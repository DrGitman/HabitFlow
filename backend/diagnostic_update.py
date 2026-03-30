from models.user import User
from db.connection import get_connection

def test_update():
    user_id = 1 # Assuming user 1 exists
    try:
        print(f"Testing update for user {user_id}...")
        current_user = User.find_by_id(user_id)
        if not current_user:
            print("User 1 not found. trying to find any user...")
            conn = get_connection()
            cursor = conn.cursor()
            cursor.execute("SELECT id FROM users LIMIT 1")
            row = cursor.fetchone()
            if row:
                user_id = row[0]
                print(f"Found user {user_id}")
            else:
                print("No users in database.")
                return

        result = User.update(user_id, full_name="Diagnostic Test")
        print(f"Update result: {result}")
        
        refetched = User.find_by_id(user_id)
        if refetched and refetched['full_name'] == "Diagnostic Test":
            print("Update verified in DB!")
            # Revert
            User.update(user_id, full_name=current_user['full_name'])
            print("Reverted change.")
        else:
            print("Update FAILED to persist or verify.")
            
    except Exception as e:
        print(f"Error during diagnostic: {e}")

if __name__ == "__main__":
    test_update()
