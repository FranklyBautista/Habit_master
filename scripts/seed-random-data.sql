-- Datos aleatorios para probar visualmente calendario / estadísticas.
-- Uso (Supabase local):
--   docker exec -i supabase_db_habit_tracker psql -U postgres \
--     -v email=tu-correo@ejemplo.com -v wipe=1 < scripts/seed-random-data.sql
--
--   :email  correo del usuario (auth.users) al que asignar los datos. Obligatorio.
--   :wipe   1 = borra antes los hábitos/check-ins del usuario; 0 = añade. Def. 0.
--
-- No es parte del esquema ni del seed de producción: solo una ayuda de desarrollo.
\set ON_ERROR_STOP on
\if :{?wipe} \else \set wipe 0 \endif

select set_config('seed.email', :'email', false);
select set_config('seed.wipe', :'wipe', false);

do $$
declare
  v_email text := current_setting('seed.email');
  v_wipe  boolean := current_setting('seed.wipe') = '1';
  v_user  uuid;
  v_today date := current_date;
  colors  text[] := array['#047857','#0369A1','#7C3AED','#C2410C','#BE185D','#0F766E'];
  icons   text[] := array['brain','book-open','footprints','list-checks','notebook-pen','sparkles'];
  names   text[] := array[
    'Meditar','Leer 20 min','Ejercicio','Beber agua','Escribir diario',
    'Estirar','Dormir 8 h','Estudiar','Pasear','Sin pantallas de noche'];
  n_habits int := 6;
  pick_names text[];
  i int;
  v_habit uuid;
  v_start date;
  v_archived timestamptz;
  v_prob numeric;
  d date;
begin
  select id into v_user from auth.users where email = v_email;
  if v_user is null then
    raise exception 'No existe un usuario con email %', v_email;
  end if;

  if v_wipe then
    delete from public.habit_checkins where user_id = v_user;
    delete from public.habits where user_id = v_user;
    raise notice 'Datos previos borrados para %', v_email;
  end if;

  -- nombres únicos: baraja la lista y toma los primeros n_habits
  select array_agg(n order by random()) into pick_names from unnest(names) n;

  for i in 0 .. n_habits - 1 loop
    -- ventana de actividad: empieza hace 25–85 días
    v_start := v_today - (25 + floor(random() * 60))::int;
    -- ~1 de cada 6 hábitos archivado en algún punto posterior
    v_archived := case
      when random() < 0.18
      then (v_start + (10 + floor(random() * 30))::int)::timestamptz + interval '12 hours'
      else null end;
    -- probabilidad de cumplimiento propia de cada hábito (40%–95%)
    v_prob := 0.40 + random() * 0.55;

    insert into public.habits (user_id, name, description, color, icon, frequency, start_date, position, archived_at)
    values (
      v_user,
      pick_names[1 + (i % array_length(pick_names, 1))],
      case when random() < 0.5 then 'Hábito de prueba' else null end,
      colors[1 + (i % array_length(colors, 1))],
      icons[1 + (i % array_length(icons, 1))],
      'daily', v_start, i, v_archived)
    returning id into v_habit;

    for d in
      select gs::date
      from generate_series(v_start, least(v_today, coalesce(v_archived::date, v_today)), interval '1 day') gs
    loop
      -- tramos con más y menos constancia para que la racha varíe
      if random() < v_prob * (case when (extract(day from d)::int % 11) < 6 then 1.15 else 0.8 end) then
        insert into public.habit_checkins (habit_id, user_id, checkin_date, completed_at)
        values (v_habit, v_user, d, d::timestamptz + interval '20 hours')
        on conflict (habit_id, checkin_date) do nothing;
      end if;
    end loop;
  end loop;

  raise notice 'Listo: % hábitos y % check-ins para %',
    (select count(*) from public.habits where user_id = v_user),
    (select count(*) from public.habit_checkins where user_id = v_user),
    v_email;
end $$;
