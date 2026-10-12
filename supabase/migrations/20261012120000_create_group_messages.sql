-- Chat del grupo (fase colaborativa C5, ADR 0002 y su addendum de C5).
--
-- Igual que el resto de grupos, enviar, leer y borrar mensajes pasa por
-- funciones `security definer` que comprueban la pertenencia y devuelven solo
-- lo que ADR 0002 permite (nombre visible del autor, nunca su id de usuario).
--
-- Única excepción al patrón "tablas de grupos sin políticas": Realtime
-- (`postgres_changes`) necesita poder leer la fila con el rol del cliente para
-- decidir a quién avisar. Por eso `group_messages` tiene una política `select`
-- solo para miembros actuales y un `grant select` limitado a `id` y `group_id`:
-- el evento no lleva ni el texto ni el autor, y la app lo usa solo como señal
-- para volver a pedir los mensajes por RPC (ADR 0001). No hay permisos de
-- escritura para clientes.

-- 1. Tabla ----------------------------------------------------------------------

-- Salir del grupo no borra los mensajes (el autor pasa a "Antiguo miembro");
-- borrar la cuenta o el grupo sí, en cascada (ADR 0002 §3).
create table public.group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (
    char_length(body) between 1 and 1000
    and body = regexp_replace(body, '^\s+|\s+$', '', 'g')
  ),
  created_at timestamptz not null default now()
);

-- Paginación por (created_at, id) descendente y límite de envío por persona.
create index group_messages_group_created_idx
  on public.group_messages (group_id, created_at desc, id desc);
create index group_messages_author_idx
  on public.group_messages (user_id, group_id, created_at desc);

alter table public.group_messages enable row level security;

revoke all on table public.group_messages from anon, authenticated;

-- 2. Lectura para Realtime --------------------------------------------------------

-- `security definer` para consultar `group_members` sin dar a los clientes
-- permiso sobre esa tabla. Es la única función de `private` que pueden
-- ejecutar: la usa la política de abajo, que se evalúa con el rol del cliente.
create function private.is_group_member(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_members m
    where m.group_id = target_group_id
      and m.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_group_member(uuid) from public, anon, authenticated;
grant usage on schema private to authenticated;
grant execute on function private.is_group_member(uuid) to authenticated;

-- Con `usage` sobre el esquema, `authenticated` solo puede ejecutar lo que
-- tenga permitido. Todas las funciones de `private` ya lo tienen revocado
-- salvo este trigger, que conservaba el permiso por defecto de `public`.
revoke all on function private.set_updated_at() from public, anon, authenticated;

create policy "group_messages_select_member"
on public.group_messages
for select
to authenticated
using (private.is_group_member(group_id));

-- Solo las columnas que necesita el evento: Realtime omite del payload las que
-- el rol no puede leer, así que nunca viaja el texto ni el id del autor.
grant select (id, group_id) on table public.group_messages to authenticated;

-- Las eliminaciones no se emiten: Realtime no puede aplicar la RLS a un
-- DELETE, y con la identidad de réplica por defecto el filtro por `group_id`
-- no las deja pasar. Los demás ven el borrado en la siguiente consulta.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.group_messages;
  end if;
end;
$$;

-- 3. Funciones públicas -------------------------------------------------------------

-- Devuelve el id del mensaje. `message_id` lo genera la app para que reintentar
-- tras un fallo de red no duplique el mensaje: si ya existe y es de quien
-- llama en este grupo, se devuelve sin insertar otro.
create function public.send_group_message(
  group_id uuid,
  body text,
  message_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  cleaned text := regexp_replace(coalesce(body, ''), '^\s+|\s+$', '', 'g');
  existing record;
  new_id uuid;
begin
  -- Bloquear la membresía serializa los envíos de esa persona en el grupo
  -- (el límite por minuto no se puede saltar en paralelo) sin frenar a los demás.
  perform 1
  from public.group_members m
  where m.group_id = send_group_message.group_id and m.user_id = uid
  for no key update;

  if not found then
    raise exception 'No formas parte de este grupo.' using errcode = '42501';
  end if;

  if message_id is not null then
    select g.group_id, g.user_id into existing
    from public.group_messages g
    where g.id = message_id;

    if found then
      if existing.group_id = send_group_message.group_id and existing.user_id = uid then
        return message_id;
      end if;
      raise exception 'No se pudo enviar el mensaje. Inténtalo de nuevo.' using errcode = 'P0001';
    end if;
  end if;

  if cleaned = '' then
    raise exception 'Escribe un mensaje.' using errcode = 'P0001';
  end if;

  if char_length(cleaned) > 1000 then
    raise exception 'El mensaje no puede tener más de 1000 caracteres.' using errcode = 'P0001';
  end if;

  if (
    select count(*)
    from public.group_messages g
    where g.group_id = send_group_message.group_id
      and g.user_id = uid
      and g.created_at > now() - interval '1 minute'
  ) >= 10 then
    raise exception 'Has enviado 10 mensajes en el último minuto. Espera un poco antes de seguir.'
      using errcode = 'P0001';
  end if;

  insert into public.group_messages (id, group_id, user_id, body)
  values (
    coalesce(message_id, gen_random_uuid()),
    send_group_message.group_id,
    uid,
    cleaned
  )
  returning id into new_id;

  return new_id;
end;
$$;

-- Página de mensajes, del más reciente al más antiguo. Para la siguiente
-- página se pasan `created_at` e `id` del último mensaje recibido (cursor).
-- Del autor solo sale su nombre visible y el id opaco de su membresía; si ya
-- no está en el grupo, "Antiguo miembro" y `member_id` nulo.
create function public.get_group_messages(
  group_id uuid,
  before_created_at timestamptz default null,
  before_id uuid default null,
  page_size integer default 50
)
returns table (
  id uuid,
  body text,
  created_at timestamptz,
  member_id uuid,
  author_name text,
  is_mine boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
begin
  if not exists (
    select 1 from public.group_members m
    where m.group_id = get_group_messages.group_id and m.user_id = uid
  ) then
    raise exception 'No formas parte de este grupo.' using errcode = '42501';
  end if;

  return query
  select
    g.id,
    g.body,
    g.created_at,
    m.id,
    case
      when m.id is null then 'Antiguo miembro'
      when private.is_placeholder_display_name(p.display_name) then 'Miembro'
      else p.display_name
    end,
    g.user_id = uid
  from public.group_messages g
  left join public.group_members m
    on m.group_id = g.group_id and m.user_id = g.user_id
  left join public.profiles p
    on p.id = g.user_id
  where g.group_id = get_group_messages.group_id
    and (
      before_created_at is null
      or g.created_at < before_created_at
      or (g.created_at = before_created_at and before_id is not null and g.id < before_id)
    )
  order by g.created_at desc, g.id desc
  limit least(greatest(coalesce(page_size, 50), 1), 100);
end;
$$;

-- Solo los mensajes propios, y solo mientras se es miembro del grupo. Un id
-- ajeno o inexistente recibe el mismo mensaje: no se revela qué ids existen.
create function public.delete_group_message(message_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  target_group_id uuid;
begin
  select g.group_id into target_group_id
  from public.group_messages g
  where g.id = message_id and g.user_id = uid;

  if target_group_id is null then
    raise exception 'Este mensaje ya no está disponible.' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.group_members m
    where m.group_id = target_group_id and m.user_id = uid
  ) then
    raise exception 'No formas parte de este grupo.' using errcode = '42501';
  end if;

  delete from public.group_messages g where g.id = message_id;
end;
$$;

-- 4. Permisos de ejecución ----------------------------------------------------------

revoke all on function public.send_group_message(uuid, text, uuid) from public, anon;
revoke all on function public.get_group_messages(uuid, timestamptz, uuid, integer) from public, anon;
revoke all on function public.delete_group_message(uuid) from public, anon;

grant execute on function public.send_group_message(uuid, text, uuid) to authenticated;
grant execute on function public.get_group_messages(uuid, timestamptz, uuid, integer) to authenticated;
grant execute on function public.delete_group_message(uuid) to authenticated;
