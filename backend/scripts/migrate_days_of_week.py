import psycopg2
from db.connection import get_connection, execute_query

def migrate():
    print("Running migration to add days_of_week to habits...")
    try:
        # Check if column exists first
        check_query = """
            SELECT count(*) as count 
            FROM information_schema.columns 
            WHERE table_name='habits' AND column_name='days_of_week';
        """
        result = execute_query(check_query, fetch_one=True)
        
        if result['count'] == 0:
            execute_query("ALTER TABLE habits ADD COLUMN days_of_week INTEGER[] DEFAULT '{0,1,2,3,4,5,6}';", fetch_all=False)
            print("Successfully added days_of_week column!")
        else:
            print("Column days_of_week already exists.")
            
    except Exception as e:
        print(f"Error during migration: {e}")

if __name__ == "__main__":
    migrate()
