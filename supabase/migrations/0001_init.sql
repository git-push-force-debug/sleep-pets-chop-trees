-- Sleep Pets & Chop Trees support: schema, row-level security and realtime.
-- All writes go through the API server's secret key; browsers only read what policies allow.

create table public.chat_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'bot' check (status in ('bot', 'waiting_human', 'human', 'resolved')),
  bot_paused boolean not null default false,
  chatwoot_display_id integer,
  last_chatwoot_message_id bigint not null default 0,
  roblox_username text,
  email text,
  page_url text,
  user_agent text,
  handoff_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index chat_sessions_user_idx on public.chat_sessions (user_id, created_at desc);
create index chat_sessions_status_idx on public.chat_sessions (status, updated_at desc);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.chat_sessions (id) on delete cascade,
  role text not null check (role in ('user', 'bot', 'agent', 'system')),
  content text not null,
  reply jsonb,
  chatwoot_message_id bigint unique,
  agent_name text,
  feedback smallint check (feedback in (-1, 1)),
  created_at timestamptz not null default now()
);
create index messages_session_idx on public.messages (session_id, created_at);

create table public.agents (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('admin', 'agent')),
  display_name text not null,
  created_at timestamptz not null default now()
);

-- Chatwoot widget tokens act as the player's identity in Chatwoot: server-only.
create table public.chatwoot_contacts (
  user_id uuid primary key references auth.users (id) on delete cascade,
  auth_token text not null,
  source_id text,
  created_at timestamptz not null default now()
);

create table public.faq_entries (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  dify_segment_id text,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.bot_gaps (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.chat_sessions (id) on delete set null,
  question text not null,
  top_score real,
  resolved boolean not null default false,
  created_at timestamptz not null default now()
);
create index bot_gaps_open_idx on public.bot_gaps (resolved, created_at desc);

create table public.retrieval_cache (
  key text primary key,
  dataset_id text not null,
  evidence jsonb not null,
  expires_at timestamptz not null
);

create table public.settings (
  id integer primary key check (id = 1),
  data jsonb not null
);
insert into public.settings (id, data) values (1, jsonb_build_object(
  'botEnabled', true,
  'greeting', 'Hi, I''m Pip! Ask me anything about Sleep Pets & Chop Trees.',
  'starterQuestions', jsonb_build_array('How do I rebirth?', 'How do I catch my first pet?', 'How do I get Wood fast?'),
  'offlineMessage', 'The team replies as soon as they can — usually within a day. Keep this page open or come back later on this device.',
  'evidenceThreshold', 0.3,
  'supportHours', 'Every day, 9:00–21:00 (Asia/Manila)'
));

create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (key, window_start)
);

create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;
create trigger chat_sessions_touch before update on public.chat_sessions
  for each row execute function public.touch_updated_at();
create trigger faq_entries_touch before update on public.faq_entries
  for each row execute function public.touch_updated_at();

create function public.is_agent() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.agents where user_id = (select auth.uid()));
$$;
revoke execute on function public.is_agent() from public, anon;
grant execute on function public.is_agent() to authenticated;

-- Fixed-window counter; returns true once the key is over its limit for the current window.
create function public.hit_rate_limit(p_key text, p_limit integer, p_window_seconds integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  w timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  c integer;
begin
  insert into public.rate_limits (key, window_start, count) values (p_key, w, 1)
  on conflict (key, window_start) do update set count = public.rate_limits.count + 1
  returning count into c;
  if random() < 0.01 then
    delete from public.rate_limits where window_start < now() - interval '1 day';
  end if;
  return c > p_limit;
end $$;
revoke execute on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;

alter table public.chat_sessions enable row level security;
alter table public.messages enable row level security;
alter table public.agents enable row level security;
alter table public.chatwoot_contacts enable row level security;
alter table public.faq_entries enable row level security;
alter table public.bot_gaps enable row level security;
alter table public.retrieval_cache enable row level security;
alter table public.settings enable row level security;
alter table public.rate_limits enable row level security;

create policy "players read own sessions, agents read all" on public.chat_sessions
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_agent()));

create policy "players read own messages, agents read all" on public.messages
  for select to authenticated
  using (
    exists (select 1 from public.chat_sessions s where s.id = session_id and s.user_id = (select auth.uid()))
    or (select public.is_agent())
  );

create policy "agents read the team list" on public.agents
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_agent()));

alter publication supabase_realtime add table public.chat_sessions, public.messages;
