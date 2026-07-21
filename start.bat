@echo off
title HabitFlow Launcher

echo ================================
echo   HabitFlow - Starting App
echo ================================
echo.
echo IMPORTANT: PostgreSQL must be running before starting.
echo If you haven't set up the database yet, run setup_db.bat first.
echo.
pause

:: Start Backend in a new window
echo [1/2] Starting FastAPI backend...
start "HabitFlow Backend" cmd /k "cd /d "%~dp0backend" && call .venv\Scripts\activate && uvicorn main:app --reload --host 0.0.0.0 --port 5000"

:: Small delay to let backend initialise
timeout /t 2 /nobreak >nul

:: Start Frontend in a new window
echo [2/2] Starting Vite frontend...
start "HabitFlow Frontend" cmd /k "cd /d "%~dp0" && npm run dev"

echo.
echo ================================
echo   Both servers are starting.
echo   Backend  -> http://localhost:5000
echo   Frontend -> http://localhost:5173
echo ================================
echo.
echo You can close this window. The two server windows will stay open.
pause
