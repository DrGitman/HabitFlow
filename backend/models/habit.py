"""Habit model"""
from db.connection import execute_query
from datetime import datetime, timedelta

class Habit:
    @staticmethod
    def create(user_id, name, description=None, category=None, frequency='daily', target_count=1, color=None, icon=None):
        """Create a new habit"""
        query = """
            INSERT INTO habits (user_id, name, description, category, frequency, target_count, color, icon)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """
        return execute_query(query, (user_id, name, description, category, frequency, target_count, color, icon), fetch_one=True)

    @staticmethod
    def get_all(user_id, is_active=True):
        """Get all habits for user"""
        query = "SELECT * FROM habits WHERE user_id = %s AND is_active = %s ORDER BY created_at DESC"
        return execute_query(query, (user_id, is_active))

    @staticmethod
    def get_by_id(habit_id, user_id):
        """Get habit by ID"""
        query = "SELECT * FROM habits WHERE id = %s AND user_id = %s"
        return execute_query(query, (habit_id, user_id), fetch_one=True)

    @staticmethod
    def update(habit_id, user_id, **kwargs):
        """Update habit"""
        fields = []
        values = []
        for key, value in kwargs.items():
            if value is not None:
                fields.append(f"{key} = %s")
                values.append(value)

        if not fields:
            return None

        values.extend([habit_id, user_id])
        query = f"UPDATE habits SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE id = %s AND user_id = %s RETURNING *"
        return execute_query(query, tuple(values), fetch_one=True)

    @staticmethod
    def delete(habit_id, user_id):
        """Delete habit (soft delete)"""
        query = "UPDATE habits SET is_active = false WHERE id = %s AND user_id = %s"
        return execute_query(query, (habit_id, user_id), fetch_all=False)

    @staticmethod
    def mark_complete(habit_id, user_id, completion_date=None, count=1, notes=None):
        """Mark habit as complete for a date"""
        if not completion_date:
            completion_date = datetime.now().date()

        query = """
            INSERT INTO habit_completions (habit_id, user_id, completion_date, count, notes)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (habit_id, completion_date)
            DO UPDATE SET count = habit_completions.count + EXCLUDED.count
            RETURNING *
        """
        return execute_query(query, (habit_id, user_id, completion_date, count, notes), fetch_one=True)

    @staticmethod
    def get_completions(habit_id, user_id, start_date=None, end_date=None):
        """Get habit completions"""
        query = "SELECT * FROM habit_completions WHERE habit_id = %s AND user_id = %s"
        params = [habit_id, user_id]

        if start_date:
            query += " AND completion_date >= %s"
            params.append(start_date)

        if end_date:
            query += " AND completion_date <= %s"
            params.append(end_date)

        query += " ORDER BY completion_date DESC"
        return execute_query(query, tuple(params))

    @staticmethod
    def calculate_streak(habit_id, user_id):
        """Calculate current streak for a habit"""
        query = """
            SELECT completion_date FROM habit_completions
            WHERE habit_id = %s AND user_id = %s
            ORDER BY completion_date DESC
        """
        completions = execute_query(query, (habit_id, user_id))

        if not completions:
            return 0

        current_streak = 0
        today = datetime.now().date()
        last_date = None

        for comp in completions:
            comp_date = comp['completion_date']

            if last_date is None:
                # First completion - check if it's today or yesterday
                if comp_date == today or comp_date == today - timedelta(days=1):
                    current_streak = 1
                    last_date = comp_date
                else:
                    break
            else:
                # Check if this completion is consecutive
                if (last_date - comp_date).days == 1:
                    current_streak += 1
                    last_date = comp_date
                else:
                    break

        return current_streak
