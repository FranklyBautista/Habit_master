begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(47);

-- Estructura y permisos ---------------------------------------------------------

select has_table('public', 'group_messages', 'group_messages exists');
select is(
  (select relrowsecurity from pg_class where oid = 'public.group_messages'::regclass),
  true,
  'group_messages has RLS enabled'
);
select policies_are(
  'public',
  'group_messages',
  array['group_messages_select_member'],
  'group_messages only has the member select policy that Realtime needs'
);
select is(
  (select array_agg(cmd::text) from pg_policies
   where schemaname = 'public' and tablename = 'group_messages'),
  array['SELECT'],
  'the only policy on group_messages is for select'
);
select ok(
  not has_table_privilege('anon', 'public.group_messages', 'select,insert,update,delete')
  and not has_table_privilege('authenticated', 'public.group_messages', 'insert,update,delete'),
  'clients cannot write group messages directly'
);
select ok(
  has_column_privilege('authenticated', 'public.group_messages', 'id', 'select')
  and has_column_privilege('authenticated', 'public.group_messages', 'group_id', 'select')
  and not has_column_privilege('authenticated', 'public.group_messages', 'body', 'select')
  and not has_column_privilege('authenticated', 'public.group_messages', 'user_id', 'select')
  and not has_column_privilege('authenticated', 'public.group_messages', 'created_at', 'select'),
  'clients can only read the id and group id of a message (the Realtime signal)'
);
select ok(
  exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'group_messages'
  ),
  'group_messages is published for Realtime'
);
select is(
  (select array_agg(p.proname::text order by p.proname)
   from pg_proc p
   join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'private'
     and has_function_privilege('authenticated', p.oid, 'execute')),
  array['is_group_member'],
  'the only private function clients can execute is the membership check'
);
select ok(
  not has_function_privilege('anon', 'public.send_group_message(uuid, text, uuid)', 'execute')
  and not has_function_privilege('anon', 'public.get_group_messages(uuid, timestamptz, uuid, integer)', 'execute')
  and not has_function_privilege('anon', 'public.delete_group_message(uuid)', 'execute')
  and has_function_privilege('authenticated', 'public.send_group_message(uuid, text, uuid)', 'execute'),
  'chat RPCs are for signed-in users only'
);

-- Datos -------------------------------------------------------------------------

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'ana@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'beto@example.test'),
  ('33333333-3333-4333-8333-333333333333', 'caro@example.test'),
  ('44444444-4444-4444-8444-444444444444', 'dani@example.test');

update public.profiles set display_name = 'Ana', user_code = 'AAAA1111'
where id = '11111111-1111-4111-8111-111111111111';
update public.profiles set display_name = 'Beto', user_code = 'BBBB2222'
where id = '22222222-2222-4222-8222-222222222222';
update public.profiles set display_name = 'Caro', user_code = 'CCCC3333'
where id = '33333333-3333-4333-8333-333333333333';
update public.profiles set display_name = 'Dani', user_code = 'DDDD4444'
where id = '44444444-4444-4444-8444-444444444444';

set local role authenticated;

set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select set_config('test.group_id', public.create_group('Familia')::text, true);
select public.invite_to_group(current_setting('test.group_id')::uuid, 'BBBB2222');
select public.invite_to_group(current_setting('test.group_id')::uuid, 'DDDD4444');

set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
select public.respond_invitation((select id from public.get_my_invitations()), true);
set local request.jwt.claim.sub = '44444444-4444-4444-8444-444444444444';
select public.respond_invitation((select id from public.get_my_invitations()), true);

-- Un miembro escribe y lee ------------------------------------------------------

set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
select set_config(
  'test.beto_message',
  public.send_group_message(current_setting('test.group_id')::uuid, E'  ¡Hoy toca caminar!\n ')::text,
  true
);
select ok(
  current_setting('test.beto_message') ~ '^[0-9a-f-]{36}$',
  'a member sends a message and gets its id'
);

set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select results_eq(
  format(
    $$select body, author_name, is_mine, member_id is not null
      from public.get_group_messages(%L)$$,
    current_setting('test.group_id')
  ),
  $$values ('¡Hoy toca caminar!'::text, 'Beto'::text, false, true)$$,
  'other members read the trimmed message with the author display name'
);
set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
select results_eq(
  format($$select is_mine from public.get_group_messages(%L)$$, current_setting('test.group_id')),
  $$values (true)$$,
  'the author sees the message as their own'
);
select ok(
  not exists (
    select 1
    from public.get_group_messages(current_setting('test.group_id')::uuid) as m,
      unnest(array[
        '22222222-2222-4222-8222-222222222222', 'beto@example.test', 'BBBB2222'
      ]) as forbidden(term)
    where strpos(row_to_json(m)::text, forbidden.term) > 0
  ),
  'messages never expose the author user id, email or user code'
);
select isnt_empty(
  $$select id, group_id from public.group_messages$$,
  'a member can read the Realtime signal columns of their group messages'
);
select throws_ok(
  $$select body from public.group_messages$$,
  '42501',
  null,
  'nobody can read message bodies directly'
);
select throws_ok(
  format(
    $$insert into public.group_messages (group_id, user_id, body)
      values (%L, '22222222-2222-4222-8222-222222222222', 'directo')$$,
    current_setting('test.group_id')
  ),
  '42501',
  null,
  'a member cannot insert messages directly'
);
select throws_ok(
  $$update public.group_messages set group_id = group_id$$,
  '42501',
  null,
  'a member cannot update messages directly'
);
select throws_ok(
  $$delete from public.group_messages$$,
  '42501',
  null,
  'a member cannot delete messages directly'
);

-- Longitud ------------------------------------------------------------------------

select throws_ok(
  format($$select public.send_group_message(%L, E' \n\t ')$$, current_setting('test.group_id')),
  'P0001',
  'Escribe un mensaje.',
  'a blank message is rejected'
);
select throws_ok(
  format($$select public.send_group_message(%L, repeat('a', 1001))$$, current_setting('test.group_id')),
  'P0001',
  'El mensaje no puede tener más de 1000 caracteres.',
  'a message longer than 1000 characters is rejected'
);
select lives_ok(
  format($$select public.send_group_message(%L, repeat('ñ', 1000))$$, current_setting('test.group_id')),
  'a 1000-character message (counted in characters, not bytes) is accepted'
);
select lives_ok(
  format($$select public.send_group_message(%L, '  ' || repeat('b', 1000) || '  ')$$, current_setting('test.group_id')),
  'surrounding whitespace does not count towards the limit'
);

-- Reintentos idempotentes ---------------------------------------------------------

select is(
  public.send_group_message(
    current_setting('test.group_id')::uuid, 'Una vez', '99999999-9999-4999-8999-999999999999'
  ),
  '99999999-9999-4999-8999-999999999999'::uuid,
  'the app can choose the message id'
);
select is(
  public.send_group_message(
    current_setting('test.group_id')::uuid, 'Una vez', '99999999-9999-4999-8999-999999999999'
  ),
  '99999999-9999-4999-8999-999999999999'::uuid,
  'retrying with the same id returns the same message'
);
select is(
  (select count(*)::int
   from public.get_group_messages(current_setting('test.group_id')::uuid)
   where body = 'Una vez'),
  1,
  'a retried send does not duplicate the message'
);
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select throws_ok(
  format(
    $$select public.send_group_message(%L, 'Robado', '99999999-9999-4999-8999-999999999999')$$,
    current_setting('test.group_id')
  ),
  'P0001',
  'No se pudo enviar el mensaje. Inténtalo de nuevo.',
  'another member cannot reuse someone else message id'
);

-- Quien no es miembro -------------------------------------------------------------

set local request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select throws_ok(
  format($$select * from public.get_group_messages(%L)$$, current_setting('test.group_id')),
  '42501',
  'No formas parte de este grupo.',
  'an outsider cannot read messages by RPC'
);
select throws_ok(
  format($$select public.send_group_message(%L, 'Hola')$$, current_setting('test.group_id')),
  '42501',
  'No formas parte de este grupo.',
  'an outsider cannot send messages'
);
select is_empty(
  $$select id, group_id from public.group_messages$$,
  'an outsider does not see message signals of the group'
);
select throws_ok(
  format($$select public.delete_group_message(%L)$$, current_setting('test.beto_message')),
  'P0001',
  'Este mensaje ya no está disponible.',
  'an outsider cannot delete messages'
);

-- Borrar solo lo propio -------------------------------------------------------------

set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select throws_ok(
  format($$select public.delete_group_message(%L)$$, current_setting('test.beto_message')),
  'P0001',
  'Este mensaje ya no está disponible.',
  'not even the owner can delete someone else message'
);
select isnt_empty(
  format(
    $$select id from public.get_group_messages(%L) where id = %L$$,
    current_setting('test.group_id'),
    current_setting('test.beto_message')
  ),
  'the message survives a delete by someone else'
);
set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
select lives_ok(
  format($$select public.delete_group_message(%L)$$, current_setting('test.beto_message')),
  'the author deletes their own message'
);
select is_empty(
  format(
    $$select id from public.get_group_messages(%L) where id = %L$$,
    current_setting('test.group_id'),
    current_setting('test.beto_message')
  ),
  'a deleted message is gone'
);

-- Límite de envío -------------------------------------------------------------------

set local role postgres;
insert into public.group_messages (group_id, user_id, body, created_at)
select current_setting('test.group_id')::uuid, '44444444-4444-4444-8444-444444444444',
  format('Ráfaga %s', n), now() - interval '30 seconds'
from generate_series(1, 10) as n;
select set_config(
  'test.dani_message',
  (select id::text from public.group_messages
   where user_id = '44444444-4444-4444-8444-444444444444' limit 1),
  true
);
insert into public.group_messages (group_id, user_id, body, created_at)
select current_setting('test.group_id')::uuid, '11111111-1111-4111-8111-111111111111',
  format('Antiguo %s', n), now() - interval '2 minutes'
from generate_series(1, 10) as n;
set local role authenticated;

set local request.jwt.claim.sub = '44444444-4444-4444-8444-444444444444';
select throws_ok(
  format($$select public.send_group_message(%L, 'Uno más')$$, current_setting('test.group_id')),
  'P0001',
  'Has enviado 10 mensajes en el último minuto. Espera un poco antes de seguir.',
  'a member can send at most 10 messages a minute in a group'
);
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select lives_ok(
  format($$select public.send_group_message(%L, 'Sigo aquí')$$, current_setting('test.group_id')),
  'messages older than a minute do not count towards the limit'
);

-- Paginación ------------------------------------------------------------------------

set local role postgres;
insert into public.groups (id, name)
values ('55555555-5555-4555-8555-555555555555', 'Paginado');
insert into public.group_members (group_id, user_id, role)
values ('55555555-5555-4555-8555-555555555555', '11111111-1111-4111-8111-111111111111', 'owner');
insert into public.group_messages (id, group_id, user_id, body, created_at)
values
  ('a0000000-0000-4000-8000-000000000001', '55555555-5555-4555-8555-555555555555',
   '11111111-1111-4111-8111-111111111111', 'uno', '2026-10-12T10:00:00Z'),
  ('a0000000-0000-4000-8000-000000000002', '55555555-5555-4555-8555-555555555555',
   '11111111-1111-4111-8111-111111111111', 'dos', '2026-10-12T10:01:00Z'),
  ('a0000000-0000-4000-8000-000000000003', '55555555-5555-4555-8555-555555555555',
   '11111111-1111-4111-8111-111111111111', 'tres', '2026-10-12T10:01:00Z'),
  ('a0000000-0000-4000-8000-000000000004', '55555555-5555-4555-8555-555555555555',
   '11111111-1111-4111-8111-111111111111', 'cuatro', '2026-10-12T10:02:00Z');
insert into public.group_messages (group_id, user_id, body, created_at)
select '55555555-5555-4555-8555-555555555555', '11111111-1111-4111-8111-111111111111',
  format('Viejo %s', n), timestamptz '2026-10-11T10:00:00Z' + n * interval '1 second'
from generate_series(1, 120) as n;
set local role authenticated;

select results_eq(
  $$select body from public.get_group_messages(
      '55555555-5555-4555-8555-555555555555', null, null, 2)$$,
  $$values ('cuatro'::text), ('tres'::text)$$,
  'the first page holds the newest messages, newest first'
);
select results_eq(
  $$select body from public.get_group_messages(
      '55555555-5555-4555-8555-555555555555',
      '2026-10-12T10:01:00Z', 'a0000000-0000-4000-8000-000000000003', 2)$$,
  $$values ('dos'::text), ('uno'::text)$$,
  'the cursor (created_at, id) continues after the last message, even on equal timestamps'
);
select is(
  (select count(*)::int
   from public.get_group_messages('55555555-5555-4555-8555-555555555555', null, null, 1000)),
  100,
  'a page never has more than 100 messages'
);

-- Exmiembros ---------------------------------------------------------------------------

select public.remove_member(
  current_setting('test.group_id')::uuid,
  (select (m->>'member_id')::uuid
   from jsonb_array_elements(public.get_group_progress(current_setting('test.group_id')::uuid)->'members') m
   where m->>'display_name' = 'Dani')
);

set local request.jwt.claim.sub = '44444444-4444-4444-8444-444444444444';
select throws_ok(
  format($$select * from public.get_group_messages(%L)$$, current_setting('test.group_id')),
  '42501',
  'No formas parte de este grupo.',
  'a removed member can no longer read the chat'
);
select throws_ok(
  format($$select public.send_group_message(%L, 'Sigo aquí')$$, current_setting('test.group_id')),
  '42501',
  'No formas parte de este grupo.',
  'a removed member can no longer write'
);
select is_empty(
  $$select id, group_id from public.group_messages$$,
  'a removed member stops receiving message signals'
);
select throws_ok(
  format($$select public.delete_group_message(%L)$$, current_setting('test.dani_message')),
  '42501',
  'No formas parte de este grupo.',
  'a removed member cannot delete what they wrote'
);

set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select results_eq(
  format(
    $$select distinct author_name, member_id is null
      from public.get_group_messages(%L, null, null, 100)
      where body like 'Ráfaga%%'$$,
    current_setting('test.group_id')
  ),
  $$values ('Antiguo miembro'::text, true)$$,
  'messages of a former member stay, signed as "Antiguo miembro"'
);

-- Borrados en cascada ------------------------------------------------------------------

set local role postgres;
delete from auth.users where id = '44444444-4444-4444-8444-444444444444';
select is_empty(
  $$select id from public.group_messages where user_id = '44444444-4444-4444-8444-444444444444'$$,
  'deleting an account deletes their messages'
);
select isnt_empty(
  format($$select id from public.group_messages where group_id = %L$$, current_setting('test.group_id')),
  'the rest of the chat stays'
);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select public.delete_group(current_setting('test.group_id')::uuid);
set local role postgres;
select is_empty(
  format($$select id from public.group_messages where group_id = %L$$, current_setting('test.group_id')),
  'deleting a group deletes its messages'
);

select * from finish();
rollback;
