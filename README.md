# Habit Tracker

Habit tracker personal multiplataforma. El desarrollo comienza con una web
responsive en Next.js y comparte la lógica independiente de interfaz mediante un
workspace de pnpm.

## Estado

- Fase 0 de producto completada y documentada en [`docs/product`](docs/product).
- Base web creada con Next.js, App Router, React, TypeScript estricto, Tailwind CSS
  y ESLint.
- Interfaz responsive disponible en `/hoy`, `/habitos`, `/calendario`,
  `/estadisticas` y `/ajustes`, con navegación móvil y de escritorio.
- Registro, acceso, recuperación de contraseña y datos sincronizados mediante
  Supabase; las rutas privadas validan la identidad en el servidor.
- `packages/domain` contiene tipos, validaciones Zod, fechas y el contrato de
  repositorio compartido.
- Pruebas unitarias para validación, zona horaria, CRUD, archivado, persistencia y
  check-ins idempotentes.
- Calendario mensual general y por hábito con navegación entre meses.
- Estadísticas reales para 7, 30 y 90 días, con cumplimiento, rachas, gráficas y
  una tabla textual accesible.
- La base de Supabase incluye CLI fijada, configuración local, migración, seed,
  tipos generados y pruebas pgTAP de aislamiento y permisos de Data API.
- Expo y Tauri todavía no están instalados porque se incorporarán en sus fases
  correspondientes.

## Requisitos

- Node.js 22 o superior (se verificó con Node.js 24.20.0).
- Corepack habilitado para utilizar pnpm 11.24.0.
- Docker Engine o Docker Desktop con integración habilitada para la distribución
  WSL donde se ejecutan los comandos.

## Instalación

```bash
corepack enable
corepack install --global pnpm@11.24.0
pnpm install
```

## Desarrollo

```bash
pnpm supabase:start
pnpm dev
```

La web queda disponible en <http://localhost:3000>.

## Comprobaciones

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

La primera ejecución E2E requiere instalar Chromium y sus dependencias:

```bash
pnpm --filter @habit-tracker/web exec playwright install --with-deps chromium
```

La revisión de calidad, accesibilidad, rendimiento y deuda conocida está en
[`docs/quality/FASE_5.md`](docs/quality/FASE_5.md).

Para aplicar o comprobar el formato de Prettier:

```bash
pnpm format
pnpm format:check
```

## Supabase local

La guía reproducible de base de datos, separación de entornos y variables está en
[`docs/setup/SUPABASE.md`](docs/setup/SUPABASE.md). Usa [`.env.example`](.env.example)
solo como referencia; nunca copies secretos al repositorio.

## Estructura actual

```text
habit_tracker/
├── apps/
│   └── web/                 # Next.js con App Router
├── packages/
│   ├── database/            # Tipos TypeScript generados desde Supabase
│   └── domain/              # Lógica compartida sin dependencias de UI
├── supabase/                # Configuración, migraciones, seed y pruebas pgTAP
├── docs/
│   └── product/             # Alcance, wireframes, sistema visual y fixtures
├── package.json
├── pnpm-lock.yaml
├── pnpm-workspace.yaml
└── PLANIFICACION_HABIT_TRACKER.md
```

Las carpetas de móvil, escritorio, base de datos y UI compartida se crearán al
comenzar sus fases para evitar estructura vacía.

GitHub Actions ejecuta formato, lint, typecheck, pruebas y build en cada pull
request y en los cambios enviados a `main`.
