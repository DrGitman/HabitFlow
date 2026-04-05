"""Habit model"""
from db.connection import execute_query
from datetime import datetime, timedelta

class Habit:
    @staticmethod
    def create(user_id, name, description=None, category=None, frequency='daily', target_count=1, color=None, icon=None, days_of_week=None):
        """Create a new habit"""
        if days_of_week is None:
            days_of_week = [0, 1, 2, 3, 4, 5, 6]
        query = """
            INSERT INTO habits (user_id, name, description, category, frequency, target_count, color, icon, days_of_week)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """
        return execute_query(query, (user_id, name, description, category, frequency, target_count, color, icon, days_of_week), fetch_one=True)

    @staticmethod
    def get_all(user_id, is_active=True, include_completion_today=True, today_date=None):
        """Get all habits for user"""
        if include_completion_today:
            if not today_date:
                today_date = datetime.now().date()
            try:
                query = """
                    SELECT h.*, 
                    EXISTS (
                        SELECT 1 FROM habit_completions hc 
                        WHERE hc.habit_id = h.id AND hc.completion_date = %s
                    ) as is_completed_today,
                    COALESCE((
                        SELECT array_agg(goal_id) FROM goal_habits 
                        WHERE habit_id = h.id
                    ), ARRAY[]::INTEGER[]) as goal_ids
                    FROM habits h 
                    WHERE h.user_id = %s AND h.is_active = %s 
                    ORDER BY h.created_at DESC
                """
                return execute_query(query, (today_date, user_id, is_active))
            except Exception as e:
                # Fallback if goal_habits table is not accessible
                if "permission denied" in str(e).lower() or "does not exist" in str(e).lower():
                    query = """
                        SELECT h.*, 
                        EXISTS (
                            SELECT 1 FROM habit_completions hc 
                            WHERE hc.habit_id = h.id AND hc.completion_date = %s
                        ) as is_completed_today,
                        ARRAY[]::INTEGER[] as goal_ids
                        FROM habits h 
                        WHERE h.user_id = %s AND h.is_active = %s 
                        ORDER BY h.created_at DESC
                    """
                    return execute_query(query, (today_date, user_id, is_active))
                raise e
        
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
    def unmark_complete(habit_id, user_id, completion_date=None):
        """Remove habit completion for a date"""
        if not completion_date:
            completion_date = datetime.now().date()

        query = "DELETE FROM habit_completions WHERE habit_id = %s AND user_id = %s AND completion_date = %s"
        return execute_query(query, (habit_id, user_id, completion_date), fetch_all=False)

    @staticmethod
    def sync_goal_links(habit_id, goal_ids):
        """Atomically sync habit to multiple goals"""
        # Delete old links
        execute_query("DELETE FROM goal_habits WHERE habit_id = %s", (habit_id,), fetch_all=False)
        
        # Insert new links
        if goal_ids:
            for goal_id in goal_ids:
                execute_query("INSERT INTO goal_habits (goal_id, habit_id) VALUES (%s, %s)", (goal_id, habit_id), fetch_all=False)
        return True

    @staticmethod
    def get_goal_links(habit_id):
        """Get all goal IDs linked to this habit"""
        query = "SELECT goal_id FROM goal_habits WHERE habit_id = %s"
        results = execute_query(query, (habit_id,))
        return [r['goal_id'] for r in results] if results else []

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
    def calculate_streak(habit_id, user_id, today=None):
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
        if not today:
            today = datetime.now().date()
        elif isinstance(today, str):
            today = datetime.strptime(today, '%Y-%m-%d').date()
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
    def calculate_consistency(habit_id, user_id, today_date=None):
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

        if not today_date:
            today_date = datetime.now().date()
        elif isinstance(today_date, str):
            today_date = datetime.strptime(today_date, '%Y-%m-%d').date()

        total_days = (today_date - created_date).days + 1

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
    def calculate_today_completion(user_id, today_date=None):
        """Calculate today's completion rate: completed_habits_today / total_habits"""
        habits = Habit.get_all(user_id, today_date=today_date)
        total_habits = len(habits)

        if total_habits == 0:
            return 0

        if not today_date:
            today_date = datetime.now().date()
        elif isinstance(today_date, str):
            today_date = datetime.strptime(today_date, '%Y-%m-%d').date()

        query = """
            SELECT COUNT(DISTINCT habit_id) as completed_today
            FROM habit_completions
            WHERE user_id = %s AND completion_date = %s
        """
        result = execute_query(query, (user_id, today_date), fetch_one=True)
        completed_today = result['completed_today'] if result else 0

        return round((completed_today / total_habits) * 100, 1)

    @staticmethod
    def calculate_all_metrics(user_id, today_date=None):
        """Calculate all habit metrics"""
        habits = Habit.get_all(user_id, today_date=today_date)
        total_habits = len(habits)

        metrics = {
            'total_habits': total_habits,
            'today_completion': Habit.calculate_today_completion(user_id, today_date=today_date),
            'habits_data': []
        }

        for habit in habits:
            habit_metrics = {
                'id': habit['id'],
                'name': habit['name'],
                'color': habit.get('color'),
                'current_streak': Habit.calculate_streak(habit['id'], user_id, today=today_date),
                'longest_streak': Habit.calculate_longest_streak(habit['id'], user_id),
                'consistency': Habit.calculate_consistency(habit['id'], user_id, today_date=today_date)
            }
            metrics['habits_data'].append(habit_metrics)

        return metrics
