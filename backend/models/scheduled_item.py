"""Scheduled Item model"""
from db.connection import execute_query
from datetime import datetime, time, date

class ScheduledItem:
    @staticmethod
    def create(user_id, item_type, item_id, scheduled_date, scheduled_time=None, duration_minutes=30):
        """Create a scheduled item"""
        query = """
            INSERT INTO scheduled_items (user_id, item_type, item_id, scheduled_date, scheduled_time, duration_minutes)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING *
        """
        return execute_query(query, (user_id, item_type, item_id, scheduled_date, scheduled_time, duration_minutes), fetch_one=True)

    @staticmethod
    def get_by_date(user_id, scheduled_date):
        """Get all scheduled items for a specific date"""
        query = """
            SELECT * FROM scheduled_items 
            WHERE user_id = %s AND scheduled_date = %s
            ORDER BY scheduled_time ASC NULLS FIRST
        """
        return execute_query(query, (user_id, scheduled_date))

    @staticmethod
    def get_by_date_range(user_id, start_date, end_date):
        """Get all scheduled items in a date range"""
        query = """
            SELECT * FROM scheduled_items 
            WHERE user_id = %s AND scheduled_date BETWEEN %s AND %s
            ORDER BY scheduled_date, scheduled_time ASC NULLS FIRST
        """
        return execute_query(query, (user_id, start_date, end_date))

    @staticmethod
    def get_all_confirmed(user_id):
        """Get all confirmed scheduled items"""
        query = """
            SELECT * FROM scheduled_items 
            WHERE user_id = %s AND is_confirmed = true
            ORDER BY scheduled_date, scheduled_time ASC NULLS FIRST
        """
        return execute_query(query, (user_id,))

    @staticmethod
    def get_unconfirmed(user_id):
        """Get all unconfirmed scheduled items (drafts)"""
        query = """
            SELECT * FROM scheduled_items 
            WHERE user_id = %s AND is_confirmed = false
            ORDER BY scheduled_date, scheduled_time ASC NULLS FIRST
        """
        return execute_query(query, (user_id,))

    @staticmethod
    def confirm(scheduled_id, user_id):
        """Confirm a scheduled item"""
        query = """
            UPDATE scheduled_items SET is_confirmed = true 
            WHERE id = %s AND user_id = %s
            RETURNING *
        """
        return execute_query(query, (scheduled_id, user_id), fetch_one=True)

    @staticmethod
    def update(scheduled_id, user_id, scheduled_time=None, duration_minutes=None, is_confirmed=None):
        """Update an existing scheduled item"""
        fields = []
        params = []

        if scheduled_time is not None:
            fields.append("scheduled_time = %s")
            params.append(scheduled_time)
        if duration_minutes is not None:
            fields.append("duration_minutes = %s")
            params.append(duration_minutes)
        if is_confirmed is not None:
            fields.append("is_confirmed = %s")
            params.append(is_confirmed)

        if not fields:
            return None

        params.extend([scheduled_id, user_id])
        query = f"UPDATE scheduled_items SET {', '.join(fields)} WHERE id = %s AND user_id = %s RETURNING *"
        return execute_query(query, tuple(params), fetch_one=True)

    @staticmethod
    def confirm_all(user_id, scheduled_ids):
        """Confirm multiple scheduled items"""
        query = """
            UPDATE scheduled_items SET is_confirmed = true 
            WHERE id = ANY(%s) AND user_id = %s
            RETURNING *
        """
        return execute_query(query, (scheduled_ids, user_id), fetch_all=True)

    @staticmethod
    def delete(scheduled_id, user_id):
        """Delete a scheduled item"""
        query = "DELETE FROM scheduled_items WHERE id = %s AND user_id = %s"
        return execute_query(query, (scheduled_id, user_id), fetch_all=False)

    @staticmethod
    def delete_drafts(user_id):
        """Delete all unconfirmed (draft) scheduled items"""
        query = "DELETE FROM scheduled_items WHERE user_id = %s AND is_confirmed = false"
        return execute_query(query, (user_id,), fetch_all=False)

    @staticmethod
    def is_item_scheduled(user_id, item_type, item_id, scheduled_date):
        """Check if an item is already scheduled for a specific date"""
        query = """
            SELECT id FROM scheduled_items 
            WHERE user_id = %s AND item_type = %s AND item_id = %s AND scheduled_date = %s
        """
        result = execute_query(query, (user_id, item_type, item_id, scheduled_date), fetch_one=True)
        return result
