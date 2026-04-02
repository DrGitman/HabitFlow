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

    @staticmethod
    def calculate_longest_streak(habit_id, user_id):
        """Calculate longest streak ever for a habit"""
        query = """
            SELECT completion_date FROM habit_completions
            WHERE habit_id = %s AND user_id = %s
            ORDER BY completion_date ASC
        """
        completions = execute_query(query, (habit_id, user_id))

        if not completions:
            return 0

        longest_streak = 0
        current_streak = 0
        last_date = None

        for comp in completions:
            comp_date = comp['completion_date']

            if last_date is None:
                current_streak = 1
            else:
                if (comp_date - last_date).days == 1:
                    current_streak += 1
                else:
                    current_streak = 1

            if current_streak > longest_streak:
                longest_streak = current_streak

            last_date = comp_date

        return longest_streak

    @staticmethod
    def calculate_consistency(habit_id, user_id):
        """Calculate consistency: (days_completed / days_since_creation) * 100"""
        habit = Habit.get_by_id(habit_id, user_id)
        if not habit:
            return 0

        created_at = habit.get('created_at')
        if not created_at:
            return 0

        if isinstance(created_at, str):
            created_date = datetime.strptime(created_at.split('T')[0], '%Y-%m-%d').date()
        else:
            created_date = created_at.date()

        today = datetime.now().date()
        total_days = (today - created_date).days + 1

        if total_days <= 0:
            return 0

        query = """
            SELECT COUNT(DISTINCT completion_date) as days_completed
            FROM habit_completions
            WHERE habit_id = %s AND user_id = %s AND completion_date >= %s
        """
        result = execute_query(query, (habit_id, user_id, created_date), fetch_one=True)
        days_completed = result['days_completed'] if result else 0

        return round((days_completed / total_days) * 100, 1)

    @staticmethod
    def calculate_today_completion(user_id):
        """Calculate today's completion rate: completed_habits_today / total_habits"""
        habits = Habit.get_all(user_id)
        total_habits = len(habits)

        if total_habits == 0:
            return 0

        today = datetime.now().date()
        query = """
            SELECT COUNT(DISTINCT habit_id) as completed_today
            FROM habit_completions
            WHERE user_id = %s AND completion_date = %s
        """
        result = execute_query(query, (user_id, today), fetch_one=True)
        completed_today = result['completed_today'] if result else 0

        return round((completed_today / total_habits) * 100, 1)

    @staticmethod
    def calculate_all_metrics(user_id):
        """Calculate all habit metrics"""
        habits = Habit.get_all(user_id)
        total_habits = len(habits)

        metrics = {
            'total_habits': total_habits,
            'today_completion': Habit.calculate_today_completion(user_id),
            'habits_data': []
        }

        for habit in habits:
            habit_metrics = {
                'id': habit['id'],
                'name': habit['name'],
                'color': habit.get('color'),
                'current_streak': Habit.calculate_streak(habit['id'], user_id),
                'longest_streak': Habit.calculate_longest_streak(habit['id'], user_id),
                'consistency': Habit.calculate_consistency(habit['id'], user_id)
            }
            metrics['habits_data'].append(habit_metrics)

        return metrics
