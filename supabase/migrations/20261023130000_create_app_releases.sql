-- Avisos de actualización de la app móvil.
--
-- La app se distribuye como APK fuera de las tiendas y sin OTA: una versión
-- instalada solo se entera de que hay otra más nueva consultando esta tabla.
-- Cada fila es una versión publicada con sus cambios y el enlace de descarga.
--
-- Se edita a mano desde el dashboard o el SQL Editor (ver apps/mobile/README.md
-- → «Publicar una versión»): los clientes solo pueden leer, y únicamente las
-- versiones con `published_at` ya cumplido. `anon` también lee porque el aviso
-- sale aunque no haya sesión iniciada (pantallas de login y registro).

create table public.app_releases (
  id uuid primary key default gen_random_uuid(),
  platform text not null default 'android' check (platform in ('android', 'ios')),
  -- Se compara con `expo.version` de apps/mobile/app.json.
  version text not null check (version ~ '^\d+\.\d+\.\d+$'),
  title text not null check (char_length(title) between 1 and 120),
  summary text not null default '' check (char_length(summary) <= 500),
  -- Lista de `{ "type": "added" | "changed" | "removed", "text": "..." }`.
  -- La app descarta los elementos que no tengan esa forma.
  changes jsonb not null default '[]'::jsonb check (jsonb_typeof(changes) = 'array'),
  download_url text not null check (download_url ~ '^https://'),
  -- true = el aviso no se puede cerrar hasta actualizar.
  mandatory boolean not null default false,
  -- null = borrador; una fecha futura programa la publicación.
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (platform, version)
);

alter table public.app_releases enable row level security;

revoke all on table public.app_releases from anon, authenticated;
grant select on table public.app_releases to anon, authenticated;

create policy "app_releases_select_published"
on public.app_releases
for select
to anon, authenticated
using (published_at is not null and published_at <= now());
