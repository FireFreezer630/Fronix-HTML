# Codebase Analysis

This document provides a comprehensive analysis of the Fronix AI Chatbot codebase, detailing the architecture, components, and data flow.

## 1. High-Level Architecture

The application is a modern, full-stack web application with a clear separation of concerns between the frontend and backend.

- **Frontend**: A single-page application (SPA) built with vanilla HTML, CSS, and JavaScript. It uses Tailwind CSS for styling and communicates with the backend via a RESTful API.
- **Backend**: A Node.js server built with Express.js. It handles business logic, authentication, and communication with the Supabase database and external AI services.
- **Database**: A PostgreSQL database hosted on Supabase, which provides authentication, database, and storage services.
- **AI Services**: The application integrates with multiple AI services for chat and image generation, accessible through a unified API.

## 2. Component Breakdown

### 2.1. Frontend

The frontend is responsible for rendering the user interface and handling user interactions.

- **[`index.html`](index.html)**: The main entry point of the application. It includes the HTML structure, and all necessary libraries and scripts.
- **Styling**: Tailwind CSS is used for styling, with custom styles defined in the `<style>` block of [`index.html`](index.html).
- **Client-Side Logic**: All client-side logic is contained within a single `<script>` block in [`index.html`](index.html). This includes:
  - **State Management**: A `state` object manages the application's state, including chats, messages, and user information.
  - **API Communication**: Functions like `sendMessage`, `handleNewChat`, and `loadDataFromServer` handle communication with the backend.
  - **UI Rendering**: Functions like `renderSidebar`, `renderChat`, and `renderModelDropdown` dynamically update the UI based on the application's state.
  - **Authentication**: The frontend handles user authentication through Supabase, with functions for sign-in, sign-up, and logout.

### 2.2. Backend

The backend provides the API endpoints for the frontend to consume.

- **[`Backend/server.js`](Backend/server.js)**: The main entry point of the backend server. It sets up the Express server, configures CORS, and registers the API routes.
- **[`Backend/routes/`](Backend/routes/)**: This directory contains the route definitions for different API resources:
  - **[`Backend/routes/auth.js`](Backend/routes/auth.js)**: Handles user authentication, including sign-up, sign-in, and sign-out.
  - **[`Backend/routes/chat.js`](Backend/routes/chat.js)**: Manages chat-related operations, such as creating, retrieving, and deleting chats and messages.
  - **[`Backend/routes/user.js`](Backend/routes/user.js)**: Provides an endpoint to retrieve the current user's details.
  - **[`Backend/routes/ai.js`](Backend/routes/ai.js)**: Proxies requests to external AI services for chat and image generation.
- **[`Backend/utils/`](Backend/utils/)**: This directory contains utility functions used across the backend:
  - **[`Backend/utils/messageUtils.js`](Backend/utils/messageUtils.js)**: Provides functions for processing and filtering messages.
  - **[`Backend/utils/titleGenerator.js`](Backend/utils/titleGenerator.js)**: Handles the automatic generation of chat titles.
- **[`Backend/config/supabaseClient.js`](Backend/config/supabaseClient.js)**: Initializes the Supabase client for backend use.

### 2.3. Database

The database schema is defined in [`database_schema.md`](database_schema.md) and includes the following tables:

- **`chats`**: Stores chat sessions, including the title, user ID, and study mode status.
- **`messages`**: Stores individual messages within a chat, including the role (user or assistant) and content.
- **`profiles`**: Stores user profile information, such as username and plan.
- **`user_preferences`**: Stores user-specific settings, such as theme and font preferences.

## 3. Data Flow

The application's data flow is designed to be unidirectional and easy to follow.

1.  **User Interaction**: The user interacts with the frontend, triggering events such as sending a message or creating a new chat.
2.  **API Request**: The frontend sends an API request to the backend with the relevant data.
3.  **Backend Processing**: The backend processes the request, interacts with the Supabase database or external AI services, and returns a response.
4.  **State Update**: The frontend receives the response and updates its state accordingly.
5.  **UI Re-render**: The UI is re-rendered to reflect the new state.

## 4. Authentication

Authentication is handled by Supabase, with the backend providing API endpoints for the frontend to use.

- **Sign-up/Sign-in**: Users can sign up or sign in with their email and password or through Google OAuth.
- **JWT Authentication**: The backend uses JSON Web Tokens (JWTs) to authenticate API requests. The JWT is stored in the browser's local storage and sent with each request.
- **Middleware**: The `authMiddleware` function in [`Backend/middleware/authMiddleware.js`](Backend/middleware/authMiddleware.js) protects authenticated routes by verifying the JWT.

## 5. Testing

The codebase includes a suite of tests to ensure the application's functionality and reliability.

- **[`test/testChatHistory.js`](test/testChatHistory.js)**: Tests the chat history functionality, including creating, retrieving, and deleting chats and messages.
- **[`test/testMissingTitles.js`](test/testMissingTitles.js)**: Tests the automatic generation of titles for chats that are missing them.
- **[`test/testTitleGeneration.js`](test/testTitleGeneration.js)**: Tests the title generation functionality for new chats.

## 6. Conclusion

The codebase is well-structured and follows modern development best practices. The separation of concerns between the frontend and backend makes it easy to maintain and extend. The use of Supabase for authentication and database services simplifies the backend architecture and reduces the amount of boilerplate code. The integration with external AI services is handled through a unified API, making it easy to swap out or add new services in the future.