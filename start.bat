@echo off
chcp 65001 >nul 2>&1
title Puzzle Fusion Engine

echo ================================
echo   Puzzle Fusion Engine - Start
echo ================================
echo.

:: Step 0: Kill old instances (port-based)
echo [1/3] Stopping old instances...
for /f "tokens=5" %%P in ('netstat -ano ^| findstr :3000') do (
    taskkill /F /PID %%P 2>nul
)
for /f "tokens=5" %%P in ('netstat -ano ^| findstr :8000') do (
    taskkill /F /PID %%P 2>nul
)
echo    Done.
echo.

:: Step 1: Backend
echo [2/3] Starting backend (port 8000)...
start "PFE-Backend" cmd /k "cd /d D:\projects\puzzle-fusion-engine\backend && D:\Python\python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

:: Step 2: Frontend (NO cache clear!)
echo [3/3] Starting frontend (port 3000)...
start "PFE-Frontend" cmd /k "cd /d D:\projects\puzzle-fusion-engine\frontend && D:\QCLAW\resources\node\node.exe node_modules\next\dist\bin\next dev"

echo.
echo ================================
echo   All services started!
echo   Backend : http://localhost:8000
echo   Frontend: http://localhost:3000
echo ================================
echo.
pause