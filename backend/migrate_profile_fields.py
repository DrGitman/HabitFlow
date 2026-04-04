import os
from dotenv import load_dotenv
import psycopg2
from db.connection import get_connection

load_dotenv()

def migrate():
    print("Running migration to add profile fields...")
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Add columns if they don't exist
        queries = [
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS rank VARCHAR(50) DEFAULT 'Beginner';",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS status VARCHAR(100) DEFAULT 'Active';"
        ]
        
        for query in queries:
            cursor.execute(query)
            
        conn.commit()
        cursor.close()
        conn.close()
        print("Migration completed successfully!")
    except Exception as e:
        print(f"Migration error: {e}")

if __name__ == "__main__":
    migrate()
