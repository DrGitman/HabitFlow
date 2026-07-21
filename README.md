# HabitFlow

HabitFlow helps you build better habits, finish your tasks, and hit your goals — with an AI coach that tells you what to focus on today and why.

Most habit trackers just record what you did. HabitFlow tells you what to do next.

---

## What it does

- **Track habits** with daily check-ins, streaks, and a heatmap showing your consistency over time
- **Manage tasks** with priorities, due dates, and a built-in focus timer (25-minute blocks)
- **Set goals** and link your habits and tasks to them so progress feels connected
- **Coach** — an AI feature that looks at your tasks, habits, and recent patterns, then suggests a realistic plan for today. It shows the reason behind every suggestion and never changes anything until you say so
- **Analytics** with completion rates, productivity score, and weekly trends
- **Calendar** to plan and schedule habits and tasks by date
- **Notifications** for streaks, achievements, and reminders

---

## How to run it

You need Node.js, Python 3.11+, and PostgreSQL installed.

**1. Set up the database**

Run the schema file to create all tables:

```bash
psql -U habitflow_user -d habitflow -f backend/db/schema.sql
```

On Windows, double-click `setup_db.bat` if you have `psql` in your PATH.

**2. Set up environment variables**

Edit `backend/.env`:

```
DATABASE_URL=postgresql://habitflow_user:yourpassword@localhost:5432/habitflow
JWT_SECRET=any-long-random-string
```

To use a live AI model for the Coach feature, also add:

```
AI_GATEWAY_API_KEY=your-api-key
AI_GATEWAY_BASE_URL=https://api.anthropic.com
AI_MODEL=claude-haiku-4-5-20251001
```

Without an API key it runs in demo mode and returns a sample plan — good for testing without a subscription.

**3. Start the app**

Double-click `start.bat`. It opens two terminal windows — backend on port 5000, frontend on port 5173.

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Pages

| Page | What it's for |
|---|---|
| Dashboard | Your daily overview — streak cards, completion chart, recent activity |
| Actions | Your habits and tasks in one place |
| Coach | Get a focused plan for today, a recovery plan when overloaded, or a weekly review |
| Analytics | Charts showing your completion rate, trends, and productivity score |
| Calendar | See and schedule habits and tasks by date |
| Notifications | Streak alerts, achievement unlocks, and reminders |
| Profile | Your stats, achievements, and rank |

---

## Tech stack

| Layer | What's used |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Radix UI, Recharts |
| Backend | Python FastAPI, PostgreSQL, JWT auth, APScheduler |
| AI (Coach) | Anthropic API (Claude Haiku) — falls back to demo mode if no key is set |

---

## How AI was used in this project

This was built for a hackathon using two AI tools in different roles.

### GPT-5.6 — product thinking and design

GPT-5.6 shaped the Coach feature from scratch. I used it to:

- Figure out what kind of AI feature would actually be useful in a habit tracker (not just a chatbot)
- Design the three-mode structure: Today's Focus, Recovery Mode, Weekly Review
- Define what "safe AI" means here — generation never changes data, everything requires user confirmation, every recommendation must show its reasoning
- Write the prompt instructions that tell the model what to output and what rules to follow
- Design the adaptive coaching approach — where the system learns from which suggestions you accepted or ignored over time, and adjusts future suggestions based on your patterns

The implementation spec I worked from was produced through that conversation. Every key product decision — the confirmation step, the evidence panel, the cap at three recommendations — came from that back-and-forth.

### Codex / Claude Code — building and testing

Codex handled the coding:

- Reviewed the full codebase and found the schema bug causing CORS errors (tasks table referenced goals before goals was defined)
- Wrote all five Coach backend modules: schemas, context assembler, prompts, gateway, validator, apply service, overload detector
- Wrote 41 automated tests covering the validation rules from the spec
- Fixed the Pomodoro timer leak, goal priority undefined bug, and JWT session handling
- Set up the `start.bat` and `setup_db.bat` scripts
- Wired the Coach page into the React router and sidebar

### What I built and decided myself

- The full HabitFlow application — habits, tasks, goals, analytics, calendar, notifications, profile, achievements, email reports, heatmaps — built before the hackathon AI work started
- The product direction: I chose a coaching feature over a chatbot or generic AI analytics
- The decision to keep the AI read-only and require explicit confirmation before any change
- Which ideas from GPT-5.6 to build and which to cut

---

## How the Coach feature works

When you click "Get Today's Focus":

1. The backend reads your open tasks, habits, streaks, calendar blocks, and recent stats from the database
2. It checks if you're overloaded (too many tasks vs. available time, 3+ overdue items, or a low completion rate). If you are, it automatically switches to Recovery Mode
3. It sends a summary of your day to the AI model — not raw database records, just the relevant fields
4. It validates every suggestion the model returns before showing it to you. Anything scheduled in the past, after 17:30, overlapping an existing block, or referencing a task that doesn't exist gets removed
5. It returns the validated plan with the reason and evidence for each suggestion

When you confirm suggestions, only the ones you selected are sent to a separate endpoint that validates everything again before writing to the database. Nothing is ever changed automatically.

---

## Running the tests

```bash
cd backend
.venv/Scripts/python -m pytest tests/coach/ -v
```

41 tests cover: context shape, all validation rules, endpoint auth, error handling, and the no-write guarantee.

---

## Deployment

**Frontend (Netlify)**

```bash
npm run build
# deploy the dist/ folder to Netlify
```

Set `VITE_API_URL=https://your-backend-url` as an environment variable in Netlify.

**Backend (Render)**

Deploy as a Python web service. Set all variables from `backend/.env` in the Render dashboard. Make sure `DATABASE_URL` points to a hosted PostgreSQL instance (Render or Supabase both work).

---

## Screenshots



![alt text](image.png)

---

Built by Orilio Naobeb — 2026.
