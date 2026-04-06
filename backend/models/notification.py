from db.connection import execute_query
from datetime import datetime

class Notification:
    @staticmethod
    def create(user_id, type, title, message=None, related_entity_type=None, related_entity_id=None, scheduled_for=None):
        """Create a new notification"""
        query = """
            INSERT INTO notifications (user_id, type, title, message, related_entity_type, related_entity_id, scheduled_for)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING *
        """
        return execute_query(query, (user_id, type, title, message, related_entity_type, related_entity_id, scheduled_for), fetch_one=True)

    @staticmethod
    def get_all_for_user(user_id, limit=50):
        """Get all notifications for a user"""
        query = """
            SELECT * FROM notifications
            WHERE user_id = %s AND (scheduled_for IS NULL OR scheduled_for <= NOW())
            ORDER BY COALESCE(scheduled_for, created_at) DESC
            LIMIT %s
        """
        return execute_query(query, (user_id, limit))

    @staticmethod
    def get_unread(user_id):
        """Get only unread notifications"""
        query = """
            SELECT * FROM notifications
            WHERE user_id = %s AND is_read = false AND (scheduled_for IS NULL OR scheduled_for <= NOW())
            ORDER BY COALESCE(scheduled_for, created_at) DESC
        """
        return execute_query(query, (user_id,))

    @staticmethod
    def mark_as_read(notification_id, user_id):
        """Mark a notification as read"""
        query = "UPDATE notifications SET is_read = true WHERE id = %s AND user_id = %s RETURNING *"
        return execute_query(query, (notification_id, user_id), fetch_one=True)

    @staticmethod
    def delete(notification_id, user_id):
        """Delete a notification"""
        query = "DELETE FROM notifications WHERE id = %s AND user_id = %s"
        return execute_query(query, (notification_id, user_id), fetch_all=False)
