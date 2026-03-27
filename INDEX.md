# HabitFlow - Navigation Index

Quick access to all documentation and code.

## 📄 Documentation (Start Here)

1. **[QUICKSTART.md](QUICKSTART.md)** - Get running in 5 minutes ⭐ START HERE
2. **[README.md](README.md)** - Complete documentation
3. **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - Project overview
4. **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deployment guides

## 🗂️ Code Organization

### Backend (Python Flask)
- `backend/app.py` - Main Flask application with all API endpoints
- `backend/db/schema.sql` - PostgreSQL database schema
- `backend/db/connection.py` - Database connection (**Replace POSTGRES_DB_LINK here**)
- `backend/models/` - Database models (user, habit, task, goal)
- `backend/seed_data.py` - Demo data generator
- `backend/requirements.txt` - Python dependencies
- `backend/.env.example` - Environment variables template

### Frontend (React + TypeScript)
- `src/app/App.tsx` - Main app with routing
- `src/app/pages/Dashboard.tsx` - Dashboard with charts
- `src/app/pages/Tasks.tsx` - Task management
- `src/app/pages/Habits.tsx` - Habit tracking
- `src/app/pages/Analytics.tsx` - Advanced analytics
- `src/app/pages/Login.tsx` - Authentication
- `src/app/components/Navigation.tsx` - Sidebar navigation
- `src/app/context/AuthContext.tsx` - Auth state management
- `src/app/services/api.ts` - API client

### Configuration
- `.env.example` - Frontend environment variables
- `package.json` - Node dependencies
- `vite.config.ts` - Vite configuration

## 🚀 Quick Commands

### Setup
```bash
# Backend
cd backend
pip install -r requirements.txt
cp .env.example .env
# Edit .env - replace POSTGRES_DB_LINK
python app.py

# Database
createdb habit_tracker
psql -U postgres -d habit_tracker -f backend/db/schema.sql
python backend/seed_data.py

# Frontend
pnpm install
# Preview should auto-start in Make
```

### Development
```bash
# Backend (Terminal 1)
cd backend && python app.py

# Frontend already running in Make preview
```

### Testing
```bash
# Test API
curl -X POST http://localhost:5000/api/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'

# Login to demo account
# Email: demo@habitflow.com
# Password: demo123
```

## 📊 Key Features

✅ Task Management
✅ Habit Tracking with Streaks
✅ Goal Setting
✅ Real-time Analytics (8 chart types)
✅ JWT Authentication
✅ PostgreSQL Database
✅ RESTful API (28 endpoints)
✅ Responsive Dark Theme UI

## 🎯 Setup Checklist

- [ ] PostgreSQL installed and running
- [ ] Database created: `createdb habit_tracker`
- [ ] Database schema initialized: `psql -U postgres -d habit_tracker -f backend/db/schema.sql`
- [ ] Backend `.env` configured (replace POSTGRES_DB_LINK)
- [ ] Backend dependencies installed: `pip install -r requirements.txt`
- [ ] Backend running: `python app.py` → http://localhost:5000
- [ ] Frontend dependencies installed: `pnpm install`
- [ ] Frontend preview running in Make
- [ ] Demo data seeded (optional): `python seed_data.py`
- [ ] Can login and see charts

## 🔍 Finding Things

### Where to find...

**Database connection string:**
- `backend/db/connection.py` line 10 (POSTGRES_DB_LINK)

**API endpoints:**
- `backend/app.py` (all routes from line 44 onwards)

**Chart components:**
- `src/app/pages/Dashboard.tsx` (lines 90-200)
- `src/app/pages/Analytics.tsx` (lines 70-300)

**Authentication logic:**
- `backend/app.py` (lines 44-110 - signup/login)
- `src/app/context/AuthContext.tsx` (React auth context)

**Color scheme:**
- Search for `#1a1f2e`, `#222a3d`, `#dae2fd`, `#4edea3`, `#c2c1ff`

**Database schema:**
- `backend/db/schema.sql`

## 🆘 Troubleshooting

**Backend won't start:**
→ Check DATABASE_URL in `backend/.env`
→ Verify PostgreSQL is running: `pg_isready`

**Database error:**
→ Initialize schema: `psql -U postgres -d habit_tracker -f backend/db/schema.sql`

**Frontend shows no data:**
→ Check backend is running on port 5000
→ Check browser console for API errors
→ Verify REACT_APP_API_URL in `.env`

**Charts not showing:**
→ Seed demo data: `python backend/seed_data.py`
→ Create habits and tasks manually

**Login fails:**
→ Check backend logs for errors
→ Verify user exists in database: `psql -U postgres -d habit_tracker -c "SELECT * FROM users;"`

## 📚 Learning Path

1. **Understand the flow:** Read PROJECT_SUMMARY.md
2. **Setup locally:** Follow QUICKSTART.md
3. **Explore code:** Start with `backend/app.py` and `src/app/App.tsx`
4. **Make changes:** Try changing colors or adding a feature
5. **Deploy:** Follow DEPLOYMENT.md to go live

## 🎓 Code Examples

### Add a new API endpoint
```python
# backend/app.py
@app.route('/api/new-endpoint', methods=['GET'])
def new_endpoint():
    user_id = get_current_user()
    if not user_id:
        return jsonify({'error': 'Unauthorized'}), 401
    
    # Your logic here
    return jsonify({'data': 'your data'})
```

### Add a new chart
```tsx
// src/app/pages/Dashboard.tsx
<ResponsiveContainer width="100%" height={300}>
  <BarChart data={yourData}>
    <XAxis dataKey="name" />
    <YAxis />
    <Bar dataKey="value" fill="#4edea3" />
  </BarChart>
</ResponsiveContainer>
```

### Query database
```python
# backend/models/your_model.py
from db.connection import execute_query

query = "SELECT * FROM your_table WHERE user_id = %s"
results = execute_query(query, (user_id,))
```

## 📁 Complete File Tree

```
.
├── INDEX.md (this file)
├── README.md
├── QUICKSTART.md
├── DEPLOYMENT.md
├── PROJECT_SUMMARY.md
├── package.json
├── .env.example
│
├── backend/
│   ├── app.py
│   ├── requirements.txt
│   ├── .env.example
│   ├── seed_data.py
│   ├── db/
│   │   ├── schema.sql
│   │   └── connection.py
│   └── models/
│       ├── user.py
│       ├── habit.py
│       ├── task.py
│       └── goal.py
│
└── src/app/
    ├── App.tsx
    ├── services/
    │   └── api.ts
    ├── context/
    │   └── AuthContext.tsx
    ├── components/
    │   └── Navigation.tsx
    └── pages/
        ├── Dashboard.tsx
        ├── Tasks.tsx
        ├── Habits.tsx
        ├── Analytics.tsx
        └── Login.tsx
```

## 🎯 What Makes This Special

1. **NO MOCK DATA** - Everything uses real database
2. **PRODUCTION-READY** - Deploy today, use immediately
3. **WELL-DOCUMENTED** - 5 documentation files
4. **REAL CHARTS** - 8 chart types with live data
5. **SECURE** - JWT auth, password hashing
6. **SCALABLE** - Clean architecture
7. **BEAUTIFUL** - Matches Figma design exactly

---

**Need help?** Read the docs above or check the code comments!
