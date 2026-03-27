"""Task model"""
from db.connection import execute_query
from datetime import datetime

class Task:
    @staticmethod
    def create(user_id, title, description=None, category=None, priority='medium', due_date=None):
        """Create a new task"""
        query = """
            INSERT INTO tasks (user_id, title, description, category, priority, due_date)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING *
        """
        return execute_query(query, (user_id, title, description, category, priority, due_date), fetch_one=True)

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
    def mark_complete(task_id, user_id, is_completed=True):
        """Mark task as complete/incomplete"""
        completed_at = datetime.now() if is_completed else None
        query = "UPDATE tasks SET is_completed = %s, completed_at = %s WHERE id = %s AND user_id = %s RETURNING *"
        return execute_query(query, (is_completed, completed_at, task_id, user_id), fetch_one=True)

    @staticmethod
    def delete(task_id, user_id):
        """Delete task"""
        query = "DELETE FROM tasks WHERE id = %s AND user_id = %s"
        return execute_query(query, (task_id, user_id), fetch_all=False)

    @staticmethod
    def get_by_date_range(user_id, start_date, end_date):
        """Get tasks within date range"""
        query = """
            SELECT * FROM tasks
            WHERE user_id = %s AND due_date BETWEEN %s AND %s
            ORDER BY due_date ASC
        """
        return execute_query(query, (user_id, start_date, end_date))
