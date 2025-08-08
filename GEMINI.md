# Fronix AI Chatbot

## Project Overview

This project is a web-based AI chatbot called Fronix. It consists of a frontend built with HTML, CSS, and JavaScript, and a backend powered by Node.js and Express. The application uses Supabase for its database and user authentication.

### Key Technologies

*   **Frontend:**
    *   HTML
    *   TailwindCSS
    *   JavaScript
    *   [marked.js](https://marked.js.org/) for Markdown rendering
    *   [highlight.js](https://highlightjs.org/) for syntax highlighting
    *   [anime.js](https://animejs.com/) for animations
*   **Backend:**
    *   Node.js
    *   Express.js
    *   [Supabase](https://supabase.io/) for database and authentication
    *   [jsonwebtoken](https://github.com/auth0/node-jsonwebtoken) for handling JWTs
*   **AI:**
    *   The application is configured to use a variety of large language models, including both text and image generation models.

## Building and Running

### Backend

To run the backend server:

1.  Navigate to the `Backend` directory.
2.  Install the dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
    The server will run on port 3001 by default.

### Frontend

To run the frontend:

1.  Open the `index.html` file in your web browser.
2.  You may need to use a local web server to avoid CORS issues. The VS Code Live Server extension is a good option.

## Development Conventions

### API Routes

The backend API routes are defined in the `Backend/routes` directory. The main routes are:

*   `/api/auth`: Authentication routes (signup, signin).
*   `/api/chat`: Chat-related routes (creating, fetching, and managing chats and messages).
*   `/api/user`: User profile and preferences routes.
*   `/api/ai`: Routes for interacting with the AI models.

### Database

The database schema is defined in `database_schema.md`. The main tables are:

*   `chats`: Stores chat sessions.
*   `messages`: Stores individual messages within a chat. The `content` column can be either text or a JSON object for multimodal messages (text and images).
*   `profiles`: Stores user profile information.
*   `user_preferences`: Stores user-specific settings like theme and font preferences.

Row Level Security (RLS) is enabled on all tables to ensure that users can only access their own data.
