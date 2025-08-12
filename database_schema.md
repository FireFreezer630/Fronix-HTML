# Database Schema for Vision Support

## Messages Table Content Structure

The `messages` table `content` column now supports both text and JSON structures:

### Text Messages
```sql
content: "Simple text message"
```

### Multimodal Messages (Images + Text)
```sql
content: '[
  {
    "type": "text",
    "text": "What's in this image?"
  },
  {
    "type": "image_url", 
    "image_url": {
      "url": "https://supabase-url/storage/v1/object/public/chat_images/user123/timestamp-randomid.jpg",
      "detail": "high"
    }
  }
]'
```

## Database Changes Applied

1. **Supabase Storage Bucket**: `chat_images` bucket created with RLS policies
2. **Message Content**: Now stores JSON strings for multimodal content
3. **Foreign Key**: Fixed messages.chat_id foreign key constraint
4. **Indexes**:
   - CREATE INDEX IF NOT EXISTS idx_messages_chat_created ON public.messages (chat_id, created_at DESC);
   - CREATE INDEX IF NOT EXISTS idx_chats_user_updated ON public.chats (user_id, created_at DESC);

## RLS Policies Applied

```sql
-- Policy 1: Allow authenticated users to view any image in the bucket
CREATE POLICY "Authenticated users can view images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'chat_images');

-- Policy 2: Allow users to upload images
CREATE POLICY "Users can upload images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat_images' AND auth.uid() = owner);

-- Policy 3: Allow users to delete their own images
CREATE POLICY "Users can delete their own images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat_images' AND auth.uid() = owner);
```

## Content Parsing

- **Frontend**: Automatically detects JSON strings and parses them for display
- **Backend**: Stores multimodal content as JSON strings
- **API**: Handles both text and array content structures seamlessly

## Database Schema
 -- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.chats (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text,
  study_mode boolean NOT NULL DEFAULT false,
  title_generated boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT chats_pkey PRIMARY KEY (id),
  CONSTRAINT chats_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.messages (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  chat_id bigint NOT NULL,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  role text NOT NULL,
  content jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT messages_pkey PRIMARY KEY (id),
  CONSTRAINT messages_chat_id_fkey FOREIGN KEY (chat_id) REFERENCES public.chats(id),
  CONSTRAINT messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.profiles (
  user_id uuid NOT NULL,
  username text NOT NULL,
  avatar_url text,
  plan text NOT NULL DEFAULT 'basic'::text,
  CONSTRAINT profiles_pkey PRIMARY KEY (user_id),
  CONSTRAINT profiles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_preferences (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL UNIQUE,
  theme text DEFAULT 'dark'::text,
  font_family text DEFAULT 'inter'::text,
  font_weight text DEFAULT '400'::text,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);