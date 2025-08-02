# Fronix.ai Codebase Analysis

This document provides a detailed analysis of the Fronix.ai application, covering its architecture, technology stack, and key features.

## 1. Frontend Architecture and Technology Stack

The Fronix.ai frontend is a single-page application (SPA) built with vanilla JavaScript, HTML, and Tailwind CSS. This approach prioritizes performance and avoids framework-specific overhead.

### Key Technologies:

*   **HTML5**: The core structure is defined in [`index.html`](index.html:1), which serves as the single entry point for the application.
*   **Tailwind CSS**: A utility-first CSS framework is used for styling, configured directly within the HTML file. This allows for rapid and consistent UI development.
*   **Vanilla JavaScript**: All application logic is written in plain JavaScript, without frameworks like React or Vue. The code is embedded within a `<script>` tag in [`index.html`](index.html:355).
*   **Supabase Client**: The official Supabase JavaScript client is used for interacting with the backend for authentication and database operations.
*   **Marked.js**: A Markdown parser is used to render chat messages, allowing for rich text formatting.
*   **KaTeX**: A math typesetting library is integrated for rendering mathematical formulas within chat messages.
*   **Highlight.js**: This library provides syntax highlighting for code blocks in chat messages, improving readability.
*   **Anime.js**: A lightweight animation library is used for creating dynamic and engaging UI animations.

### Architectural Patterns:

*   **Single-Page Application (SPA)**: The application operates as an SPA, with all UI updates and interactions handled dynamically on the client-side.
*   **State Management**: A global `state` object is used to manage the application's state, including user information, chat history, and settings. This object is persisted to local storage.
*   **Component-like Structure**: The JavaScript code is organized into functions that manage specific UI components (e.g., sidebar, chat, modals), mimicking a component-based architecture.
*   **Event-Driven**: The application is event-driven, with user interactions triggering functions that update the state and re-render the UI.

This lightweight and efficient frontend architecture is well-suited for a real-time chat application, providing a responsive and customizable user experience.

## 2. Backend API Structure and Endpoints

The backend of Fronix.ai is built using Node.js and the Express framework, providing a RESTful API for the frontend to interact with. The server is configured to handle JSON requests and includes middleware for authentication and CORS.

### Core Server Setup (`Backend/server.js`)

*   **Framework**: Express.js
*   **Port**: Configurable via `process.env.PORT` or defaults to 3001.
*   **CORS Configuration**: Implemented with specific allowed origins for security.
*   **JSON Parsing**: `express.json()` middleware is used to parse incoming JSON requests.
*   **Global Error Handler**: A middleware is in place to catch and log errors, with specific handling for CORS errors.

### API Routes

The backend exposes several API endpoints, categorized by their functionality:

#### Authentication (`Backend/routes/auth.js`)

*   `POST /api/auth/signup`: Registers a new user with email and password.
*   `POST /api/auth/signin`: Authenticates an existing user with email and password.
*   `POST /api/auth/logout`: Logs out the authenticated user.

#### Chat Management (`Backend/routes/chat.js`)

*   `GET /api/chat`: Retrieves all chats for the authenticated user.
*   `POST /api/chat`: Creates a new chat for the authenticated user.
*   `GET /api/chat/:chatId/messages`: Retrieves all messages for a specific chat belonging to the authenticated user.
*   `POST /api/chat/:chatId/save-messages`: Saves user and assistant messages for a given chat.
*   `PUT /api/chat/:chatId`: Updates the title of an existing chat.
*   `DELETE /api/chat/:chatId`: Deletes a chat and its associated messages.
*   `POST /api/chat/upload-image`: Uploads an image to Supabase storage.
*   `DELETE /api/chat/cleanup-images`: Cleans up orphaned images from Supabase storage.

#### User Information (`Backend/routes/user.js`)

*   `GET /api/user/me`: Retrieves the current authenticated user's details.

#### AI Services (`Backend/routes/ai.js`)

*   `POST /api/ai/chat`: Handles chat interactions with AI models, supporting streaming responses and multimodal input (text and images). It includes a sophisticated API key management system with automatic key rotation for different AI providers and models.
*   `POST /api/ai/images/generations`: Handles image generation requests, supporting various models and parameters.

### Middleware

*   **Authentication Middleware**: [`Backend/middleware/authMiddleware.js`](Backend/middleware/authMiddleware.js) - Verifies JWT tokens from the `Authorization` header to authenticate requests. It attaches the user object to the request for use in route handlers.

This backend structure provides a robust API for managing user data, chat history, and interacting with AI services.

## 3. Authentication and Authorization Flow

The application employs a JWT-based authentication system managed by Supabase.

### Authentication Process:

1.  **Sign Up/Sign In**: Users can sign up or sign in via email/password or Google OAuth. These actions are handled by the `/api/auth` routes, which interact with Supabase Auth.
2.  **Token Generation**: Upon successful sign-in, Supabase provides JWT tokens (access and refresh tokens).
3.  **Token Storage**: The frontend stores the `authToken` in `localStorage`.
4.  **Token Validation**: The `authMiddleware.js` intercepts incoming requests. It extracts the token from the `Authorization` header and uses `supabase.auth.getUser(token)` to validate it and retrieve user information.
5.  **User Attachment**: If the token is valid, the authenticated user object is attached to the `req.user` property, making it available to subsequent route handlers.
6.  **Protected Routes**: Routes requiring authentication (e.g., chat, user, AI endpoints) are protected by the `authMiddleware`.

### Authorization:

*   **User-Specific Data**: The backend ensures that users can only access and modify their own data (chats, messages) by querying Supabase with `user_id` filters.
*   **Supabase RLS**: Row Level Security policies in Supabase further enforce data access control at the database level, ensuring that users can only interact with their own records.

This flow ensures secure and authorized access to user-specific data and AI functionalities.