-- Dictation sessions
create table if not exists dictation_sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references auth.users(id) on delete cascade,
  raw_text      text,
  cleaned_text  text,
  provider      text,               -- which API was used
  duration_ms   integer,            -- transcription latency
  audio_uri     text,               -- local URI (not stored remotely in v1)
  language      text default 'en',
  title         text,               -- auto-generated from first sentence
  is_starred    boolean default false,
  is_deleted    boolean default false,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- Custom vocabulary per user
create table if not exists custom_vocabulary (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  word       text not null,
  category   text,                  -- e.g. 'medical', 'legal', 'tech'
  created_at timestamptz default now()
);

-- RLS
alter table dictation_sessions enable row level security;
alter table custom_vocabulary enable row level security;

drop policy if exists "Users manage own sessions" on dictation_sessions;
create policy "Users manage own sessions"
  on dictation_sessions for all using (auth.uid() = user_id);

drop policy if exists "Users manage own vocabulary" on custom_vocabulary;
create policy "Users manage own vocabulary"
  on custom_vocabulary for all using (auth.uid() = user_id);

-- Index for history feed
create index if not exists dictation_sessions_user_created
  on dictation_sessions(user_id, created_at desc)
  where is_deleted = false;
