# Repository Guidelines

## Project Structure & Module Organization

This repository is a pnpm workspace. The Next.js application lives in
`apps/web`; routes, layouts, and global styles are under `apps/web/src/app`, and
static assets belong in `apps/web/public`. The Expo mobile app lives in
`apps/mobile` (Expo Router screens under `apps/mobile/src/app`). Supabase
migrations, pgTAP tests, email templates, and local config live in `supabase/`;
generated database types in `packages/database`. Platform-independent types,
validation, date logic, streaks, and metrics belong in `packages/domain`; do not
import React or browser APIs there. Product decisions, wireframes, visual rules,
and fixtures live in `docs/product`; ADRs in `docs/decisions`; setup and
deploy guides in `docs/setup`. Treat `PLANIFICACION_HABIT_TRACKER.md` as the
source of truth for scope and phase status. Add the desktop app (`apps/desktop`)
only when its planned phase begins.

## Build, Test, and Development Commands

Run commands from the repository root:

- `pnpm install` installs all workspace dependencies from the lockfile.
- `pnpm dev` starts the web app at `http://localhost:3000`.
- `pnpm lint` runs ESLint in `apps/web` and `apps/mobile`.
- `pnpm typecheck` checks every workspace package with TypeScript.
- `pnpm test` runs the Vitest suites of every package.
- `pnpm test:e2e` builds the web app and runs Playwright (needs local Supabase).
- `pnpm format` / `pnpm format:check` apply or check Prettier.
- `pnpm build` creates the production Next.js build.

Use Node.js 22 or newer (CI uses 24) and pnpm 11.24.0 through Corepack. Docker
must be running for local Supabase (`pnpm supabase:start`).

## Coding Style & Naming Conventions

Use strict TypeScript and two-space indentation. Keep App Router components as
Server Components unless interaction or browser-only APIs require `"use client"`.
Name React components and exported types in PascalCase, functions and variables
in camelCase, and route folders in lowercase Spanish (for example,
`app/estadisticas`). Prefer named exports in shared packages and keep domain
functions pure. ESLint (with `simple-import-sort`) and Prettier are enforced in
CI; run `pnpm format` before committing and avoid unrelated formatting changes.

## Testing Guidelines

Every change must pass `pnpm lint`, `pnpm typecheck`, `pnpm test`, and
`pnpm format:check`; changes touching the web app or the database also need
`pnpm test:e2e`, and schema changes need `pnpm db:test` (pgTAP). Colocate
unit/component tests (Vitest, jsdom, Testing Library) as `*.test.ts` or
`*.test.tsx` and place Playwright journeys under `apps/web/e2e/*.spec.ts`. Prioritize date
boundaries, idempotent check-ins, archived habits, metrics, and accessibility.

## Commit & Pull Request Guidelines

Commits follow Conventional Commits with a scope and a Spanish subject, for
example `feat(web): verificar registro con código` or `fix(mobile): …`, keeping
each commit focused. Pull requests should explain the behavior and motivation,
identify the planning task, list verification commands, and include responsive
screenshots for UI changes. Call out migrations, environment changes, known
limitations, and follow-up work explicitly.

## Security & Configuration

Never commit `.env` files, credentials, or Supabase `service_role` keys. Commit
only documented placeholders in `.env.example`. Preserve user ownership checks
and Row Level Security: every table is owner-only, and new tables need explicit
grants plus pgTAP coverage.
