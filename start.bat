@echo off
title KMITSURAT Work Portal

:: Check if port 3000 is already in use
netstat -ano | findstr ":3000 " >nul 2>&1
if %errorlevel% == 0 (
    echo Server already running, opening browser...
    start "" "http://localhost:3000"
    exit /b
)

:: Start dev server in background
echo Starting KMITSURAT Work Portal...
cd /d "C:\Project\Kmit_ERP\kmit-erp"
start /min cmd /c "npm run dev"

:: Wait for server to be ready
echo Waiting for server...
timeout /t 5 /nobreak >nul

:: Open browser
start "" "http://localhost:3000"
exit /b
