from fastapi import FastAPI, Request, HTTPException, Depends, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional, Any
from datetime import datetime, timedelta, date
import jwt
import bcrypt
import os
from dotenv import load_dotenv
from apscheduler.schedulers.background import BackgroundScheduler

from email_service import send_email_with_pdf
from pdf_service import generate_weekly_pdf

from models.user import User
from models.habit import Habit
from models.task import Task
from models.goal import Goal
from models.focus_session import FocusSession
from models.scheduled_item import ScheduledItem
from models.notification import Notification
from db.connection import execute_query

load_dotenv()

app = FastAPI(title="Habit Tracker API")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "http://127.0.0.1:5173",
        "http://localhost:5174", "http://127.0.0.1:5174",
        "http://localhost:5175", "http://127.0.0.1:5175"
    ],
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
    days_of_week: Optional[List[int]] = None

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
    priority: str = 'medium'  # low, medium, high
    deadline: Optional[str] = None

class ProgressUpdate(BaseModel):
    increment: float = 1

class FocusSessionStart(BaseModel):
    task_id: int
    duration_minutes: int = 25

class FocusSessionComplete(BaseModel):
    task_completed: bool = False

class UserPreferences(BaseModel):
    dark_mode: Optional[bool] = None
    desktop_notifications: Optional[bool] = None
    weekly_summary_emails: Optional[bool] = None
    notification_reminders: Optional[bool] = None
    notification_achievements: Optional[bool] = None
    profile_visibility: Optional[str] = None
    anonymous_analytics: Optional[bool] = None

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
    
    # Initialize user preferences
    execute_query("INSERT INTO user_preferences (user_id) VALUES (%s) ON CONFLICT (user_id) DO NOTHING", (user['id'],))
    
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
            'full_name': user['full_name'],
            'avatar_url': user.get('avatar_url'),
            'rank': user.get('rank'),
            'timezone': user.get('timezone'),
            'status': user.get('status')
        }
    }

# --- Habits ---

@app.get("/api/habits")
async def get_habits(date: Optional[str] = None, user_id: int = Depends(get_current_user_id)):
    return Habit.get_all(user_id, today_date=date)

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
    
    # Trigger Notification for Habit Completion
    Notification.create(
        user_id=user_id,
        type='habit_completed',
        title='Habit Completed!',
        message=f'Great job! You just completed one session of your habit.',
        related_entity_type='habit',
        related_entity_id=habit_id
    )

    # Sync achievements after completion
    await sync_achievements(user_id)
    
    return completion

@app.delete("/api/habits/{habit_id}/complete")
async def uncomplete_habit(habit_id: int, date: Optional[str] = None, user_id: int = Depends(get_current_user_id)):
    Habit.unmark_complete(habit_id, user_id, date)
    return {'message': 'Habit completion removed'}

@app.get("/api/habits/{habit_id}/goals")
async def get_habit_goals(habit_id: int, user_id: int = Depends(get_current_user_id)):
    return Habit.get_goal_links(habit_id)

@app.put("/api/habits/{habit_id}/goals")
async def sync_habit_goals(habit_id: int, data: dict, user_id: int = Depends(get_current_user_id)):
    goal_ids = data.get('goal_ids', [])
    Habit.sync_goal_links(habit_id, goal_ids)
    return {'message': 'Goals synced'}

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
    completion_date = data.get('date')
    task = Task.mark_complete(task_id, user_id, is_completed, completed_at=completion_date)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    try:
        # Recalculate rank after completion
        summary = await get_analytics_summary(user_id)
        new_rank = calculate_user_rank(summary.get('completed_tasks', 0))
        User.update(user_id, rank=new_rank)
        
        # Trigger Notification for Task Completion
        if is_completed:
            Notification.create(
                user_id=user_id,
                type='task_completed',
                title='Task Finished!',
                message=f'Excellent! You reached another milestone.',
                related_entity_type='task',
                related_entity_id=task_id
            )

        # Sync achievements
        await sync_achievements(user_id)
    except Exception as e:
        print(f"Post-completion hook error (permissions/sync): {e}")
        # We don't fail the entire request if notifications or sync fails
    
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

# --- Goal Linking ---

@app.post("/api/goals/{goal_id}/link-habit")
async def link_habit_to_goal(goal_id: int, data: dict, user_id: int = Depends(get_current_user_id)):
    """Link a habit to a goal"""
    # Verify goal exists
    goal = Goal.get_by_id(goal_id, user_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    habit_id = data.get('habit_id')
    if not habit_id:
        raise HTTPException(status_code=400, detail="habit_id is required")
    
    # Verify habit exists
    habit = Habit.get_by_id(habit_id, user_id)
    if not habit:
        raise HTTPException(status_code=404, detail="Habit not found")
    
    Goal.link_habit_to_goal(goal_id, habit_id)
    return {'message': 'Habit linked to goal', 'goal_id': goal_id, 'habit_id': habit_id}

@app.delete("/api/goals/{goal_id}/unlink-habit/{habit_id}")
async def unlink_habit_from_goal(goal_id: int, habit_id: int, user_id: int = Depends(get_current_user_id)):
    """Unlink a habit from a goal"""
    goal = Goal.get_by_id(goal_id, user_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    Goal.unlink_habit_from_goal(goal_id, habit_id)
    return {'message': 'Habit unlinked from goal', 'goal_id': goal_id, 'habit_id': habit_id}

@app.post("/api/goals/{goal_id}/link-habits")
async def link_habits_to_goal(goal_id: int, data: dict, user_id: int = Depends(get_current_user_id)):
    """Update linked habits for a goal (multi-select)"""
    goal = Goal.get_by_id(goal_id, user_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    habit_ids = data.get('habit_ids', [])
    
    # Verify all habits exist
    for habit_id in habit_ids:
        habit = Habit.get_by_id(habit_id, user_id)
        if not habit:
            raise HTTPException(status_code=404, detail=f"Habit {habit_id} not found")
    
    Goal.update_goal_habits(goal_id, habit_ids)
    return {'message': 'Goal habits updated', 'goal_id': goal_id, 'habit_ids': habit_ids}

@app.get("/api/goals/{goal_id}/linked-habits")
async def get_linked_habits(goal_id: int, user_id: int = Depends(get_current_user_id)):
    """Get all habits linked to a goal"""
    goal = Goal.get_by_id(goal_id, user_id)
    if not goal:
        raise HTTPException(status_code=404, detail="Goal not found")
    
    habit_ids = Goal.get_goal_habits(goal_id)
    return {'goal_id': goal_id, 'habit_ids': habit_ids}

# --- Analytics ---

@app.get("/api/analytics/summary")
async def get_analytics_summary(user_id: int = Depends(get_current_user_id), date: Optional[str] = None):
    try:
        total_habits = len(Habit.get_all(user_id, today_date=date))
        total_tasks = len(Task.get_all(user_id))
        completed_tasks = len(Task.get_all(user_id, is_completed=True))
        total_goals = len(Goal.get_all(user_id))
        completed_goals = len(Goal.get_all(user_id, is_completed=True))
    except Exception as e:
        print(f"Error fetching basic metrics: {e}")
        total_habits = 0
        total_tasks = 0
        completed_tasks = 0
        total_goals = 0
        completed_goals = 0

    if not date:
        today = datetime.now().date()
    else:
        today = datetime.strptime(date, '%Y-%m-%d').date()
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

    try:
        habits = Habit.get_all(user_id)
        total_habits_count = len(habits)
    except Exception as e:
        print(f"Error fetching habits list: {e}")
        habits = []
        total_habits_count = 0

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
async def get_analytics_metrics(user_id: int = Depends(get_current_user_id), date: Optional[str] = None):
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
    habit_metrics = Habit.calculate_all_metrics(user_id, today_date=date)
    
    # Goal Metrics
    goal_metrics = Goal.calculate_all_metrics(user_id, today_date=date)
    
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
async def get_analytics_progress(user_id: int = Depends(get_current_user_id), date: Optional[str] = None):
    if not date:
        end_date = datetime.now().date()
    else:
        end_date = datetime.strptime(date, '%Y-%m-%d').date()
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
async def get_analytics_streaks(user_id: int = Depends(get_current_user_id), date: Optional[str] = None):
    try:
        habits = Habit.get_all(user_id, today_date=date)
    except Exception as e:
        print(f"Error fetching habits for streaks: {e}")
        habits = []
    streak_data = []
    for habit in habits:
        current_streak = Habit.calculate_streak(habit['id'], user_id, today=date)
        streak_data.append({
            'habit_id': habit['id'],
            'habit_name': habit['name'],
            'current_streak': current_streak,
            'color': habit['color'],
            'is_completed_today': habit.get('is_completed_today', False)
        })
    return streak_data

@app.get("/api/calendar-data")
async def get_calendar_data(start_date: Optional[str] = None, end_date: Optional[str] = None, user_id: int = Depends(get_current_user_id)):
    if not start_date or not end_date:
        today = datetime.now()
        start_date = today.replace(day=1).date()
        end_date = (today.replace(day=1) + timedelta(days=32)).replace(day=1).date() - timedelta(days=1)

    tasks_query = """
        SELECT * FROM tasks
        WHERE user_id = %s
          AND due_date BETWEEN %s AND %s
          AND id NOT IN (
            SELECT item_id FROM scheduled_items
            WHERE user_id = %s AND item_type = 'task' AND is_confirmed = true
          )
        ORDER BY due_date ASC
    """
    tasks = execute_query(tasks_query, (user_id, start_date, end_date, user_id)) or []
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
    """Get upcoming planned tasks, falling back to due-date tasks"""
    today = datetime.now().date()
    planned_query = """
        SELECT
            t.id,
            t.title,
            t.category,
            si.scheduled_date,
            si.scheduled_time,
            t.due_date,
            t.is_completed
        FROM scheduled_items si
        JOIN tasks t ON t.id = si.item_id
        WHERE si.user_id = %s
          AND si.item_type = 'task'
          AND si.is_confirmed = true
          AND t.is_completed = false
          AND (
            si.scheduled_date > %s OR
            (si.scheduled_date = %s AND (si.scheduled_time IS NULL OR si.scheduled_time >= CURRENT_TIME))
          )
        ORDER BY si.scheduled_date ASC, si.scheduled_time ASC NULLS FIRST
        LIMIT 10
    """
    planned = execute_query(planned_query, (user_id, today, today)) or []

    serialized_planned = []
    planned_ids = set()
    for item in planned:
        planned_ids.add(item['id'])
        serialized_planned.append({
            'id': item['id'],
            'title': item['title'],
            'category': item.get('category'),
            'due_date': item['due_date'].isoformat() if item.get('due_date') else None,
            'scheduled_date': item['scheduled_date'].isoformat() if item.get('scheduled_date') else None,
            'scheduled_time': str(item['scheduled_time']) if item.get('scheduled_time') else None,
            'is_completed': item.get('is_completed', False)
        })

    fallback_query = """
        SELECT id, title, category, due_date, is_completed
        FROM tasks 
        WHERE user_id = %s AND due_date IS NOT NULL AND due_date >= %s AND is_completed = false
        ORDER BY due_date ASC
        LIMIT 10
    """
    fallback = execute_query(fallback_query, (user_id, today)) or []
    fallback_items = []
    for item in fallback:
        if item['id'] in planned_ids:
            continue
        fallback_items.append({
            'id': item['id'],
            'title': item['title'],
            'category': item.get('category'),
            'due_date': item['due_date'].isoformat() if item.get('due_date') else None,
            'scheduled_date': None,
            'scheduled_time': None,
            'is_completed': item.get('is_completed', False)
        })

    return (serialized_planned + fallback_items)[:10]

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
    return Notification.get_all_for_user(user_id)

@app.get("/api/notifications/unread")
async def get_unread_notifications(user_id: int = Depends(get_current_user_id)):
    return Notification.get_unread(user_id)

@app.post("/api/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: int, user_id: int = Depends(get_current_user_id)):
    notification = Notification.mark_as_read(notification_id, user_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notification

@app.delete("/api/notifications/{notification_id}")
async def delete_notification(notification_id: int, user_id: int = Depends(get_current_user_id)):
    Notification.delete(notification_id, user_id)
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
    """Calculate user rank based on completed tasks"""
    if completed_tasks >= 500: return "Expert"
    if completed_tasks >= 250: return "Advanced"
    if completed_tasks >= 100: return "Intermediate"
    if completed_tasks >= 50: return "Intermediate"
    if completed_tasks >= 10: return "Beginner"
    return "New User"

def build_scheduled_notification_datetime(scheduled_date: str, scheduled_time: Optional[str]):
    """Build a datetime for reminder notifications from planned date/time."""
    if not scheduled_time:
        return None

    normalized_time = scheduled_time[:8]
    try:
        return datetime.fromisoformat(f"{scheduled_date}T{normalized_time}")
    except ValueError:
        return None

def create_planning_reminders(user_id: int, item: dict, item_title: str):
    """Create reminders 5 minutes before and at planned start."""
    reminder_at = build_scheduled_notification_datetime(
        item['scheduled_date'],
        item.get('scheduled_time')
    )

    if not reminder_at:
        return

    five_minutes_before = reminder_at - timedelta(minutes=5)

    Notification.create(
        user_id=user_id,
        type='reminder',
        title=f"Starting soon: {item_title}",
        message=f"Your planned {item['item_type']} starts in 5 minutes at {item.get('scheduled_time')}.",
        related_entity_type=item['item_type'],
        related_entity_id=item['item_id'],
        scheduled_for=five_minutes_before
    )

    Notification.create(
        user_id=user_id,
        type='reminder',
        title=f"It's time for {item_title}",
        message=f"Your planned {item['item_type']} starts now.",
        related_entity_type=item['item_type'],
        related_entity_id=item['item_id'],
        scheduled_for=reminder_at
    )

@app.get("/api/profile")
async def get_profile(user_id: int = Depends(get_current_user_id)):
    user = User.find_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Convert RealDictCursor to dict and ensure it's JSON-serializable
    user_dict = dict(user) if user else {}
    
    # Update rank dynamically on fetch
    summary = await get_analytics_summary(user_id)
    new_rank = calculate_user_rank(summary['completed_tasks'])
    
    if user_dict.get('rank') != new_rank:
        updated_user = User.update(user_id, rank=new_rank)
        if updated_user:
            user_dict = dict(updated_user)
    
    # Convert datetime to ISO format if present
    if 'created_at' in user_dict and user_dict['created_at']:
        user_dict['created_at'] = user_dict['created_at'].isoformat() if hasattr(user_dict['created_at'], 'isoformat') else str(user_dict['created_at'])
    if 'updated_at' in user_dict and user_dict['updated_at']:
        user_dict['updated_at'] = user_dict['updated_at'].isoformat() if hasattr(user_dict['updated_at'], 'isoformat') else str(user_dict['updated_at'])
            
    return user_dict

@app.put("/api/profile")
async def update_profile(data: dict, user_id: int = Depends(get_current_user_id)):
    try:
        # Prevent some fields from being updated directly through this endpoint
        update_data = {k: v for k, v in data.items() if k in ['full_name', 'email', 'timezone', 'status', 'avatar_url']}
        
        user = User.update(user_id, **update_data)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Convert to dict for JSON serialization
        user_dict = dict(user) if user else {}
            
        # Also sync rank in case progress stats changed (unlikely here but good for consistency)
        summary = await get_analytics_summary(user_id)
        new_rank = calculate_user_rank(summary['completed_tasks'])
        if user_dict.get('rank') != new_rank:
            updated_user = User.update(user_id, rank=new_rank)
            if updated_user:
                user_dict = dict(updated_user)

        # Convert datetime to ISO format if present
        if 'created_at' in user_dict and user_dict['created_at']:
            user_dict['created_at'] = user_dict['created_at'].isoformat() if hasattr(user_dict['created_at'], 'isoformat') else str(user_dict['created_at'])
        if 'updated_at' in user_dict and user_dict['updated_at']:
            user_dict['updated_at'] = user_dict['updated_at'].isoformat() if hasattr(user_dict['updated_at'], 'isoformat') else str(user_dict['updated_at'])
        
        return user_dict
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

@app.delete("/api/profile")
async def delete_profile(user_id: int = Depends(get_current_user_id)):
    user = User.find_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    User.delete(user_id)
    return {"message": "Account successfully deleted"}

async def sync_achievements(user_id: int):
    """Internal helper to evaluate and persist achievements"""
    try:
        summary = await get_analytics_summary(user_id)
        # For streaks, we'll use current date for now, or could pass it if needed
        streaks = await get_analytics_streaks(user_id)
        
        max_streak = 0
        if streaks:
            max_streak = max([s['current_streak'] for s in streaks])
        
        all_achievements = execute_query("SELECT * FROM achievements")
        if not all_achievements:
            return
            
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
                    
    except Exception as e:
        print(f"Achievement sync error: {e}")

@app.get("/api/profile/achievements")
async def get_achievements_endpoint(user_id: int = Depends(get_current_user_id)):
    await sync_achievements(user_id)
    
    # Fetch user's unlocked achievements mapped to UI fields
    user_ach = execute_query("""
        SELECT a.name as title, a.description as desc, a.rank_type as type, a.icon, a.color
        FROM user_achievements ua
        JOIN achievements a ON ua.achievement_id = a.id
        WHERE ua.user_id = %s
        ORDER BY ua.unlocked_at DESC
    """, (user_id,))
    
    return user_ach

# --- Planning / Schedule Endpoints ---

class ScheduleItemCreate(BaseModel):
    item_type: str  # 'task' or 'habit'
    item_id: int
    scheduled_date: str
    scheduled_time: Optional[str] = None
    duration_minutes: int = 30

class AutoScheduleRequest(BaseModel):
    scheduled_date: str
    task_ids: List[int] = []
    habit_ids: List[int] = []
    start_time: str = "09:00"
    end_time: str = "18:00"
    slot_duration: int = 30

@app.get("/api/planning/unscheduled-tasks")
async def get_unscheduled_tasks(
    scheduled_date: Optional[str] = None,
    user_id: int = Depends(get_current_user_id)
):
    """Get all unscheduled tasks for planning"""
    if not scheduled_date:
        scheduled_date = datetime.now().date().isoformat()
    
    # Get tasks that are not completed and not already scheduled for the given date
    query = """
        SELECT id, title, description, priority, due_date 
        FROM tasks 
        WHERE user_id = %s AND is_completed = false
        AND id NOT IN (
            SELECT item_id FROM scheduled_items 
            WHERE user_id = %s AND item_type = 'task' AND scheduled_date = %s AND is_confirmed = true
        )
        ORDER BY priority DESC, due_date ASC NULLS LAST
    """
    tasks = execute_query(query, (user_id, user_id, scheduled_date)) or []
    
    # Get habits (daily habits can be scheduled)
    habits_query = """
        SELECT id, name, description, frequency, color
        FROM habits
        WHERE user_id = %s AND is_active = true AND frequency = 'daily'
        AND id NOT IN (
            SELECT item_id FROM scheduled_items 
            WHERE user_id = %s AND item_type = 'habit' AND scheduled_date = %s AND is_confirmed = true
        )
    """
    habits = execute_query(habits_query, (user_id, user_id, scheduled_date)) or []
    
    return {
        'tasks': tasks,
        'habits': habits
    }

@app.post("/api/planning/schedule-item")
async def schedule_single_item(
    data: ScheduleItemCreate,
    user_id: int = Depends(get_current_user_id)
):
    """Schedule a single item (draft - not confirmed)"""
    # Check if already scheduled
    existing = ScheduledItem.is_item_scheduled(user_id, data.item_type, data.item_id, data.scheduled_date)
    if existing:
        raise HTTPException(status_code=400, detail="Item already scheduled for this date")
    
    scheduled = ScheduledItem.create(
        user_id=user_id,
        item_type=data.item_type,
        item_id=data.item_id,
        scheduled_date=data.scheduled_date,
        scheduled_time=data.scheduled_time,
        duration_minutes=data.duration_minutes
    )
    return scheduled

@app.post("/api/planning/auto-schedule")
async def auto_schedule(
    data: AutoScheduleRequest,
    user_id: int = Depends(get_current_user_id)
):
    """Generate auto-schedule suggestions (not saved yet)"""
    # Parse times
    start_hour, start_min = map(int, data.start_time.split(':'))
    end_hour, end_min = map(int, data.end_time.split(':'))
    
    start_minutes = start_hour * 60 + start_min
    end_minutes = end_hour * 60 + end_min
    
    # Generate time slots
    slots = []
    current = start_minutes
    while current + data.slot_duration <= end_minutes:
        hour = current // 60
        minute = current % 60
        time_str = f"{hour:02d}:{minute:02d}"
        slots.append(time_str)
        current += data.slot_duration
    
    # Get task details
    scheduled_items = []
    slot_index = 0
    
    for task_id in data.task_ids:
        task = Task.get_by_id(task_id, user_id)
        if task:
            scheduled_items.append({
                'item_type': 'task',
                'item_id': task_id,
                'title': task.get('title', 'Task'),
                'scheduled_time': slots[slot_index] if slot_index < len(slots) else None,
                'duration_minutes': 30
            })
            slot_index += 1
    
    for habit_id in data.habit_ids:
        habit = Habit.get_by_id(habit_id, user_id)
        if habit:
            scheduled_items.append({
                'item_type': 'habit',
                'item_id': habit_id,
                'title': habit.get('name', 'Habit'),
                'scheduled_time': slots[slot_index] if slot_index < len(slots) else None,
                'duration_minutes': 15
            })
            slot_index += 1
    
    return {
        'suggestions': scheduled_items,
        'slots': slots
    }

@app.post("/api/planning/confirm")
async def confirm_scheduled_items(
    scheduled_items: List[dict],
    user_id: int = Depends(get_current_user_id)
):
    """Save and confirm scheduled items"""
    confirmed = []
    for item in scheduled_items:
        # First create as draft if not exists
        existing = ScheduledItem.is_item_scheduled(
            user_id, 
            item['item_type'], 
            item['item_id'], 
            item['scheduled_date']
        )
        if not existing:
            scheduled = ScheduledItem.create(
                user_id=user_id,
                item_type=item['item_type'],
                item_id=item['item_id'],
                scheduled_date=item['scheduled_date'],
                scheduled_time=item.get('scheduled_time'),
                duration_minutes=item.get('duration_minutes', 30)
            )
            if scheduled:
                confirmed_item = ScheduledItem.confirm(scheduled['id'], user_id)
                confirmed.append(confirmed_item)
        else:
            # Already exists, update it with the latest chosen time and confirm it
            confirmed_item = ScheduledItem.update(
                existing['id'],
                user_id,
                scheduled_time=item.get('scheduled_time'),
                duration_minutes=item.get('duration_minutes', 30),
                is_confirmed=True
            )
            if confirmed_item:
                confirmed.append(confirmed_item)

        item_title = item.get('title')
        if not item_title:
            if item['item_type'] == 'task':
                task = Task.get_by_id(item['item_id'], user_id)
                item_title = task.get('title') if task else 'task'
            elif item['item_type'] == 'habit':
                habit = Habit.get_by_id(item['item_id'], user_id)
                item_title = habit.get('name') if habit else 'habit'

        create_planning_reminders(user_id, item, item_title)
    
    return {'confirmed': confirmed}

@app.get("/api/planning/scheduled")
async def get_scheduled_items(
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    user_id: int = Depends(get_current_user_id)
):
    """Get all confirmed scheduled items"""
    if not start_date:
        start_date = (datetime.now().date() - timedelta(days=7)).isoformat()
    if not end_date:
        end_date = (datetime.now().date() + timedelta(days=30)).isoformat()

    start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
    end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
    
    items = ScheduledItem.get_by_date_range(user_id, start_date, end_date)
    
    # Enrich with item details
    enriched = []
    for item in items:
        if item['item_type'] == 'task':
            task = Task.get_by_id(item['item_id'], user_id)
            if not task:
                continue
            item['title'] = task['title']
            item['description'] = task.get('description', '')
            item['category'] = task.get('category')
            item['priority'] = task.get('priority')
            enriched.append(item)
            continue

        if item['item_type'] == 'habit':
            habit = Habit.get_by_id(item['item_id'], user_id)
            if not habit:
                continue

            habit_title = habit['name']
            habit_description = habit.get('description', '')
            habit_color = habit.get('color', '#39d353')
            frequency = habit.get('frequency', 'daily')
            days_of_week = habit.get('days_of_week') or [0, 1, 2, 3, 4, 5, 6]

            scheduled_date = item['scheduled_date']
            occurrence_start = max(start_date_obj, scheduled_date) if scheduled_date else start_date_obj
            current_day = occurrence_start

            while current_day <= end_date_obj:
                weekday = current_day.weekday()
                include_day = False
                if frequency == 'daily':
                    include_day = True
                elif frequency == 'weekly':
                    include_day = weekday in days_of_week
                elif frequency == 'monthly':
                    include_day = scheduled_date and current_day.day == scheduled_date.day

                if include_day:
                    enriched.append({
                        **dict(item),
                        'scheduled_date': current_day,
                        'title': habit_title,
                        'description': habit_description,
                        'color': habit_color
                    })

                current_day += timedelta(days=1)
    
    return enriched

@app.delete("/api/planning/item/{item_id}")
async def delete_scheduled_item(
    item_id: int,
    user_id: int = Depends(get_current_user_id)
):
    """Delete a scheduled item"""
    ScheduledItem.delete(item_id, user_id)
    return {'message': 'Deleted'}

@app.post("/api/planning/clear-drafts")
async def clear_drafts(user_id: int = Depends(get_current_user_id)):
    """Clear all unconfirmed draft scheduled items"""
    ScheduledItem.delete_drafts(user_id)
    return {'message': 'Drafts cleared'}

# --- Focus Sessions (Task-linked Timer) ---

@app.post("/api/focus-sessions/start")
async def start_focus_session(
    data: FocusSessionStart,
    user_id: int = Depends(get_current_user_id)
):
    """Start a new focus session for a task"""
    # Verify task exists and belongs to user
    task = Task.get_by_id(data.task_id, user_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    session = FocusSession.create(user_id, data.task_id, data.duration_minutes)
    return session

@app.get("/api/focus-sessions/{session_id}")
async def get_focus_session(session_id: int, user_id: int = Depends(get_current_user_id)):
    """Get a focus session by ID"""
    session = FocusSession.get_by_id(session_id, user_id)
    if not session:
        raise HTTPException(status_code=404, detail="Focus session not found")
    return session

@app.post("/api/focus-sessions/{session_id}/complete")
async def complete_focus_session(
    session_id: int,
    data: FocusSessionComplete,
    user_id: int = Depends(get_current_user_id)
):
    """Complete a focus session"""
    session = FocusSession.get_by_id(session_id, user_id)
    if not session:
        raise HTTPException(status_code=404, detail="Focus session not found")
    
    # If user marked task as completed, update the task
    if data.task_completed:
        task = Task.get_by_id(session.get('task_id'), user_id)
        if task:
            Task.update(session.get('task_id'), user_id, is_completed=True, completed_at=datetime.utcnow())
    
    completed_session = FocusSession.complete_session(session_id, user_id, data.task_completed)
    return completed_session

@app.get("/api/focus-sessions")
async def get_user_focus_sessions(
    task_id: Optional[int] = Query(None),
    user_id: int = Depends(get_current_user_id)
):
    """Get all focus sessions for user, optionally filtered by task"""
    sessions = FocusSession.get_all(user_id, task_id)
    return sessions

@app.get("/api/focus-sessions/task/{task_id}")
async def get_task_focus_sessions(task_id: int, user_id: int = Depends(get_current_user_id)):
    """Get all focus sessions for a specific task"""
    # Verify task exists
    task = Task.get_by_id(task_id, user_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    
    sessions = FocusSession.get_task_sessions(user_id, task_id)
    return sessions

@app.get("/api/focus-sessions/today")
async def get_today_sessions(user_id: int = Depends(get_current_user_id)):
    """Get all focus sessions created today"""
    sessions = FocusSession.get_today_sessions(user_id)
    return sessions

# --- User Preferences Endpoints ---

@app.get("/api/preferences")
async def get_preferences(user_id: int = Depends(get_current_user_id)):
    prefs = execute_query("SELECT * FROM user_preferences WHERE user_id = %s", (user_id,))
    if not prefs:
        # Fallback create if somehow missing
        execute_query("INSERT INTO user_preferences (user_id) VALUES (%s) ON CONFLICT (user_id) DO NOTHING", (user_id,))
        prefs = execute_query("SELECT * FROM user_preferences WHERE user_id = %s", (user_id,))
    
    return prefs[0] if prefs else {}

@app.patch("/api/preferences")
async def update_preferences(data: UserPreferences, user_id: int = Depends(get_current_user_id)):
    update_data = data.dict(exclude_unset=True)
    if not update_data:
        return {"message": "No changes provided"}
    
    fields = []
    values = []
    for k, v in update_data.items():
        fields.append(f"{k} = %s")
        values.append(v)
    
    values.append(user_id)
    query = f"UPDATE user_preferences SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE user_id = %s RETURNING *"
    
    updated = execute_query(query, tuple(values))
    if not updated:
        raise HTTPException(status_code=404, detail="Preferences not found")
        
    return updated[0]

# --- Background Scheduler ---
scheduler = BackgroundScheduler()

def run_weekly_summaries():
    print("Running weekly summaries...")
    users = execute_query("SELECT * FROM users JOIN user_preferences ON users.id = user_preferences.user_id WHERE user_preferences.weekly_summary_emails = true")
    if not users:
        return
        
    for user in users:
        try:
            # Need to ensure we fetch metrics using sync DB calls or adapt get_analytics_metrics
            # Because get_analytics_metrics is async. Since this is just a system run, we'll
            # do simple fetching directly or call the sync equivalents if they exist.
            from models.habit import Habit
            from models.goal import Goal
            from models.task import Task
            
            habits = Habit.calculate_all_metrics(user['id'])
            goals = Goal.calculate_all_metrics(user['id'])
            tasks = Task.calculate_metrics(user['id'])
            
            # Form simple mock metrics based on what pdf expects
            avg_goal_progress = goals.get('average_goal_progress', 0)
            avg_habit_consistency = 0
            habits_data = habits.get('habits_data', [])
            if habits_data:
                avg_habit_consistency = sum(h.get('consistency', 0) for h in habits_data) / len(habits_data)
            
            productivity_score = round(
                (0.5 * tasks['task_efficiency']) +
                (0.3 * avg_habit_consistency) +
                (0.2 * avg_goal_progress), 1
            )
            
            metrics = {
                'productivity_score': productivity_score,
                'completed_tasks': tasks.get('completed_tasks', 0),
                'total_habits': habits.get('total_habits', 0)
            }
            
            pdf_bytes = generate_weekly_pdf(user.get('full_name') or user.get('email'), metrics, habits_data, goals.get('goals_data', []))
            
            html_body = f"""
            <html><body>
            <h2>Your Weekly HabitFlow Digest</h2>
            <p>Hi {user.get('full_name') or 'User'},</p>
            <p>Your weekly summary is ready. Please find the attached PDF report.</p>
            <p>Keep up the great work!</p>
            </body></html>
            """
            
            send_email_with_pdf(user['email'], "Your HabitFlow Weekly Summary", html_body, pdf_bytes)
        except Exception as e:
            print(f"Failed to send weekly summary to {user['email']}: {e}")

@app.on_event("startup")
def start_scheduler():
    scheduler.add_job(run_weekly_summaries, 'cron', day_of_week='sun', hour=8)
    scheduler.start()
    
@app.on_event("shutdown")
def stop_scheduler():
    scheduler.shutdown()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
