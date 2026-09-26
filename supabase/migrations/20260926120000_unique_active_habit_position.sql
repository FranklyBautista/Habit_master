-- Dos hábitos activos del mismo usuario podían acabar con la misma posición
-- (condición de carrera entre dispositivos, datos locales antiguos que la
-- calculaban contando hábitos) y el orden en Hoy/Hábitos se rompía en
-- silencio. Solo cuentan los activos: un archivado conserva su posición
-- antigua y un activo puede reutilizarla.

-- 1. Renumerar los duplicados existentes antes de exigir la restricción,
--    conservando el orden visible (posición y, a igualdad, antigüedad).
with duplicated_users as (
  select user_id
  from public.habits
  where archived_at is null
  group by user_id, position
  having count(*) > 1
),
ranked as (
  select
    id,
    (row_number() over (
      partition by user_id order by position, created_at, id
    ) - 1)::integer as new_position
  from public.habits
  where archived_at is null
    and user_id in (select user_id from duplicated_users)
)
update public.habits h
set position = ranked.new_position
from ranked
where h.id = ranked.id
  and h.position <> ranked.new_position;

-- 2. Un índice único parcial no puede ser diferible; la exclusión sí. Se
--    comprueba al confirmar la transacción, así que un reordenamiento que
--    intercambia posiciones en un mismo UPDATE no choca a mitad de camino.
alter table public.habits
  add constraint habits_active_position_unique
  exclude using btree (user_id with =, position with =)
  where (archived_at is null)
  deferrable initially deferred;

-- 3. Reordenar en una sola sentencia. Antes cada cliente enviaba un UPDATE
--    por hábito en paralelo (una transacción cada uno): con la restricción,
--    cualquier intercambio fallaría. `security invoker`: RLS sigue aplicando.
--    Exige la lista completa de hábitos activos del usuario; si otro
--    dispositivo creó, archivó o restauró uno, el cliente tiene una lista
--    vieja y debe recargar en vez de dejar posiciones repetidas.
create function public.reorder_habits(ordered_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (
    select array_agg(id order by id)
    from public.habits
    where user_id = (select auth.uid())
      and archived_at is null
  ) is distinct from (
    select array_agg(distinct ordered_id order by ordered_id)
    from unnest(ordered_ids) as ordered_id
  )
    or cardinality(ordered_ids) <> (select count(distinct ordered_id)
      from unnest(ordered_ids) as ordered_id)
  then
    raise exception
      'La lista de hábitos cambió en otro dispositivo. Vuelve a intentarlo.'
      using errcode = 'P0001';
  end if;

  update public.habits h
  set position = (ordered.ordinality - 1)::integer
  from unnest(ordered_ids) with ordinality as ordered(id, ordinality)
  where h.id = ordered.id
    and h.position <> (ordered.ordinality - 1)::integer;
end;
$$;

revoke all on function public.reorder_habits(uuid[]) from public, anon;
grant execute on function public.reorder_habits(uuid[]) to authenticated;

-- 4. La importación de datos locales renumera los hábitos activos detrás de
--    los que la cuenta ya tenga: el prototipo local calculaba la posición
--    contando hábitos activos y puede traer posiciones repetidas.
create or replace function public.import_local_data(habits jsonb, checkins jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  next_position integer;
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

  select coalesce(max(p.position) + 1, 0)
  into next_position
  from public.habits p
  where p.user_id = uid
    and p.archived_at is null
    and p.id not in (
      select h.id from jsonb_to_recordset(habits) as h(id uuid)
    );

  insert into public.habits (
    id, user_id, name, description, color, icon, frequency,
    start_date, position, archived_at, created_at, updated_at
  )
  select
    h.id, uid, h.name, h.description, h.color, h.icon, h.frequency,
    h."startDate",
    case
      when h."archivedAt" is null then next_position + (row_number() over (
        partition by h."archivedAt" is null
        order by h.position, h."createdAt", h.id
      ) - 1)::integer
      else h.position
    end,
    h."archivedAt", h."createdAt", h."updatedAt"
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
