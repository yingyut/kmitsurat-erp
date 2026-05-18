@echo off
:: KMITSURAT ERP Launcher - GUI version
:: Launches the PowerShell WinForms popup
:: -WindowStyle Hidden hides the console so only the popup appears
powershell -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0KMITSURAT_ERP_GUI.ps1"
