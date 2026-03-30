import os
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from db.connection import get_db

DEFAULT_ACHIEVEMENTS = [
    {
        "name": "30 Day Streak",
        "description": "Consistent discipline maintained for 30 consecutive calendar days.",
        "type": "streak",
        "threshold_value": 30,
        "icon": "Flame",
        "color": "#ff7b72",
        "rank_type": "RARE"
    },
    {
        "name": "7 Day Streak",
        "description": "Maintain focus for a full week without breaking the chain.",
        "type": "streak",
        "threshold_value": 7,
        "icon": "Flame",
        "color": "#ff7b72",
        "rank_type": "COMMON"
    },
    {
        "name": "Completed 100 Tasks",
        "description": "A significant milestone in productivity and execution.",
        "type": "task_count",
        "threshold_value": 100,
        "icon": "Zap",
        "color": "#7c79ff",
        "rank_type": "EPIC"
    },
    {
        "name": "Productivity Pulse",
        "description": "You've successfully completed 10 tasks. Keep the momentum!",
        "type": "task_count",
        "threshold_value": 10,
        "icon": "CheckCircle2",
        "color": "#39d353",
        "rank_type": "COMMON"
    },
    {
        "name": "Early Bird Elite",
        "description": "High efficiency maintained across multiple habits.",
        "type": "consistency",
        "threshold_value": 90,
        "icon": "Award",
        "color": "#d29922",
        "rank_type": "COMMON"
    }
]

def seed_achievements():
    print("Running schema updates incrementally...")
    
    with get_db() as conn:
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS achievements (
                id SERIAL PRIMARY KEY,
                name VARCHAR(255) UNIQUE NOT NULL,
                description TEXT,
                type VARCHAR(50) NOT NULL,
                threshold_value INTEGER NOT NULL,
                icon VARCHAR(50),
                color VARCHAR(20),
                rank_type VARCHAR(20)
            );
            """)
        except Exception as e:
            print("Failed creating achievements:", e)

        try:
            cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_achievements (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                achievement_id INTEGER REFERENCES achievements(id) ON DELETE CASCADE,
                unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(user_id, achievement_id)
            );
            """)
        except Exception as e:
            print("Failed creating user_achievements:", e)

        try:
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON user_achievements(user_id);")
        except Exception as e:
            print("Failed index indexing:", e)
        
        print("Seeding achievements data...")
        for ach in DEFAULT_ACHIEVEMENTS:
            try:
                cursor.execute("""
                    INSERT INTO achievements (name, description, type, threshold_value, icon, color, rank_type)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON CONFLICT (name) DO UPDATE 
                    SET description = EXCLUDED.description,
                        type = EXCLUDED.type,
                        threshold_value = EXCLUDED.threshold_value,
                        icon = EXCLUDED.icon,
                        color = EXCLUDED.color,
                        rank_type = EXCLUDED.rank_type
                """, (ach["name"], ach["description"], ach["type"], ach["threshold_value"], ach["icon"], ach["color"], ach["rank_type"]))
            except Exception as e:
                print("Failed inserting", ach["name"], e)
                conn.rollback()  # rollback transaction for this fail, wait actually rollback will reset the context manager
                raise e
            
        print("Achievements seeded successfully!")

if __name__ == "__main__":
    seed_achievements()
