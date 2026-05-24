@echo off
title PinPinKanMe

echo ================================
echo   PinPinKanMe - Starting...
echo ================================
echo.

:: Kill old processes on target ports
echo [1/3] Stopping old instances...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8000 "') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 "') do taskkill /F /PID %%a >nul 2>&1
echo    Done.
echo.

:: Start backend
echo [2/3] Starting backend (port 8000)...
start "PPM-Backend" cmd /k "cd /d D:\projects\puzzle-fusion-engine\backend && D:\Python\python.exe -m uvicorn main:app --host 0.0.0.0 --port 8000"

timeout /t 3 /nobreak >nul

:: Start frontend
echo [3/3] Starting frontend (port 3000)...
start "PPM-Frontend" cmd /k "cd /d D:\projects\puzzle-fusion-engine\frontend && D:\QCLAW\resources\node\node.exe node_modules\next\dist\bin\next dev"

echo.
echo ================================
echo   Ready!
echo   Backend : http://localhost:8000
echo   Frontend: http://localhost:3000
echo ================================
echo.
echo   Close this window to stop all servers.
pause >nul

:: Cleanup on window close
echo Cleaning up...
taskkill /FI "WINDOWTITLE eq PPM-Backend*" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq PPM-Frontend*" /F >nul 2>&1
echo Done.
