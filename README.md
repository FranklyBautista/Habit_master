# Habit Tracker

Habit tracker personal multiplataforma. El desarrollo empezó con una web
responsive instalable como PWA en Next.js y ahora avanza hacia la app móvil con
Expo; toda la lógica independiente de interfaz se comparte mediante un workspace
de pnpm.

`PLANIFICACION_HABIT_TRACKER.md` es la fuente de verdad del alcance y del estado
de cada fase.

## Estado

**MVP web/PWA v1 (Fases 0–7) completado.** **Fase 8 (app móvil con Expo) en
curso.**

### Web / PWA — completado

- Fase 0 de producto cerrada y documentada en [`docs/product`](docs/product)
  (alcance, historias, wireframes, sistema visual y fixtures).
- Base web con Next.js 16 (App Router), React 19, TypeScript estricto,
  Tailwind CSS v4 y ESLint + Prettier con orden de imports.
- Interfaz responsive mobile-first en `/hoy`, `/habitos`, `/calendario`,
  `/estadisticas` y `/ajustes`, con navegación inferior en móvil y lateral en
  escritorio, estados vacíos/carga/error y modo claro.
- Núcleo funcional: crear, editar, ordenar, archivar y restaurar hábitos sin
  perder historial; marcar y desmarcar el día actual con check-ins idempotentes
  y manejo de fecha local por zona horaria.
- Calendario mensual general con intensidad por porcentaje y calendario de
  detalle por hábito, con navegación entre meses.
- Estadísticas reales para hoy, 7, 30 y 90 días: cumplimiento, racha actual y
  mejor racha, gráficas de línea/área y de barras (Recharts, carga diferida) y
  una alternativa textual accesible.
- Autenticación con Supabase (registro, login, logout y recuperación de
  contraseña); las rutas privadas validan la identidad en el servidor mediante
  el middleware `proxy.ts` y clientes Supabase separados para navegador y
  servidor.
- Sincronización con Postgres como fuente de verdad (ADR
  [`docs/decisions/0001-supabase-sync.md`](docs/decisions/0001-supabase-sync.md)):
  sin UI optimista, revalidación tras cada mutación y al recuperar foco/conexión,
  y migración explícita de los datos locales a la primera cuenta.
- Base de datos con CLI fijada, configuración local, migración única, seed,
  tipos TypeScript generados y pruebas pgTAP de estructura, RLS y permisos de
  Data API; RLS por propiedad en todas las tablas.
- PWA instalable: manifest, iconos, service worker (`public/sw.js`) con caché
  versionado que no almacena respuestas autenticadas, y página offline de solo
  lectura (`/offline`).
- Desplegada en Vercel con entornos Preview (por Pull Request) y Production
  (al mergear a `main`); lista de verificación de despliegue y rollback en
  [`docs/setup/DEPLOY.md`](docs/setup/DEPLOY.md).
- Pruebas unitarias/de componentes (Vitest + Testing Library) y recorridos E2E
  (Playwright, con auditoría de accesibilidad `@axe-core/playwright`): flujo de
  hábitos, PWA y flujo Supabase.

**Limitación conocida:** sin hardware Apple, la instalación en iOS y el recorrido
en Safari quedan sin verificar; es un riesgo aceptado y documentado en la Fase 7
que debe resolverse antes de cerrar el criterio de salida de la Fase 8.

### Móvil (Expo) — en curso (Fase 8)

- `apps/mobile` creada con `create-expo-app`, Expo SDK 57, Expo Router
  (rutas tipadas) y TypeScript.
- Reutiliza `@habit-tracker/domain` y `@habit-tracker/database` desde el
  workspace.
- Autenticación funcionando: pantallas de login, registro, recuperación y
  actualización de contraseña, confirmación por deep link (`habittracker://`),
  `SessionProvider`, `AuthGate` y almacenamiento seguro de sesión con
  `expo-secure-store` (cifrado para valores largos).
- Pantalla **Hoy** provisional; las pantallas de hábitos, calendario y
  estadísticas llegan en las siguientes iteraciones de la fase.

### Aún no iniciado

- Fase 9: app de escritorio con Tauri (`apps/desktop`).
- `packages/design-tokens` y `packages/ui-web` se crearán cuando su fase lo
  requiera.

## Requisitos

- Node.js 22 o superior (CI y desarrollo usan Node.js 24).
- Corepack habilitado para utilizar pnpm 11.24.0.
- Docker Engine o Docker Desktop con integración habilitada para la distribución
  WSL donde se ejecutan los comandos (necesario para Supabase local).

## Instalación

```bash
corepack enable
corepack install --global pnpm@11.24.0
pnpm install
```

Instala siempre desde la raíz del repo, nunca dentro de `apps/*`.

## Desarrollo

### Web

```bash
pnpm supabase:start
pnpm dev
```

La web queda disponible en <http://localhost:3000>. Exporta
`NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` con los
valores de `pnpm exec supabase status` (ver [`.env.example`](.env.example) y
[`docs/setup/SUPABASE.md`](docs/setup/SUPABASE.md)).

### Móvil

```bash
pnpm supabase:start
# Usa la IP LAN de tu máquina, no localhost, para emulador/dispositivo físico
export EXPO_PUBLIC_SUPABASE_URL="http://<tu-ip-lan>:54321"
export EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY="<publishable key de supabase status>"
pnpm --filter @habit-tracker/mobile start
```

Detalles en [`apps/mobile/README.md`](apps/mobile/README.md).

## Comprobaciones

```bash
pnpm lint        # ESLint de la web
pnpm typecheck   # todos los paquetes (incluye apps/mobile)
pnpm test        # Vitest en todos los paquetes
pnpm test:e2e    # build + Playwright de la web
pnpm build       # build de producción de la web
```

La primera ejecución E2E requiere instalar Chromium y sus dependencias:

```bash
pnpm --filter @habit-tracker/web exec playwright install --with-deps chromium
```

Para aplicar o comprobar el formato de Prettier (obligatorio antes de
commitear, junto con lint):

```bash
pnpm format
pnpm format:check
```

La revisión de calidad, accesibilidad, rendimiento y deuda conocida del
prototipo está en [`docs/quality/FASE_5.md`](docs/quality/FASE_5.md).

## Supabase local

```bash
pnpm supabase:start          # levanta la pila local (Docker)
pnpm db:reset                # reconstruye la BD desde migraciones + seed
pnpm db:test                 # pruebas pgTAP de supabase/tests/
pnpm db:lint / pnpm db:advisors
pnpm db:types                # regenera packages/database/src/database.types.ts
```

La guía reproducible de base de datos, separación de entornos y variables está en
[`docs/setup/SUPABASE.md`](docs/setup/SUPABASE.md). Usa [`.env.example`](.env.example)
solo como referencia; nunca copies secretos al repositorio y no añadas
`SUPABASE_SERVICE_ROLE_KEY` (las variables `NEXT_PUBLIC_*` / `EXPO_PUBLIC_*`
viajan en el bundle del cliente).

## Estructura actual

```text
habit_tracker/
├── apps/
│   ├── web/                 # Next.js 16 con App Router (PWA desplegada)
│   └── mobile/              # Expo SDK 57 + Expo Router (Fase 8, en curso)
├── packages/
│   ├── database/            # Tipo Database generado desde Supabase
│   └── domain/              # Entidades Zod, fechas, rachas y métricas (sin UI)
├── supabase/                # config, migración única, seed y pruebas pgTAP
├── docs/
│   ├── product/             # Alcance, wireframes, sistema visual y fixtures
│   ├── quality/             # Revisión de calidad del prototipo
│   ├── setup/               # Guías de Supabase y despliegue
│   └── decisions/           # ADRs (0001: Supabase como fuente de verdad)
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── PLANIFICACION_HABIT_TRACKER.md
```

Las carpetas de escritorio (`apps/desktop`) y los paquetes de UI compartida se
crearán al comenzar sus fases para evitar estructura vacía.

GitHub Actions ejecuta formato, lint, typecheck, pruebas y build en cada pull
request y en los cambios enviados a `main`.
