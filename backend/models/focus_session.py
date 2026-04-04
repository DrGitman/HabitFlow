"""Focus Session model for task-linked timer tracking"""
from db.connection import execute_query
from datetime import datetime

class FocusSession:
    @staticmethod
    def create(user_id, task_id, duration_minutes=25):
        """Create a new focus session"""
        query = """
            INSERT INTO focus_sessions (user_id, task_id, duration_minutes, start_time)
            VALUES (%s, %s, %s, CURRENT_TIMESTAMP)
            RETURNING *
        """
        return execute_query(query, (user_id, task_id, duration_minutes), fetch_one=True)

    @staticmethod
    def get_by_id(session_id, user_id):
        """Get focus session by ID"""
        query = "SELECT * FROM focus_sessions WHERE id = %s AND user_id = %s"
        return execute_query(query, (session_id, user_id), fetch_one=True)

    @staticmethod
    def get_all(user_id, task_id=None):
        """Get all focus sessions for user, optionally filtered by task"""
        query = "SELECT * FROM focus_sessions WHERE user_id = %s"
        params = [user_id]
        
        if task_id:
            query += " AND task_id = %s"
            params.append(task_id)
        
        query += " ORDER BY start_time DESC"
        return execute_query(query, tuple(params))

    @staticmethod
    def complete_session(session_id, user_id, task_completed=False):
        """Complete a focus session"""
        query = """
            UPDATE focus_sessions 
            SET end_time = CURRENT_TIMESTAMP, task_completed = %s, updated_at = CURRENT_TIMESTAMP 
            WHERE id = %s AND user_id = %s 
            RETURNING *
        """
        return execute_query(query, (task_completed, session_id, user_id), fetch_one=True)

    @staticmethod
    def get_task_sessions(user_id, task_id):
        """Get all sessions for a specific task"""
        query = """
            SELECT * FROM focus_sessions 
            WHERE user_id = %s AND task_id = %s 
            ORDER BY start_time DESC
        """
        return execute_query(query, (user_id, task_id))

    @staticmethod
    def get_today_sessions(user_id):
        """Get all sessions created today"""
        query = """
            SELECT * FROM focus_sessions 
            WHERE user_id = %s AND DATE(start_time) = CURRENT_DATE
            ORDER BY start_time DESC
        """
        return execute_query(query, (user_id,))
