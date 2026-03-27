# Habit Tracker Backend - Python Flask API

## Setup Instructions

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Configure Database

1. Create a PostgreSQL database
2. Copy `.env.example` to `.env`
3. Replace `POSTGRES_DB_LINK` in `.env` with your actual PostgreSQL connection string:
   ```
   DATABASE_URL=postgresql://username:password@host:port/database_name
   ```

### 3. Initialize Database

```bash
python -c "from db.connection import init_database; init_database()"
```

### 4. Run the Server

```bash
python app.py
```

The server will run on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/signup` - Create new user account
- `POST /api/login` - Login user

### Habits
- `GET /api/habits` - Get all habits
- `POST /api/habits` - Create new habit
- `PUT /api/habits/:id` - Update habit
- `DELETE /api/habits/:id` - Delete habit
- `POST /api/habits/:id/complete` - Mark habit complete

### Tasks
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create new task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/complete` - Mark task complete

### Goals
- `GET /api/goals` - Get all goals
- `POST /api/goals` - Create new goal
- `PUT /api/goals/:id` - Update goal
- `DELETE /api/goals/:id` - Delete goal
- `POST /api/goals/:id/progress` - Update goal progress

### Analytics
- `GET /api/analytics/summary` - Get summary statistics
- `GET /api/analytics/progress` - Get 30-day progress data
- `GET /api/analytics/streaks` - Get habit streaks
- `GET /api/calendar-data` - Get calendar data (tasks + completions)
- `GET /api/notifications` - Get notifications
- `GET /api/profile` - Get user profile

## Database Schema

See `db/schema.sql` for complete database schema including:
- users
- habits
- tasks
- goals
- habit_completions
- streaks
- notifications
- activity_log

## Environment Variables

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT token generation
- `FLASK_ENV` - Flask environment (development/production)
- `FLASK_DEBUG` - Debug mode (True/False)
