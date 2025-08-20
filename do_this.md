# Actions for You

This file contains a list of actions you need to perform manually. Please check off items as you complete them.

- [ ] **Phase 1: Initial Setup**
    1.  **Configure Google OAuth in Google Cloud Console:**
        - Go to the Google Cloud Console.
        - Create an OAuth 2.0 Client ID for a "Web application".
        - Add the authorized redirect URI: `https://<your-supabase-project-id>.supabase.co/auth/v1/callback` (replace `<your-supabase-project-id>` with your actual Supabase project ID).
        - Copy the Client ID and Client Secret.
    2.  **Configure Google Provider in Supabase:**
        - Go to your Supabase Project Dashboard > Authentication > Providers > Google.
        - Enable the Google provider.
        - Paste the Client ID and Client Secret you copied from the Google Cloud Console.
        - Save the configuration.
    3.  **Enable Row-Level Security (RLS):**
        - In your Supabase Dashboard, go to the SQL Editor.
        - Run the following SQL commands to enable RLS and create policies that allow users to access their own data:
        ```sql
        -- Enable RLS on chats and messages tables
        alter table public.chats enable row level security;
        alter table public.messages enable row level security;

        -- Create policies for the 'chats' table
        create policy "Users can view their own chats." on public.chats for select using (auth.uid() = user_id);
        create policy "Users can create their own chats." on public.chats for insert with check (auth.uid() = user_id);
        create policy "Users can update their own chats." on public.chats for update using (auth.uid() = user_id);
        create policy "Users can delete their own chats." on public.chats for delete using (auth.uid() = user_id);

        -- Create policies for the 'messages' table
        create policy "Users can view their own messages." on public.messages for select using (auth.uid() = user_id);
        create policy "Users can create their own messages." on public.messages for insert with check (auth.uid() = user_id);
        create policy "Users can update their own messages." on public.messages for update using (auth.uid() = user_id);
        create policy "Users can delete their own messages." on public.messages for delete using (auth.uid() = user_id);
        ```

- [ ] **Phase 1: Local Testing Configuration**
    1.  **Update API_BASE_URL for Local Testing:**
        - In `index.html`, find the line `const API_BASE_URL = 'https://fronix-html.onrender.com';`.
        - For local testing, temporarily change it to `const API_BASE_URL = 'http://localhost:3001';`.
        - **Important:** Remember to change this back to the production URL before deploying your changes.