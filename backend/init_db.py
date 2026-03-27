import os
from dotenv import load_dotenv
import psycopg2
from db.connection import get_connection

load_dotenv()

def init_database():
    """Initialize the database with schema.sql"""
    print("Initializing database...")
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Read schema.sql
        schema_path = os.path.join(os.path.dirname(__file__), 'db', 'schema.sql')
        with open(schema_path, 'r') as f:
            schema = f.read()
            
        # Execute schema
        cursor.execute(schema)
        conn.commit()
        
        cursor.close()
        conn.close()
        print("Database initialized successfully!")
    except Exception as e:
        print(f"Error initializing database: {e}")

if __name__ == "__main__":
    init_database()
