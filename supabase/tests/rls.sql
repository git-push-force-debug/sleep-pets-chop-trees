-- RLS assertions. Run with the Supabase MCP execute_sql. The block always raises, so every change rolls back:
--   'RLS_OK …' means all assertions passed; 'RLS_FAIL …' names the first failure.
do $$
declare
  a uuid := 'aaaaaaaa-0000-4000-8000-000000000001';
  b uuid := 'bbbbbbbb-0000-4000-8000-000000000002';
  c uuid := 'cccccccc-0000-4000-8000-000000000003';
  n int;
  over boolean;
begin
  insert into auth.users (id, instance_id, aud, role, email)
  values (a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-a@test.invalid'),
         (b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-b@test.invalid'),
         (c, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'rls-c@test.invalid');
  insert into public.chat_sessions (id, user_id) values ('aaaaaaaa-1111-4000-8000-000000000001', a), ('bbbbbbbb-1111-4000-8000-000000000002', b);
  insert into public.messages (session_id, role, content)
  values ('aaaaaaaa-1111-4000-8000-000000000001', 'user', 'hi from a'), ('bbbbbbbb-1111-4000-8000-000000000002', 'user', 'hi from b');
  insert into public.chatwoot_contacts (user_id, auth_token) values (a, 'secret-token-a');
  insert into public.agents (user_id, role, display_name) values (c, 'agent', 'Casey');

  -- Player A
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', a, 'role', 'authenticated')::text, true);
  select count(*) into n from public.chat_sessions; if n <> 1 then raise exception 'RLS_FAIL player sees % sessions', n; end if;
  select count(*) into n from public.messages; if n <> 1 then raise exception 'RLS_FAIL player sees % messages', n; end if;
  select count(*) into n from public.chatwoot_contacts; if n <> 0 then raise exception 'RLS_FAIL player sees % chatwoot tokens', n; end if;
  select count(*) into n from public.settings; if n <> 0 then raise exception 'RLS_FAIL player reads settings'; end if;
  begin
    perform public.hit_rate_limit('x', 1, 60);
    raise exception 'RLS_FAIL player can call hit_rate_limit';
  exception when insufficient_privilege then null;
  end;

  -- Agent C
  perform set_config('request.jwt.claims', json_build_object('sub', c, 'role', 'authenticated')::text, true);
  select count(*) into n from public.chat_sessions; if n <> 2 then raise exception 'RLS_FAIL agent sees % sessions', n; end if;
  select count(*) into n from public.messages; if n <> 2 then raise exception 'RLS_FAIL agent sees % messages', n; end if;
  select count(*) into n from public.chatwoot_contacts; if n <> 0 then raise exception 'RLS_FAIL agent sees chatwoot tokens'; end if;

  -- Server (back to the owner role)
  perform set_config('role', 'postgres', true);
  over := public.hit_rate_limit('rls-test', 2, 60); if over then raise exception 'RLS_FAIL rate limit hit on call 1'; end if;
  over := public.hit_rate_limit('rls-test', 2, 60); if over then raise exception 'RLS_FAIL rate limit hit on call 2'; end if;
  over := public.hit_rate_limit('rls-test', 2, 60); if not over then raise exception 'RLS_FAIL rate limit not hit on call 3'; end if;

  raise exception 'RLS_OK all assertions passed';
end $$;
