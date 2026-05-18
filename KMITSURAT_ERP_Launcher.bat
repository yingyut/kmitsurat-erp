@echo off
setlocal enabledelayedexpansion
title KMITSURAT ERP Launcher

:: ============================================================
:: KMITSURAT ERP Launcher
:: - Reads settings from config.ini (auto-creates if missing)
:: - Pings ERP server to check connectivity
:: - Connected  : Opens browser directly to ERP
:: - No network : Opens Windows VPN Settings for user to connect
:: - No passwords stored in this file
:: ============================================================

set "SCRIPT_DIR=%~dp0"
set "CONFIG_FILE=%SCRIPT_DIR%config.ini"

:: --- Default values ---
set "ERP_IP=172.16.1.60"
set "ERP_PORT=3100"
set "VPN_NAME=KMIT"
set "ERP_NAME=KMITSURAT ERP"

:: ============================================================
:: Auto-create config.ini with defaults if not found
:: ============================================================
if not exist "%CONFIG_FILE%" (
    echo [INFO] config.ini not found. Creating with default values...
    echo ; ============================================================  > "%CONFIG_FILE%"
    echo ; KMITSURAT ERP Launcher - Configuration File                  >> "%CONFIG_FILE%"
    echo ; Edit these values when the server address or VPN name changes >> "%CONFIG_FILE%"
    echo ;                                                               >> "%CONFIG_FILE%"
    echo [Settings]                                                      >> "%CONFIG_FILE%"
    echo ERP_IP=172.16.1.60                                              >> "%CONFIG_FILE%"
    echo ERP_PORT=3100                                                   >> "%CONFIG_FILE%"
    echo VPN_NAME=KMIT                                                   >> "%CONFIG_FILE%"
    echo ERP_NAME=KMITSURAT ERP                                          >> "%CONFIG_FILE%"
    echo [INFO] config.ini created at: %CONFIG_FILE%
    echo.
)

:: ============================================================
:: Read config.ini
:: tokens=1,* delims== splits on first = only (supports spaces in values)
:: Skips lines starting with ; (comments) and [ (section headers)
:: ============================================================
for /f "usebackq tokens=1,* delims==" %%A in ("%CONFIG_FILE%") do (
    set "KEY=%%A"
    set "KEY=!KEY: =!"
    if not "!KEY:~0,1!"==";" (
        if not "!KEY:~0,1!"=="[" (
            if not "!KEY:~0,1!"=="#" (
                if /i "!KEY!"=="ERP_IP"   set "ERP_IP=%%B"
                if /i "!KEY!"=="ERP_PORT" set "ERP_PORT=%%B"
                if /i "!KEY!"=="VPN_NAME" set "VPN_NAME=%%B"
                if /i "!KEY!"=="ERP_NAME" set "ERP_NAME=%%B"
            )
        )
    )
)

:: ============================================================
:: Display banner with loaded config
:: ============================================================
echo.
echo ============================================================
echo   !ERP_NAME! - Launcher
echo ============================================================
echo   Server  : http://!ERP_IP!:!ERP_PORT!
echo   VPN     : !VPN_NAME!
echo   Config  : %CONFIG_FILE%
echo ============================================================
echo.

:: ============================================================
:: Step 1: Ping server to check if reachable
:: -n 1 = send 1 packet   -w 2000 = 2 second timeout
:: ============================================================
echo [1/2] Checking connection to !ERP_IP! ...
ping -n 1 -w 2000 !ERP_IP! >nul 2>&1

if errorlevel 1 goto :VPN_REQUIRED
goto :OPEN_ERP

:: ============================================================
:OPEN_ERP
:: Server reachable - open browser
:: ============================================================
echo [OK] Server reachable!
echo.
echo [2/2] Opening !ERP_NAME! ...
start "" "http://!ERP_IP!:!ERP_PORT!"
echo.
echo [Done] Browser launched. Please wait a moment...
timeout /t 3 /nobreak >nul
goto :DONE

:: ============================================================
:VPN_REQUIRED
:: Cannot reach server - guide user to connect VPN
:: ============================================================
echo [!] Cannot reach server !ERP_IP!
echo     The device may be outside the network or VPN is not connected.
echo.
echo [2/2] Opening Windows VPN Settings...
start ms-settings:network-vpn
echo.
echo ============================================================
echo   How to connect VPN:
echo   1. In the VPN Settings window that just opened
echo   2. Click on VPN named "!VPN_NAME!"
echo   3. Click "Connect"
echo   4. Wait until status shows "Connected"
echo   5. Return here and press Enter
echo ============================================================
echo.
echo   (If VPN is not configured, contact your system administrator)
echo.
set /p "DUMMY=>>> Press Enter after connecting to VPN [!VPN_NAME!]: "

:: --- Re-check ping after VPN connect attempt ---
echo.
echo [Checking] Re-checking server connection...
ping -n 2 -w 3000 !ERP_IP! >nul 2>&1

if errorlevel 1 goto :CONNECT_FAILED

echo [OK] Server reachable!
echo.
echo Opening !ERP_NAME! ...
start "" "http://!ERP_IP!:!ERP_PORT!"
echo.
echo [Done] Browser launched. Please wait a moment...
timeout /t 3 /nobreak >nul
goto :DONE

:: ============================================================
:CONNECT_FAILED
:: Still unreachable after VPN - show error, keep window open
:: ============================================================
echo.
echo ============================================================
echo  [ERROR] Cannot connect to server
echo ============================================================
echo.
echo   Possible causes:
echo   - VPN "!VPN_NAME!" not connected or connection failed
echo   - VPN_NAME in config.ini does not match Windows VPN name
echo   - Server !ERP_IP!:!ERP_PORT! may be offline
echo   - Contact your system administrator if the problem persists
echo.
echo   Config file: %CONFIG_FILE%
echo ============================================================
echo.
pause
goto :EOF

:: ============================================================
:DONE
endlocal
