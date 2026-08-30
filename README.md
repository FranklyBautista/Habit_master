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
- `packages/domain` preparado para la lógica compartida de fases posteriores.
- Supabase, Expo y Tauri todavía no están instalados porque se incorporarán en sus
  fases correspondientes.

## Requisitos

- Node.js 20.9 o superior (se verificó con Node.js 24.20.0).
- Corepack habilitado para utilizar pnpm 11.24.0.

## Instalación

```bash
corepack enable
corepack install --global pnpm@11.24.0
pnpm install
```

## Desarrollo

```bash
pnpm dev
```

La web queda disponible en <http://localhost:3000>.

## Comprobaciones

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

Para aplicar o comprobar el formato de Prettier:

```bash
pnpm format
pnpm format:check
```

## Variables de entorno

La Fase 1 no necesita variables de entorno. Usa [`.env.example`](.env.example)
como referencia cuando una fase posterior añada una integración; nunca copies
secretos al repositorio.

## Estructura actual

```text
habit_tracker/
├── apps/
│   └── web/                 # Next.js con App Router
├── packages/
│   └── domain/              # Lógica compartida sin dependencias de UI
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
