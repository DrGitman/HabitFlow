"""Goal model"""
from db.connection import execute_query
from datetime import datetime

class Goal:
    @staticmethod
    def create(user_id, title, description=None, target_value=100, current_value=0, unit=None, deadline=None):
        """Create a new goal"""
        query = """
            INSERT INTO goals (user_id, title, description, target_value, current_value, unit, deadline)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """
        return execute_query(query, (user_id, title, description, target_value, current_value, unit, deadline), fetch_one=True)

    @staticmethod
    def get_all(user_id, is_completed=None):
        """Get all goals for user"""
        query = "SELECT * FROM goals WHERE user_id = %s"
        params = [user_id]

        if is_completed is not None:
            query += " AND is_completed = %s"
            params.append(is_completed)

        query += " ORDER BY deadline ASC NULLS LAST, created_at DESC"
        return execute_query(query, tuple(params))

    @staticmethod
    def get_by_id(goal_id, user_id):
        """Get goal by ID"""
        query = "SELECT * FROM goals WHERE id = %s AND user_id = %s"
        return execute_query(query, (goal_id, user_id), fetch_one=True)

    @staticmethod
    def update(goal_id, user_id, **kwargs):
        """Update goal"""
        fields = []
        values = []
        for key, value in kwargs.items():
            if value is not None:
                fields.append(f"{key} = %s")
                values.append(value)

        if not fields:
            return None

        values.extend([goal_id, user_id])
        query = f"UPDATE goals SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE id = %s AND user_id = %s RETURNING *"
        return execute_query(query, tuple(values), fetch_one=True)

    @staticmethod
    def update_progress(goal_id, user_id, increment):
        """Update goal progress"""
        query = """
            UPDATE goals
            SET current_value = current_value + %s,
                is_completed = CASE WHEN current_value + %s >= target_value THEN true ELSE false END,
                completed_at = CASE WHEN current_value + %s >= target_value AND completed_at IS NULL THEN CURRENT_TIMESTAMP ELSE completed_at END
            WHERE id = %s AND user_id = %s
            RETURNING *
        """
        return execute_query(query, (increment, increment, increment, goal_id, user_id), fetch_one=True)

    @staticmethod
    def delete(goal_id, user_id):
        """Delete goal"""
        query = "DELETE FROM goals WHERE id = %s AND user_id = %s"
        return execute_query(query, (goal_id, user_id), fetch_all=False)
