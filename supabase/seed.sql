-- Cuenta local: demo@habit-tracker.local / HabitTracker2026
-- Solo se usa en la pila local creada por `supabase start`.
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
values (
  '00000000-0000-0000-0000-000000000000',
  '00000000-0000-4000-8000-000000000001',
  'authenticated',
  'authenticated',
  'demo@habit-tracker.local',
  crypt('HabitTracker2026', gen_salt('bf')),
  '2026-08-24T12:00:00Z',
  '{"provider":"email","providers":["email"]}',
  '{}',
  '2026-08-24T12:00:00Z',
  '2026-08-24T12:00:00Z',
  '',
  '',
  '',
  ''
)
on conflict (id) do nothing;

insert into auth.identities (
  id,
  user_id,
  provider_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
values (
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '{"sub":"00000000-0000-4000-8000-000000000001","email":"demo@habit-tracker.local"}',
  'email',
  '2026-08-24T12:00:00Z',
  '2026-08-24T12:00:00Z',
  '2026-08-24T12:00:00Z'
)
on conflict (provider_id, provider) do nothing;

update public.profiles
set
  display_name = 'Alex',
  timezone = 'America/Los_Angeles'
where id = '00000000-0000-4000-8000-000000000001';

insert into public.habits (
  id,
  user_id,
  name,
  description,
  color,
  icon,
  start_date,
  position,
  archived_at,
  created_at,
  updated_at
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-4000-8000-000000000001',
    'Meditar',
    'Cinco minutos al comenzar el día',
    '#047857',
    'brain',
    '2026-08-24',
    0,
    null,
    '2026-08-24T12:00:00Z',
    '2026-08-24T12:00:00Z'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    '00000000-0000-4000-8000-000000000001',
    'Leer 20 minutos',
    null,
    '#0369A1',
    'book-open',
    '2026-08-24',
    1,
    null,
    '2026-08-24T12:00:00Z',
    '2026-08-24T12:00:00Z'
  )
on conflict (id) do nothing;

insert into public.habit_checkins (
  id,
  habit_id,
  user_id,
  checkin_date,
  completed_at
)
values (
  '20000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  '00000000-0000-4000-8000-000000000001',
  '2026-08-24',
  '2026-08-24T15:05:00Z'
)
on conflict (habit_id, checkin_date) do nothing;
