begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(11);

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

set local role anon;
select throws_ok(
  $$select public.sync_offline_checkins('[]'::jsonb)$$,
  '42501',
  null,
  'anon cannot sync check-ins'
);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select is(
  public.sync_offline_checkins(jsonb_build_array(
    jsonb_build_object(
      'habitId', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'checkinDate', (now() at time zone 'utc')::date - 5,
      'completed', true
    ),
    jsonb_build_object(
      'habitId', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'checkinDate', (now() at time zone 'utc')::date - 8,
      'completed', true
    ),
    jsonb_build_object(
      'habitId', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'checkinDate', (now() at time zone 'utc')::date,
      'completed', true
    )
  )),
  '{"applied": 3, "rejected": 0}'::jsonb,
  'check-ins from the last 7 local days (8 in UTC) are accepted'
);
select results_eq(
  $$select checkin_date from public.habit_checkins
    where habit_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' order by 1$$,
  $$values
    ((now() at time zone 'utc')::date - 8),
    ((now() at time zone 'utc')::date - 5),
    ((now() at time zone 'utc')::date)$$,
  'the accepted check-ins are stored for the caller'
);

select is(
  public.sync_offline_checkins(jsonb_build_array(
    jsonb_build_object(
      'habitId', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'checkinDate', (now() at time zone 'utc')::date - 5,
      'completed', true
    )
  )),
  '{"applied": 1, "rejected": 0}'::jsonb,
  'marking an already marked day again is idempotent'
);
select is(
  (select count(*)::integer from public.habit_checkins
    where habit_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  3,
  'the repeated mark does not duplicate the check-in'
);

select is(
  public.sync_offline_checkins(jsonb_build_array(
    jsonb_build_object(
      'habitId', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'checkinDate', (now() at time zone 'utc')::date - 9,
      'completed', true
    ),
    jsonb_build_object(
      'habitId', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'checkinDate', (now() at time zone 'utc')::date + 2,
      'completed', true
    ),
    jsonb_build_object(
      'habitId', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      'checkinDate', (now() at time zone 'utc')::date,
      'completed', true
    ),
    jsonb_build_object(
      'habitId', 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
      'checkinDate', (now() at time zone 'utc')::date,
      'completed', true
    ),
    jsonb_build_object(
      'habitId', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'checkinDate', (now() at time zone 'utc')::date - 1,
      'completed', true
    )
  )),
  '{"applied": 1, "rejected": 4}'::jsonb,
  'old, future, foreign and unknown habits are skipped without aborting the batch'
);

reset role;
select is_empty(
  $$select id from public.habit_checkins
    where habit_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$$,
  'another user habit gets no check-in'
);
select is_empty(
  $$select id from public.habit_checkins
    where checkin_date in (
      (now() at time zone 'utc')::date - 9,
      (now() at time zone 'utc')::date + 2
    )$$,
  'dates outside the window are not stored'
);

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select is(
  public.sync_offline_checkins(jsonb_build_array(
    jsonb_build_object(
      'habitId', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'checkinDate', (now() at time zone 'utc')::date - 5,
      'completed', false
    )
  )),
  '{"applied": 1, "rejected": 0}'::jsonb,
  'unmarking an offline day is applied'
);
select is_empty(
  $$select id from public.habit_checkins
    where habit_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      and checkin_date = (now() at time zone 'utc')::date - 5$$,
  'the unmarked check-in is removed'
);

select throws_ok(
  $$select public.sync_offline_checkins('{}'::jsonb)$$,
  'P0001',
  'Lote de sincronización no válido.',
  'a non-array payload is rejected'
);

select * from finish();
rollback;
