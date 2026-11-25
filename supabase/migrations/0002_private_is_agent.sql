-- Move the policy helper out of the REST-exposed public schema (advisor 0029).
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

create function private.is_agent() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.agents where user_id = (select auth.uid()));
$$;
revoke execute on function private.is_agent() from public, anon;
grant execute on function private.is_agent() to authenticated;

drop policy "players read own sessions, agents read all" on public.chat_sessions;
drop policy "players read own messages, agents read all" on public.messages;
drop policy "agents read the team list" on public.agents;
drop function public.is_agent();

create policy "players read own sessions, agents read all" on public.chat_sessions
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_agent()));

create policy "players read own messages, agents read all" on public.messages
  for select to authenticated
  using (
    exists (select 1 from public.chat_sessions s where s.id = session_id and s.user_id = (select auth.uid()))
    or (select private.is_agent())
  );

create policy "agents read the team list" on public.agents
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_agent()));
