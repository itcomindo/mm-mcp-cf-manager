@echo off
setlocal EnableExtensions

cd /d "%~dp0"

title MM MCP CF Manager Launcher

set "LOG_DIR=%LOCALAPPDATA%\MM-MCP-CF-Manager"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%" >nul 2>&1
set "LOG_FILE=%LOG_DIR%\launcher.log"

>>"%LOG_FILE%" echo.
>>"%LOG_FILE%" echo ===== %DATE% %TIME% Launcher =====
>>"%LOG_FILE%" echo Working directory: %CD%

call :ensure_node_path

where node >nul 2>&1
if errorlevel 1 (
    >>"%LOG_FILE%" echo ERROR: node.exe not found on PATH
    call :fail "Node.js was not found. Install Node.js 24 LTS from https://nodejs.org/"
)

where npm >nul 2>&1
if errorlevel 1 (
    >>"%LOG_FILE%" echo ERROR: npm not found on PATH
    call :fail "npm was not found. Reinstall Node.js 24 LTS."
)

node "%~dp0scripts\check-node-version.mjs" >>"%LOG_FILE%" 2>&1
if errorlevel 1 (
    >>"%LOG_FILE%" echo ERROR: Node.js version check failed
    call :fail "Node.js 24 or newer is required. Run node -v in a terminal to verify."
)

if not exist "package.json" (
    >>"%LOG_FILE%" echo ERROR: package.json missing
    call :fail "package.json not found. Run this launcher from the MM MCP CF Manager folder."
)

echo Preparing MM MCP CF Manager...
call npm run app:prepare
if errorlevel 1 (
    >>"%LOG_FILE%" echo ERROR: app:prepare failed with code %ERRORLEVEL%
    echo.
    echo [ERROR] Preparation failed. Log: %LOG_FILE%
    pause
    exit /b 1
)

echo Starting MM MCP CF Manager...
set "MMCF_LAUNCHER=1"
set "ELECTRON_EXE=%~dp0node_modules\electron\dist\electron.exe"
if not exist "%ELECTRON_EXE%" (
    >>"%LOG_FILE%" echo ERROR: electron.exe missing at %ELECTRON_EXE%
    call :fail "Electron was not found. Run npm install in the project folder."
)

start "" /D "%~dp0" "%ELECTRON_EXE%" .
if errorlevel 1 (
    >>"%LOG_FILE%" echo ERROR: failed to start electron detached
    echo.
    echo [ERROR] Application failed to start. Log: %LOG_FILE%
    pause
    exit /b 1
)

>>"%LOG_FILE%" echo Started electron detached (exit 0)
exit /b 0

:ensure_node_path
where node >nul 2>&1
if not errorlevel 1 exit /b 0
set "PATH=%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%LOCALAPPDATA%\Programs\nodejs;%AppData%\npm;%PATH%"
exit /b 0

:fail
echo.
echo [ERROR] %~1
echo Log: %LOG_FILE%
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Add-Type -AssemblyName PresentationFramework; [System.Windows.MessageBox]::Show('%~1','MM MCP CF Manager','OK','Error')" >nul 2>&1
pause
exit /b 1
