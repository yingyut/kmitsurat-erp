@echo off
setlocal enabledelayedexpansion
title KMITSURAT ERP - Install Desktop Shortcut

:: ============================================================
:: install_shortcut.bat
:: Creates a Desktop Shortcut for KMITSURAT ERP Launcher
:: - Reads shortcut name from config.ini (ERP_NAME value)
:: - Shortcut points to KMITSURAT_ERP_Launcher.bat
:: - Uses icon.ico if found in the same folder
:: - Uses PowerShell to create .lnk (no Admin rights required)
:: ============================================================

set "SCRIPT_DIR=%~dp0"
set "CONFIG_FILE=%SCRIPT_DIR%config.ini"
set "LAUNCHER=%SCRIPT_DIR%KMITSURAT_ERP.bat"
set "ICON_FILE=%SCRIPT_DIR%icon.ico"

:: --- Verify launcher file exists ---
if not exist "%LAUNCHER%" (
    echo [ERROR] KMITSURAT_ERP_Launcher.bat not found in:
    echo         %SCRIPT_DIR%
    echo         Please keep all files in the same folder.
    echo.
    pause
    goto :EOF
)

:: --- Default shortcut name ---
set "ERP_NAME=KMITSURAT ERP"

:: --- Read ERP_NAME from config.ini ---
if exist "%CONFIG_FILE%" (
    for /f "usebackq tokens=1,* delims==" %%A in ("%CONFIG_FILE%") do (
        set "KEY=%%A"
        set "KEY=!KEY: =!"
        if not "!KEY:~0,1!"==";" (
            if not "!KEY:~0,1!"=="[" (
                if /i "!KEY!"=="ERP_NAME" set "ERP_NAME=%%B"
            )
        )
    )
)

echo.
echo ============================================================
echo   Install Desktop Shortcut: !ERP_NAME!
echo ============================================================
echo   Launcher : %LAUNCHER%
echo   Working  : %SCRIPT_DIR%
if exist "%ICON_FILE%" (
    echo   Icon     : %ICON_FILE%
) else (
    echo   Icon     : icon.ico not found - using default CMD icon
)
echo ============================================================
echo.

:: ============================================================
:: Generate a temporary PowerShell script using >> redirects
:: (More reliable than () block redirect - avoids escape issues)
:: ============================================================
set "PS_SCRIPT=%TEMP%\CreateErpShortcut_%RANDOM%.ps1"

echo $shortcutName = "!ERP_NAME!"                                               > "%PS_SCRIPT%"
echo $targetPath   = "%LAUNCHER%"                                              >> "%PS_SCRIPT%"
echo $workingDir   = "%SCRIPT_DIR%"                                            >> "%PS_SCRIPT%"
echo $iconPath     = "%ICON_FILE%"                                             >> "%PS_SCRIPT%"
echo $desktopPath  = [System.Environment]::GetFolderPath('Desktop')            >> "%PS_SCRIPT%"
echo $linkPath     = [System.IO.Path]::Combine($desktopPath, "$shortcutName.lnk") >> "%PS_SCRIPT%"
echo $ws = New-Object -ComObject WScript.Shell                                 >> "%PS_SCRIPT%"
echo $sc = $ws.CreateShortcut($linkPath)                                       >> "%PS_SCRIPT%"
echo $sc.TargetPath      = $targetPath                                         >> "%PS_SCRIPT%"
echo $sc.WorkingDirectory = $workingDir                                        >> "%PS_SCRIPT%"
echo $sc.WindowStyle     = 1                                                   >> "%PS_SCRIPT%"
echo if (Test-Path $iconPath) {                                                >> "%PS_SCRIPT%"
echo     $sc.IconLocation = "$iconPath,0"                                      >> "%PS_SCRIPT%"
echo     Write-Host "[INFO] Icon set: $iconPath"                               >> "%PS_SCRIPT%"
echo } else {                                                                  >> "%PS_SCRIPT%"
echo     Write-Host "[INFO] icon.ico not found - using default icon"           >> "%PS_SCRIPT%"
echo }                                                                         >> "%PS_SCRIPT%"
echo $sc.Save()                                                                >> "%PS_SCRIPT%"
echo Write-Host "[OK] Shortcut created: $linkPath"                             >> "%PS_SCRIPT%"

:: --- Run the PowerShell script ---
echo [Creating] Generating Desktop Shortcut...
powershell -ExecutionPolicy Bypass -File "%PS_SCRIPT%"
set "PS_EXIT=%errorlevel%"

:: --- Clean up temp script ---
if exist "%PS_SCRIPT%" del "%PS_SCRIPT%" >nul 2>&1

:: --- Report result ---
echo.
if %PS_EXIT% equ 0 (
    echo ============================================================
    echo [Done] Shortcut installed successfully!
    echo   Double-click "!ERP_NAME!" on your Desktop to launch ERP.
    echo ============================================================
) else (
    echo ============================================================
    echo [ERROR] Shortcut creation failed. PowerShell exit code: %PS_EXIT%
    echo   Try right-clicking install_shortcut.bat and Run as administrator
    echo ============================================================
)

echo.
pause
endlocal
