-- Lote de check-ins hechos sin conexión en la app móvil (ADR 0003). La RLS de
-- habit_checkins solo acepta ayer–mañana (UTC); este RPC amplía la ventana a 7
-- días atrás en la zona del usuario (hoy - 8 en UTC) solo para estos lotes.
-- `security definer` para saltar esa ventana, así que fuerza `user_id = uid` y
-- comprueba la propiedad de cada hábito a mano, como import_local_data.
-- Las operaciones inválidas se omiten sin abortar el lote: devuelve cuántas se
-- aplicaron y cuántas se rechazaron para que la app pueda avisar.
create function public.sync_offline_checkins(ops jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  today date := (now() at time zone 'utc')::date;
  op record;
  applied integer := 0;
  rejected integer := 0;
begin
  if uid is null then
    raise exception 'Inicia sesión para sincronizar tus hábitos.' using errcode = '42501';
  end if;

  -- Dos `if` separados: Postgres no garantiza el cortocircuito de `or` y
  -- jsonb_array_length falla con un objeto.
  if jsonb_typeof(ops) is distinct from 'array' then
    raise exception 'Lote de sincronización no válido.' using errcode = 'P0001';
  end if;
  if jsonb_array_length(ops) > 500 then
    raise exception 'Lote de sincronización no válido.' using errcode = 'P0001';
  end if;

  for op in
    select o."habitId" as habit_id, o."checkinDate" as checkin_date, o.completed
    from jsonb_to_recordset(ops) as o("habitId" uuid, "checkinDate" date, completed boolean)
  loop
    if op.habit_id is null
      or op.checkin_date is null
      or op.completed is null
      or op.checkin_date not between today - 8 and today + 1
      or not exists (
        select 1 from public.habits h where h.id = op.habit_id and h.user_id = uid
      )
    then
      rejected := rejected + 1;
      continue;
    end if;

    if op.completed then
      insert into public.habit_checkins (habit_id, user_id, checkin_date)
      values (op.habit_id, uid, op.checkin_date)
      on conflict (habit_id, checkin_date) do nothing;
    else
      delete from public.habit_checkins
      where habit_id = op.habit_id
        and user_id = uid
        and checkin_date = op.checkin_date;
    end if;
    applied := applied + 1;
  end loop;

  return jsonb_build_object('applied', applied, 'rejected', rejected);
end;
$$;

revoke all on function public.sync_offline_checkins(jsonb) from public, anon;
grant execute on function public.sync_offline_checkins(jsonb) to authenticated;
