begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(14);

insert into auth.users (id, email)
values
  ('11111111-1111-4111-8111-111111111111', 'owner@example.test'),
  ('22222222-2222-4222-8222-222222222222', 'other@example.test');

insert into public.habits (
  id,
  user_id,
  name,
  color,
  icon,
  start_date,
  position
)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'Hábito del propietario',
    '#047857',
    'brain',
    '2026-08-31',
    0
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '22222222-2222-4222-8222-222222222222',
    'Hábito ajeno',
    '#0369A1',
    'book-open',
    '2026-08-31',
    0
  );

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select results_eq(
  $$select name from public.habits order by name$$,
  array['Hábito del propietario'],
  'a user reads only their habits'
);
select is_empty(
  $$select id from public.profiles where id = '22222222-2222-4222-8222-222222222222'$$,
  'a user cannot read another profile'
);
select lives_ok(
  $$insert into public.habits (user_id, name, color, icon, start_date, position)
    values (
      '11111111-1111-4111-8111-111111111111',
      'Nuevo propio',
      '#7C3AED',
      'sparkles',
      '2026-08-31',
      1
    )$$,
  'a user can insert their habit'
);
select throws_ok(
  $$insert into public.habits (user_id, name, color, icon, start_date, position)
    values (
      '22222222-2222-4222-8222-222222222222',
      'Nuevo ajeno',
      '#7C3AED',
      'sparkles',
      '2026-08-31',
      1
    )$$,
  '42501',
  null,
  'a user cannot insert a habit for another user'
);
select results_eq(
  $$update public.habits
    set name = 'Actualizado'
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    returning name$$,
  array['Actualizado'],
  'a user can update their habit'
);
select is_empty(
  $$update public.habits
    set name = 'Intrusión'
    where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    returning id$$,
  'a user cannot update another habit'
);
select throws_ok(
  $$update public.habits
    set user_id = '22222222-2222-4222-8222-222222222222'
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '42501',
  null,
  'a user cannot transfer habit ownership'
);
select lives_ok(
  $$insert into public.habit_checkins (
      habit_id,
      user_id,
      checkin_date
    ) values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '11111111-1111-4111-8111-111111111111',
      '2026-08-31'
    )$$,
  'a user can check in to their habit'
);
select throws_ok(
  $$insert into public.habit_checkins (
      habit_id,
      user_id,
      checkin_date
    ) values (
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      '11111111-1111-4111-8111-111111111111',
      '2026-08-31'
    )$$,
  '23503',
  null,
  'the composite foreign key rejects a check-in on another user habit'
);
select throws_ok(
  $$insert into public.habit_checkins (
      habit_id,
      user_id,
      checkin_date
    ) values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '11111111-1111-4111-8111-111111111111',
      '2026-08-31'
    )$$,
  '23505',
  null,
  'the unique constraint rejects duplicate daily check-ins'
);
select is_empty(
  $$delete from public.habits
    where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    returning id$$,
  'a user cannot delete another habit'
);
select results_eq(
  $$delete from public.habit_checkins
    where habit_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    returning checkin_date$$,
  array['2026-08-31'::date],
  'a user can remove their check-in'
);
select results_eq(
  $$delete from public.habits
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
    returning id$$,
  array['aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid],
  'a user can delete their habit'
);

set local role anon;
select throws_ok(
  $$select * from public.habits$$,
  '42501',
  null,
  'anon cannot read habits through the Data API role'
);

select * from finish();
rollback;
