# Caching and Performance Improvement Plan

## 1. Analysis of Current System

### Frontend (`index.html`)
- **`loadDataFromServer()`:** This function is the main performance bottleneck.
  - It fetches the user's profile.
  - It then fetches a list of all user chats.
  - It then **loops through every chat** and sends a separate request to fetch all messages for that chat.
- **Problem:** This "N+1" request pattern leads to a storm of network requests on initial load, making the login process feel very slow, especially for users with many chats.
- **State Management:** Uses a simple JavaScript object (`state`) and `localStorage` for persistence, with no robust caching.

### Backend (`/Backend/routes/chat.js`)
- The API endpoints for fetching chats (`/api/chat`) and messages (`/api/chat/:chatId/messages`) already support pagination (`page` and `limit` query parameters).
- The frontend currently does not make effective use of this pagination for the initial load.

## 2. Proposed Solution & Implementation Steps

The core of the solution is to shift from an "eager" loading strategy (fetch everything at once) to a "lazy" loading strategy (fetch data only when needed) and to cache data on the client to make subsequent loads feel instantaneous.

---

### Step 1: Implement Client-Side Caching with IndexedDB

We will use IndexedDB, a browser-based database, to store chats and messages locally. This will provide a persistent, queryable cache.

**`[ ]` Task 1.1: Create an IndexedDB Wrapper**
- Create a new JavaScript file, e.g., `db.js`, to manage all IndexedDB interactions.
- This wrapper should handle:
  - Opening the database.
  - Defining object stores for `chats` and `messages`.
  - Providing simple `get`, `put`, and `delete` methods for chats and messages.

**`[ ]` Task 1.2: Modify `loadDataFromServer` to Use Cache**
- On initial load, first attempt to populate the UI with data from IndexedDB.
- After loading from cache, start a background sync with the server to fetch updates.
- When new data arrives from the server, update both the UI and the IndexedDB cache.

### Step 2: Optimize the Data Loading Flow

**`[ ]` Task 2.1: Decouple Chat and Message Loading**
- Modify `loadDataFromServer` to **only** fetch the list of chats, not their messages.
- The initial server response for chats should be lean, containing just `id`, `title`, and `last_updated_at`.

**`[ ]` Task 2.2: Implement On-Demand Message Loading**
- When a user clicks on a chat in the sidebar (`setActive` function):
  - Check if messages for that chat are in IndexedDB.
    - If yes, load them instantly.
    - If no (or if data is stale), fetch the *first page* of messages from the server.
  - Store the fetched messages in IndexedDB.

### Step 3: Implement Message Pagination (Infinite Scroll)

This will prevent the application from loading thousands of messages for a single chat at once.

**`[ ]` Task 3.1: Add Scroll Event Listener**
- In `renderChat`, add a scroll event listener to the `chat-box-wrapper` element.
- When the user scrolls to the top of the chat history, trigger a function to load the next page of older messages.

**`[ ]` Task 3.2: Create a `loadMoreMessages` Function**
- This function will:
  - Keep track of the current page number for the active chat.
  - Fetch the next page of messages from `/api/chat/:chatId/messages?page=X`.
  - Prepend the new messages to the top of the chat display.
  - Update the messages in IndexedDB.

### Step 4: Server-Side and Database Optimizations

**`[ ]` Task 4.1: Optimize Backend Queries**
- Review the Supabase queries in `Backend/routes/chat.js`.
- Instead of `select('*')`, specify only the columns needed for each request to reduce payload size. For example, the initial chat list doesn't need the full `created_at` timestamp if a `last_updated` field is used for syncing.

**`[ ]` Task 4.2: (Optional) Introduce Server-Side Caching with Redis**
- For a future enhancement, a Redis cache can be added to the Node.js backend.
- Cache results of common queries, such as user profiles and the first page of messages for active chats.
- This will reduce the load on the Supabase database and speed up API responses.

## 3. High-Level Workflow Diagram

```mermaid
sequenceDiagram
    participant Client
    participant IndexedDB
    participant Server
    participant Supabase

    Client->>Client: App Load / Login
    Client->>IndexedDB: Get cached chats & messages
    IndexedDB-->>Client: Return cached data
    Client->>Client: Render UI instantly from cache

    Client->>Server: Fetch latest chats (background sync)
    Server->>Supabase: Get chats for user
    Supabase-->>Server: Return chats
    Server-->>Client: Return latest chats
    Client->>IndexedDB: Update chats in cache
    Client->>Client: Re-render sidebar with new data

    User->>Client: Clicks on a chat
    Client->>IndexedDB: Get messages for chat
    alt Messages are in cache
        IndexedDB-->>Client: Return cached messages
        Client->>Client: Render chat messages
    else Messages not in cache
        Client->>Server: Fetch first page of messages
        Server->>Supabase: Get messages (page 1)
        Supabase-->>Server: Return messages
        Server-->>Client: Return messages
        Client->>IndexedDB: Store new messages
        Client->>Client: Render chat messages
    end

    User->>Client: Scrolls to top of chat
    Client->>Server: Fetch next page of messages
    Server->>Supabase: Get messages (page N)
    Supabase-->>Server: Return messages
    Server-->>Client: Return messages
    Client->>IndexedDB: Store more messages
    Client->>Client: Prepend messages to chat view