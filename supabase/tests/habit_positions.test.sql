begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(14);

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
    'Primero',
    '#047857',
    'brain',
    '2026-01-01',
    0
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-bbbbbbbbbbbb',
    '11111111-1111-4111-8111-111111111111',
    'Segundo',
    '#047857',
    'brain',
    '2026-01-01',
    1
  ),
  (
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    '22222222-2222-4222-8222-222222222222',
    'Ajeno',
    '#0369A1',
    'book-open',
    '2026-01-01',
    0
  );

-- La restricción es diferible (se comprueba al confirmar); en el test se
-- fuerza a comprobarse al final de cada sentencia para poder observarla.
set constraints all immediate;

set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select throws_ok(
  $$insert into public.habits (user_id, name, color, icon, start_date, position)
    values (
      '11111111-1111-4111-8111-111111111111',
      'Repetido', '#7C3AED', 'sparkles', '2026-01-01', 1
    )$$,
  '23P01',
  null,
  'two active habits of the same user cannot share a position'
);
select throws_ok(
  $$update public.habits set position = 0
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-bbbbbbbbbbbb'$$,
  '23P01',
  null,
  'an update cannot move an active habit onto a taken position'
);
select lives_ok(
  $$insert into public.habits (user_id, name, color, icon, start_date, position)
    values (
      '11111111-1111-4111-8111-111111111111',
      'Posición libre', '#7C3AED', 'sparkles', '2026-01-01', 2
    )$$,
  'a free position is accepted'
);
select lives_ok(
  $$insert into public.habits (
      id, user_id, name, color, icon, start_date, position, archived_at
    ) values (
      'aaaaaaaa-aaaa-4aaa-8aaa-cccccccccccc',
      '11111111-1111-4111-8111-111111111111',
      'Archivado', '#7C3AED', 'sparkles', '2026-01-01', 0, now()
    )$$,
  'an archived habit may keep a position used by an active one'
);
select throws_ok(
  $$update public.habits set archived_at = null
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-cccccccccccc'$$,
  '23P01',
  null,
  'restoring without a free position is rejected'
);

-- Hábitos activos del propietario: Primero (0), Segundo (1), Posición libre (2).
select lives_ok(
  $$select public.reorder_habits(array(
      select id from public.habits
      where archived_at is null
      order by case name when 'Segundo' then 0 when 'Primero' then 1 else 2 end
    ))$$,
  'reorder_habits swaps positions in a single statement'
);
select results_eq(
  $$select name from public.habits where archived_at is null order by position$$,
  array['Segundo', 'Primero', 'Posición libre'],
  'the new order is persisted'
);
select throws_ok(
  $$select public.reorder_habits(array[
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      'aaaaaaaa-aaaa-4aaa-8aaa-bbbbbbbbbbbb'
    ]::uuid[])$$,
  'P0001',
  'La lista de hábitos cambió en otro dispositivo. Vuelve a intentarlo.',
  'a stale list missing an active habit is rejected'
);
select throws_ok(
  $$select public.reorder_habits(
      array(select id from public.habits where archived_at is null)
      || 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid
    )$$,
  'P0001',
  'La lista de hábitos cambió en otro dispositivo. Vuelve a intentarlo.',
  'a list with repeated ids is rejected'
);
select throws_ok(
  $$select public.reorder_habits(
      array(select id from public.habits where archived_at is null)
      || 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'::uuid
    )$$,
  'P0001',
  'La lista de hábitos cambió en otro dispositivo. Vuelve a intentarlo.',
  'a list with another user habit is rejected'
);

-- Importación: la cuenta nueva ya tiene un hábito activo en la posición 0 y
-- los datos locales traen dos activos repetidos en la 0 y un archivado.
reset role;
insert into public.habits (id, user_id, name, color, icon, start_date, position)
values (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '33333333-3333-4333-8333-333333333333',
  'Ya existente',
  '#047857',
  'brain',
  '2026-01-01',
  0
);
set local role authenticated;
set local request.jwt.claim.sub = '33333333-3333-4333-8333-333333333333';

select lives_ok(
  $$select public.import_local_data(
      '[
        {"id": "cccccccc-cccc-4ccc-8ccc-000000000001", "name": "Local A",
         "description": null, "color": "#047857", "icon": "brain",
         "frequency": "daily", "startDate": "2026-01-01", "position": 0,
         "archivedAt": null, "createdAt": "2026-01-01T10:00:00Z",
         "updatedAt": "2026-01-01T10:00:00Z"},
        {"id": "cccccccc-cccc-4ccc-8ccc-000000000002", "name": "Local B",
         "description": null, "color": "#047857", "icon": "brain",
         "frequency": "daily", "startDate": "2026-01-01", "position": 0,
         "archivedAt": null, "createdAt": "2026-01-02T10:00:00Z",
         "updatedAt": "2026-01-02T10:00:00Z"},
        {"id": "cccccccc-cccc-4ccc-8ccc-000000000003", "name": "Local archivado",
         "description": null, "color": "#047857", "icon": "brain",
         "frequency": "daily", "startDate": "2026-01-01", "position": 0,
         "archivedAt": "2026-01-05T10:00:00Z", "createdAt": "2026-01-01T10:00:00Z",
         "updatedAt": "2026-01-05T10:00:00Z"}
      ]'::jsonb,
      '[]'::jsonb
    )$$,
  'importing local habits with repeated positions succeeds'
);
select results_eq(
  $$select name, position from public.habits
    where archived_at is null order by position$$,
  $$values ('Ya existente'::text, 0), ('Local A', 1), ('Local B', 2)$$,
  'imported active habits are renumbered after the existing ones'
);
select results_eq(
  $$select position from public.habits where archived_at is not null$$,
  array[0],
  'imported archived habits keep their position'
);

set local role anon;
select throws_ok(
  $$select public.reorder_habits(array[]::uuid[])$$,
  '42501',
  null,
  'anon cannot call reorder_habits'
);

select * from finish();
rollback;
