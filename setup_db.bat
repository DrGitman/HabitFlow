@echo off
title HabitFlow - Database Setup

echo ================================
echo   HabitFlow - Database Setup
echo ================================
echo.
echo This will create the PostgreSQL database and tables for HabitFlow.
echo Make sure PostgreSQL is running and you have psql in your PATH.
echo.
echo Expected database config (from backend/.env):
echo   Host:     localhost
echo   Port:     5432
echo   Database: habitflow
echo   User:     habitflow_user
echo   Password: badhabitsdiehard100##
echo.

set PGPASSWORD=badhabitsdiehard100##

echo [1/3] Creating database user (if not exists)...
psql -U postgres -h localhost -c "DO $$ BEGIN CREATE USER habitflow_user WITH PASSWORD 'badhabitsdiehard100##'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;"

echo [2/3] Creating database (if not exists)...
psql -U postgres -h localhost -c "SELECT 1 FROM pg_database WHERE datname='habitflow'" | findstr /c:"1 row" >nul
if errorlevel 1 (
    psql -U postgres -h localhost -c "CREATE DATABASE habitflow OWNER habitflow_user;"
) else (
    echo Database 'habitflow' already exists, skipping.
)

echo [3/3] Running schema migrations...
psql -U habitflow_user -h localhost -d habitflow -f "%~dp0backend\db\schema.sql"

echo.
echo ================================
echo   Database setup complete!
echo   You can now run start.bat
echo ================================
echo.
pause
