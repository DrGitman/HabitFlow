"""User model"""
from db.connection import execute_query
from datetime import datetime

class User:
    @staticmethod
    def create(email, password_hash, full_name=None):
        """Create a new user"""
        query = """
            INSERT INTO users (email, password_hash, full_name)
            VALUES (%s, %s, %s)
            RETURNING id, email, full_name, created_at
        """
        return execute_query(query, (email, password_hash, full_name), fetch_one=True)

    @staticmethod
    def find_by_email(email):
        """Find user by email"""
        query = "SELECT * FROM users WHERE email = %s"
        return execute_query(query, (email,), fetch_one=True)

    @staticmethod
    def find_by_id(user_id):
        """Find user by ID"""
        query = "SELECT id, email, full_name, avatar_url, created_at FROM users WHERE id = %s"
        return execute_query(query, (user_id,), fetch_one=True)

    @staticmethod
    def update(user_id, **kwargs):
        """Update user"""
        fields = []
        values = []
        for key, value in kwargs.items():
            if value is not None:
                fields.append(f"{key} = %s")
                values.append(value)

        if not fields:
            return None

        values.append(user_id)
        query = f"UPDATE users SET {', '.join(fields)}, updated_at = CURRENT_TIMESTAMP WHERE id = %s RETURNING *"
        return execute_query(query, tuple(values), fetch_one=True)
