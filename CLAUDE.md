# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project scope and workflow

`PLANIFICACION_HABIT_TRACKER.md` is the source of truth for scope and phase status; `docs/` holds product decisions, wireframes, the visual system, quality reviews, and ADRs (`docs/decisions/`). Work is done one phase at a time via the Cursor skill `$implementar-fase` (`.cursor/skills/implementar-fase/`): implement only the requested/next unchecked phase, verify every task before marking `[ ]` → `[x]`, and never start a later phase automatically. Implemented through Phase 6 (Supabase auth + sync); mobile (Expo) and desktop (Tauri) folders do not exist yet and are added only when their phase begins.

UI copy, routes, and locale are Spanish (`es`). Route folders are lowercase Spanish (`app/(dashboard)/estadisticas`).

`AGENTS.md` holds contributor guidelines, but predates the current test setup (it claims no test frameworks are installed and lists Node 20.9 — both outdated).

## Commands

Run from the repo root. Requires Node 22+ (CI and README use 24) and pnpm 11.24.0 via Corepack; Docker must be running for Supabase.

| Task                                | Command                             |
| ----------------------------------- | ----------------------------------- |
| Dev server (`localhost:3000`)       | `pnpm dev`                          |
| Production build                    | `pnpm build`                        |
| Lint / autofix                      | `pnpm lint` / `pnpm lint:fix`       |
| Typecheck (all packages)            | `pnpm typecheck`                    |
| Unit/component tests (all packages) | `pnpm test`                         |
| E2E (builds first)                  | `pnpm test:e2e`                     |
| Format / check                      | `pnpm format` / `pnpm format:check` |

Prettier and ESLint (with `simple-import-sort`) are enforced in CI — run `pnpm format` before committing.

### Running a single test

```bash
# One Vitest file
pnpm --filter @habit-tracker/web exec vitest run src/components/period-tabs.test.tsx
pnpm --filter @habit-tracker/domain exec vitest run src/metrics.test.ts
# By test name
pnpm --filter @habit-tracker/web exec vitest run -t "idempotent"
# One Playwright spec (needs Supabase running + a build)
pnpm --filter @habit-tracker/web exec playwright test e2e/habit-flow.spec.ts
```

First E2E run needs the browser: `pnpm --filter @habit-tracker/web exec playwright install --with-deps chromium`. Playwright starts `next start` on port 3100 and expects a demo user (`e2e/helpers/auth.ts`).

### Supabase (local)

```bash
pnpm supabase:start          # start local stack (Docker)
eval "$(pnpm exec supabase status -o env)"   # then export the two NEXT_PUBLIC_* vars below
pnpm db:reset                # rebuild DB from migrations + seed
pnpm db:test                 # pgTAP tests in supabase/tests/
pnpm db:lint / pnpm db:advisors
pnpm db:types                # regenerate packages/database/src/database.types.ts
```

The web app reads `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (values from `supabase status`; see `.env.example` and `docs/setup/SUPABASE.md`). Never add `SUPABASE_SERVICE_ROLE_KEY` or secrets to the repo — `NEXT_PUBLIC_*` ships in the browser bundle.

## Architecture

pnpm workspace (`apps/*`, `packages/*`), no Turbo. Three packages:

- **`packages/domain`** (`@habit-tracker/domain`) — platform-independent core. No React, no browser APIs. Contains Zod entity schemas (`entities.ts`), the `HabitRepository` interface (`repository.ts`), timezone-aware date logic (`dates.ts`), and completion/streak/period metrics (`metrics.ts`). Keep functions pure, use named exports.
- **`packages/database`** (`@habit-tracker/database`) — only the TypeScript `Database` type generated from the Supabase schema.
- **`apps/web`** (`@habit-tracker/web`) — Next.js 16 App Router, React 19, Tailwind v4 (`@tailwindcss/postcss`), Recharts, `@supabase/ssr`. Path alias `@/*` → `src/*`.

### Dates are keyed strings, not `Date` objects

All calendar logic uses "local date keys" — `YYYY-MM-DD` strings computed in the user's timezone via `getLocalDateKey`. Use the domain helpers (`addDaysToDateKey`, `getDateRange`, `getMonthDateKeys`, `isHabitActiveOnDate`, …) for any date arithmetic; never do raw `Date` math for calendar/streak logic. A habit's activity window is `[startDate, archivedAt-in-timezone)`.

### State validation boundary

`habitTrackerStateSchema` (which also enforces one check-in per `(habitId, date)`) is parsed at every boundary — when reading from localStorage, from Supabase, and before writing. Trust parsed state; re-parse anything crossing a boundary.

### Repository implementations

- `apps/web/src/lib/local-habit-repository.ts` — `LocalHabitRepository`, synchronous, backed by `localStorage` (key `habit-tracker:v1`). Implements the domain `HabitRepository` interface. Prototype/legacy adapter; still the source of the local-data import flow.
- `apps/web/src/lib/supabase-habit-repository.ts` — `SupabaseHabitRepository`, async, Postgres is the source of truth. This is the current adapter. It does **not** implement `HabitRepository` (methods are async and take extra args like `startDate`). Maps snake_case rows ↔ camelCase domain types.

### Data flow (Supabase, per ADR 0001)

1. `app/(dashboard)/layout.tsx` (server) creates a Supabase server client, checks the user, calls `SupabaseHabitRepository.getState()`, passes the result as `initialState` to `AppShell`.
2. `AppShell` → `HabitStoreProvider` (`src/lib/habit-store.tsx`, client) builds a browser-client repository and holds the `HabitSnapshot`.
3. Every mutation goes through `mutate()`: await the server write, then re-fetch the **entire** state and replace the snapshot. **No optimistic UI** — a failed write surfaces as a recoverable error, not a completed sync. State is revalidated on window `focus` and `online`.
4. Check-in toggles dedupe in-flight requests per `(habitId, date)`; marking is an idempotent `upsert` on `(habit_id, checkin_date)`, unmarking is a filtered `delete`.

Consume state via `useHabitStore()` (snapshot) / `useHabitActions()` (mutations) / `useLocalDataMigration()`.

### Auth

- `apps/web/src/proxy.ts` is the request middleware (Next 16 renamed `middleware` → `proxy`). It delegates to `updateSession` (`src/lib/supabase/proxy.ts`), which refreshes session cookies and redirects: unauthenticated → `/login?next=…`; authenticated on an auth page → `/hoy`.
- Route groups: `(auth)` (login, registro, recuperar, actualizar-contrasena) and `(dashboard)` (the app). Auth is handled by server actions in `app/(auth)/actions.ts`.
- Three Supabase client factories in `src/lib/supabase/`: `client.ts` (browser), `server.ts` (server components — cannot write cookies, `proxy` handles refresh), `proxy.ts` (middleware).
- A `profiles` row is auto-created by a DB trigger on `auth.users` insert; the app never inserts profiles.

### Database

Single migration `supabase/migrations/20260831192001_*.sql` defines the whole schema: `profiles`, `habits`, `habit_checkins`. Key properties:

- RLS on every table, owner-only (`(select auth.uid()) = user_id`), explicit `GRANT`s to `authenticated` only (`auto_expose_new_tables = false`).
- `habit_checkins` references `habits (id, user_id)` (composite FK) and is unique on `(habit_id, checkin_date)`.
- `updated_at` maintained by triggers; helper functions live in a locked-down `private` schema.
- pgTAP tests in `supabase/tests/` cover structure and RLS/ownership.

After any schema change: add a new migration file, run `pnpm db:reset`, then `pnpm db:types`, and update the pgTAP tests.

## Testing conventions

- Colocate unit/component tests as `*.test.ts` / `*.test.tsx`. Vitest, jsdom, Testing Library; setup in `apps/web/src/test/setup.ts` (polyfills `HTMLDialogElement`).
- Playwright journeys go in `apps/web/e2e/*.spec.ts`; helpers in `e2e/helpers/`.
- Prioritize: date/timezone boundaries, idempotent check-ins, archived habits, metrics, accessibility (`@axe-core/playwright`).
