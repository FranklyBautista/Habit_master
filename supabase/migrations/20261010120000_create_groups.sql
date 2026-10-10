-- Grupos de hábitos compartidos (fase colaborativa C2, ADR 0002).
--
-- Las tablas nuevas tienen RLS activada y ningún permiso para los clientes:
-- toda lectura y escritura pasa por funciones `security definer` que
-- comprueban la pertenencia al grupo y devuelven solo las columnas que ADR 0002
-- permite exponer. `habits`, `habit_checkins` y `habit_archive_periods` siguen
-- siendo owner-only; ninguna política se amplía.

-- 1. Código de usuario ---------------------------------------------------------

-- 8 caracteres en base32 de Crockford (40 bits aleatorios, sin I, L, O ni U).
-- Se guarda sin guion; el cliente lo muestra como `XXXX-XXXX`.
create function private.generate_user_code()
returns text
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  alphabet constant text := '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
  bytes bytea := extensions.gen_random_bytes(5);
  bits bigint := 0;
  code text := '';
begin
  for i in 0..4 loop
    bits := (bits << 8) | get_byte(bytes, i);
  end loop;
  for i in 0..7 loop
    code := substr(alphabet, ((bits >> (35 - i * 5)) & 31)::integer + 1, 1) || code;
  end loop;
  return code;
end;
$$;

revoke all on function private.generate_user_code() from public, anon, authenticated;

-- Acepta lo que la persona escriba o pegue: minúsculas, guion, espacios y las
-- letras que Crockford lee como dígitos (I/L → 1, O → 0).
create function private.normalize_user_code(raw text)
returns text
language sql
immutable
security invoker
set search_path = ''
as $$
  select translate(upper(regexp_replace(coalesce(raw, ''), '[\s-]', '', 'g')), 'ILO', '110');
$$;

revoke all on function private.normalize_user_code(text) from public, anon, authenticated;

-- Lo asigna un trigger y no un `default`: un valor por defecto se evalúa con
-- los permisos de quien inserta, y los clientes no pueden ejecutar funciones de
-- `private` (el upsert de `ensureProfile()` fallaría).
create function private.assign_user_code()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.user_code := private.generate_user_code();
  return new;
end;
$$;

revoke all on function private.assign_user_code() from public, anon, authenticated;

alter table public.profiles add column user_code text;

update public.profiles set user_code = private.generate_user_code();

-- El `default ''` solo existe para que el código sea opcional al insertar (y
-- en los tipos generados); el trigger lo sustituye siempre antes del `check`.
alter table public.profiles
  alter column user_code set default '',
  alter column user_code set not null,
  add constraint profiles_user_code_format_check
    check (user_code ~ '^[0-9A-HJKMNP-TV-Z]{8}$'),
  add constraint profiles_user_code_key unique (user_code);

create trigger profiles_assign_user_code
before insert on public.profiles
for each row execute function private.assign_user_code();

-- Hasta ahora el cliente podía actualizar cualquier columna de su perfil. El
-- código lo genera solo el servidor (`regenerate_user_code`), así que los
-- permisos pasan a ser por columna. `id` sigue en la lista porque el upsert de
-- `ensureProfile()` lo envía; la RLS impide cambiarlo por otro.
revoke insert, update on table public.profiles from authenticated;
grant insert (id, display_name, timezone, locale, week_starts_on)
  on table public.profiles to authenticated;
grant update (id, display_name, timezone, locale, week_starts_on)
  on table public.profiles to authenticated;

-- 2. Tablas --------------------------------------------------------------------

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 60),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- `id` es un identificador opaco de la membresía: el dueño expulsa o transfiere
-- con él, sin que el cliente vea nunca el id de usuario de otra persona.
create table public.group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  unique (group_id, user_id)
);

-- Como mucho un dueño por grupo; las funciones garantizan que haya al menos uno.
create unique index group_members_one_owner_idx
  on public.group_members (group_id)
  where role = 'owner';
create index group_members_user_idx on public.group_members (user_id);

-- `invitee_code` guarda el código tal como se usó: el dueño ve sus
-- invitaciones pendientes por código, nunca por nombre ni correo, aunque la
-- persona lo regenere después. `muted`: invitación que el dueño ve como
-- enviada, pero que el invitado no recibe porque rechazó otra de este grupo
-- hace menos de 30 días (ADR 0002 §1).
create table public.group_invitations (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  inviter_id uuid not null references auth.users (id) on delete cascade,
  invitee_id uuid not null references auth.users (id) on delete cascade,
  invitee_code text not null,
  status text not null default 'pending' check (
    status in ('pending', 'accepted', 'declined', 'cancelled', 'expired')
  ),
  muted boolean not null default false,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '7 days',
  responded_at timestamptz,
  check (expires_at > created_at)
);

create unique index group_invitations_one_pending_idx
  on public.group_invitations (group_id, invitee_id)
  where status = 'pending';
create index group_invitations_invitee_idx
  on public.group_invitations (invitee_id, status);
create index group_invitations_inviter_created_idx
  on public.group_invitations (inviter_id, created_at desc);

-- Las dos claves foráneas compuestas hacen el trabajo de ADR 0002 §3: solo se
-- comparten hábitos propios, y salir o ser expulsado borra lo compartido en ese
-- grupo (borrar el hábito también).
create table public.group_habit_shares (
  group_id uuid not null,
  habit_id uuid not null,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (group_id, habit_id),
  constraint group_habit_shares_habit_owner_fkey
    foreign key (habit_id, user_id)
    references public.habits (id, user_id)
    on delete cascade,
  constraint group_habit_shares_member_fkey
    foreign key (group_id, user_id)
    references public.group_members (group_id, user_id)
    on delete cascade
);

create index group_habit_shares_member_idx
  on public.group_habit_shares (group_id, user_id);
create index group_habit_shares_habit_owner_idx
  on public.group_habit_shares (habit_id, user_id);

create trigger groups_set_updated_at
before update on public.groups
for each row execute function private.set_updated_at();

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.group_invitations enable row level security;
alter table public.group_habit_shares enable row level security;

revoke all on table public.groups from anon, authenticated;
revoke all on table public.group_members from anon, authenticated;
revoke all on table public.group_invitations from anon, authenticated;
revoke all on table public.group_habit_shares from anon, authenticated;

-- 3. Dueño al borrar una cuenta -----------------------------------------------

-- Si desaparece el dueño (su cuenta se borra y la membresía cae en cascada), la
-- propiedad pasa al miembro más antiguo; sin miembros, el grupo se borra. Salir
-- del grupo como dueño lo impide antes `leave_group`.
create function private.handle_group_member_removed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.groups where id = old.group_id) then
    return null;
  end if;

  if not exists (select 1 from public.group_members where group_id = old.group_id) then
    delete from public.groups where id = old.group_id;
  elsif old.role = 'owner'
    and not exists (
      select 1 from public.group_members
      where group_id = old.group_id and role = 'owner'
    )
  then
    update public.group_members
    set role = 'owner'
    where id = (
      select id from public.group_members
      where group_id = old.group_id
      order by joined_at, id
      limit 1
    );
  end if;
  return null;
end;
$$;

revoke all on function private.handle_group_member_removed() from public, anon, authenticated;

create trigger group_members_after_delete
after delete on public.group_members
for each row execute function private.handle_group_member_removed();

-- 4. Funciones auxiliares -----------------------------------------------------

-- "Hoy" de una persona sin exponer su zona. Una zona inválida (datos antiguos)
-- cae a UTC en vez de romper la vista de todo el grupo.
create function private.local_date(instant timestamptz, tz text)
returns date
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  return (instant at time zone tz)::date;
exception
  when invalid_parameter_value then
    return (instant at time zone 'UTC')::date;
end;
$$;

revoke all on function private.local_date(timestamptz, text) from public, anon, authenticated;

create function private.require_user()
returns uuid
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
begin
  if uid is null then
    raise exception 'Inicia sesión para usar los grupos.' using errcode = '42501';
  end if;
  return uid;
end;
$$;

revoke all on function private.require_user() from public, anon, authenticated;

-- Bloquea el grupo para serializar las operaciones que cuentan miembros o
-- invitaciones, y devuelve el rol de quien llama. El mismo mensaje sirve para
-- un grupo inexistente y uno ajeno: no se revela qué ids existen.
create function private.lock_group_for_member(target_group_id uuid, uid uuid)
returns text
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  member_role text;
begin
  perform 1 from public.groups where id = target_group_id for update;

  select role into member_role
  from public.group_members
  where group_id = target_group_id and user_id = uid;

  if member_role is null then
    raise exception 'No formas parte de este grupo.' using errcode = '42501';
  end if;
  return member_role;
end;
$$;

revoke all on function private.lock_group_for_member(uuid, uuid) from public, anon, authenticated;

create function private.require_owner(target_group_id uuid, uid uuid)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
begin
  if private.lock_group_for_member(target_group_id, uid) <> 'owner' then
    raise exception 'Solo el dueño del grupo puede hacer esto.' using errcode = '42501';
  end if;
end;
$$;

revoke all on function private.require_owner(uuid, uuid) from public, anon, authenticated;

-- Para entrar en un grupo hace falta nombre visible (ADR 0002 §2). Si el
-- perfil no lo tiene, se guarda el que se pase; si tampoco hay, error.
-- Bloquea el perfil para que dos altas simultáneas no superen los 10 grupos.
create function private.prepare_member_profile(uid uuid, new_display_name text)
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  current_name text;
begin
  insert into public.profiles (id) values (uid) on conflict (id) do nothing;

  select display_name into current_name
  from public.profiles
  where id = uid
  for update;

  if current_name is null then
    if new_display_name is null or char_length(btrim(new_display_name)) not between 1 and 60 then
      raise exception 'Elige un nombre visible de 1 a 60 caracteres para unirte a un grupo.'
        using errcode = 'P0001';
    end if;
    update public.profiles set display_name = btrim(new_display_name) where id = uid;
  end if;

  if (select count(*) from public.group_members where user_id = uid) >= 10 then
    raise exception 'Ya estás en 10 grupos, el máximo.' using errcode = 'P0001';
  end if;
end;
$$;

revoke all on function private.prepare_member_profile(uuid, text) from public, anon, authenticated;

-- Sustituye los hábitos activos que `uid` comparte en el grupo. Los archivados
-- ya compartidos se conservan: vuelven a verse al restaurarlos (ADR 0002 §2).
create function private.replace_shared_habits(target_group_id uuid, uid uuid, habit_ids uuid[])
returns void
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  wanted uuid[] := coalesce(
    (select array_agg(distinct id) from unnest(habit_ids) as id where id is not null),
    '{}'
  );
begin
  if cardinality(wanted) > 10 then
    raise exception 'Puedes compartir como máximo 10 hábitos por grupo.' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from unnest(wanted) as w(id)
    where not exists (
      select 1 from public.habits h
      where h.id = w.id and h.user_id = uid and h.archived_at is null
    )
  ) then
    raise exception 'Solo puedes compartir tus hábitos activos.' using errcode = 'P0001';
  end if;

  delete from public.group_habit_shares s
  using public.habits h
  where s.group_id = target_group_id
    and s.user_id = uid
    and h.id = s.habit_id
    and h.archived_at is null
    and not (s.habit_id = any (wanted));

  insert into public.group_habit_shares (group_id, habit_id, user_id)
  select target_group_id, w.id, uid
  from unnest(wanted) as w(id)
  on conflict (group_id, habit_id) do nothing;
end;
$$;

revoke all on function private.replace_shared_habits(uuid, uuid, uuid[]) from public, anon, authenticated;

create function private.validate_group_name(group_name text)
returns text
language plpgsql
immutable
security invoker
set search_path = ''
as $$
begin
  if group_name is null or char_length(btrim(group_name)) not between 1 and 60 then
    raise exception 'El nombre del grupo debe tener entre 1 y 60 caracteres.'
      using errcode = 'P0001';
  end if;
  return btrim(group_name);
end;
$$;

revoke all on function private.validate_group_name(text) from public, anon, authenticated;

-- 5. Funciones públicas: código de usuario y grupos ----------------------------

create function public.regenerate_user_code()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  new_code text;
begin
  loop
    begin
      update public.profiles
      set user_code = private.generate_user_code()
      where id = uid
      returning user_code into new_code;
      exit;
    exception
      when unique_violation then
        -- Colisión entre ~10¹² códigos: se prueba otro.
    end;
  end loop;

  if new_code is null then
    raise exception 'No se encontró tu perfil.' using errcode = 'P0001';
  end if;
  return new_code;
end;
$$;

create function public.create_group(
  group_name text,
  habit_ids uuid[] default '{}',
  new_display_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  new_group_id uuid;
begin
  perform private.prepare_member_profile(uid, new_display_name);

  insert into public.groups (name)
  values (private.validate_group_name(group_name))
  returning id into new_group_id;

  insert into public.group_members (group_id, user_id, role)
  values (new_group_id, uid, 'owner');

  perform private.replace_shared_habits(new_group_id, uid, habit_ids);
  return new_group_id;
end;
$$;

create function public.rename_group(group_id uuid, group_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
begin
  perform private.require_owner(rename_group.group_id, uid);
  update public.groups
  set name = private.validate_group_name(group_name)
  where id = rename_group.group_id;
end;
$$;

create function public.delete_group(group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
begin
  perform private.require_owner(delete_group.group_id, uid);
  delete from public.groups where id = delete_group.group_id;
end;
$$;

-- Devuelve 'sent', 'already_member' o 'already_invited'. Los errores (código
-- no válido, límites) se lanzan con el mensaje que muestra la app.
create function public.invite_to_group(group_id uuid, user_code text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  code text := private.normalize_user_code(user_code);
  target uuid;
  silenced boolean;
begin
  perform private.require_owner(invite_to_group.group_id, uid);

  if code !~ '^[0-9A-HJKMNP-TV-Z]{8}$' then
    raise exception 'Código no válido.' using errcode = 'P0001';
  end if;

  select id into target from public.profiles where profiles.user_code = code;
  if target is null then
    raise exception 'Código no válido.' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.group_members m
    where m.group_id = invite_to_group.group_id and m.user_id = target
  ) then
    return 'already_member';
  end if;

  update public.group_invitations i
  set status = 'expired'
  where i.group_id = invite_to_group.group_id
    and i.status = 'pending'
    and i.expires_at <= now();

  if exists (
    select 1 from public.group_invitations i
    where i.group_id = invite_to_group.group_id
      and i.invitee_id = target
      and i.status = 'pending'
  ) then
    return 'already_invited';
  end if;

  if (select count(*) from public.group_members m where m.group_id = invite_to_group.group_id)
    + (select count(*) from public.group_invitations i
       where i.group_id = invite_to_group.group_id and i.status = 'pending') >= 10
  then
    raise exception 'Este grupo ya tiene 10 miembros e invitaciones pendientes, el máximo.'
      using errcode = 'P0001';
  end if;

  if (
    select count(*) from public.group_invitations i
    where i.inviter_id = uid and i.created_at > now() - interval '24 hours'
  ) >= 20 then
    raise exception 'Has enviado 20 invitaciones en las últimas 24 horas. Inténtalo más tarde.'
      using errcode = 'P0001';
  end if;

  -- Tras un rechazo, 30 días sin volver a molestar, sin decírselo al dueño.
  silenced := exists (
    select 1 from public.group_invitations i
    where i.group_id = invite_to_group.group_id
      and i.invitee_id = target
      and i.status = 'declined'
      and i.responded_at > now() - interval '30 days'
  );

  insert into public.group_invitations (group_id, inviter_id, invitee_id, invitee_code, muted)
  values (invite_to_group.group_id, uid, target, code, silenced);

  return 'sent';
end;
$$;

create function public.cancel_invitation(invitation_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  target_group_id uuid;
begin
  select group_id into target_group_id
  from public.group_invitations
  where id = invitation_id and status = 'pending';

  if target_group_id is null then
    raise exception 'Esta invitación ya no está disponible.' using errcode = 'P0001';
  end if;

  perform private.require_owner(target_group_id, uid);

  update public.group_invitations
  set status = 'cancelled', responded_at = now()
  where id = invitation_id and status = 'pending';
end;
$$;

create function public.respond_invitation(
  invitation_id uuid,
  accept boolean,
  habit_ids uuid[] default '{}',
  new_display_name text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  invitation public.group_invitations;
begin
  select * into invitation
  from public.group_invitations
  where id = invitation_id
  for update;

  -- Ajena, silenciada, caducada o ya respondida: el mismo mensaje para todas.
  if invitation.id is null
    or invitation.invitee_id <> uid
    or invitation.muted
    or invitation.status <> 'pending'
    or invitation.expires_at <= now()
  then
    raise exception 'Esta invitación ya no está disponible.' using errcode = 'P0001';
  end if;

  if not accept then
    update public.group_invitations
    set status = 'declined', responded_at = now()
    where id = invitation_id;
    return;
  end if;

  perform 1 from public.groups where id = invitation.group_id for update;
  perform private.prepare_member_profile(uid, new_display_name);

  -- Esta invitación ya contaba para el límite al crearse, así que solo faltan
  -- plazas si el grupo se llenó de otra forma (no debería pasar).
  if (select count(*) from public.group_members where group_id = invitation.group_id) >= 10 then
    raise exception 'Este grupo ya tiene 10 miembros, el máximo.' using errcode = 'P0001';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (invitation.group_id, uid, 'member');

  update public.group_invitations
  set status = 'accepted', responded_at = now()
  where id = invitation_id;

  perform private.replace_shared_habits(invitation.group_id, uid, habit_ids);
end;
$$;

create function public.set_shared_habits(group_id uuid, habit_ids uuid[])
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
begin
  perform private.lock_group_for_member(set_shared_habits.group_id, uid);
  perform private.replace_shared_habits(set_shared_habits.group_id, uid, habit_ids);
end;
$$;

create function public.remove_member(group_id uuid, member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
begin
  perform private.require_owner(remove_member.group_id, uid);

  delete from public.group_members m
  where m.id = member_id
    and m.group_id = remove_member.group_id
    and m.user_id <> uid;

  if not found then
    raise exception 'Esa persona ya no está en el grupo.' using errcode = 'P0001';
  end if;
end;
$$;

create function public.transfer_ownership(group_id uuid, member_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
begin
  perform private.require_owner(transfer_ownership.group_id, uid);

  if not exists (
    select 1 from public.group_members m
    where m.id = member_id
      and m.group_id = transfer_ownership.group_id
      and m.user_id <> uid
  ) then
    raise exception 'Esa persona ya no está en el grupo.' using errcode = 'P0001';
  end if;

  -- Primero se degrada al dueño actual: el índice único admite un solo dueño.
  update public.group_members m
  set role = 'member'
  where m.group_id = transfer_ownership.group_id and m.user_id = uid;

  update public.group_members m
  set role = 'owner'
  where m.id = member_id;
end;
$$;

create function public.leave_group(group_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
begin
  if private.lock_group_for_member(leave_group.group_id, uid) = 'owner'
    and exists (
      select 1 from public.group_members m
      where m.group_id = leave_group.group_id and m.user_id <> uid
    )
  then
    raise exception 'Transfiere la propiedad a otro miembro antes de salir.'
      using errcode = 'P0001';
  end if;

  -- Si era el único miembro, el trigger borra el grupo.
  delete from public.group_members m
  where m.group_id = leave_group.group_id and m.user_id = uid;
end;
$$;

-- 6. Lecturas -------------------------------------------------------------------

create function public.get_my_groups()
returns table (
  id uuid,
  name text,
  role text,
  member_count integer,
  joined_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    g.id,
    g.name,
    m.role,
    (select count(*)::integer from public.group_members c where c.group_id = g.id),
    m.joined_at
  from public.group_members m
  join public.groups g on g.id = m.group_id
  where m.user_id = (select auth.uid())
  order by m.joined_at, g.id;
$$;

-- Invitaciones recibidas que se pueden responder. Del dueño solo sale su nombre
-- visible; las silenciadas no aparecen.
create function public.get_my_invitations()
returns table (
  id uuid,
  group_id uuid,
  group_name text,
  inviter_name text,
  member_count integer,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    i.id,
    g.id,
    g.name,
    p.display_name,
    (select count(*)::integer from public.group_members c where c.group_id = g.id),
    i.expires_at
  from public.group_invitations i
  join public.groups g on g.id = i.group_id
  left join public.profiles p on p.id = i.inviter_id
  where i.invitee_id = (select auth.uid())
    and i.status = 'pending'
    and not i.muted
    and i.expires_at > now()
  order by i.created_at, i.id;
$$;

-- Todo lo que la vista del grupo necesita, limitado a ADR 0002 §2:
--   - por miembro: id de membresía, nombre visible, rol, si es quien llama y su
--     "hoy" ya calculado (sin zona horaria);
--   - por hábito compartido y activo: nombre, color, icono, fecha de inicio,
--     periodos de archivado cerrados como fechas locales `[from, to)` y fechas
--     completadas. El id del hábito solo sale en los propios, para gestionar
--     qué se comparte;
--   - invitaciones pendientes, solo para el dueño (por código).
-- Nunca: correo, id de usuario, código de usuario, zona horaria, descripción,
-- posición ni `completed_at`.
create function public.get_group_progress(group_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := private.require_user();
  my_role text;
  result jsonb;
begin
  select m.role into my_role
  from public.group_members m
  where m.group_id = get_group_progress.group_id and m.user_id = uid;

  if my_role is null then
    raise exception 'No formas parte de este grupo.' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'id', g.id,
    'name', g.name,
    'my_role', my_role,
    'members', coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'member_id', m.id,
          'display_name', p.display_name,
          'role', m.role,
          'is_me', m.user_id = uid,
          'today', private.local_date(now(), p.timezone),
          'habits', coalesce((
            select jsonb_agg(
              jsonb_build_object(
                'habit_id', case when h.user_id = uid then h.id end,
                'name', h.name,
                'color', h.color,
                'icon', h.icon,
                'start_date', h.start_date,
                'archive_periods', coalesce((
                  select jsonb_agg(
                    jsonb_build_object(
                      'from', private.local_date(a.archived_at, p.timezone),
                      'to', private.local_date(a.restored_at, p.timezone)
                    )
                    order by a.archived_at
                  )
                  from public.habit_archive_periods a
                  where a.habit_id = h.id and a.user_id = h.user_id
                ), '[]'::jsonb),
                'checkin_dates', coalesce((
                  select jsonb_agg(c.checkin_date order by c.checkin_date)
                  from public.habit_checkins c
                  where c.habit_id = h.id and c.user_id = h.user_id
                ), '[]'::jsonb)
              )
              order by s.created_at, h.name
            )
            from public.group_habit_shares s
            join public.habits h on h.id = s.habit_id and h.user_id = s.user_id
            where s.group_id = g.id
              and s.user_id = m.user_id
              and h.archived_at is null
          ), '[]'::jsonb)
        )
        order by m.joined_at, m.id
      )
      from public.group_members m
      join public.profiles p on p.id = m.user_id
      where m.group_id = g.id
    ), '[]'::jsonb),
    'pending_invitations', case when my_role = 'owner' then coalesce((
      select jsonb_agg(
        jsonb_build_object('id', i.id, 'user_code', i.invitee_code, 'expires_at', i.expires_at)
        order by i.created_at, i.id
      )
      from public.group_invitations i
      where i.group_id = g.id and i.status = 'pending' and i.expires_at > now()
    ), '[]'::jsonb) else '[]'::jsonb end
  )
  into result
  from public.groups g
  where g.id = get_group_progress.group_id;

  return result;
end;
$$;

-- 7. Permisos de ejecución ------------------------------------------------------

revoke all on function public.regenerate_user_code() from public, anon;
revoke all on function public.create_group(text, uuid[], text) from public, anon;
revoke all on function public.rename_group(uuid, text) from public, anon;
revoke all on function public.delete_group(uuid) from public, anon;
revoke all on function public.invite_to_group(uuid, text) from public, anon;
revoke all on function public.cancel_invitation(uuid) from public, anon;
revoke all on function public.respond_invitation(uuid, boolean, uuid[], text) from public, anon;
revoke all on function public.set_shared_habits(uuid, uuid[]) from public, anon;
revoke all on function public.remove_member(uuid, uuid) from public, anon;
revoke all on function public.transfer_ownership(uuid, uuid) from public, anon;
revoke all on function public.leave_group(uuid) from public, anon;
revoke all on function public.get_my_groups() from public, anon;
revoke all on function public.get_my_invitations() from public, anon;
revoke all on function public.get_group_progress(uuid) from public, anon;

grant execute on function public.regenerate_user_code() to authenticated;
grant execute on function public.create_group(text, uuid[], text) to authenticated;
grant execute on function public.rename_group(uuid, text) to authenticated;
grant execute on function public.delete_group(uuid) to authenticated;
grant execute on function public.invite_to_group(uuid, text) to authenticated;
grant execute on function public.cancel_invitation(uuid) to authenticated;
grant execute on function public.respond_invitation(uuid, boolean, uuid[], text) to authenticated;
grant execute on function public.set_shared_habits(uuid, uuid[]) to authenticated;
grant execute on function public.remove_member(uuid, uuid) to authenticated;
grant execute on function public.transfer_ownership(uuid, uuid) to authenticated;
grant execute on function public.leave_group(uuid) to authenticated;
grant execute on function public.get_my_groups() to authenticated;
grant execute on function public.get_my_invitations() to authenticated;
grant execute on function public.get_group_progress(uuid) to authenticated;
