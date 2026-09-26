begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(16);

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'owner@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'other@example.test'),
  ('33333333-3333-4333-8333-333333333333', 'fresh@example.test');

insert into public.habits (id, user_id, name, color, icon, start_date, position)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'Hábito del propietario',
    '#047857',
    'brain',
    '2026-01-01',
    0
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '22222222-2222-4222-8222-222222222222',
    'Hábito ajeno',
    '#0369A1',
    'book-open',
    '2026-01-01',
    0
  );

-- El administrador (seed, scripts) no está limitado por la ventana.
select lives_ok(
  $$insert into public.habit_checkins (habit_id, user_id, checkin_date)
    values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '11111111-1111-4111-8111-111111111111',
      (now() at time zone 'utc')::date - 30
    )$$,
  'the admin role can still write historical check-ins (seed)'
);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

-- Ventana: de ayer a mañana en UTC.
select lives_ok(
  $$insert into public.habit_checkins (habit_id, user_id, checkin_date)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111',
      (now() at time zone 'utc')::date)$$,
  'a user can check in today'
);
select lives_ok(
  $$insert into public.habit_checkins (habit_id, user_id, checkin_date)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111',
      (now() at time zone 'utc')::date - 1)$$,
  'yesterday (UTC) is accepted, covering timezones behind UTC'
);
select lives_ok(
  $$insert into public.habit_checkins (habit_id, user_id, checkin_date)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111',
      (now() at time zone 'utc')::date + 1)$$,
  'tomorrow (UTC) is accepted, covering timezones ahead of UTC'
);
select throws_ok(
  $$insert into public.habit_checkins (habit_id, user_id, checkin_date)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111',
      (now() at time zone 'utc')::date - 2)$$,
  '42501',
  null,
  'a user cannot backdate a check-in'
);
select throws_ok(
  $$insert into public.habit_checkins (habit_id, user_id, checkin_date)
    values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '11111111-1111-4111-8111-111111111111',
      (now() at time zone 'utc')::date + 2)$$,
  '42501',
  null,
  'a user cannot forward-date a check-in'
);
select throws_ok(
  $$update public.habit_checkins
    set checkin_date = (now() at time zone 'utc')::date - 10
    where checkin_date = (now() at time zone 'utc')::date$$,
  '42501',
  null,
  'a user cannot move a check-in to an old date'
);
select results_eq(
  $$delete from public.habit_checkins
    where checkin_date = (now() at time zone 'utc')::date - 30
    returning checkin_date$$,
  $$values ((now() at time zone 'utc')::date - 30)$$,
  'a user can still remove an old check-in of their own'
);

-- Importación única de datos locales.
set local role anon;
select throws_ok(
  $$select public.import_local_data('[]'::jsonb, '[]'::jsonb)$$,
  '42501',
  null,
  'anon cannot call the import'
);

set local role authenticated;
select throws_ok(
  $$select public.import_local_data(
      '[]'::jsonb,
      jsonb_build_array(jsonb_build_object(
        'habitId', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
        'checkinDate', (now() at time zone 'utc')::date - 20,
        'completedAt', now()
      ))
    )$$,
  'P0001',
  'Esta cuenta ya tiene registros: el historial local solo se puede importar en una cuenta nueva.',
  'history cannot be imported into an account that already has check-ins'
);

set local request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';
select throws_ok(
  $$select public.import_local_data(
      jsonb_build_array(jsonb_build_object(
        'id', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'name', 'Robado',
        'description', null, 'color', '#047857', 'icon', 'brain', 'frequency', 'daily',
        'startDate', '2026-01-01', 'position', 0, 'archivedAt', null,
        'createdAt', now(), 'updatedAt', now()
      )),
      '[]'::jsonb
    )$$,
  '42501',
  null,
  'the import cannot take over another user habit'
);
select throws_ok(
  $$select public.import_local_data(
      '[]'::jsonb,
      jsonb_build_array(jsonb_build_object(
        'habitId', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
        'checkinDate', (now() at time zone 'utc')::date - 20,
        'completedAt', now()
      ))
    )$$,
  '23503',
  null,
  'the import cannot add check-ins to another user habit'
);
select throws_ok(
  $$select public.import_local_data(
      jsonb_build_array(jsonb_build_object(
        'id', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'name', 'Leer',
        'description', null, 'color', '#047857', 'icon', 'brain', 'frequency', 'daily',
        'startDate', '2026-01-01', 'position', 0, 'archivedAt', null,
        'createdAt', now(), 'updatedAt', now()
      )),
      jsonb_build_array(jsonb_build_object(
        'habitId', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
        'checkinDate', (now() at time zone 'utc')::date + 5,
        'completedAt', now()
      ))
    )$$,
  'P0001',
  'Los datos locales tienen check-ins con fechas futuras.',
  'the import rejects future check-ins'
);
select is_empty(
  $$select id from public.habits where user_id = '33333333-3333-4333-8333-333333333333'$$,
  'a rejected import writes nothing'
);
select lives_ok(
  $$select public.import_local_data(
      jsonb_build_array(jsonb_build_object(
        'id', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', 'name', 'Leer',
        'description', null, 'color', '#047857', 'icon', 'brain', 'frequency', 'daily',
        'startDate', '2026-01-01', 'position', 0, 'archivedAt', null,
        'createdAt', now(), 'updatedAt', now()
      )),
      jsonb_build_array(
        jsonb_build_object(
          'habitId', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          'checkinDate', (now() at time zone 'utc')::date - 20,
          'completedAt', now()
        ),
        jsonb_build_object(
          'habitId', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
          'checkinDate', (now() at time zone 'utc')::date - 19,
          'completedAt', now()
        )
      )
    )$$,
  'a new account can import its local history once'
);
select results_eq(
  $$select checkin_date from public.habit_checkins
    where user_id = '33333333-3333-4333-8333-333333333333' order by 1$$,
  $$values ((now() at time zone 'utc')::date - 20), ((now() at time zone 'utc')::date - 19)$$,
  'the imported history belongs to the caller'
);

select * from finish();
rollback;
