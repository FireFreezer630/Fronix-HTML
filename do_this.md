# Actions for You

This file contains a list of actions you need to perform manually. Please check off items as you complete them.

- [ ] **Increase Login Duration to One Week**
    -   To increase the login duration, you need to change the "Refresh token lifetime" in your Supabase project settings.
    -   1. Go to your Supabase project dashboard.
    -   2. In the left sidebar, click on the **Authentication** icon, then click on **Settings**.
    -   3. Scroll down to the "Tokens" section.
    -   4. In the **"Refresh token lifetime"** field, enter `604800` (which is 7 days in seconds).
    -   5. Click the **"Save"** button.

- [ ] **Backfill Missing User Profiles**
    -   Run the following SQL script in your Supabase SQL Editor to create profiles for users who signed up before the `profiles` table was created:
        ```sql
        INSERT INTO public.profiles (user_id, username)
        SELECT
            id,
            COALESCE(raw_user_meta_data->>'username', email) AS username
        FROM
            auth.users
        WHERE
            id NOT IN (SELECT user_id FROM public.profiles);
        ```

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
