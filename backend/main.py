from fastapi import FastAPI, Request, HTTPException, Depends, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime, timedelta
import jwt
import bcrypt
import os
from dotenv import load_dotenv

from models.user import User
from models.habit import Habit
from models.task import Task
from models.goal import Goal
from db.connection import execute_query

load_dotenv()

app = FastAPI(title="Habit Tracker API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# JWT Secret Key
JWT_SECRET = os.getenv('JWT_SECRET', 'your-secret-key-here')

# --- Models ---

class UserSignup(BaseModel):
    email: str
    password: str
    full_name: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class HabitCreate(BaseModel):
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    frequency: str = "daily"
    target_count: int = 1
    color: Optional[str] = None
    icon: Optional[str] = None

class HabitComplete(BaseModel):
    date: Optional[str] = None
    count: int = 1
    notes: Optional[str] = None

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    category: Optional[str] = None
    priority: str = "medium"
    due_date: Optional[str] = None
    goal_id: Optional[int] = None

class GoalCreate(BaseModel):
    title: str
    description: Optional[str] = None
    target_value: float = 100
    current_value: float = 0
    unit: Optional[str] = None
    deadline: Optional[str] = None

class ProgressUpdate(BaseModel):
    increment: float = 1

# --- Security & Auth ---

def create_token(user_id: int):
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm='HS256')

def verify_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=['HS256'])
        return payload['user_id']
    except:
        return None

async def get_current_user_id(request: Request):
    auth_header = request.headers.get('Authorization')
    if not auth_header or not auth_header.startswith('Bearer '):
        raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")
    
    token = auth_header.split(' ')[1]
    user_id = verify_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Session expired. Please sign in again.")
    return user_id

# --- Endpoints ---

@app.post("/api/signup", status_code=status.HTTP_201_CREATED)
async def signup(data: UserSignup):
    existing_user = User.find_by_email(data.email)
    if existing_user:
        raise HTTPException(status_code=400, detail="User already exists")

    password_hash = bcrypt.hashpw(data.password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    user = User.create(data.email, password_hash, data.full_name)
    token = create_token(user['id'])

    return {
        'token': token,
        'user': {
            'id': user['id'],
            'email': user['email'],
            'full_name': user['full_name']
        }
    }

@app.post("/api/login")
async def login(data: UserLogin):
    user = User.find_by_email(data.email)
    if not user or not bcrypt.checkpw(data.password.encode('utf-8'), user['password_hash'].encode('utf-8')):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(user['id'])
    return {
        'token': token,
        'user': {
            'id': user['id'],
            'email': user['email'],
            'full_name': user['full_name']
        }
    }

# --- Habits ---

@app.get("/api/habits")
async def get_habits(user_id: int = Depends(get_current_user_id)):
    return Habit.get_all(user_id)

@app.post("/api/habits", status_code=status.HTTP_201_CREATED)
async def create_habit(data: HabitCreate, user_id: int = Depends(get_current_user_id)):
    habit = Habit.create(user_id=user_id, **data.dict())
    return habit

@app.put("/api/habits/{habit_id}")
async def update_habit(habit_id: int, data: dict, user_id: int = Depends(get_current_user_id)):
    habit = Habit.update(habit_id, user_id, **data)
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    return habit

@app.delete("/api/habits/{habit_id}")
async def delete_habit(habit_id: int, user_id: int = Depends(get_current_user_id)):
    Habit.delete(habit_id, user_id)
    return {'message': 'Habit deleted'}

@app.post("/api/habits/{habit_id}/complete", status_code=status.HTTP_201_CREATED)
async def complete_habit(habit_id: int, data: HabitComplete, user_id: int = Depends(get_current_user_id)):
    completion = Habit.mark_complete(
        habit_id=habit_id,
        user_id=user_id,
        completion_date=data.date,
        count=data.count,
        notes=data.notes
    )
    return completion

# --- Tasks ---

@app.get("/api/tasks")
async def get_tasks(completed: Optional[str] = None, user_id: int = Depends(get_current_user_id)):
    is_completed = None
    if completed is not None:
        is_completed = completed.lower() == 'true'
    return Task.get_all(user_id, is_completed)

@app.post("/api/tasks", status_code=status.HTTP_201_CREATED)
async def create_task(data: TaskCreate, user_id: int = Depends(get_current_user_id)):
    task = Task.create(user_id=user_id, **data.dict())
    return task

@app.put("/api/tasks/{task_id}")
async def update_task(task_id: int, data: dict, user_id: int = Depends(get_current_user_id)):
    task = Task.update(task_id, user_id, **data)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

@app.post("/api/tasks/{task_id}/complete")
async def complete_task(task_id: int, data: dict, user_id: int = Depends(get_current_user_id)):
    is_completed = data.get('is_completed', True)
    task = Task.mark_complete(task_id, user_id, is_completed)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    # Recalculate rank after completion
    summary = await get_analytics_summary(user_id)
    new_rank = calculate_user_rank(summary['completed_tasks'])
    User.update(user_id, rank=new_rank)
    
    return task

@app.delete("/api/tasks/{task_id}")
async def delete_task(task_id: int, user_id: int = Depends(get_current_user_id)):
    Task.delete(task_id, user_id)
    return {'message': 'Task deleted'}

# --- Goals ---

@app.get("/api/goals")
async def get_goals(user_id: int = Depends(get_current_user_id)):
    return Goal.get_all(user_id)

@app.post("/api/goals", status_code=status.HTTP_201_CREATED)
async def create_goal(data: GoalCreate, user_id: int = Depends(get_current_user_id)):
    goal = Goal.create(user_id=user_id, **data.dict())
    return goal

@app.put("/api/goals/{goal_id}")
async def update_goal(goal_id: int, data: dict, user_id: int = Depends(get_current_user_id)):
    goal = Goal.update(goal_id, user_id, **data)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal

@app.post("/api/goals/{goal_id}/progress")
async def update_goal_progress(goal_id: int, data: ProgressUpdate, user_id: int = Depends(get_current_user_id)):
    goal = Goal.update_progress(goal_id, user_id, data.increment)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal

@app.delete("/api/goals/{goal_id}")
async def delete_goal(goal_id: int, user_id: int = Depends(get_current_user_id)):
    Goal.delete(goal_id, user_id)
    return {'message': 'Goal deleted'}

# --- Analytics ---

@app.get("/api/analytics/summary")
async def get_analytics_summary(user_id: int = Depends(get_current_user_id)):
    total_habits = len(Habit.get_all(user_id))
    total_tasks = len(Task.get_all(user_id))
    completed_tasks = len(Task.get_all(user_id, is_completed=True))
    total_goals = len(Goal.get_all(user_id, is_completed=False))
    completed_goals = len(Goal.get_all(user_id, is_completed=True))

    today = datetime.now().date()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)
    last_week_start = week_start - timedelta(days=7)
    last_week_end = week_start - timedelta(days=1)

    query = """
        SELECT COUNT(DISTINCT CONCAT(habit_id, completion_date)) as count 
        FROM habit_completions
        WHERE user_id = %s AND completion_date BETWEEN %s AND %s
    """
    week_completions = execute_query(query, (user_id, week_start, week_end), fetch_one=True)
    last_week_completions = execute_query(query, (user_id, last_week_start, last_week_end), fetch_one=True)

    habits = Habit.get_all(user_id)
    total_habits_count = len(habits)
    days_passed = max((today - week_start).days + 1, 1)
    total_possible = total_habits_count * days_passed

    week_count = week_completions['count'] if week_completions and week_completions.get('count') else 0
    last_week_count = last_week_completions['count'] if last_week_completions and last_week_completions.get('count') else 0

    completion_rate = 0
    if total_possible > 0:
        completion_rate = round((week_count / total_possible) * 100, 1)

    if last_week_count > 0:
        momentum = round(((week_count - last_week_count) / last_week_count) * 100, 1)
    else:
        momentum = 100 if week_count > 0 else 0

    return {
        'total_habits': total_habits,
        'total_tasks': total_tasks,
        'completed_tasks': completed_tasks,
        'total_goals': total_goals,
        'completed_goals': completed_goals,
        'completion_rate': completion_rate,
        'week_completions': week_count,
        'this_week_completions': week_count,
        'last_week_completions': last_week_count,
        'momentum': momentum
    }

# --- Comprehensive Metrics (All-in-One) ---

@app.get("/api/analytics/metrics")
async def get_analytics_metrics(user_id: int = Depends(get_current_user_id)):
    """
    Comprehensive metrics endpoint with all calculated values:
    - Task Metrics: total_tasks, completed_tasks, remaining_tasks, task_efficiency
    - Habit Metrics: total_habits, today_completion, habits_data (current_streak, longest_streak, consistency)
    - Goal Metrics: total_goals, completed_goals, average_goal_progress, goals_data
    - System Metric: productivity_score
    """
    # Task Metrics
    task_metrics = Task.calculate_metrics(user_id)
    
    # Habit Metrics
    habit_metrics = Habit.calculate_all_metrics(user_id)
    
    # Goal Metrics
    goal_metrics = Goal.calculate_all_metrics(user_id)
    
    # Calculate Habit Consistency (average across all habits)
    habits_data = habit_metrics.get('habits_data', [])
    avg_habit_consistency = 0
    if habits_data:
        total_consistency = sum(h.get('consistency', 0) for h in habits_data)
        avg_habit_consistency = round(total_consistency / len(habits_data), 1)
    
    # Calculate Average Goal Progress
    avg_goal_progress = goal_metrics.get('average_goal_progress', 0)
    
    # Productivity Score = (0.5 * task_efficiency) + (0.3 * habit_consistency) + (0.2 * average_goal_progress)
    productivity_score = round(
        (0.5 * task_metrics['task_efficiency']) +
        (0.3 * avg_habit_consistency) +
        (0.2 * avg_goal_progress), 1
    )
    
    return {
        # Task Metrics
        'total_tasks': task_metrics['total_tasks'],
        'completed_tasks': task_metrics['completed_tasks'],
        'remaining_tasks': task_metrics['remaining_tasks'],
        'task_efficiency': task_metrics['task_efficiency'],
        
        # Habit Metrics
        'total_habits': habit_metrics['total_habits'],
        'today_completion': habit_metrics['today_completion'],
        'habits_data': habits_data,
        'habit_consistency': avg_habit_consistency,
        
        # Goal Metrics
        'total_goals': goal_metrics['total_goals'],
        'completed_goals': goal_metrics['completed_goals'],
        'average_goal_progress': avg_goal_progress,
        'goals_data': goal_metrics.get('goals_data', []),
        
        # System Metric
        'productivity_score': productivity_score
    }

@app.get("/api/analytics/progress")
async def get_analytics_progress(user_id: int = Depends(get_current_user_id)):
    end_date = datetime.now().date()
    start_date = end_date - timedelta(days=29)

    query = """
        SELECT completion_date, COUNT(*) as count
        FROM habit_completions
        WHERE user_id = %s AND completion_date BETWEEN %s AND %s
        GROUP BY completion_date
        ORDER BY completion_date ASC
    """
    completions = execute_query(query, (user_id, start_date, end_date))

    progress_data = []
    current_date = start_date
    completion_dict = {item['completion_date']: item['count'] for item in completions}

    while current_date <= end_date:
        progress_data.append({
            'date': current_date.isoformat(),
            'count': completion_dict.get(current_date, 0)
        })
        current_date += timedelta(days=1)

    return progress_data

@app.get("/api/analytics/streaks")
async def get_analytics_streaks(user_id: int = Depends(get_current_user_id)):
    habits = Habit.get_all(user_id)
    streak_data = []
    for habit in habits:
        current_streak = Habit.calculate_streak(habit['id'], user_id)
        streak_data.append({
            'habit_id': habit['id'],
            'habit_name': habit['name'],
            'current_streak': current_streak,
            'color': habit['color']
        })
    return streak_data

@app.get("/api/calendar-data")
async def get_calendar_data(start_date: Optional[str] = None, end_date: Optional[str] = None, user_id: int = Depends(get_current_user_id)):
    if not start_date or not end_date:
        today = datetime.now()
        start_date = today.replace(day=1).date()
        end_date = (today.replace(day=1) + timedelta(days=32)).replace(day=1).date() - timedelta(days=1)

    tasks = Task.get_by_date_range(user_id, start_date, end_date)
    query = """
        SELECT hc.completion_date, h.id, h.name, h.color, hc.count
        FROM habit_completions hc
        JOIN habits h ON hc.habit_id = h.id
        WHERE hc.user_id = %s AND hc.completion_date BETWEEN %s AND %s
        ORDER BY hc.completion_date ASC
    """
    completions = execute_query(query, (user_id, start_date, end_date))

    return {
        'tasks': tasks,
        'completions': completions
    }

@app.get("/api/tasks/upcoming")
async def get_upcoming_tasks(user_id: int = Depends(get_current_user_id)):
    """Get upcoming tasks (future due dates)"""
    today = datetime.now().date()
    query = """
        SELECT * FROM tasks 
        WHERE user_id = %s AND due_date IS NOT NULL AND due_date >= %s AND is_completed = false
        ORDER BY due_date ASC
        LIMIT 10
    """
    return execute_query(query, (user_id, today)) or []

@app.get("/api/analytics/calendar-stats")
async def get_calendar_stats(user_id: int = Depends(get_current_user_id)):
    """Get calendar page statistics from database"""
    today = datetime.now().date()
    
    # Focus Score = completion rate this month
    month_start = today.replace(day=1)
    query = """
        SELECT COUNT(DISTINCT CONCAT(habit_id, completion_date)) as count 
        FROM habit_completions
        WHERE user_id = %s AND completion_date BETWEEN %s AND %s
    """
    month_completions = execute_query(query, (user_id, month_start, today), fetch_one=True)
    
    habits = Habit.get_all(user_id)
    total_habits = len(habits)
    days_in_month = today.day
    total_possible = total_habits * days_in_month
    
    focus_score = 0
    if total_possible > 0:
        focus_score = round((month_completions['count'] if month_completions and month_completions.get('count') else 0) / total_possible * 100, 1)
    
    # Top Habit - habit with most completions this month
    top_habit_query = """
        SELECT h.name, COUNT(*) as completions, %s as total_days
        FROM habit_completions hc
        JOIN habits h ON hc.habit_id = h.id
        WHERE hc.user_id = %s AND hc.completion_date BETWEEN %s AND %s
        GROUP BY h.id, h.name
        ORDER BY completions DESC
        LIMIT 1
    """
    top_habit = execute_query(top_habit_query, (days_in_month, user_id, month_start, today), fetch_one=True)
    
    # Current Streak - max consecutive days across all habits
    streak_query = """
        SELECT completion_date FROM habit_completions
        WHERE user_id = %s
        ORDER BY completion_date DESC
    """
    completions = execute_query(streak_query, (user_id,)) or []
    
    current_streak = 0
    if completions:
        streak_count = 0
        last_date = None
        for comp in completions:
            comp_date = comp['completion_date']
            if hasattr(comp_date, 'date'):
                comp_date = comp_date.date()
            
            if last_date is None:
                # Check if most recent is today or yesterday
                if comp_date == today or comp_date == today - timedelta(days=1):
                    streak_count = 1
                    last_date = comp_date
                else:
                    break
            else:
                if (last_date - comp_date).days == 1:
                    streak_count += 1
                    last_date = comp_date
                else:
                    break
        current_streak = streak_count
    
    # Calculate vs last month
    last_month_end = month_start - timedelta(days=1)
    last_month_start = last_month_end.replace(day=1)
    last_month_completions = execute_query(query, (user_id, last_month_start, last_month_end), fetch_one=True)
    last_month_count = last_month_completions['count'] if last_month_completions and last_month_completions.get('count') else 0
    last_month_days = last_month_end.day
    last_month_possible = total_habits * last_month_days
    last_month_score = round((last_month_count / last_month_possible) * 100, 1) if last_month_possible > 0 else 0
    focus_change = focus_score - last_month_score
    
    return {
        'focus_score': focus_score,
        'focus_change': focus_change,
        'top_habit': {
            'name': top_habit['name'] if top_habit else None,
            'completions': top_habit['completions'] if top_habit else 0,
            'total_days': top_habit['total_days'] if top_habit else days_in_month
        } if top_habit else None,
        'current_streak': current_streak
    }

@app.get("/api/notifications")
async def get_notifications(user_id: int = Depends(get_current_user_id)):
    query = """
        SELECT * FROM notifications
        WHERE user_id = %s
        ORDER BY created_at DESC
        LIMIT 50
    """
    return execute_query(query, (user_id,))

@app.post("/api/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: int, user_id: int = Depends(get_current_user_id)):
    query = "UPDATE notifications SET is_read = true WHERE id = %s AND user_id = %s RETURNING *"
    notification = execute_query(query, (notification_id, user_id), fetch_one=True)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notification

@app.delete("/api/notifications/{notification_id}")
async def delete_notification(notification_id: int, user_id: int = Depends(get_current_user_id)):
    query = "DELETE FROM notifications WHERE id = %s AND user_id = %s"
    execute_query(query, (notification_id, user_id))
    return {'message': 'Notification deleted'}

@app.get("/api/recent-activity")
async def get_recent_activity(user_id: int = Depends(get_current_user_id)):
    """Return all recent activity: tasks (created/completed), habits completed, goals (created/completed)"""
    
    # Tasks - created
    tasks_created_query = """
        SELECT 'task_created' as type, title as label, 'Tasks' as category,
               created_at as occurred_at
        FROM tasks
        WHERE user_id = %s
        ORDER BY created_at DESC
        LIMIT 10
    """
    
    # Tasks - completed
    tasks_completed_query = """
        SELECT 'task_completed' as type, title as label, 'Tasks' as category,
               completed_at as occurred_at
        FROM tasks
        WHERE user_id = %s AND is_completed = true AND completed_at IS NOT NULL
        ORDER BY completed_at DESC
        LIMIT 10
    """
    
    # Habits completed
    habits_completed_query = """
        SELECT 'habit_completed' as type, h.name as label, 'Habits' as category,
               hc.completion_date as occurred_at
        FROM habit_completions hc
        JOIN habits h ON hc.habit_id = h.id
        WHERE hc.user_id = %s
        ORDER BY hc.completion_date DESC
        LIMIT 10
    """
    
    # Goals - created
    goals_created_query = """
        SELECT 'goal_created' as type, title as label, 'Goals' as category,
               created_at as occurred_at
        FROM goals
        WHERE user_id = %s
        ORDER BY created_at DESC
        LIMIT 10
    """
    
    # Goals - completed
    goals_completed_query = """
        SELECT 'goal_completed' as type, title as label, 'Goals' as category,
               completed_at as occurred_at
        FROM goals
        WHERE user_id = %s AND is_completed = true AND completed_at IS NOT NULL
        ORDER BY completed_at DESC
        LIMIT 10
    """
    
    tasks_created = execute_query(tasks_created_query, (user_id,)) or []
    tasks_completed = execute_query(tasks_completed_query, (user_id,)) or []
    habits_completed = execute_query(habits_completed_query, (user_id,)) or []
    goals_created = execute_query(goals_created_query, (user_id,)) or []
    goals_completed = execute_query(goals_completed_query, (user_id,)) or []

    events = []
    
    for item in tasks_created:
        occurred_at = item.get('occurred_at')
        if occurred_at and hasattr(occurred_at, 'isoformat'):
            occurred_at = occurred_at.isoformat()
        events.append({
            'type': item['type'],
            'label': item['label'],
            'category': item['category'],
            'occurred_at': occurred_at
        })
    
    for item in tasks_completed:
        occurred_at = item.get('occurred_at')
        if occurred_at and hasattr(occurred_at, 'isoformat'):
            occurred_at = occurred_at.isoformat()
        events.append({
            'type': item['type'],
            'label': item['label'],
            'category': item['category'],
            'occurred_at': occurred_at
        })
    
    for item in habits_completed:
        occurred_at = item.get('occurred_at')
        if occurred_at:
            if hasattr(occurred_at, 'isoformat'):
                occurred_at = occurred_at.isoformat()
            elif isinstance(occurred_at, str):
                occurred_at = occurred_at + "T00:00:00"
        events.append({
            'type': item['type'],
            'label': item['label'],
            'category': item['category'],
            'occurred_at': occurred_at
        })
        
    for item in goals_created:
        occurred_at = item.get('occurred_at')
        if occurred_at and hasattr(occurred_at, 'isoformat'):
            occurred_at = occurred_at.isoformat()
        events.append({
            'type': item['type'],
            'label': item['label'],
            'category': item['category'],
            'occurred_at': occurred_at
        })
    
    for item in goals_completed:
        occurred_at = item.get('occurred_at')
        if occurred_at and hasattr(occurred_at, 'isoformat'):
            occurred_at = occurred_at.isoformat()
        events.append({
            'type': item['type'],
            'label': item['label'],
            'category': item['category'],
            'occurred_at': occurred_at
        })

    # Sort by occurred_at descending (most recent first)
    events.sort(key=lambda x: str(x.get('occurred_at') or ''), reverse=True)
    return events[:20]



@app.get("/api/search")
async def global_search(q: str = Query("", min_length=0), user_id: int = Depends(get_current_user_id)):
    if not q:
        return {'habits': [], 'tasks': [], 'goals': []}
    
    q_pattern = f'%{q.lower()}%'
    habits_query = "SELECT * FROM habits WHERE user_id = %s AND (LOWER(name) LIKE %s OR LOWER(description) LIKE %s)"
    habits = execute_query(habits_query, (user_id, q_pattern, q_pattern))
    
    tasks_query = "SELECT * FROM tasks WHERE user_id = %s AND (LOWER(title) LIKE %s OR LOWER(description) LIKE %s)"
    tasks = execute_query(tasks_query, (user_id, q_pattern, q_pattern))
    
    goals_query = "SELECT * FROM goals WHERE user_id = %s AND (LOWER(title) LIKE %s OR LOWER(description) LIKE %s)"
    goals = execute_query(goals_query, (user_id, q_pattern, q_pattern))
    
    return {
        'habits': habits,
        'tasks': tasks,
        'goals': goals
    }

def calculate_user_rank(completed_tasks: int) -> str:
    """Calculate architect rank based on completed task nodes"""
    if completed_tasks >= 500: return "Nexus Prime Architect"
    if completed_tasks >= 250: return "Master System Designer"
    if completed_tasks >= 100: return "Senior Architect"
    if completed_tasks >= 50: return "Disciplined Architect"
    if completed_tasks >= 10: return "Initiate Architect"
    return "Novice Architect"

@app.get("/api/profile")
async def get_profile(user_id: int = Depends(get_current_user_id)):
    user = User.find_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update rank dynamically on fetch
    summary = await get_analytics_summary(user_id)
    new_rank = calculate_user_rank(summary['completed_tasks'])
    
    if user.get('rank') != new_rank:
        User.update(user_id, rank=new_rank)
        user['rank'] = new_rank
        
    return user

@app.put("/api/profile")
async def update_profile(data: dict, user_id: int = Depends(get_current_user_id)):
    try:
        # Prevent some fields from being updated directly through this endpoint
        update_data = {k: v for k, v in data.items() if k in ['full_name', 'email', 'timezone', 'status', 'avatar_url']}
        
        user = User.update(user_id, **update_data)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        # Also sync rank in case progress stats changed (unlikely here but good for consistency)
        summary = await get_analytics_summary(user_id)
        new_rank = calculate_user_rank(summary['completed_tasks'])
        if user.get('rank') != new_rank:
            user = User.update(user_id, rank=new_rank)

        return user
    except Exception as e:
        print(f"Update error: {e}")
        # If it's a unique constraint error for email
        if "unique constraint" in str(e).lower() and "email" in str(e).lower():
            raise HTTPException(status_code=400, detail="This email is already in use by another architect.")
        raise HTTPException(status_code=400, detail=str(e))

@app.put("/api/profile/password")
async def change_password(data: dict, user_id: int = Depends(get_current_user_id)):
    current_password = data.get('current_password')
    new_password = data.get('new_password')
    
    user = User.find_by_id_with_password(user_id)
    if not user or not bcrypt.checkpw(current_password.encode('utf-8'), user['password_hash'].encode('utf-8')):
        raise HTTPException(status_code=400, detail="Invalid current password")
    
    password_hash = bcrypt.hashpw(new_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    User.update(user_id, password_hash=password_hash)
    return {"message": "Password updated successfully"}

@app.post("/api/profile/avatar")
async def update_avatar(data: dict, user_id: int = Depends(get_current_user_id)):
    avatar_url = data.get('avatar_url')
    if not avatar_url:
        raise HTTPException(status_code=400, detail="Avatar URL is required")
    
    User.update(user_id, avatar_url=avatar_url)
    return {"avatar_url": avatar_url}

@app.get("/api/profile/achievements")
async def get_achievements(user_id: int = Depends(get_current_user_id)):
    # Calculate dynamic achievements
    summary = await get_analytics_summary(user_id)
    streaks = await get_analytics_streaks(user_id)
    
    max_streak = 0
    if streaks:
        max_streak = max([s['current_streak'] for s in streaks])
    
    all_achievements = execute_query("SELECT * FROM achievements")
    
    for ach in all_achievements:
        unlocked = False
        ach_type = ach.get('type')
        thresh = ach.get('threshold_value', 0)
        
        if ach_type == 'streak':
            if max_streak >= thresh:
                unlocked = True
        elif ach_type == 'task_count':
            if summary['completed_tasks'] >= thresh:
                unlocked = True
        elif ach_type == 'consistency':
            if summary['completion_rate'] >= thresh:
                unlocked = True
                
        if unlocked:
            execute_query("""
                INSERT INTO user_achievements (user_id, achievement_id)
                VALUES (%s, %s) ON CONFLICT (user_id, achievement_id) DO NOTHING
            """, (user_id, ach['id']), fetch_all=False)
            
    # Fetch user's unlocked achievements mapped to UI fields
    user_ach = execute_query("""
        SELECT a.name as title, a.description as desc, a.rank_type as type, a.icon, a.color
        FROM user_achievements ua
        JOIN achievements a ON ua.achievement_id = a.id
        WHERE ua.user_id = %s
        ORDER BY ua.unlocked_at DESC
    """, (user_id,))
    
    return user_ach

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
