You are a senior full-stack engineer and DevOps architect.

I will provide UI code for a habit tracker / productivity application. Your job is to convert it into a FULLY FUNCTIONAL, INTERNET-DEPLOYABLE application.

This is NOT a UI task. You must build a COMPLETE working system.

--------------------------------------------------
CORE REQUIREMENT (CRITICAL)
--------------------------------------------------
Everything must be FUNCTIONAL:
- All charts must use REAL data from the backend
- All pages must be connected
- No mock or placeholder data allowed
- The app must run end-to-end

--------------------------------------------------
STEP 1 — ANALYZE UI
--------------------------------------------------
Extract:
- Pages (Dashboard, Calendar, Analytics, Notifications, Tasks, Profile, Settings)
- Features (streaks, habits, goals, progress tracking, reminders)
- Data structures implied by UI

--------------------------------------------------
STEP 2 — FRONTEND (React / Next.js)
--------------------------------------------------
- Convert UI into reusable React components
- Use Next.js (App Router preferred)
- Use Tailwind EXACTLY as provided (keep design consistent)

MANDATORY:
- Use React Query (or similar) for API data fetching
- All pages must fetch real data from backend APIs
- Implement loading, error, and empty states

--------------------------------------------------
STEP 3 — BACKEND (Node.js)
--------------------------------------------------
- Use Next.js API routes OR Express.js
- Build REST API with endpoints:

Auth:
- POST /signup
- POST /login

Core:
- GET/POST/PUT/DELETE /tasks
- GET/POST/PUT/DELETE /habits
- GET/POST/PUT/DELETE /goals

Tracking:
- POST /completions
- GET /calendar-data

Analytics:
- GET /analytics/summary
- GET /analytics/progress
- GET /analytics/streaks

Notifications:
- GET /notifications

--------------------------------------------------
STEP 4 — DATABASE (PostgreSQL)
--------------------------------------------------
Design full relational schema with:
- users
- tasks
- habits
- goals
- completions
- streaks
- notifications

Include:
- Foreign key relationships
- Indexes for performance
- Proper timestamps

IMPORTANT:
- Backend must be written so I can connect my own PostgreSQL instance easily using ENV variables

--------------------------------------------------
STEP 5 — DATA VISUALIZATION (VERY IMPORTANT)
--------------------------------------------------
ALL charts MUST be real and dynamic:

Use:
- Recharts or Chart.js

REQUIREMENTS:
- Fetch data from backend APIs
- Transform data properly for charts
- No hardcoded values

Examples:
- Weekly completion chart → from completions table
- Habit streak chart → from streak calculations
- Progress % → computed dynamically

If charts are not connected to real backend data, the output is INVALID.

--------------------------------------------------
STEP 6 — BUSINESS LOGIC
--------------------------------------------------
Implement:

- Streak calculation:
  - consecutive completion days
- Completion tracking:
  - mark tasks/habits complete per date
- Calendar logic:
  - return tasks per date
- Analytics:
  - completion rate %
  - trends over time

--------------------------------------------------
STEP 7 — AUTHENTICATION
--------------------------------------------------
- JWT-based authentication
- Protected routes
- User-specific data (each user sees only their data)

--------------------------------------------------
STEP 8 — DEPLOYMENT (INTERNET-READY)
--------------------------------------------------
Provide deployment setup:

Frontend + Backend:
- Deploy on Vercel (preferred)

Database:
- PostgreSQL (user will provide)

Include:
- Environment variables setup (.env)
- API base URL handling
- CORS setup if needed

Optional:
- Docker setup (if possible)

--------------------------------------------------
STEP 9 — PROJECT STRUCTURE
--------------------------------------------------
Provide clean folder structure:

- /app or /pages (frontend)
- /components
- /lib (API helpers)
- /server or /api
- /db (schema)

--------------------------------------------------
STEP 10 — OUTPUT REQUIREMENTS
--------------------------------------------------
Provide:

1. Full folder structure
2. PostgreSQL schema (SQL)
3. Backend API code
4. Frontend pages + components
5. Chart implementations (connected to API)
6. Authentication flow
7. .env example
8. Step-by-step setup instructions
9. Deployment guide (Vercel)

--------------------------------------------------
STRICT RULES
--------------------------------------------------
- NO mock data
- NO fake charts
- NO disconnected UI
- EVERYTHING must work together

If any chart, API, or page is not connected to real backend data, regenerate.

--------------------------------------------------
GOAL
--------------------------------------------------
Produce a complete, production-ready SaaS habit tracking web app that can be deployed and used by real users on the internet.