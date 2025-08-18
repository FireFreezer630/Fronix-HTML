Of course. Here is a comprehensive todo list in Markdown format, detailing all the identified issues and proposed implementations from our discussion.

---

# Project Fronix: Codebase Improvement Todo List

This document outlines the necessary fixes, performance enhancements, and code health improvements for the Fronix application.

## Tier 1: High-Priority Bug Fixes & Performance

*These items address critical user experience issues and major performance bottlenecks.*

### [ ] 1. Fix Message Order Swapping on Refresh

-   **Status:** Not Started
-   **Priority:** **Critical**
-   **Description:** The most significant bug. When a user refreshes the page, the messages in a chat are loaded from the database in an incorrect order, causing user and AI responses to swap places. This happens because the database queries that fetch chats and their nested messages are missing an `ORDER BY` clause for the messages.
-   **Implementation Steps:**
    1.  **Location:** Backend file `user.js`.
    2.  **Action:** Modify the Supabase queries in both the `/bootstrap` and `/pre-fetch` API endpoints.
    3.  **Code Change:** In the `.select()` statement for chats, add an `order` modifier to the nested `messages` query.
        ```javascript
        // Change this:
        .select('... messages(id, role, content, created_at)')

        // To this:
        .select('... messages(id, role, content, created_at, order: "created_at")')
        ```
    4.  **Verification:** After deploying the change, log in and hard-refresh the page multiple times to confirm the chat history remains in the correct chronological order.

### [ ] 2. Implement Message Pagination (Lazy Loading)

-   **Status:** Not Started
-   **Priority:** **High**
-   **Description:** Currently, the application loads *all messages for all chats* upon login. This will become extremely slow for users with long chat histories, leading to long initial load times and high memory usage. The solution is to only load the list of chats initially and then fetch messages for a specific chat on demand as the user needs them.
-   **Implementation Steps:**
    1.  **Backend (`user.js`):**
        -   Modify the `/bootstrap` and `/pre-fetch` endpoints to **remove** the nested messages from the query. The frontend should only receive a list of chats.
    2.  **Backend (`chat.js`):**
        -   Modify the existing `/api/chat/:chatId/messages` endpoint to support pagination. It should accept `page` and `limit` query parameters.
        -   The query should use Supabase's `.range()` function to fetch a specific slice of messages (e.g., the 50 most recent).
        -   The response should include the messages, the current page, and the total number of pages.
    3.  **Frontend (`index.html`):**
        -   Modify the `setActive(chatId)` function. When a user clicks a chat, it should now trigger a network request to the new paginated endpoint to fetch the first page of messages.
        -   Implement an "infinite scroll" listener on the chat box. When the user scrolls to the top, fetch the next page of older messages and prepend them to the view.

### [ ] 3. Add Critical Database Indexes

-   **Status:** Not Started
-   **Priority:** **High**
-   **Description:** Without proper indexes, the database will slow down significantly as the `chats` and `messages` tables grow. Adding indexes to frequently queried columns is the most effective way to ensure long-term performance.
-   **Implementation Steps:**
    1.  **Location:** Supabase Dashboard > SQL Editor.
    2.  **Action:** Execute the following SQL commands to create the necessary indexes.
        ```sql
        -- Speeds up fetching all chats for a specific user
        CREATE INDEX idx_chats_user_id_created_at ON public.chats (user_id, created_at DESC);

        -- Speeds up fetching all messages for a specific chat
        CREATE INDEX idx_messages_chat_id_created_at ON public.messages (chat_id, created_at DESC);

        -- Speeds up security policy checks and other user-specific lookups
        CREATE INDEX idx_messages_user_id ON public.messages (user_id);
        ```

---

## Tier 2: Reliability & Perceived Performance

*These items improve the application's robustness and make it feel faster to the user.*

### [ ] 4. Implement Instant Client-Side Load on Refresh

-   **Status:** Not Started
-   **Priority:** Medium
-   **Description:** On a page refresh, the app feels slow because it waits for the `/bootstrap` network call to complete before rendering any user data. We can make it feel instant by validating the existing session token on the client, loading the cached UI from `localStorage` immediately, and then syncing with the server in the background.
-   **Implementation Steps:**
    1.  **Frontend (`index.html`):**
        -   Create a JavaScript function `isTokenExpired(token)` that decodes the JWT payload and checks if its expiration timestamp (`exp`) is in the past.
        -   In the `init()` function, check if a token exists in `localStorage` and if it's not expired using your new function.
        -   If the token is valid, immediately call `loadState()` to render the cached chats from the last session.
        -   After rendering the cached state, proceed to call `loadDataFromServer()` to fetch fresh data and update the UI if anything has changed.

### [ ] 5. Improve Message Error Handling Reliability

-   **Status:** Not Started
-   **Priority:** Medium
-   **Description:** When sending a message fails, the current error handling uses `messages.pop()` to remove the optimistic UI updates. This is fragile and can lead to removing the wrong messages if network conditions are unusual.
-   **Implementation Steps:**
    1.  **Frontend (`index.html`):**
        -   In the `sendMessage` function, when creating the optimistic user and assistant messages, assign them temporary, unique IDs (e.g., `id: 'temp-user-12345'`).
        -   In the `catch` block for error handling, instead of calling `.pop()`, use `.findIndex()` to locate the messages by their temporary IDs and then use `.splice()` to remove them reliably. This ensures only the correct, failed messages are removed.

---

## Tier 3: Code Health & Security Hardening

*These items focus on long-term maintainability and best practices.*

### [ ] 6. Harden User Enumeration Vector

-   **Status:** Not Started
-   **Priority:** Low
-   **Description:** The `/api/user/pre-fetch` endpoint could potentially allow an attacker to guess which emails are registered with the service based on response time or content. The current implementation with background warming is a good mitigation, but it should be reviewed to ensure it's fully secure.
-   **Implementation Steps:**
    1.  **Backend (`user.js`):**
        -   Review the `/pre-fetch` endpoint.
        -   Ensure that the response sent to the client is **always** `202 Accepted` and is sent **immediately**, regardless of whether the email exists or not. The cache warming process should happen entirely in the background and not affect the response timing.

### [ ] 7. Fix Inconsistent Content Rendering

-   **Status:** Not Started
-   **Priority:** Low
-   **Description:** The frontend code correctly parses user messages that might contain JSON, but it does not apply the same logic to assistant messages. This is a latent bug that could cause rendering issues if the AI ever returns a JSON object.
-   **Implementation Steps:**
    1.  **Frontend (`index.html`):**
        -   In the `renderChat` function, locate the `else` block responsible for rendering assistant messages.
        -   Copy the `try...catch` block that attempts to `JSON.parse()` the message content from the user message rendering logic into the assistant message block.

### [ ] 8. General Code Cleanup

-   **Status:** Not Started
-   **Priority:** Low
-   **Description:** The codebase contains unused functions and variables left over from previous development, which adds clutter and can be confusing for future maintenance.
-   **Implementation Steps:**
    1.  **Frontend (`index.html`):**
        -   Remove the unused `generateImage` function.
        -   Remove the unused `config` constant (`const config = { API_ENDPOINT: '...' };`).
        -   Search for any other variables or functions that are declared but never called.