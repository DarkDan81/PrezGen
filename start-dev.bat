@echo off
setlocal

cd /d "%~dp0"

echo [PrezGen] Checking Node.js...
where node >nul 2>nul
if errorlevel 1 (
  echo [PrezGen] Node.js not found.
  where winget >nul 2>nul
  if not errorlevel 1 (
    echo [PrezGen] Trying to install Node.js LTS via winget...
    winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
  )

  where node >nul 2>nul
  if errorlevel 1 (
    echo [PrezGen] Auto-install failed. Opening Node.js download page...
    start "" "https://nodejs.org/en/download"
    echo [PrezGen] Install Node.js and run start-dev.bat again.
    pause
    exit /b 1
  )
)

echo [PrezGen] Node.js detected:
node -v

if not exist "node_modules" (
  echo [PrezGen] Installing root dependencies...
  npm install
  if errorlevel 1 (
    echo [PrezGen] Failed to install root dependencies.
    pause
    exit /b 1
  )
)

if not exist "frontend\\node_modules" (
  echo [PrezGen] Installing frontend dependencies...
  npm --prefix frontend install
  if errorlevel 1 (
    echo [PrezGen] Failed to install frontend dependencies.
    pause
    exit /b 1
  )
)

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
