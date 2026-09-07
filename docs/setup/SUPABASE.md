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

### Correo real en local (opcional, cambio personal sin commitear)

Por defecto (`enabled = false`, el valor comiteado), Supabase local captura
todo el correo de Auth (confirmación, recuperación de contraseña) en
**Mailpit** (`http://127.0.0.1:54324`) en vez de enviarlo. Esto es intencional:
CI y el pgTAP/E2E de `apps/web/e2e/supabase-flow.spec.ts` dependen de que el
correo se quede en Mailpit (no hay credenciales reales en CI), así que
`enabled` debe permanecer en `false` en lo que se commitea.

Para recibir el correo de verdad en tu propia bandeja durante desarrollo (sin
tocar `habit_master`), `supabase/config.toml` ya trae listo un bloque
`[auth.email.smtp]` para Gmail — actívalo solo en tu copia de trabajo local:

1. Activa verificación en 2 pasos en tu cuenta de Google si no la tienes.
2. Genera una "contraseña de aplicación": <https://myaccount.google.com/apppasswords>.
3. Crea `.env` en la raíz (no `.env.local`, ese es de `apps/web`) con
   `GMAIL_SMTP_USER` y `GMAIL_SMTP_APP_PASSWORD` (plantilla en `.env.example`;
   ese `.env` ya está en `.gitignore`, nunca se commitea).
4. Cambia `enabled = false` a `enabled = true` en tu `supabase/config.toml`
   local — **no comitees ese cambio** (es un toggle por máquina; `enabled` es
   booleano y Supabase CLI no soporta `env(...)` en campos booleanos, así que
   no hay forma de hacerlo condicional vía variables de entorno).
5. Reinicia el stack para que Auth recargue la config:
   `pnpm exec supabase stop && pnpm supabase:start`.

Para volver a Mailpit, pon `enabled = false` de nuevo (o descarta el cambio
local con `git checkout -- supabase/config.toml`).

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
4. **Fase 8 (apps/mobile):** añade también `habittracker://**` a las Redirect
   URLs del dashboard de `habit_master` (mismo patrón que `supabase/config.toml`
   local) antes de probar login/registro/recuperar-contraseña de la app móvil
   contra producción. No hace falta añadir `exp://**` ahí — ese esquema solo
   existe durante desarrollo con Expo Go, que siempre corre contra Supabase
   local.
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
