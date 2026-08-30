# Repository Guidelines

## Project Structure & Module Organization

This repository is a pnpm workspace. The Next.js application lives in
`apps/web`; routes, layouts, and global styles are under `apps/web/src/app`, and
static assets belong in `apps/web/public`. Platform-independent types,
validation, date logic, streaks, and metrics belong in `packages/domain`; do not
import React or browser APIs there. Product decisions, wireframes, visual rules,
and fixtures live in `docs/product`. Treat `PLANIFICACION_HABIT_TRACKER.md` as the
source of truth for scope and phase status. Add mobile, desktop, or Supabase
folders only when their planned phase begins.

## Build, Test, and Development Commands

Run commands from the repository root:

- `pnpm install` installs all workspace dependencies from the lockfile.
- `pnpm dev` starts the web app at `http://localhost:3000`.
- `pnpm lint` runs ESLint against `apps/web`.
- `pnpm typecheck` checks every workspace package with TypeScript.
- `pnpm build` creates the production Next.js build.

Use Node.js 20.9 or newer and pnpm 11.24.0 through Corepack.

## Coding Style & Naming Conventions

Use strict TypeScript and two-space indentation. Keep App Router components as
Server Components unless interaction or browser-only APIs require `"use client"`.
Name React components and exported types in PascalCase, functions and variables
in camelCase, and route folders in lowercase Spanish (for example,
`app/estadisticas`). Prefer named exports in shared packages and keep domain
functions pure. ESLint is the current style gate; avoid unrelated formatting
changes.

## Testing Guidelines

Automated test frameworks are planned but not installed yet. Until they are,
every change must pass `pnpm lint`, `pnpm typecheck`, and `pnpm build`. When tests
are introduced, colocate unit/component files as `*.test.ts` or `*.test.tsx` and
place Playwright journeys under `apps/web/e2e/*.spec.ts`. Prioritize date
boundaries, idempotent check-ins, archived habits, metrics, and accessibility.

## Commit & Pull Request Guidelines

History currently contains only `first commit`, so no formal convention exists.
Use short imperative subjects such as `Add daily progress calculation`, keeping
each commit focused. Pull requests should explain the behavior and motivation,
identify the planning task, list verification commands, and include responsive
screenshots for UI changes. Call out migrations, environment changes, known
limitations, and follow-up work explicitly.

## Security & Configuration

Never commit `.env` files, credentials, or Supabase `service_role` keys. Commit
only documented placeholders in `.env.example`. Preserve user ownership checks
and Row Level Security when database work begins.
