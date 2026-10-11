@echo off
setlocal EnableExtensions

cd /d "%~dp0"

set "APP_DIR=%CD%"
set "LAUNCHER=%APP_DIR%\run-app.bat"
set "ICON=%APP_DIR%\assets\app.ico"
set "SHORTCUT_NAME=MM MCP CF Manager.lnk"

if not exist "%LAUNCHER%" (
    echo [ERROR] Launcher not found:
    echo %LAUNCHER%
    echo.
    pause
    exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\create-shortcut.ps1" -LauncherPath "%LAUNCHER%" -WorkingDirectory "%APP_DIR%" -IconPath "%ICON%" -ShortcutName "%SHORTCUT_NAME%"

if errorlevel 1 (
    echo.
    echo [ERROR] Failed to create Desktop shortcut.
    pause
    exit /b 1
)

echo.
echo MM MCP CF Manager shortcut is ready on the Desktop.
echo If the app fails to start, check: %LOCALAPPDATA%\MM-MCP-CF-Manager\launcher.log
echo.
pause
exit /b 0
