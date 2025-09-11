# Fronix AI - Quick Fix Guide

This guide will help you resolve the "Error loading available models: TypeError: Failed to fetch" error and get your application running properly.

## 🔍 Problem Analysis

The error occurs because the frontend application is trying to connect to a backend server that isn't running. The backend server handles:
- AI model availability checking
- User authentication 
- Chat message persistence
- Pro/beta model access

## ✅ Solution 1: Start the Backend Server (Recommended)

### Windows Users:
1. **Double-click `start-backend.bat`** in the project root directory
2. The script will:
   - Check if Node.js is installed
   - Install dependencies if needed
   - Start the server on http://localhost:3001

### Mac/Linux Users:
1. **Run `./start-backend.sh`** in terminal from the project root directory
2. The script will do the same as above

### Manual Start (Alternative):
```bash
# Navigate to Backend folder
cd Backend

# Install dependencies (first time only)
npm install

# Start the server
npm run dev
```

## ✅ Solution 2: Use Without Backend (Limited Features)

The application now includes fallback mechanisms that allow it to work without the backend:

### What Works Without Backend:
- ✅ Anonymous chat with basic models (GPT-4.1, GPT-5-nano, Gemini)
- ✅ Local chat storage
- ✅ Basic AI conversations using fallback endpoints
- ✅ Theme switching and settings

### What Requires Backend:
- ❌ User authentication (Google login, email/password)
- ❌ Chat synchronization across devices
- ❌ Pro and Beta models
- ❌ Study mode
- ❌ Chat persistence to database

## 🛠️ Features I've Fixed

1. **Enhanced Error Handling**: The app now gracefully handles backend unavailability
2. **Fallback API Endpoints**: Anonymous users can still chat using backup servers
3. **Better User Feedback**: Clear warning messages when features are limited
4. **Automatic Model Selection**: Switches to available models when primary ones are down
5. **Startup Scripts**: Easy one-click server startup

## 📋 Setup Instructions

### 1. Check Requirements
- **Node.js 16+**: Download from https://nodejs.org/
- **Modern Browser**: Chrome, Firefox, Safari, or Edge

### 2. Start the Backend
- **Windows**: Double-click `start-backend.bat`
- **Mac/Linux**: Run `./start-backend.sh` in terminal

### 3. Open the Frontend
- Open `index.html` in your web browser
- Or use a local server like Live Server in VS Code

### 4. Verify Everything Works
- You should see no error messages in the browser console
- The "Syncing..." indicator should briefly appear and disappear
- All models should be available in the dropdown

## 🔧 Troubleshooting

### "Node.js not found" Error
- Install Node.js from https://nodejs.org/
- Restart your terminal/command prompt after installation

### "Port 3001 already in use" Error
- Close any other running instances of the server
- Or change the PORT in `Backend/.env` file

### Models Still Showing as Unavailable
- Wait 10 seconds for the availability check to complete
- Check your internet connection
- Verify API keys in `Backend/.env` file

### Google Login Not Working
- The comprehensive OAuth setup guide is in `todo.md`
- Requires additional Supabase and Google Cloud Console configuration

## 🚀 What's Next

1. **Start the Backend**: Use the provided scripts
2. **Test Basic Features**: Try sending a message as an anonymous user
3. **Set Up Authentication**: Follow the guide in `todo.md` for Google login
4. **Configure Pro Models**: Contact the team for pro access

## 📝 Notes

- The application is designed to work offline with limited features
- All error messages are now user-friendly and actionable
- Backend server automatically checks model availability every 10 minutes
- Anonymous chats are saved locally and persist between sessions

## ⚡ Quick Test

1. Start backend: `start-backend.bat` (Windows) or `./start-backend.sh` (Mac/Linux)  
2. Open `index.html` in browser
3. Type a message and send
4. You should get an AI response without any errors

---

**Need Help?** Check the browser console for detailed error information, or refer to the comprehensive fix guide in `todo.md`.
