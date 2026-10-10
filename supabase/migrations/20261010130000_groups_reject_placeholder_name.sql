-- "Tú" no es un nombre visible: es lo que la app muestra cuando el perfil no
-- tiene nombre. Desde `d802b41` la sincronización de zona horaria reenviaba
-- todos los ajustes, así que guardó "Tú" en los perfiles que no tenían nombre.
-- En un grupo ese valor lo verían los demás (ADR 0002 §2), de modo que:
--   1. se devuelve a null donde lo escribió la app;
--   2. al crear un grupo o unirse, "Tú" cuenta como nombre ausente y tampoco
--      se acepta como nombre nuevo.

update public.profiles
set display_name = null
where btrim(display_name) = 'Tú';

create or replace function private.is_placeholder_display_name(display_name text)
returns boolean
language sql
immutable
security invoker
set search_path = ''
as $$
  select display_name is null or lower(btrim(display_name)) = 'tú';
$$;

revoke all on function private.is_placeholder_display_name(text) from public, anon, authenticated;

create or replace function private.prepare_member_profile(uid uuid, new_display_name text)
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

  if private.is_placeholder_display_name(current_name) then
    if private.is_placeholder_display_name(new_display_name)
      or char_length(btrim(new_display_name)) not between 1 and 60
    then
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
