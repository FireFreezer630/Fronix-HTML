# Actions for You

This file contains a list of actions you need to perform manually. Please check off items as you complete them.

- [ ] **Phase 2: Grant Pro Access to Users**
    -   **No database schema changes are needed.** The existing `profiles` table and `plan` column are sufficient.
    -   To grant a user "pro" access, you need to manually update their plan in the database.
    -   You can do this by running the following SQL command in your Supabase SQL Editor.
    -   **Important:** Replace `<user_id>` with the actual `id` of the user from the `auth.users` table.
        ```sql
        UPDATE public.profiles
        SET plan = 'pro'
        WHERE user_id = '<user_id>';
        ```

- [ ] **Future Reminders**
    -   Remind me to change the `airforce.ai` cooldown from 1 minute to 25 seconds in the future.
    -   Remind me to ask you for new APIs when you are ready.
    -   Revert the temporary CORS change in `Backend/server.js`.
