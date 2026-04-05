
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL', 'postgresql://postgres:postgres@localhost:5432/habitflow')

def fix_permissions():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = True
        cursor = conn.cursor()
        
        # Get current user
        cursor.execute("SELECT current_user;")
        user = cursor.fetchone()[0]
        print(f"Current DB User: {user}")
        
        # Try to grant permissions to the current user for all tables in public schema
        # This works if the current user has enough privileges or is the owner
        tables = ['users', 'habits', 'tasks', 'goals', 'scheduled_items', 'habit_completions', 
                  'streaks', 'notifications', 'activity_log', 'achievements', 
                  'user_achievements', 'focus_sessions', 'goal_habits']
        
        for table in tables:
            try:
                cursor.execute(f"GRANT ALL PRIVILEGES ON TABLE {table} TO {user};")
                print(f"Granted privileges on {table} to {user}")
            except Exception as e:
                print(f"Could not grant privileges on {table}: {e}")
                
        # Also grant on sequences for SERIAL columns
        try:
            cursor.execute(f"GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO {user};")
            print(f"Granted privileges on all sequences to {user}")
        except Exception as e:
            print(f"Could not grant privileges on sequences: {e}")

        conn.close()
        print("Permission fix attempt completed.")
        
    except Exception as e:
        print(f"Error connecting to database: {e}")

if __name__ == "__main__":
    fix_permissions()
