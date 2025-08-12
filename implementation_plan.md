# Implementation Plan

This document outlines the plan for implementing the new features and fixes as per the user's request.

## 1. High-Level Caching

To improve performance, we will implement a high-level caching mechanism in the backend. This will allow us to pre-fetch user data when a user enters their email, making the login process feel faster.

### 1.1. Caching Strategy

We will use an in-memory cache to store user data. This is a simple and effective solution for a single-server setup. If the application scales to multiple servers, we can consider using a distributed cache like Redis.

### 1.2. Implementation Steps

1.  **Create a new route**: We will create a new API endpoint (e.g., `/api/user/pre-fetch`) that accepts a user's email address.
2.  **Fetch user data**: When this endpoint is called, the backend will fetch the user's data from the database (chats, messages, etc.).
3.  **Store data in cache**: The fetched data will be stored in the in-memory cache with the user's email as the key.
4.  **Update frontend**: The frontend will be updated to call this new endpoint when the user enters their email in the login form.
5.  **Retrieve data from cache**: When the user logs in, the backend will first check the cache for the user's data. If the data is found, it will be returned immediately. Otherwise, it will be fetched from the database.

## 2. Improved Local Storage

We will enhance the local storage implementation to provide a better user experience.

### 2.1. Longer Logged-In Duration

We will use `localStorage` to store the user's session information. This will allow the user to stay logged in for a longer period, even after closing the browser.

### 2.2. Local Chat Storage

To improve performance and enable offline access, we will explore options for storing chat data locally. We will consider using `IndexedDB` for this purpose, as it is well-suited for storing large amounts of structured data.

## 3. Fix Google Login Redirect

The Google login flow is currently redirecting to `localhost` instead of the production URL. This is because the redirect URI is not correctly configured in the Supabase project settings.

### 3.1. Instructions for Fixing the Redirect

To fix this, you will need to update the redirect URI in your Supabase project settings:

1.  Go to your Supabase project dashboard.
2.  Navigate to **Authentication** > **Providers**.
3.  Select **Google** from the list of providers.
4.  In the **Redirect URIs** field, add `https://fronix.netlify.app` to the list of allowed redirect URIs.
5.  Save the changes.

After updating the redirect URI, the Google login flow should correctly redirect to the production URL.

## 4. Todo List

- [ ] Implement backend caching for user data.
- [ ] Enhance local storage for longer logged-in duration.
- [ ] Explore options for local chat storage with IndexedDB.
- [ ] Provide instructions for fixing the Google login redirect.