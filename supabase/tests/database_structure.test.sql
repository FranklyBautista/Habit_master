begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(14);

select has_table('public', 'profiles', 'profiles exists');
select has_table('public', 'habits', 'habits exists');
select has_table('public', 'habit_checkins', 'habit_checkins exists');

select policies_are(
  'public',
  'profiles',
  array[
    'profiles_delete_own',
    'profiles_insert_own',
    'profiles_select_own',
    'profiles_update_own'
  ],
  'profiles has one ownership policy per operation'
);
select policies_are(
  'public',
  'habits',
  array[
    'habits_delete_own',
    'habits_insert_own',
    'habits_select_own',
    'habits_update_own'
  ],
  'habits has one ownership policy per operation'
);
select policies_are(
  'public',
  'habit_checkins',
  array[
    'habit_checkins_delete_own',
    'habit_checkins_insert_own',
    'habit_checkins_select_own',
    'habit_checkins_update_own'
  ],
  'habit_checkins has one ownership policy per operation'
);

select is(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  true,
  'profiles has RLS enabled'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.habits'::regclass),
  true,
  'habits has RLS enabled'
);
select is(
  (select relrowsecurity from pg_class where oid = 'public.habit_checkins'::regclass),
  true,
  'habit_checkins has RLS enabled'
);

select ok(
  not has_table_privilege('anon', 'public.profiles', 'select,insert,update,delete'),
  'anon has no profile privileges'
);
select ok(
  not has_table_privilege('anon', 'public.habits', 'select,insert,update,delete'),
  'anon has no habit privileges'
);
select ok(
  not has_table_privilege('anon', 'public.habit_checkins', 'select,insert,update,delete'),
  'anon has no check-in privileges'
);
select ok(
  has_table_privilege('authenticated', 'public.habits', 'select,insert,update,delete'),
  'authenticated receives explicit habit privileges'
);
select ok(
  has_table_privilege('authenticated', 'public.habit_checkins', 'select,insert,update,delete'),
  'authenticated receives explicit check-in privileges'
);

select * from finish();
rollback;
