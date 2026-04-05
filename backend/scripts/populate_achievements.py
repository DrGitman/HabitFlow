from db.connection import execute_query

def populate_achievements():
    achievements = [
        ('Streak Starter', 'Complete a habit for 3 consecutive days', 'streak', 3, 'zap', '#7c79ff', 'COMMON'),
        ('Streak Master', 'Complete a habit for 7 consecutive days', 'streak', 7, 'flame', '#ff7b72', 'RARE'),
        ('Legendary Consistency', 'Complete a habit for 30 consecutive days', 'streak', 30, 'award', '#f1e05a', 'EPIC'),
        ('Task Finisher', 'Complete 10 tasks in total', 'task_count', 10, 'check-circle', '#39d353', 'COMMON'),
        ('Productivity Pro', 'Complete 50 tasks in total', 'task_count', 50, 'activity', '#2188ff', 'RARE'),
        ('Execution Legend', 'Complete 250 tasks', 'task_count', 250, 'zap', '#bc8cff', 'EPIC'),
        ('Goal Getter', 'Complete your first goal', 'goal_count', 1, 'target', '#f85149', 'COMMON'),
        ('Goal Destroyer', 'Complete 5 goals', 'goal_count', 5, 'award', '#f1e05a', 'RARE'),
        ('Architect of Life', 'Complete 20 goals', 'goal_count', 20, 'shield', '#bc8cff', 'EPIC')
    ]
    
    # First, make sure the table exists (it should from schema.sql)
    for name, desc, type, threshold, icon, color, rank in achievements:
        query = """
            INSERT INTO achievements (name, description, type, threshold_value, icon, color, rank_type)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (name) DO UPDATE 
            SET description = EXCLUDED.description,
                type = EXCLUDED.type,
                threshold_value = EXCLUDED.threshold_value,
                icon = EXCLUDED.icon,
                color = EXCLUDED.color,
                rank_type = EXCLUDED.rank_type
        """
        execute_query(query, (name, desc, type, threshold, icon, color, rank), fetch_all=False)
    
    print("Achievements populated successfully!")

if __name__ == "__main__":
    populate_achievements()
