@echo off
setlocal

cd /d "%~dp0"

echo [PrezGen] Starting backend...
start "PrezGen Backend" cmd /k "cd /d ""%~dp0"" && npm run api"

echo [PrezGen] Starting frontend...
start "PrezGen Frontend" cmd /k "cd /d ""%~dp0"" && npm run frontend:dev"

echo [PrezGen] Waiting for frontend to boot...
timeout /t 4 /nobreak >nul

echo [PrezGen] Opening browser...
start "" "http://localhost:5173"

echo [PrezGen] Done.
echo Close backend/frontend terminal windows to stop the app.

endlocal
