import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
DATABASE_URL = os.getenv('DATABASE_URL')

def check_ownership():
    print(f"Connecting to: {DATABASE_URL.split('@')[-1] if DATABASE_URL else 'NONE'}")
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        
        # Check tables in the current database
        cursor.execute("""
            SELECT tablename, tableowner 
            FROM pg_tables 
            WHERE schemaname = 'public';
        """)
        
        tables = cursor.fetchall()
        if not tables:
            print("No tables found in public schema.")
        else:
            print("Tables and Owners:")
            for table in tables:
                print(f"Table: {table[0]}, Owner: {table[1]}")
            
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"DETAILED ERROR: {type(e).__name__}: {e}")

if __name__ == "__main__":
    check_ownership()
