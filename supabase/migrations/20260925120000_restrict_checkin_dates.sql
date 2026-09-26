-- La regla "solo se marca el día actual" (plan §3) se aplicaba solo en los
-- clientes: con su propia sesión, cualquiera podía crear check-ins en
-- cualquier fecha por la Data API e inflar rachas y estadísticas.
--
-- Ventana permitida: de ayer a mañana según UTC. El "hoy" local de cualquier
-- zona horaria (UTC-12 a UTC+14) cae siempre dentro, sin depender de la zona
-- guardada en el perfil, que el propio usuario puede cambiar. Solo afecta a
-- `authenticated`: el seed y los scripts SQL corren como administrador.

drop policy "habit_checkins_insert_own" on public.habit_checkins;
drop policy "habit_checkins_update_own" on public.habit_checkins;

create policy "habit_checkins_insert_own"
on public.habit_checkins for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and checkin_date between (now() at time zone 'utc')::date - 1
    and (now() at time zone 'utc')::date + 1
);

create policy "habit_checkins_update_own"
on public.habit_checkins for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and checkin_date between (now() at time zone 'utc')::date - 1
    and (now() at time zone 'utc')::date + 1
);

-- Única vía para subir historial: importar los datos del prototipo local
-- (localStorage) a una cuenta que todavía no tiene check-ins, como pide el
-- plan ("migración explícita de los datos locales a la primera cuenta").
-- Todo en una transacción: o se importa completo, o no se escribe nada.
-- `security definer` para saltar la ventana de fechas de RLS; por eso valida
-- a mano la propiedad de cada hábito y fuerza `user_id = auth.uid()`.
create function public.import_local_data(habits jsonb, checkins jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'Inicia sesión para importar tus datos.' using errcode = '42501';
  end if;

  if jsonb_array_length(checkins) > 0
    and exists (select 1 from public.habit_checkins where user_id = uid)
  then
    raise exception
      'Esta cuenta ya tiene registros: el historial local solo se puede importar en una cuenta nueva.'
      using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(checkins) as c("checkinDate" date)
    where c."checkinDate" > (now() at time zone 'utc')::date + 1
  ) then
    raise exception 'Los datos locales tienen check-ins con fechas futuras.'
      using errcode = 'P0001';
  end if;

  insert into public.habits (
    id, user_id, name, description, color, icon, frequency,
    start_date, position, archived_at, created_at, updated_at
  )
  select
    h.id, uid, h.name, h.description, h.color, h.icon, h.frequency,
    h."startDate", h.position, h."archivedAt", h."createdAt", h."updatedAt"
  from jsonb_to_recordset(habits) as h(
    id uuid, name text, description text, color text, icon text, frequency text,
    "startDate" date, position integer, "archivedAt" timestamptz,
    "createdAt" timestamptz, "updatedAt" timestamptz
  )
  on conflict (id) do update set
    name = excluded.name,
    description = excluded.description,
    color = excluded.color,
    icon = excluded.icon,
    start_date = excluded.start_date,
    position = excluded.position,
    archived_at = excluded.archived_at
  -- Nunca tocar un hábito ajeno aunque se repita su id.
  where public.habits.user_id = uid;

  if exists (
    select 1
    from jsonb_to_recordset(habits) as h(id uuid)
    where not exists (
      select 1 from public.habits p where p.id = h.id and p.user_id = uid
    )
  ) then
    raise exception 'Los datos locales hacen referencia a un hábito que no es tuyo.'
      using errcode = '42501';
  end if;

  -- La clave foránea compuesta (habit_id, user_id) rechaza cualquier check-in
  -- de un hábito que no pertenezca a `uid`.
  insert into public.habit_checkins (habit_id, user_id, checkin_date, completed_at)
  select c."habitId", uid, c."checkinDate", c."completedAt"
  from jsonb_to_recordset(checkins) as c(
    "habitId" uuid, "checkinDate" date, "completedAt" timestamptz
  )
  on conflict (habit_id, checkin_date) do nothing;
end;
$$;

revoke all on function public.import_local_data(jsonb, jsonb) from public, anon;
grant execute on function public.import_local_data(jsonb, jsonb) to authenticated;
