@echo off
title Smart Warranty Tracker
echo.
echo  ==========================================
echo   Smart Warranty Tracker - Starting...
echo  ==========================================
echo.

:: Start Backend
start "Backend - FastAPI" cmd /k "cd /d c:\Users\mohamed\Desktop\srial\backend && uvicorn main:app --reload --port 8000"

:: Wait 3 seconds then start Frontend
timeout /t 3 /nobreak >nul
start "Frontend - Next.js" cmd /k "cd /d c:\Users\mohamed\Desktop\srial\frontend && npm run dev"

:: Wait then open browser
timeout /t 5 /nobreak >nul
start http://localhost:3000

echo.
echo  ==========================================
echo   Backend:   http://localhost:8000
echo   Frontend:  http://localhost:3000
echo   Admin:     http://localhost:3000/admin
echo  ==========================================
echo.
pause
