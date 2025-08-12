# Bug Fix Plan

This document outlines the plan for fixing the race condition that occurs when a new user logs in with Google.

## 1. The Problem

The error logs indicate that the `handleNewChat` function is being called before the user's data is fully loaded from the server. This results in a race condition where the frontend tries to create a new chat before it has the necessary user information.

## 2. The Solution

To fix this, we will implement the following changes:

1.  **Refactor `loadDataFromServer`**: We will modify the `loadDataFromServer` function in `index.html` to only create a new chat if the user has no existing chats. This will prevent the function from being called unnecessarily.
2.  **Add a `user` route**: We will add a new route to `Backend/routes/user.js` to fetch user data by email. This will allow the frontend to pre-fetch user data and avoid the race condition.
3.  **Update `index.html`**: We will update the frontend to call the new `/api/user/email/:email` route when the user enters their email address.

## 3. Implementation Steps

1.  **Modify `loadDataFromServer`**:
    -   In `index.html`, locate the `loadDataFromServer` function.
    -   Add a condition to check if `state.chats.length === 0` before calling `handleNewChat`.
2.  **Add the new route**:
    -   In `Backend/routes/user.js`, add a new route: `router.get('/email/:email', async (req, res) => { ... });`
    -   This route will fetch the user's data from the database and return it to the frontend.
3.  **Update `index.html`**:
    -   In `index.html`, locate the `handleSignIn` function.
    -   Add a call to the new `/api/user/email/:email` route when the user enters their email address.
    -   Store the returned user data in the `state` object.

## 4. Todo List

- [ ] Refactor `loadDataFromServer` to prevent unnecessary calls to `handleNewChat`.
- [ ] Add a new route to `Backend/routes/user.js` to fetch user data by email.
- [ ] Update `index.html` to pre-fetch user data.