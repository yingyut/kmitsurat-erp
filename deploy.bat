@echo off
title KMITSURAT ERP - Deploy
color 0A
cd /d D:\Project\ERP_KMITSURAT\ERP_KMITSURAT_Ins\ERP_KMITSURAT_Ins
if errorlevel 1 (echo [ERROR] Project folder not found & pause & exit /b 1)

echo ============================================================
echo   KMITSURAT ERP - Deploy Production
echo ============================================================
echo.

echo [1/5] Fetching latest code...
git fetch origin
git reset --hard origin/master
git checkout-index -a -f
echo [OK] Code updated.

echo.
echo [2/5] Installing dependencies...
call npm install --prefer-offline
if errorlevel 1 (echo [ERROR] npm install failed & pause & exit /b 1)

echo.
echo [3/5] Building...
if exist .next rmdir /s /q .next
call npm run build
if errorlevel 1 (echo [ERROR] Build failed & pause & exit /b 1)

echo.
echo [4/5] Stopping old server...
taskkill /f /im node.exe >nul 2>&1
ping -n 3 127.0.0.1 >nul

echo.
echo [5/5] Starting server on port 3100...
set PORT=3100
start "KMITSURAT ERP" /min cmd /k "cd /d D:\Project\ERP_KMITSURAT\ERP_KMITSURAT_Ins\ERP_KMITSURAT_Ins && set PORT=3100 && npm start"

echo.
echo ============================================================
echo   Deploy complete!  http://172.16.1.60:3100
echo ============================================================
echo.
pause
