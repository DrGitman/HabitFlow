# HabitFlow - Production-Ready Habit Tracker Application

A complete, full-stack habit tracking and productivity application with real-time analytics, task management, and goal tracking.

## 🚀 Features

### Frontend (React + TypeScript + Tailwind CSS)
- **Dashboard** - Real-time analytics with charts (Recharts)
- **Task Management** - Create, edit, complete, and delete tasks
- **Habit Tracking** - Build and track daily habits with streak calculations
- **Analytics** - 30-day trends, performance radar charts, and completion rates
- **Authentication** - JWT-based login and signup
- **Responsive Design** - Dark theme with beautiful gradients

### Backend (Python Flask + PostgreSQL)
- **RESTful API** - Complete API endpoints for all features
- **Database Schema** - PostgreSQL with proper relationships and indexes
- **Authentication** - JWT tokens with bcrypt password hashing
- **Business Logic** - Streak calculations, analytics, and data aggregations
- **User Isolation** - Each user sees only their own data

## 📁 Project Structure

```
.
├── backend/                    # Python Flask Backend
│   ├── api/                   # API route handlers
│   ├── db/                    # Database connection and schema
│   │   ├── connection.py      # PostgreSQL connection (replace POSTGRES_DB_LINK)
│   │   └── schema.sql         # Database schema
│   ├── models/                # Data models
│   │   ├── user.py
│   │   ├── habit.py
│   │   ├── task.py
│   │   └── goal.py
│   ├── app.py                 # Flask application
│   ├── requirements.txt       # Python dependencies
│   └── .env.example          # Environment variables template
│
├── src/                       # React Frontend
│   ├── app/
│   │   ├── components/       # React components
│   │   │   └── Navigation.tsx
│   │   ├── pages/            # Page components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Tasks.tsx
│   │   │   ├── Habits.tsx
│   │   │   ├── Analytics.tsx
│   │   │   └── Login.tsx
│   │   ├── context/          # React context
│   │   │   └── AuthContext.tsx
│   │   ├── services/         # API service layer
│   │   │   └── api.ts
│   │   └── App.tsx           # Main app component
│   └── imports/              # Figma imported components
│
└── package.json              # Node dependencies
```

## 🛠️ Setup Instructions

### 1. Database Setup

#### Create PostgreSQL Database

```bash
# Using psql
createdb habit_tracker

# Or using PostgreSQL client
psql -U postgres
CREATE DATABASE habit_tracker;
```

#### Initialize Database Schema

```bash
cd backend
psql -U postgres -d habit_tracker -f db/schema.sql
```

### 2. Backend Setup

#### Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

#### Configure Environment Variables

```bash
# Copy example env file
cp .env.example .env

# Edit .env and replace placeholders
nano .env
```

**IMPORTANT:** Replace `POSTGRES_DB_LINK` in `.env` with your actual PostgreSQL connection string:

```
DATABASE_URL=postgresql://username:password@localhost:5432/habit_tracker
JWT_SECRET=your-secret-key-here
```

#### Run Backend Server

```bash
python app.py
```

The backend will run on `http://localhost:5000`

### 3. Frontend Setup

#### Install Node Dependencies

```bash
pnpm install
```

#### Configure API URL

Create a `.env` file in the root directory:

```
REACT_APP_API_URL=http://localhost:5000
```

#### Run Frontend Development Server

The Vite dev server should already be running. If not, check your Make preview surface.

### 4. Access Application

1. Open the Make preview surface
2. You'll see the login page
3. Create a new account or login
4. Start tracking your habits!

## 🗄️ Database Schema

### Tables

- **users** - User accounts with authentication
- **habits** - User habits with frequency and targets
- **tasks** - Task management with priorities and due dates
- **goals** - Goal tracking with progress
- **habit_completions** - Daily habit completion records
- **streaks** - Habit streak tracking
- **notifications** - User notifications
- **activity_log** - Activity tracking

See `backend/db/schema.sql` for complete schema.

## 🔌 API Endpoints

### Authentication
- `POST /api/signup` - Create new user
- `POST /api/login` - Login user

### Habits
- `GET /api/habits` - Get all habits
- `POST /api/habits` - Create habit
- `PUT /api/habits/:id` - Update habit
- `DELETE /api/habits/:id` - Delete habit
- `POST /api/habits/:id/complete` - Mark habit complete

### Tasks
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `POST /api/tasks/:id/complete` - Complete task

### Goals
- `GET /api/goals` - Get all goals
- `POST /api/goals` - Create goal
- `PUT /api/goals/:id` - Update goal
- `DELETE /api/goals/:id` - Delete goal
- `POST /api/goals/:id/progress` - Update progress

### Analytics
- `GET /api/analytics/summary` - Get summary stats
- `GET /api/analytics/progress` - Get 30-day progress
- `GET /api/analytics/streaks` - Get habit streaks
- `GET /api/calendar-data` - Get calendar data
- `GET /api/notifications` - Get notifications
- `GET /api/profile` - Get user profile

## 📊 Charts & Analytics

All charts use **real data** from the PostgreSQL database via the Flask API:

- **Dashboard**: Stats, weekly activity, 30-day progress, streaks
- **Analytics**: Performance radar, trends, monthly summaries
- **Real-time Updates**: All data fetches from API on component mount

### Chart Libraries
- **Recharts** - For all data visualizations
- **React Router** - For navigation
- **Lucide React** - For icons

## 🚢 Deployment

### Option 1: Vercel (Recommended)

#### Backend
Since Vercel doesn't support Python Flask directly, you'll need to deploy the backend separately:

**Recommended: Railway, Render, or Heroku**

```bash
# Example for Railway
railway init
railway add
railway up
```

#### Frontend
```bash
# Deploy to Vercel
vercel
```

Update the `REACT_APP_API_URL` environment variable in Vercel to point to your deployed backend.

### Option 2: Docker

```dockerfile
# Dockerfile for backend
FROM python:3.11
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install -r requirements.txt
COPY backend/ .
CMD ["python", "app.py"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: habit_tracker
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"

  backend:
    build: .
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/habit_tracker
    ports:
      - "5000:5000"
    depends_on:
      - postgres
```

### Option 3: Traditional Hosting

1. Set up a Linux server (Ubuntu 20.04+)
2. Install PostgreSQL and Python
3. Clone repository
4. Follow setup instructions
5. Use Nginx as reverse proxy
6. Use PM2 or systemd for process management

## 🔒 Security Notes

- JWT tokens expire after 7 days
- Passwords are hashed with bcrypt
- All API routes (except auth) require authentication
- CORS is configured for cross-origin requests
- SQL injection protection via parameterized queries

## 🎨 Design System

### Colors
- Primary Background: `#1a1f2e`
- Card Background: `#222a3d`
- Text Primary: `#dae2fd`
- Text Secondary: `#c7c4d7`
- Success/Green: `#4edea3`
- Purple: `#c2c1ff`
- Orange: `#ff9671`
- Yellow: `#ffd93d`

### Typography
- Font Family: Inter
- Headings: Bold
- Body: Medium/Regular

## 📝 Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://username:password@host:port/database
JWT_SECRET=your-secret-key-here
FLASK_ENV=development
FLASK_DEBUG=True
```

### Frontend (.env)
```
REACT_APP_API_URL=http://localhost:5000
```

## 🧪 Testing

```bash
# Backend
cd backend
python -c "from db.connection import init_database; init_database()"

# Create test user
curl -X POST http://localhost:5000/api/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
```

## 🐛 Troubleshooting

### Database Connection Error
- Ensure PostgreSQL is running: `pg_isready`
- Check connection string in `.env`
- Verify database exists: `psql -l`

### CORS Error
- Check backend CORS configuration in `app.py`
- Verify frontend API URL is correct

### Authentication Error
- Clear localStorage and re-login
- Check JWT secret is set in backend `.env`

## 📄 License

This project is for demonstration purposes. Feel free to use and modify for your own projects.

## 🤝 Contributing

This is a complete production-ready application. To add features:
1. Add database migrations to `schema.sql`
2. Create/update models in `backend/models/`
3. Add API endpoints in `backend/app.py`
4. Create/update React components in `src/app/`

## 📞 Support

For issues or questions:
- Check the backend logs: `python app.py`
- Check the browser console for frontend errors
- Verify database schema is initialized
- Ensure all environment variables are set correctly

---

Built with ❤️ using React, Python Flask, PostgreSQL, and Recharts
