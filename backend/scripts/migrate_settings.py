import os
import psycopg2
from dotenv import load_dotenv
from db.connection import get_connection

load_dotenv()

def migrate_settings():
    """Migrate settings for existing users"""
    print("Migrating user preferences for existing users...")
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # 1. Create the table if it doesn't exist (redundant but safe)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_preferences (
                user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
                dark_mode BOOLEAN DEFAULT true,
                desktop_notifications BOOLEAN DEFAULT true,
                weekly_summary_emails BOOLEAN DEFAULT true,
                notification_reminders BOOLEAN DEFAULT true,
                notification_achievements BOOLEAN DEFAULT true,
                privacy_show_rank BOOLEAN DEFAULT true,
                privacy_share_stats BOOLEAN DEFAULT false,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)
        
        # 2. Insert default preferences for users who don't have them
        cursor.execute("""
            INSERT INTO user_preferences (user_id)
            SELECT id FROM users
            WHERE NOT EXISTS (
                SELECT 1 FROM user_preferences WHERE user_id = users.id
            )
            ON CONFLICT (user_id) DO NOTHING;
        """)
        
        conn.commit()
        cursor.close()
        conn.close()
        print("Migration complete!")
    except Exception as e:
        print(f"Migration error: {e}")

if __name__ == "__main__":
    migrate_settings()
