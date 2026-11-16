@echo off
setlocal
cd /d "%~dp0"
echo ========================================================
echo   Clipyx Standalone Production Server (dist)
echo   Starting local server at http://localhost:8765/
echo ========================================================
python server.py 8765 --open
if %ERRORLEVEL% NEQ 0 (
    echo.
    echo Failed to start Python server. Ensure Python 3 is installed and added to PATH.
    pause
)
