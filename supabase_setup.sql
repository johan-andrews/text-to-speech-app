-- =====================================================================
-- VOICEFLOW AI - CONSOLIDATED SUPABASE SCHEMA
-- Copy and paste this script directly into your Supabase SQL Editor
-- (Supabase Dashboard -> SQL Editor -> New Query -> Run)
-- =====================================================================

-- 1. Ensure the Profiles table exists (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id           uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  avatar_url   text,
  plan_type    text        NOT NULL DEFAULT 'free',
  created_at   timestamptz DEFAULT now(),
  updated_at   timestamptz DEFAULT now()
);

-- Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Profiles are publicly readable"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);


-- 2. Trigger to automatically create a profile when a user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id)
  VALUES (new.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 3. Dictation Sessions Table
CREATE TABLE IF NOT EXISTS public.dictation_sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  raw_text      text,
  cleaned_text  text,
  provider      text,               -- API provider (e.g., 'assemblyai', 'deepgram', etc.)
  duration_ms   integer,            -- Transcription latency or audio duration
  audio_uri     text,               -- Local URI (metadata)
  language      text DEFAULT 'en',
  title         text,               -- Session title
  is_starred    boolean DEFAULT false,
  is_deleted    boolean DEFAULT false,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Enable RLS on Dictation Sessions
ALTER TABLE public.dictation_sessions ENABLE ROW LEVEL SECURITY;

-- Session policies (All operations restricted to the owning user)
CREATE POLICY "Users manage own sessions"
  ON public.dictation_sessions FOR ALL 
  USING (auth.uid() = user_id);


-- 4. Custom Vocabulary Table
CREATE TABLE IF NOT EXISTS public.custom_vocabulary (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  word       text NOT NULL,
  category   text,                  -- e.g. 'medical', 'legal', 'tech'
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on Custom Vocabulary
ALTER TABLE public.custom_vocabulary ENABLE ROW LEVEL SECURITY;

-- Vocabulary policies (All operations restricted to the owning user)
CREATE POLICY "Users manage own vocabulary"
  ON public.custom_vocabulary FOR ALL 
  USING (auth.uid() = user_id);


-- 5. Performance and Query Optimizations
CREATE INDEX IF NOT EXISTS dictation_sessions_user_created
  ON public.dictation_sessions(user_id, created_at desc)
  WHERE is_deleted = false;
