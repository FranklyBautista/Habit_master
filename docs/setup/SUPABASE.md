# Configuración de Supabase

La fase 6 usa Supabase CLI `2.116.0`, `@supabase/supabase-js` `2.112.4` y
`@supabase/ssr` `0.12.5`. Las versiones están fijadas en los manifiestos y en el
lockfile.

## Decisiones verificadas en la documentación vigente

La revisión se realizó el 31 de agosto de 2026. Se tuvieron en cuenta estos
cambios y recomendaciones:

- Las tablas nuevas ya no deben depender de exposición automática a Data API.
  `config.toml` la desactiva y la migración revoca y concede permisos
  explícitamente.
- Toda tabla pública tiene RLS y una política separada para cada operación.
- Las políticas de actualización incluyen `USING` y `WITH CHECK`.
- La protección SSR valida identidad mediante `getClaims()` en `proxy.ts` y
  `getUser()` al cargar el dashboard; `getSession()` no se utiliza como prueba
  de autorización.
- Next.js 16 usa `proxy.ts`, no el archivo obsoleto `middleware.ts`.
- Las bibliotecas actuales de Supabase requieren Node.js 22 o posterior.

Referencias:

- <https://supabase.com/changelog.md>
- <https://supabase.com/docs/guides/auth/server-side/nextjs>
- <https://supabase.com/docs/guides/auth/server-side/creating-a-client>
- <https://supabase.com/docs/guides/database/postgres/row-level-security>

## Desarrollo local

Se necesita Docker Engine o Docker Desktop en ejecución.

Con Docker Desktop en Windows, habilita **Settings → Resources → WSL
Integration** para la distribución desde la que ejecutarás pnpm. Comprueba la
integración en una terminal WSL nueva con `docker version`.

```bash
pnpm install --frozen-lockfile
pnpm supabase:start
pnpm db:reset
pnpm db:test
pnpm db:lint
pnpm db:advisors
```

`db:reset` aplica todas las migraciones desde cero y carga `supabase/seed.sql`.
La cuenta ficticia local es `demo@habit-tracker.local` y su contraseña se indica
en el propio seed; no debe reutilizarse en ningún entorno remoto.

La base local debe terminar con tres tablas públicas, RLS habilitado y todas las
pruebas pgTAP aprobadas. `db:advisors` no debe reportar hallazgos de seguridad o
rendimiento con nivel de error.

## Tipos TypeScript

Después de que `db:reset`, las pruebas y los asesores terminen correctamente:

```bash
pnpm exec supabase gen types --local --schema public > packages/database/src/database.types.ts
```

El archivo generado debe revisarse y guardarse en Git. No se debe escribir a
mano ni generar desde una base cuyo esquema difiera de las migraciones.

## Entornos remotos

**Decisión (2026-09-01):** este es un proyecto personal en el plan gratuito de
Supabase, así que se usa un único proyecto remoto, `habit_master`, reservado
exclusivamente para producción. No existe un proyecto remoto de desarrollo
separado; Supabase local (Docker, ver abajo) es el entorno de desarrollo, y CI
levanta su propio Supabase local desechable en cada push. Ningún flujo
automatizado (dev local, CI, Preview de Vercel) debe apuntar nunca a
`habit_master`. Reevaluar esta decisión si el proyecto suma colaboradores,
si los Preview de Vercel necesitan golpear datos remotos reales (por ejemplo
para probar enlaces de correo), o si se pasa a un plan de pago.

Configuración de `habit_master`:

1. Abre **Connect** y copia la URL y la clave publicable.
2. Configura las URLs permitidas de Auth para el dominio de producción
   (Vercel) una vez desplegado en la Fase 7.
3. Guarda los valores solo en el gestor de variables de entorno de Vercel
   (Production); nunca en un `.env` del repositorio.
4. Vincula el proyecto con `pnpm exec supabase link` siguiendo las
   indicaciones interactivas de la CLI, únicamente cuando vayas a desplegar
   migraciones a producción.
5. Aplica las migraciones a `habit_master` solo después de validar `db:reset`
   en local y de que CI pase en verde.

Variables públicas de la web:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_example
```

La clave `service_role`, claves secretas y contraseñas de base de datos nunca se
guardan en el repositorio ni se exponen con el prefijo `NEXT_PUBLIC_`.
