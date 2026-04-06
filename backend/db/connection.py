"""
Database connection module using PostgreSQL
Replace POSTGRES_DB_LINK with your actual PostgreSQL connection string
"""
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from contextlib import contextmanager
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parents[1] / '.env')

# Placeholder - replace with your actual PostgreSQL connection string
# Format: postgresql://username:password@host:port/database
DATABASE_URL = os.getenv('DATABASE_URL', 'POSTGRES_DB_LINK')

def get_connection():
    """Get database connection"""
    return psycopg2.connect(
        DATABASE_URL,
        cursor_factory=RealDictCursor
    )

@contextmanager
def get_db():
    """Context manager for database connections"""
    conn = get_connection()
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

def execute_query(query, params=None, fetch_one=False, fetch_all=True):
    """Execute a database query"""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(query, params or ())

        if fetch_one:
            return cursor.fetchone()
        elif fetch_all:
            return cursor.fetchall()
        else:
            return cursor.rowcount

def init_database():
    """Initialize database with schema"""
    with open('db/schema.sql', 'r') as f:
        schema = f.read()

    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute(schema)
        print("Database initialized successfully")
