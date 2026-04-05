"""Task model"""
from db.connection import execute_query
from datetime import datetime

class Task:
    @staticmethod
    def create(user_id, title, description=None, category=None, priority='medium', due_date=None, goal_id=None):
        """Create a new task"""
        query = """
            INSERT INTO tasks (user_id, title, description, category, priority, due_date, goal_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """
        return execute_query(query, (user_id, title, description, category, priority, due_date, goal_id), fetch_one=True)

    @staticmethod
    def get_all(user_id, is_completed=None):
        """Get all tasks for user"""
        query = "SELECT * FROM tasks WHERE user_id = %s"
        params = [user_id]

        if is_completed is not None:
            query += " AND is_completed = %s"
            params.append(is_completed)

        query += " ORDER BY due_date ASC NULLS LAST, created_at DESC"
        return execute_query(query, tuple(params))

    @staticmethod
    def get_by_id(task_id, user_id):
        """Get task by ID"""
        query = "SELECT * FROM tasks WHERE id = %s AND user_id = %s"
        return execute_query(query, (task_id, user_id), fetch_one=True)

    @staticmethod
    def update(task_id, user_id, **kwargs):
        """Update task"""
        fields = []
        values = []
        for key, value in kwargs.items():
            if value is not None:
                fields.append(f"{key} = %s")
                values.append(value)

        if not fields:
            return None

        values.extend([task_id, user_id])
        query = f"UPDATE tasks SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE id = %s AND user_id = %s RETURNING *"
        return execute_query(query, tuple(values), fetch_one=True)


    @staticmethod
    def delete(task_id, user_id):
        """Delete task"""
        query = "DELETE FROM tasks WHERE id = %s AND user_id = %s"
        return execute_query(query, (task_id, user_id), fetch_all=False)

    @staticmethod
    def mark_complete(task_id, user_id, is_completed=True, completed_at=None):
        """Mark task as complete"""
        if not completed_at:
            completed_at = datetime.now()
            
        return Task.update(task_id, user_id, is_completed=is_completed, completed_at=completed_at)

    @staticmethod
    def get_by_date_range(user_id, start_date, end_date):
        """Get tasks within date range"""
        query = """
            SELECT * FROM tasks
            WHERE user_id = %s AND due_date BETWEEN %s AND %s
            ORDER BY due_date ASC
        """
        return execute_query(query, (user_id, start_date, end_date))

    @staticmethod
    def get_tasks_by_goal(user_id, goal_id):
        """Get all tasks linked to a specific goal"""
        query = "SELECT * FROM tasks WHERE user_id = %s AND goal_id = %s"
        return execute_query(query, (user_id, goal_id))

    @staticmethod
    def calculate_metrics(user_id):
        """Calculate task metrics"""
        all_tasks = Task.get_all(user_id)
        total_tasks = len(all_tasks)
        completed_tasks = len([t for t in all_tasks if t.get('is_completed', False)])
        remaining_tasks = total_tasks - completed_tasks
        task_efficiency = round((completed_tasks / total_tasks) * 100, 1) if total_tasks > 0 else 0

        return {
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'remaining_tasks': remaining_tasks,
            'task_efficiency': task_efficiency
        }
