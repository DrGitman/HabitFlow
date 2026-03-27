# Quick Start Guide

Get HabitFlow running in 5 minutes!

## Prerequisites

- PostgreSQL 14+ installed and running
- Python 3.9+ installed
- Node.js 18+ and pnpm installed

## Step 1: Database (2 minutes)

```bash
# Create database
createdb habit_tracker

# Initialize schema
cd backend
psql -U postgres -d habit_tracker -f db/schema.sql
```

## Step 2: Backend (1 minute)

```bash
# Install dependencies
cd backend
pip install -r requirements.txt

# Configure environment
cp .env.example .env

# IMPORTANT: Edit .env and replace POSTGRES_DB_LINK with your actual PostgreSQL connection string
# Example: DATABASE_URL=postgresql://postgres:password@localhost:5432/habit_tracker

# Run server
python app.py
```

Backend should now be running on http://localhost:5000

## Step 3: Frontend (1 minute)

```bash
# From root directory
pnpm install

# The Vite dev server should auto-start
# If not, check your Make preview surface
```

## Step 4: Test It! (1 minute)

1. Open your Make preview surface
2. You should see the login page
3. Click "Sign Up"
4. Create an account (e.g., test@example.com / password123)
5. Start using the app!

## What to Try First

1. **Create a Habit**: Click "Habits" → "Add Habit" → Create "Morning Exercise"
2. **Add a Task**: Click "Tasks" → "Add Task" → Create "Buy groceries"
3. **View Dashboard**: Click "Dashboard" to see your stats and charts
4. **Complete a Habit**: Go to Habits → Click "Complete" on your habit
5. **Check Analytics**: View your progress charts in "Analytics"

## Troubleshooting

### Backend won't start
- Check if PostgreSQL is running: `pg_isready`
- Verify your DATABASE_URL in backend/.env

### Can't login
- Check browser console for errors
- Verify backend is running on port 5000
- Check backend terminal for error messages

### No data in charts
- Complete some habits and tasks first
- The charts show real data from your database
- Mark habits complete for multiple days to see trends

## Next Steps

- Read the full README.md for deployment instructions
- Customize the color scheme in your components
- Add more features using the existing patterns

Enjoy tracking your habits! 🚀
