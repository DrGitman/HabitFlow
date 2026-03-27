"""
Seed sample data for testing
Run this after initializing the database
"""
from models.user import User
from models.habit import Habit
from models.task import Task
from models.goal import Goal
from datetime import datetime, timedelta
import bcrypt

def seed_demo_data():
    """Create demo user with sample data"""

    # Create demo user
    print("Creating demo user...")
    password_hash = bcrypt.hashpw('demo123'.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    try:
        user = User.create('demo@habitflow.com', password_hash, 'Demo User')
        user_id = user['id']
        print(f"✓ Created demo user (ID: {user_id})")
    except Exception as e:
        print(f"User may already exist, trying to find existing user...")
        user = User.find_by_email('demo@habitflow.com')
        user_id = user['id']
        print(f"✓ Using existing demo user (ID: {user_id})")

    # Create sample habits
    print("\nCreating sample habits...")
    habits_data = [
        {'name': 'Morning Exercise', 'description': '30 minutes of cardio', 'category': 'Health', 'color': '#4edea3'},
        {'name': 'Read Books', 'description': 'Read for 20 minutes', 'category': 'Learning', 'color': '#c2c1ff'},
        {'name': 'Meditation', 'description': '10 minutes of mindfulness', 'category': 'Wellness', 'color': '#ff9671'},
        {'name': 'Drink Water', 'description': '8 glasses of water', 'category': 'Health', 'color': '#6bcf7f', 'target_count': 8},
        {'name': 'Learn Programming', 'description': 'Code for 1 hour', 'category': 'Learning', 'color': '#ffd93d'},
    ]

    created_habits = []
    for habit_data in habits_data:
        habit = Habit.create(user_id, **habit_data)
        created_habits.append(habit)
        print(f"✓ Created habit: {habit['name']}")

    # Create sample habit completions (last 30 days)
    print("\nCreating sample habit completions...")
    today = datetime.now().date()
    for i in range(30):
        date = today - timedelta(days=i)
        for habit in created_habits[:3]:  # Complete first 3 habits
            if i % 2 == 0 or i % 3 == 0:  # Create some gaps for realistic data
                Habit.mark_complete(habit['id'], user_id, date, 1)
    print(f"✓ Created 30 days of completion data")

    # Create sample tasks
    print("\nCreating sample tasks...")
    tasks_data = [
        {'title': 'Complete project proposal', 'category': 'Work', 'priority': 'high', 'due_date': (today + timedelta(days=2)).isoformat()},
        {'title': 'Buy groceries', 'category': 'Personal', 'priority': 'medium', 'due_date': today.isoformat()},
        {'title': 'Schedule dentist appointment', 'category': 'Health', 'priority': 'low', 'due_date': (today + timedelta(days=7)).isoformat()},
        {'title': 'Review pull requests', 'category': 'Work', 'priority': 'high', 'due_date': today.isoformat()},
        {'title': 'Plan weekend trip', 'category': 'Personal', 'priority': 'low', 'due_date': (today + timedelta(days=5)).isoformat()},
    ]

    for task_data in tasks_data:
        task = Task.create(user_id, **task_data)
        print(f"✓ Created task: {task['title']}")

    # Mark some tasks as complete
    all_tasks = Task.get_all(user_id)
    if len(all_tasks) >= 2:
        Task.mark_complete(all_tasks[0]['id'], user_id, True)
        Task.mark_complete(all_tasks[1]['id'], user_id, True)
        print(f"✓ Marked 2 tasks as complete")

    # Create sample goals
    print("\nCreating sample goals...")
    goals_data = [
        {'title': 'Exercise 100 times', 'target_value': 100, 'current_value': 35, 'unit': 'sessions'},
        {'title': 'Read 12 books', 'target_value': 12, 'current_value': 4, 'unit': 'books', 'deadline': (today + timedelta(days=180)).isoformat()},
        {'title': 'Meditate 50 days', 'target_value': 50, 'current_value': 22, 'unit': 'days'},
    ]

    for goal_data in goals_data:
        goal = Goal.create(user_id, **goal_data)
        print(f"✓ Created goal: {goal['title']}")

    print("\n✅ Demo data seeded successfully!")
    print("\nDemo Account Credentials:")
    print("Email: demo@habitflow.com")
    print("Password: demo123")
    print("\nYou can now login with these credentials to see sample data!")

if __name__ == '__main__':
    seed_demo_data()
