@echo off
echo Starting Fronix Backend Server...
echo.

:: Check if Node.js is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed or not in PATH.
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Navigate to Backend directory
cd /d "%~dp0Backend"

:: Check if package.json exists
if not exist "package.json" (
    echo Error: package.json not found in Backend directory.
    echo Please make sure you're running this script from the project root.
    pause
    exit /b 1
)

:: Check if node_modules exists, if not install dependencies
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo Error: Failed to install dependencies.
        pause
        exit /b 1
    )
)

:: Check if .env file exists
if not exist ".env" (
    echo Warning: .env file not found. The server may not work properly.
    echo Please make sure you have a .env file with the required configuration.
    echo.
)

echo.
echo Starting server on http://localhost:3001
echo Press Ctrl+C to stop the server
echo.

:: Start the server
npm run dev

pause
