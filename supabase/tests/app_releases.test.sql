begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(16);

-- Estructura y permisos ---------------------------------------------------------

select has_table('public', 'app_releases', 'app_releases exists');
select is(
  (select relrowsecurity from pg_class where oid = 'public.app_releases'::regclass),
  true,
  'app_releases has RLS enabled'
);
select policies_are(
  'public',
  'app_releases',
  array['app_releases_select_published'],
  'app_releases only has the published select policy'
);
select ok(
  has_table_privilege('anon', 'public.app_releases', 'select')
  and has_table_privilege('authenticated', 'public.app_releases', 'select'),
  'anon and authenticated can read releases'
);
select ok(
  not has_table_privilege('anon', 'public.app_releases', 'insert,update,delete')
  and not has_table_privilege('authenticated', 'public.app_releases', 'insert,update,delete'),
  'clients cannot write releases'
);

-- Restricciones -------------------------------------------------------------------

select throws_ok(
  $$insert into public.app_releases (version, title, download_url)
    values ('1.2', 'Versión rota', 'https://example.test/app.apk')$$,
  '23514',
  null,
  'the version must be semver'
);
select throws_ok(
  $$insert into public.app_releases (version, title, download_url)
    values ('1.2.0', 'Enlace inseguro', 'http://example.test/app.apk')$$,
  '23514',
  null,
  'the download url must be https'
);
select throws_ok(
  $$insert into public.app_releases (version, title, download_url, changes)
    values ('1.2.0', 'Cambios rotos', 'https://example.test/app.apk', '{"type":"added"}')$$,
  '23514',
  null,
  'changes must be a json array'
);
select throws_ok(
  $$insert into public.app_releases (platform, version, title, download_url)
    values ('windows', '1.2.0', 'Otra plataforma', 'https://example.test/app.apk')$$,
  '23514',
  null,
  'the platform must be android or ios'
);

insert into public.app_releases (version, title, download_url, changes, published_at)
values
  (
    '1.1.0',
    'Publicada',
    'https://example.test/1.1.0.apk',
    '[{"type":"added","text":"Avisos de actualización"}]',
    now() - interval '1 day'
  ),
  ('1.2.0', 'Borrador', 'https://example.test/1.2.0.apk', '[]', null),
  ('1.3.0', 'Programada', 'https://example.test/1.3.0.apk', '[]', now() + interval '1 day');

select throws_ok(
  $$insert into public.app_releases (version, title, download_url)
    values ('1.1.0', 'Repetida', 'https://example.test/otra.apk')$$,
  '23505',
  null,
  'a version is unique per platform'
);
select lives_ok(
  $$insert into public.app_releases (platform, version, title, download_url)
    values ('ios', '1.1.0', 'Misma versión en iOS', 'https://example.test/ios')$$,
  'the same version can exist on another platform'
);

-- Lectura como cliente --------------------------------------------------------------

set local role anon;

select results_eq(
  $$select version from public.app_releases where platform = 'android' order by version$$,
  array['1.1.0'],
  'anon only sees published releases (no drafts, no scheduled ones)'
);
select throws_ok(
  $$insert into public.app_releases (version, title, download_url)
    values ('9.9.9', 'Intruso', 'https://example.test/x.apk')$$,
  '42501',
  null,
  'anon cannot insert releases'
);

reset role;
insert into auth.users (id, email)
values ('11111111-1111-4111-8111-111111111111', 'user@example.test');
set local role authenticated;
set local request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';

select results_eq(
  $$select version from public.app_releases where platform = 'android' order by version$$,
  array['1.1.0'],
  'authenticated users only see published releases'
);
select throws_ok(
  $$update public.app_releases set mandatory = true$$,
  '42501',
  null,
  'authenticated users cannot update releases'
);
select throws_ok(
  $$delete from public.app_releases$$,
  '42501',
  null,
  'authenticated users cannot delete releases'
);

select * from finish();
rollback;
