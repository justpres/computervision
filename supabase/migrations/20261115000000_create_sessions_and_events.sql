-- Create study sessions and observable events tables with Row Level Security.
-- Stores only session timestamps, threshold settings, and debounced event metadata.
-- Zero video frames, images, or facial landmark coordinates are stored.

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  ended_at timestamptz null,
  consented_at timestamptz not null,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  event_type text not null check (
    event_type in ('eyes_closed', 'long_eye_closure', 'head_turned', 'looking_away')
  ),
  started_at timestamptz not null,
  duration_ms integer not null check (duration_ms >= 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_sessions_user_started_at
  on public.sessions(user_id, started_at desc);

create index if not exists idx_events_session_id
  on public.events(session_id);

create index if not exists idx_events_user_id
  on public.events(user_id);

-- Enable Row Level Security in the same migration
alter table public.sessions enable row level security;
alter table public.events enable row level security;

-- RLS Policies for public.sessions scoped strictly to the authenticated owner
create policy "Users can select own sessions"
  on public.sessions
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own sessions"
  on public.sessions
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own sessions"
  on public.sessions
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own sessions"
  on public.sessions
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);

-- RLS Policies for public.events scoped strictly to the authenticated owner
create policy "Users can select own events"
  on public.events
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can insert own events"
  on public.events
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can update own events"
  on public.events
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete own events"
  on public.events
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
