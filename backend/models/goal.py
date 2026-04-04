"""Goal model"""
from db.connection import execute_query
from datetime import datetime, timedelta

class Goal:
    @staticmethod
    def create(user_id, title, description=None, priority='medium', deadline=None):
        """Create a new goal"""
        query = """
            INSERT INTO goals (user_id, title, description, priority, deadline)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING *
        """
        return execute_query(query, (user_id, title, description, priority, deadline), fetch_one=True)

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

    @staticmethod
    def calculate_goal_progress(user_id, goal_id):
        """Calculate goal progress from linked tasks: (completed_tasks / total_linked_tasks) * 100"""
        query = """
            SELECT 
                COUNT(*) as total_tasks,
                SUM(CASE WHEN is_completed = true THEN 1 ELSE 0 END) as completed_tasks
            FROM tasks
            WHERE user_id = %s AND goal_id = %s
        """
        result = execute_query(query, (user_id, goal_id), fetch_one=True)
        
        total = result['total_tasks'] if result else 0
        completed = result['completed_tasks'] if result else 0
        
        if total == 0:
            return 0
        
        return round((completed / total) * 100, 1)

    @staticmethod
    def calculate_days_remaining(goal_id, user_id):
        """Calculate days remaining until deadline"""
        goal = Goal.get_by_id(goal_id, user_id)
        if not goal or not goal.get('deadline'):
            return None
        
        deadline = goal['deadline']
        if isinstance(deadline, str):
            deadline = datetime.strptime(deadline.split('T')[0], '%Y-%m-%d').date()
        
        today = datetime.now().date()
        days_remaining = (deadline - today).days
        
        return days_remaining

    @staticmethod
    def calculate_time_progress(user_id, goal_id):
        """Calculate time progress: (days_passed / total_days) * 100"""
        goal = Goal.get_by_id(goal_id, user_id)
        if not goal or not goal.get('deadline'):
            return None
        
        created_at = goal.get('created_at')
        if not created_at:
            return 0
        
        if isinstance(created_at, str):
            start_date = datetime.strptime(created_at.split('T')[0], '%Y-%m-%d').date()
        else:
            start_date = created_at.date()
        
        deadline = goal['deadline']
        if isinstance(deadline, str):
            deadline = datetime.strptime(deadline.split('T')[0], '%Y-%m-%d').date()
        
        today = datetime.now().date()
        total_days = (deadline - start_date).days
        days_passed = (today - start_date).days
        
        if total_days <= 0:
            return 100
        
        return round((days_passed / total_days) * 100, 1)

    @staticmethod
    def calculate_all_metrics(user_id):
        """Calculate all goal metrics"""
        goals = Goal.get_all(user_id)
        total_goals = len(goals)
        completed_goals = len([g for g in goals if g.get('is_completed', False)])
        
        goals_data = []
        total_progress = 0
        
        for goal in goals:
            goal_progress = Goal.calculate_goal_progress(user_id, goal['id'])
            days_remaining = Goal.calculate_days_remaining(goal['id'], user_id)
            time_progress = Goal.calculate_time_progress(user_id, goal['id'])
            
            total_progress += goal_progress
            
            goals_data.append({
                'id': goal['id'],
                'title': goal['title'],
                'goal_progress': goal_progress,
                'days_remaining': days_remaining,
                'time_progress': time_progress,
                'is_completed': goal.get('is_completed', False)
            })
        
        avg_goal_progress = round(total_progress / total_goals, 1) if total_goals > 0 else 0
        
        return {
            'total_goals': total_goals,
            'completed_goals': completed_goals,
            'average_goal_progress': avg_goal_progress,
            'goals_data': goals_data
        }
    # --- Goal-Habit Linking ---
    @staticmethod
    def link_habit_to_goal(goal_id, habit_id):
        """Link a habit to a goal (many-to-many)"""
        query = """
            INSERT INTO goal_habits (goal_id, habit_id)
            VALUES (%s, %s)
            ON CONFLICT (goal_id, habit_id) DO NOTHING
            RETURNING *
        """
        return execute_query(query, (goal_id, habit_id), fetch_one=True)

    @staticmethod
    def unlink_habit_from_goal(goal_id, habit_id):
        """Unlink a habit from a goal"""
        query = "DELETE FROM goal_habits WHERE goal_id = %s AND habit_id = %s"
        return execute_query(query, (goal_id, habit_id), fetch_all=False)

    @staticmethod
    def get_goal_habits(goal_id):
        """Get all habits linked to a goal"""
        query = "SELECT habit_id FROM goal_habits WHERE goal_id = %s"
        result = execute_query(query, (goal_id,))
        return [r['habit_id'] for r in result] if result else []

    @staticmethod
    def update_goal_habits(goal_id, habit_ids):
        """Update all habits for a goal (replace existing)"""
        # Delete existing links
        query1 = "DELETE FROM goal_habits WHERE goal_id = %s"
        execute_query(query1, (goal_id,), fetch_all=False)
        
        # Add new links
        if habit_ids:
            query2 = "INSERT INTO goal_habits (goal_id, habit_id) VALUES "
            values = []
            params = []
            for habit_id in habit_ids:
                values.append("(%s, %s)")
                params.append(goal_id)
                params.append(habit_id)
            query2 += ", ".join(values)
            execute_query(query2, tuple(params), fetch_all=False)
        
        return True