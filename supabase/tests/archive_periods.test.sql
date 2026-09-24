begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(13);

-- Estructura y permisos: los clientes solo leen; escribe el trigger.
select has_table('public', 'habit_archive_periods', 'habit_archive_periods exists');
select is(
  (select relrowsecurity from pg_class where oid = 'public.habit_archive_periods'::regclass),
  true,
  'habit_archive_periods has RLS enabled'
);
select policies_are(
  'public',
  'habit_archive_periods',
  array['habit_archive_periods_select_own'],
  'habit_archive_periods only has a read policy'
);
select ok(
  not has_table_privilege('anon', 'public.habit_archive_periods', 'select,insert,update,delete'),
  'anon has no archive period privileges'
);
select ok(
  has_table_privilege('authenticated', 'public.habit_archive_periods', 'select')
  and not has_table_privilege('authenticated', 'public.habit_archive_periods', 'insert,update,delete'),
  'authenticated can only read archive periods'
);

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'owner@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'other@example.test');

insert into public.habits (id, user_id, name, color, icon, start_date, position)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'Hábito del propietario',
    '#047857',
    'brain',
    '2026-08-01',
    0
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '22222222-2222-4222-8222-222222222222',
    'Hábito ajeno',
    '#0369A1',
    'book-open',
    '2026-08-01',
    0
  );

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

-- Archivar no deja historial todavía: el archivado vigente vive en habits.
update public.habits
set archived_at = now() - interval '3 days'
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select is_empty(
  $$select id from public.habit_archive_periods$$,
  'archiving alone records no period'
);

-- Cambiar otra columna o la fecha de un archivado vigente tampoco.
update public.habits
set name = 'Renombrado', archived_at = now() - interval '2 days'
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select is_empty(
  $$select id from public.habit_archive_periods$$,
  'editing an archived habit records no period'
);

-- Restaurar cierra la ventana con la hora del servidor.
update public.habits
set archived_at = null
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select results_eq(
  $$select habit_id, user_id, archived_at, restored_at from public.habit_archive_periods$$,
  $$values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
      '11111111-1111-4111-8111-111111111111'::uuid,
      now() - interval '2 days',
      now()
    )$$,
  'restoring records the closed archive window'
);

-- Un segundo ciclo añade otra ventana sin tocar la anterior.
update public.habits set archived_at = now() where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
update public.habits set archived_at = null where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select is(
  (select count(*)::int from public.habit_archive_periods),
  2,
  'each archive-and-restore cycle adds one period'
);

select throws_ok(
  $$insert into public.habit_archive_periods (habit_id, user_id, archived_at, restored_at)
    values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '11111111-1111-4111-8111-111111111111',
      now() - interval '10 days',
      now()
    )$$,
  '42501',
  null,
  'a user cannot invent archive periods to hide missed days'
);
select throws_ok(
  $$delete from public.habit_archive_periods$$,
  '42501',
  null,
  'a user cannot delete archive history'
);

-- El otro usuario no ve el historial ajeno.
set local request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
select is_empty(
  $$select id from public.habit_archive_periods$$,
  'a user cannot read another user archive periods'
);

-- Borrar el hábito borra su historial.
set local role postgres;
delete from public.habits where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select is_empty(
  $$select id from public.habit_archive_periods$$,
  'deleting a habit cascades to its archive periods'
);

select * from finish();
rollback;
