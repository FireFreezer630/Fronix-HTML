#!/bin/bash

echo "Starting Fronix Backend Server..."
echo

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is not installed or not in PATH."
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
BACKEND_DIR="$SCRIPT_DIR/Backend"

# Navigate to Backend directory
cd "$BACKEND_DIR" || {
    echo "Error: Could not navigate to Backend directory."
    exit 1
}

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "Error: package.json not found in Backend directory."
    echo "Please make sure you're running this script from the project root."
    exit 1
fi

# Check if node_modules exists, if not install dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "Error: Failed to install dependencies."
        exit 1
    fi
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "Warning: .env file not found. The server may not work properly."
    echo "Please make sure you have a .env file with the required configuration."
    echo
fi

echo
echo "Starting server on http://localhost:3001"
echo "Press Ctrl+C to stop the server"
echo

# Start the server
npm run dev
