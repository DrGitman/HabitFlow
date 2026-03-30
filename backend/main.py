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
    total_tasks = len(Task.get_all(user_id, is_completed=False))
    completed_tasks = len(Task.get_all(user_id, is_completed=True))
    total_goals = len(Goal.get_all(user_id, is_completed=False))
    completed_goals = len(Goal.get_all(user_id, is_completed=True))

    today = datetime.now().date()
    week_start = today - timedelta(days=today.weekday())
    week_end = week_start + timedelta(days=6)

    query = """
        SELECT COUNT(*) as count FROM habit_completions
        WHERE user_id = %s AND completion_date BETWEEN %s AND %s
    """
    week_completions = execute_query(query, (user_id, week_start, week_end), fetch_one=True)

    habits = Habit.get_all(user_id)
    days_passed = (today - week_start).days + 1
    total_possible = len(habits) * days_passed

    completion_rate = 0
    if total_possible > 0:
        completion_rate = round((week_completions['count'] / total_possible) * 100, 1)

    return {
        'total_habits': total_habits,
        'total_tasks': total_tasks,
        'completed_tasks': completed_tasks,
        'total_goals': total_goals,
        'completed_goals': completed_goals,
        'completion_rate': completion_rate,
        'week_completions': week_completions['count']
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
    
    achievements = []
    
    if max_streak >= 30:
        achievements.append({
            "title": "30 Day Streak",
            "desc": "Consistent discipline maintained for 30 consecutive calendar days.",
            "type": "RARE",
            "icon": "Flame",
            "color": "#ff7b72"
        })
    elif max_streak >= 7:
         achievements.append({
            "title": "7 Day Streak",
            "desc": "Maintain focus for a full week without breaking the chain.",
            "type": "COMMON",
            "icon": "Flame",
            "color": "#ff7b72"
        })

    if summary['completed_tasks'] >= 100:
        achievements.append({
            "title": "Completed 100 Tasks",
            "desc": "A significant milestone in productivity and execution.",
            "type": "EPIC",
            "icon": "Zap",
            "color": "#7c79ff"
        })
    elif summary['completed_tasks'] >= 10:
        achievements.append({
            "title": "Productivity Pulse",
            "desc": "You've successfully completed 10 tasks. Keep the momentum!",
            "type": "COMMON",
            "icon": "CheckCircle2",
            "color": "#39d353"
        })

    if summary['completion_rate'] >= 90 and summary['total_habits'] >= 3:
        achievements.append({
            "title": "Early Bird Elite",
            "desc": "High efficiency maintained across multiple habits.",
            "type": "COMMON",
            "icon": "Award",
            "color": "#d29922"
        })

    return achievements

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
