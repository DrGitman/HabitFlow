# Deployment Guide

Complete guide to deploying HabitFlow to production.

## Table of Contents
1. [Railway (Recommended for Backend)](#railway)
2. [Vercel (Recommended for Frontend)](#vercel)
3. [Render](#render)
4. [Heroku](#heroku)
5. [Docker](#docker)
6. [VPS/Traditional Hosting](#vps)

---

## Railway (Recommended for Backend)

Railway is the easiest way to deploy Python Flask apps with PostgreSQL.

### Steps

1. **Sign up at [railway.app](https://railway.app)**

2. **Create New Project**
   - Click "New Project"
   - Select "Deploy from GitHub repo"
   - Connect your repository

3. **Add PostgreSQL Database**
   - Click "New" → "Database" → "PostgreSQL"
   - Railway will create a database and provide connection string

4. **Configure Backend Service**
   - Add a new service for your backend
   - Set root directory to `backend`
   - Add environment variables:
     ```
     DATABASE_URL=${{Postgres.DATABASE_URL}}
     JWT_SECRET=your-random-secret-key-here
     FLASK_ENV=production
     ```

5. **Deploy**
   - Railway auto-deploys on git push
   - Get your backend URL (e.g., `https://your-app.railway.app`)

6. **Initialize Database**
   ```bash
   # SSH into Railway or run locally against Railway DB
   railway run python seed_data.py
   ```

**Cost:** Free tier includes 500 hours/month

---

## Vercel (Recommended for Frontend)

Vercel is perfect for React applications.

### Steps

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Deploy**
   ```bash
   vercel
   ```

3. **Configure Environment Variables**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add:
     ```
     REACT_APP_API_URL=https://your-backend-url.railway.app
     ```

4. **Redeploy**
   ```bash
   vercel --prod
   ```

**Cost:** Free tier includes unlimited deployments

---

## Render

Deploy both frontend and backend on Render.

### Backend on Render

1. **Create PostgreSQL Database**
   - Go to [render.com](https://render.com)
   - New → PostgreSQL
   - Note the Internal Database URL

2. **Create Web Service**
   - New → Web Service
   - Connect repository
   - Settings:
     - **Name:** habitflow-backend
     - **Root Directory:** `backend`
     - **Environment:** Python 3
     - **Build Command:** `pip install -r requirements.txt`
     - **Start Command:** `gunicorn app:app`

3. **Add Environment Variables**
   ```
   DATABASE_URL=<your-postgres-url>
   JWT_SECRET=<random-secret>
   FLASK_ENV=production
   ```

4. **Add gunicorn to requirements.txt**
   ```bash
   echo "gunicorn==21.2.0" >> backend/requirements.txt
   ```

### Frontend on Render

1. **Create Static Site**
   - New → Static Site
   - Connect repository
   - Settings:
     - **Build Command:** `pnpm install && pnpm run build`
     - **Publish Directory:** `dist`

2. **Add Environment Variables**
   ```
   REACT_APP_API_URL=https://your-backend.onrender.com
   ```

**Cost:** Free tier available (apps sleep after 15 min inactivity)

---

## Heroku

### Backend

1. **Install Heroku CLI**
   ```bash
   brew install heroku/brew/heroku  # macOS
   ```

2. **Create Heroku App**
   ```bash
   cd backend
   heroku create habitflow-backend
   ```

3. **Add PostgreSQL**
   ```bash
   heroku addons:create heroku-postgresql:mini
   ```

4. **Create Procfile**
   ```bash
   echo "web: gunicorn app:app" > Procfile
   ```

5. **Add gunicorn**
   ```bash
   echo "gunicorn==21.2.0" >> requirements.txt
   ```

6. **Set Environment Variables**
   ```bash
   heroku config:set JWT_SECRET=your-secret-key
   heroku config:set FLASK_ENV=production
   ```

7. **Deploy**
   ```bash
   git subtree push --prefix backend heroku main
   ```

8. **Initialize Database**
   ```bash
   heroku run python seed_data.py
   ```

### Frontend

Deploy frontend to Vercel (easier than Heroku for static sites)

**Cost:** Free tier discontinued Nov 2022, paid plans start at $5/month

---

## Docker

Deploy anywhere with Docker.

### Create Dockerfiles

**backend/Dockerfile:**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["python", "app.py"]
```

**Dockerfile (frontend):**
```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .
RUN pnpm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: habit_tracker
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://postgres:${DB_PASSWORD}@postgres:5432/habit_tracker
      JWT_SECRET: ${JWT_SECRET}
      FLASK_ENV: production
    ports:
      - "5000:5000"
    depends_on:
      - postgres

  frontend:
    build: .
    environment:
      REACT_APP_API_URL: http://backend:5000
    ports:
      - "80:80"
    depends_on:
      - backend

volumes:
  postgres_data:
```

### Deploy

```bash
# Create .env file
echo "DB_PASSWORD=your-db-password" > .env
echo "JWT_SECRET=your-jwt-secret" >> .env

# Deploy
docker-compose up -d

# Initialize database
docker-compose exec backend python seed_data.py
```

**Deploy to:** AWS ECS, Google Cloud Run, DigitalOcean, etc.

---

## VPS (Traditional Hosting)

Deploy to any Ubuntu/Debian VPS (DigitalOcean, Linode, AWS EC2, etc.)

### 1. Setup Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install dependencies
sudo apt install -y python3 python3-pip postgresql postgresql-contrib nginx nodejs npm

# Install pnpm
npm install -g pnpm
```

### 2. Setup Database

```bash
sudo -u postgres psql
CREATE DATABASE habit_tracker;
CREATE USER habitflow WITH PASSWORD 'your-password';
GRANT ALL PRIVILEGES ON DATABASE habit_tracker TO habitflow;
\q
```

### 3. Deploy Backend

```bash
# Clone repository
git clone your-repo.git
cd your-repo/backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
pip install gunicorn

# Setup environment
cp .env.example .env
nano .env  # Edit DATABASE_URL and JWT_SECRET

# Initialize database
psql -U habitflow -d habit_tracker -f db/schema.sql
python seed_data.py

# Test run
gunicorn app:app
```

### 4. Setup Systemd Service

**Create /etc/systemd/system/habitflow.service:**
```ini
[Unit]
Description=HabitFlow Backend
After=network.target

[Service]
User=www-data
WorkingDirectory=/var/www/habitflow/backend
Environment="PATH=/var/www/habitflow/backend/venv/bin"
ExecStart=/var/www/habitflow/backend/venv/bin/gunicorn -w 4 -b 0.0.0.0:5000 app:app

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl start habitflow
sudo systemctl enable habitflow
```

### 5. Deploy Frontend

```bash
cd ../
pnpm install
pnpm run build
sudo cp -r dist /var/www/habitflow/frontend
```

### 6. Configure Nginx

**Create /etc/nginx/sites-available/habitflow:**
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /var/www/habitflow/frontend;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/habitflow /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 7. Setup SSL (Let's Encrypt)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

**Cost:** $5-10/month for basic VPS

---

## Environment Variables Reference

### Backend
```env
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=random-64-character-string
FLASK_ENV=production
FLASK_DEBUG=False
```

### Frontend
```env
REACT_APP_API_URL=https://api.your-domain.com
```

---

## Post-Deployment Checklist

- [ ] Database initialized with schema
- [ ] Environment variables configured
- [ ] Backend health check passes: `curl https://your-api.com/api/profile`
- [ ] Frontend loads correctly
- [ ] Can create account and login
- [ ] Charts display real data
- [ ] SSL certificate installed (production)
- [ ] Database backups configured
- [ ] Monitoring setup (optional)

---

## Monitoring & Maintenance

### Database Backups

```bash
# Automated daily backups
pg_dump -U habitflow habit_tracker > backup_$(date +%Y%m%d).sql
```

### Logs

```bash
# Backend logs
tail -f /var/log/habitflow/backend.log

# Nginx logs
tail -f /var/log/nginx/access.log
```

### Updates

```bash
# Pull latest changes
git pull origin main

# Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
sudo systemctl restart habitflow

# Frontend
cd ..
pnpm install
pnpm run build
sudo cp -r dist/* /var/www/habitflow/frontend/
```

---

## Cost Comparison

| Platform | Backend | Database | Frontend | Total/Month |
|----------|---------|----------|----------|-------------|
| Railway + Vercel | Free | Free | Free | $0 |
| Render | Free | Free | Free | $0 |
| Railway (Paid) | $5 | Included | Free (Vercel) | $5 |
| DigitalOcean VPS | $6 | Included | Included | $6 |
| AWS (t2.micro) | $5 | $15 (RDS) | $0.50 (S3) | $20.50 |

**Recommendation:** Start with Railway (backend) + Vercel (frontend) for free hosting with great performance.

---

## Need Help?

Check the troubleshooting section in README.md or review server logs for errors.
