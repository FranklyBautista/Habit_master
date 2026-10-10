begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(70);

-- Estructura y permisos ---------------------------------------------------------

select has_table('public', 'groups', 'groups exists');
select has_table('public', 'group_members', 'group_members exists');
select has_table('public', 'group_invitations', 'group_invitations exists');
select has_table('public', 'group_habit_shares', 'group_habit_shares exists');
select is(
  (select count(*)::int from pg_class
   where oid in (
     'public.groups'::regclass, 'public.group_members'::regclass,
     'public.group_invitations'::regclass, 'public.group_habit_shares'::regclass
   ) and relrowsecurity),
  4,
  'every group table has RLS enabled'
);
select is_empty(
  $$select policyname from pg_policies
    where schemaname = 'public'
      and tablename in ('groups', 'group_members', 'group_invitations', 'group_habit_shares')$$,
  'group tables have no policies: clients only reach them through RPC'
);
select ok(
  not exists (
    select 1
    from unnest(array['anon', 'authenticated']) as r(role_name),
      unnest(array[
        'public.groups', 'public.group_members',
        'public.group_invitations', 'public.group_habit_shares'
      ]) as t(table_name)
    where has_table_privilege(r.role_name, t.table_name, 'select,insert,update,delete')
  ),
  'anon and authenticated have no privileges on group tables'
);
select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'user_code', 'insert')
  and not has_column_privilege('authenticated', 'public.profiles', 'user_code', 'update'),
  'clients cannot write their user code'
);
select ok(
  has_column_privilege('authenticated', 'public.profiles', 'display_name', 'update')
  and has_column_privilege('authenticated', 'public.profiles', 'timezone', 'update')
  and has_column_privilege('authenticated', 'public.profiles', 'id', 'insert'),
  'clients can still upsert and edit their profile settings'
);
select ok(
  not has_function_privilege('anon', 'public.get_group_progress(uuid)', 'execute')
  and not has_function_privilege('anon', 'public.invite_to_group(uuid, text)', 'execute')
  and has_function_privilege('authenticated', 'public.get_group_progress(uuid)', 'execute'),
  'group RPCs are for signed-in users only'
);

-- Datos -------------------------------------------------------------------------

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'ana@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'beto@example.test'),
  ('33333333-3333-4333-8333-333333333333', 'caro@example.test');

select is(
  (select count(*)::int from public.profiles
   where user_code ~ '^[0-9A-HJKMNP-TV-Z]{8}$'
     and id in (
       '11111111-1111-4111-8111-111111111111',
       '22222222-2222-4222-8222-222222222222',
       '33333333-3333-4333-8333-333333333333'
     )),
  3,
  'every new profile gets a Crockford base32 user code'
);

update public.profiles set display_name = 'Ana', timezone = 'America/Mexico_City', user_code = 'AAAA1111'
where id = '11111111-1111-4111-8111-111111111111';
update public.profiles set display_name = null, timezone = 'Europe/Madrid', user_code = 'BBBB2222'
where id = '22222222-2222-4222-8222-222222222222';
update public.profiles set display_name = 'Caro', user_code = 'CCCC3333'
where id = '33333333-3333-4333-8333-333333333333';

insert into public.habits (id, user_id, name, description, color, icon, start_date, position, archived_at)
values
  ('a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1', '11111111-1111-4111-8111-111111111111',
   'Meditar', 'secreto-de-ana', '#047857', 'brain', '2026-09-01', 0, null),
  ('a2a2a2a2-a2a2-4a2a-8a2a-a2a2a2a2a2a2', '11111111-1111-4111-8111-111111111111',
   'Privado', null, '#0369A1', 'book-open', '2026-09-01', 1, null),
  ('b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1', '22222222-2222-4222-8222-222222222222',
   'Caminar', null, '#7C3AED', 'footprints', '2026-09-01', 0, null),
  ('b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2', '22222222-2222-4222-8222-222222222222',
   'Archivado', null, '#C2410C', 'sparkles', '2026-09-01', 1, now() - interval '1 day');

insert into public.habit_checkins (habit_id, user_id, checkin_date, completed_at)
values
  ('a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1', '11111111-1111-4111-8111-111111111111',
   '2026-10-01', '2026-10-01T07:15:00Z'),
  ('a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1', '11111111-1111-4111-8111-111111111111',
   '2026-10-02', '2026-10-02T07:15:00Z'),
  ('a2a2a2a2-a2a2-4a2a-8a2a-a2a2a2a2a2a2', '11111111-1111-4111-8111-111111111111',
   '2026-10-02', '2026-10-02T08:00:00Z');

set local role authenticated;

-- Código de usuario -----------------------------------------------------------

set local request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select set_config('test.new_code', public.regenerate_user_code(), true);
select ok(
  current_setting('test.new_code') <> 'CCCC3333'
  and (select user_code from public.profiles) = current_setting('test.new_code'),
  'regenerating the user code replaces the old one'
);
select throws_ok(
  $$update public.profiles set user_code = 'VANITY00'$$,
  '42501',
  null,
  'a user cannot choose their own code'
);
set local role postgres;
update public.profiles set user_code = 'CCCC3333' where id = '33333333-3333-4333-8333-333333333333';
set local role authenticated;

-- Crear grupo -------------------------------------------------------------------

set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
select throws_ok(
  $$select public.create_group('Sin nombre')$$,
  'P0001',
  'Elige un nombre visible de 1 a 60 caracteres para unirte a un grupo.',
  'creating a group requires a display name'
);

set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select throws_ok(
  $$select public.create_group('   ')$$,
  'P0001',
  'El nombre del grupo debe tener entre 1 y 60 caracteres.',
  'a group name cannot be blank'
);
select throws_ok(
  $$select public.create_group('Familia', array['b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1'::uuid])$$,
  'P0001',
  'Solo puedes compartir tus hábitos activos.',
  'a user cannot share another user habit'
);
select set_config(
  'test.group_id',
  public.create_group('  Familia ', array['a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1'::uuid])::text,
  true
);
select results_eq(
  $$select name, role, member_count from public.get_my_groups()$$,
  $$values ('Familia'::text, 'owner'::text, 1)$$,
  'the creator owns the new group'
);

-- Invitar -----------------------------------------------------------------------

select throws_ok(
  format($$select public.invite_to_group(%L, 'xyz')$$, current_setting('test.group_id')),
  'P0001',
  'Código no válido.',
  'a malformed code is rejected'
);
select throws_ok(
  format($$select public.invite_to_group(%L, 'ZZZZ9999')$$, current_setting('test.group_id')),
  'P0001',
  'Código no válido.',
  'an unknown code gets the same answer as a malformed one'
);
select is(
  public.invite_to_group(current_setting('test.group_id')::uuid, ' bbbb-2222 '),
  'sent',
  'the owner invites with a pasted, lower-case code'
);
select is(
  public.invite_to_group(current_setting('test.group_id')::uuid, 'BBBB2222'),
  'already_invited',
  'a second invitation to the same person is reported'
);
select is(
  public.invite_to_group(current_setting('test.group_id')::uuid, 'AAAA1111'),
  'already_member',
  'inviting a member is reported'
);

-- Quien no es miembro ---------------------------------------------------------

set local request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select is_empty(
  $$select id from public.get_my_invitations()$$,
  'an outsider has no invitations'
);
select throws_ok(
  format($$select public.get_group_progress(%L)$$, current_setting('test.group_id')),
  '42501',
  'No formas parte de este grupo.',
  'an outsider cannot read group progress'
);
select throws_ok(
  format($$select public.invite_to_group(%L, 'CCCC3333')$$, current_setting('test.group_id')),
  '42501',
  'No formas parte de este grupo.',
  'an outsider cannot invite'
);
select throws_ok(
  $$select id from public.groups$$,
  '42501',
  null,
  'clients cannot read group tables directly'
);
select throws_ok(
  $$insert into public.group_members (group_id, user_id)
    values (current_setting('test.group_id')::uuid, '33333333-3333-4333-8333-333333333333')$$,
  '42501',
  null,
  'clients cannot add themselves to a group'
);
select throws_ok(
  $$select public.respond_invitation(
      (select id from public.group_invitations limit 1), true, '{}', 'Caro'
    )$$,
  '42501',
  null,
  'an outsider cannot look up invitation ids'
);

-- Aceptar ------------------------------------------------------------------------

set local role postgres;
select set_config(
  'test.invitation_id',
  (select id::text from public.group_invitations
   where invitee_id = '22222222-2222-4222-8222-222222222222'),
  true
);
set local role authenticated;

set local request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select throws_ok(
  format($$select public.respond_invitation(%L, true, '{}', 'Caro')$$, current_setting('test.invitation_id')),
  'P0001',
  'Esta invitación ya no está disponible.',
  'only the invitee can answer an invitation'
);

set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
select results_eq(
  $$select group_name, inviter_name, member_count from public.get_my_invitations()$$,
  $$values ('Familia'::text, 'Ana'::text, 1)$$,
  'the invitee sees the group, the inviter display name and the size'
);
select throws_ok(
  format($$select public.respond_invitation(%L, true)$$, current_setting('test.invitation_id')),
  'P0001',
  'Elige un nombre visible de 1 a 60 caracteres para unirte a un grupo.',
  'joining requires a display name'
);
select throws_ok(
  format(
    $$select public.respond_invitation(%L, true, array['b2b2b2b2-b2b2-4b2b-8b2b-b2b2b2b2b2b2'::uuid], 'Beto')$$,
    current_setting('test.invitation_id')
  ),
  'P0001',
  'Solo puedes compartir tus hábitos activos.',
  'an archived habit cannot be shared'
);
select lives_ok(
  format(
    $$select public.respond_invitation(%L, true, array['b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1'::uuid], 'Beto')$$,
    current_setting('test.invitation_id')
  ),
  'the invitee joins sharing one habit'
);
select is(
  (select display_name from public.profiles),
  'Beto',
  'joining stores the chosen display name'
);
select throws_ok(
  format($$select public.respond_invitation(%L, false)$$, current_setting('test.invitation_id')),
  'P0001',
  'Esta invitación ya no está disponible.',
  'an answered invitation cannot be answered again'
);

-- Qué ve un miembro (ADR 0002 §2) -----------------------------------------------

select set_config(
  'test.progress',
  public.get_group_progress(current_setting('test.group_id')::uuid)::text,
  true
);
select is(
  (select jsonb_agg(m->>'display_name' order by m->>'display_name')
   from jsonb_array_elements(current_setting('test.progress')::jsonb->'members') m),
  '["Ana", "Beto"]'::jsonb,
  'a member sees every member by display name'
);
select is(
  (select jsonb_path_query_array(m, '$.habits[*].name')
   from jsonb_array_elements(current_setting('test.progress')::jsonb->'members') m
   where m->>'display_name' = 'Ana'),
  '["Meditar"]'::jsonb,
  'only shared habits are visible'
);
select is(
  (select h->'checkin_dates'
   from jsonb_array_elements(current_setting('test.progress')::jsonb->'members') m,
     jsonb_array_elements(m->'habits') h
   where m->>'display_name' = 'Ana'),
  '["2026-10-01", "2026-10-02"]'::jsonb,
  'a shared habit exposes its completed date keys'
);
select is(
  (select m->>'today'
   from jsonb_array_elements(current_setting('test.progress')::jsonb->'members') m
   where m->>'display_name' = 'Ana'),
  (now() at time zone 'America/Mexico_City')::date::text,
  'each member today is computed in their own timezone'
);
select ok(
  (select h ? 'habit_id' and h->'habit_id' = 'null'::jsonb
   from jsonb_array_elements(current_setting('test.progress')::jsonb->'members') m,
     jsonb_array_elements(m->'habits') h
   where m->>'display_name' = 'Ana')
  and (select h->>'habit_id'
       from jsonb_array_elements(current_setting('test.progress')::jsonb->'members') m,
         jsonb_array_elements(m->'habits') h
       where m->>'display_name' = 'Beto') = 'b1b1b1b1-b1b1-4b1b-8b1b-b1b1b1b1b1b1',
  'habit ids are only returned for the caller own habits'
);
select ok(
  not exists (
    select 1
    from unnest(array[
      '11111111-1111-4111-8111-111111111111', 'ana@example.test', 'AAAA1111',
      'America/Mexico_City', 'secreto-de-ana', 'description', 'position',
      'completed_at', 'timezone', 'user_id', 'email', '07:15'
    ]) as forbidden(term)
    where strpos(current_setting('test.progress'), forbidden.term) > 0
  ),
  'progress never exposes ids, email, codes, timezone, descriptions or exact times'
);
select is(
  current_setting('test.progress')::jsonb->'pending_invitations',
  '[]'::jsonb,
  'a member does not see pending invitations'
);
select is_empty(
  $$select id from public.habits where user_id = '11111111-1111-4111-8111-111111111111'$$,
  'membership does not open the habits table'
);
select is_empty(
  $$select id from public.habit_checkins where user_id = '11111111-1111-4111-8111-111111111111'$$,
  'membership does not open the check-ins table'
);
select throws_ok(
  format($$select public.rename_group(%L, 'Otro')$$, current_setting('test.group_id')),
  '42501',
  'Solo el dueño del grupo puede hacer esto.',
  'a member cannot rename the group'
);

-- Archivado y gestión de lo compartido -----------------------------------------

set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
update public.habits set archived_at = now() where id = 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1';
select is(
  (select jsonb_array_length(m->'habits')
   from jsonb_array_elements(public.get_group_progress(current_setting('test.group_id')::uuid)->'members') m
   where m->>'display_name' = 'Ana'),
  0,
  'an archived shared habit disappears from the group'
);
-- Guardar la selección sin el archivado no lo deja de compartir.
select public.set_shared_habits(current_setting('test.group_id')::uuid, '{}');
update public.habits set archived_at = null where id = 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1';
select is(
  (select jsonb_array_length(h->'archive_periods')
   from jsonb_array_elements(public.get_group_progress(current_setting('test.group_id')::uuid)->'members') m,
     jsonb_array_elements(m->'habits') h
   where m->>'display_name' = 'Ana'),
  1,
  'a restored shared habit comes back with its archive period'
);
select lives_ok(
  format($$select public.set_shared_habits(%L, '{}')$$, current_setting('test.group_id')),
  'a member can stop sharing every habit'
);
select is(
  (select jsonb_array_length(m->'habits')
   from jsonb_array_elements(public.get_group_progress(current_setting('test.group_id')::uuid)->'members') m
   where m->>'display_name' = 'Ana'),
  0,
  'an unshared habit is no longer visible'
);
select public.set_shared_habits(
  current_setting('test.group_id')::uuid,
  array['a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1'::uuid]
);

-- Rechazo silencioso ------------------------------------------------------------

select is(
  public.invite_to_group(current_setting('test.group_id')::uuid, 'CCCC3333'),
  'sent',
  'the owner invites a third person'
);
set local request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select public.respond_invitation((select id from public.get_my_invitations()), false);
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select is(
  public.invite_to_group(current_setting('test.group_id')::uuid, 'CCCC3333'),
  'sent',
  'inviting again after a decline looks the same to the owner'
);
select is(
  jsonb_array_length(
    public.get_group_progress(current_setting('test.group_id')::uuid)->'pending_invitations'
  ),
  1,
  'the owner sees the silenced invitation as pending'
);
set local request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select is_empty(
  $$select id from public.get_my_invitations()$$,
  'the person who declined does not receive it'
);
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select lives_ok(
  $$select public.cancel_invitation(
      (select (i->>'id')::uuid
       from jsonb_array_elements(
         public.get_group_progress(current_setting('test.group_id')::uuid)->'pending_invitations'
       ) i)
    )$$,
  'the owner cancels a pending invitation'
);

-- Caducidad -----------------------------------------------------------------------

set local role postgres;
insert into public.group_invitations (
  group_id, inviter_id, invitee_id, invitee_code, created_at, expires_at
)
values (
  current_setting('test.group_id')::uuid,
  '11111111-1111-4111-8111-111111111111',
  '33333333-3333-4333-8333-333333333333',
  'CCCC3333',
  now() - interval '8 days',
  now() - interval '1 day'
);
set local role authenticated;
set local request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select is_empty(
  $$select id from public.get_my_invitations()$$,
  'an expired invitation leaves the inbox'
);
set local role postgres;
select set_config(
  'test.expired_id',
  (select id::text from public.group_invitations where status = 'pending' and expires_at < now()),
  true
);
set local role authenticated;
select throws_ok(
  format($$select public.respond_invitation(%L, true, '{}', 'Caro')$$, current_setting('test.expired_id')),
  'P0001',
  'Esta invitación ya no está disponible.',
  'an expired invitation cannot be accepted'
);

-- Límites ---------------------------------------------------------------------------

set local role postgres;
insert into auth.users (id, email)
select gen_random_uuid(), format('relleno%s@example.test', n)
from generate_series(1, 20) as n;
insert into public.group_invitations (group_id, inviter_id, invitee_id, invitee_code, status)
select current_setting('test.group_id')::uuid, '11111111-1111-4111-8111-111111111111', u.id, 'XXXX0000', 'cancelled'
from auth.users u
where u.email like 'relleno%'
limit 19;
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select throws_ok(
  format($$select public.invite_to_group(%L, 'CCCC3333')$$, current_setting('test.group_id')),
  'P0001',
  'Has enviado 20 invitaciones en las últimas 24 horas. Inténtalo más tarde.',
  'an owner can send at most 20 invitations a day'
);

set local role postgres;
delete from public.group_invitations where invitee_code = 'XXXX0000';
insert into public.group_members (group_id, user_id)
select current_setting('test.group_id')::uuid, u.id
from auth.users u
where u.email like 'relleno%'
order by u.email
limit 8;
set local role authenticated;
select throws_ok(
  format($$select public.invite_to_group(%L, 'CCCC3333')$$, current_setting('test.group_id')),
  'P0001',
  'Este grupo ya tiene 10 miembros e invitaciones pendientes, el máximo.',
  'a group holds at most 10 members and pending invitations'
);
set local role postgres;
delete from public.group_members m
using auth.users u
where m.user_id = u.id and u.email like 'relleno%';

insert into public.groups (id, name)
select gen_random_uuid(), format('Grupo %s', n) from generate_series(1, 10) as n;
insert into public.group_members (group_id, user_id, role)
select id, '33333333-3333-4333-8333-333333333333', 'owner'
from public.groups
where name like 'Grupo %';
set local role authenticated;
set local request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select throws_ok(
  $$select public.create_group('Uno más')$$,
  'P0001',
  'Ya estás en 10 grupos, el máximo.',
  'a person can be in at most 10 groups'
);

-- Propiedad, expulsión y salida ---------------------------------------------------

set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select throws_ok(
  format($$select public.leave_group(%L)$$, current_setting('test.group_id')),
  'P0001',
  'Transfiere la propiedad a otro miembro antes de salir.',
  'the owner must hand the group over before leaving'
);
select public.transfer_ownership(
  current_setting('test.group_id')::uuid,
  (select (m->>'member_id')::uuid
   from jsonb_array_elements(public.get_group_progress(current_setting('test.group_id')::uuid)->'members') m
   where m->>'display_name' = 'Beto')
);
select results_eq(
  $$select role from public.get_my_groups() where name = 'Familia'$$,
  $$values ('member'::text)$$,
  'transferring ownership demotes the old owner'
);

set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
select public.remove_member(
  current_setting('test.group_id')::uuid,
  (select (m->>'member_id')::uuid
   from jsonb_array_elements(public.get_group_progress(current_setting('test.group_id')::uuid)->'members') m
   where m->>'display_name' = 'Ana')
);
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select throws_ok(
  format($$select public.get_group_progress(%L)$$, current_setting('test.group_id')),
  '42501',
  'No formas parte de este grupo.',
  'a removed member loses access immediately'
);
set local role postgres;
select is_empty(
  $$select habit_id from public.group_habit_shares
    where user_id = '11111111-1111-4111-8111-111111111111'$$,
  'removing a member deletes what they shared in the group'
);
select isnt_empty(
  $$select id from public.habits where id = 'a1a1a1a1-a1a1-4a1a-8a1a-a1a1a1a1a1a1'$$,
  'removing a member keeps their personal habits'
);

-- Borrar la cuenta del dueño ------------------------------------------------------

insert into public.group_members (group_id, user_id, joined_at)
values (
  current_setting('test.group_id')::uuid,
  '33333333-3333-4333-8333-333333333333',
  now() + interval '1 minute'
);
delete from auth.users where id = '22222222-2222-4222-8222-222222222222';
select results_eq(
  format(
    $$select user_id, role from public.group_members where group_id = %L$$,
    current_setting('test.group_id')
  ),
  $$values ('33333333-3333-4333-8333-333333333333'::uuid, 'owner'::text)$$,
  'deleting the owner account passes ownership to the oldest member'
);
delete from auth.users where id = '33333333-3333-4333-8333-333333333333';
select is_empty(
  format($$select id from public.groups where id = %L$$, current_setting('test.group_id')),
  'a group with no members left is deleted'
);

-- El único miembro que sale borra el grupo ----------------------------------------

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
select set_config('test.solo_id', public.create_group('Solo')::text, true);
select public.leave_group(current_setting('test.solo_id')::uuid);
set local role postgres;
select is_empty(
  format($$select id from public.groups where id = %L$$, current_setting('test.solo_id')),
  'the last member leaving deletes the group'
);

-- "Tú" es el nombre por defecto de la app, no un nombre visible ---------------

insert into auth.users (id, email)
values ('44444444-4444-4444-8444-444444444444', 'dani@example.test');
update public.profiles set display_name = 'Tú'
where id = '44444444-4444-4444-8444-444444444444';
set local role authenticated;
set local request.jwt.claim.sub = '44444444-4444-4444-8444-444444444444';
select throws_ok(
  $$select public.create_group('Con Tú')$$,
  'P0001',
  'Elige un nombre visible de 1 a 60 caracteres para unirte a un grupo.',
  'the app placeholder "Tú" does not count as a display name'
);
select throws_ok(
  $$select public.create_group('Con Tú', '{}', ' tú ')$$,
  'P0001',
  'Elige un nombre visible de 1 a 60 caracteres para unirte a un grupo.',
  '"Tú" is not accepted as a new display name either'
);
select public.create_group('Con nombre', '{}', 'Dani');
select is(
  (select display_name from public.profiles),
  'Dani',
  'a real display name replaces the placeholder'
);
set local role postgres;

select * from finish();
rollback;
