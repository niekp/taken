# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Self-hosted household app ("Taken"/"Huis"): recurring chores, meal planning,
grocery lists (Bring! integration), notes/packing lists, a shared calendar
(iCal), and push notifications. Single-family, PIN-based multi-user. UI is in
Dutch. Deployed as a single Docker image (`ghcr.io/niekp/taken`).

**Stack**: React 18 + Vite + Tailwind (frontend), Express + better-sqlite3
(backend), SQLite, PWA with offline support.

## Commands

```bash
npm run dev:server   # Backend on :3000
npm run dev          # Frontend on :5173 (Vite proxies /api → :3000)
npm run build        # Build frontend into dist/ (server serves it in prod)
npm run cli          # User-management TUI (local)
npm run release      # Interactive version bump → commit → tag → push (release.sh)

docker compose up --watch   # Dev with file sync/rebuild
./manage.sh                 # Prod management TUI (Docker): users, VAPID keys, updates
```

There is no test suite and no linter configured.

**Releasing**: `npm run release` bumps the version and pushes a `vX.Y.Z` tag.
The tag triggers `.github/workflows/` to build and push the Docker image to
GHCR. Deployment = pulling `latest` on the host.

## Architecture

### Backend (`server/`) — strict layering

Request flow: `routes.js` → `middleware/auth.js` → `controllers/*` →
`repositories/*` → SQLite (`lib`/`db.js`).

- **`routes.js`** — single Express router, all `/api` routes. Auth split:
  a few public routes (login, SSE `/events`, `/revision`), then
  `router.use(requireAuth)` gates everything below.
- **`controllers/*`** — HTTP layer: validate input, call repository, shape
  response. Controllers own `broadcast()` calls for live sync (see below).
- **`repositories/*`** — all SQL lives here, one file per entity. Business
  logic (e.g. recurring-task generation) lives in the repository, not the
  controller.
- **`db.js`** — `initDb()` must be awaited once at startup; it runs pending
  migrations. Use `getDb()` everywhere else. WAL mode, foreign keys ON.
- **`migrations/*`** — numbered `NNN-name.js` files, each exporting `up(db)`.
  Applied in filename sort order, tracked in `_migrations` table. **Add
  schema changes as a new numbered migration; never edit an applied one.**

### Live sync (`server/lib/liveSync.js` + `src/lib/liveSync.js`)

Server keeps an in-memory global revision counter. Every mutating controller
calls `broadcast(channel)`, which bumps the revision and pushes an SSE event
to all connected clients. Clients refetch on the event, or poll
`GET /api/revision` as a fallback. **When adding a mutating endpoint, call
`broadcast()` in the controller** or clients won't see the change live.

### Auth

Bearer-token sessions. `POST /auth/login` (PIN) → `/auth/select-user` issues a
token stored in `localStorage`. `requireAuth` validates it and sets
`req.userId`. A 401 anywhere triggers `onUnauthorized` in the client (forced
logout). Sessions are cleaned up by a daily cron.

### Frontend (`src/`)

- **`App.jsx`** — top-level state, view routing (tab-based, persisted to
  `localStorage`), session restore, service-worker update handling.
- **`components/*`** — one file per view (WeekView, MealsView, GroceryView,
  ListsView, SchedulesView, DagschemaView, …) plus modals.
- **`lib/api.js`** — the only place that talks to `/api`. Wraps fetch with
  auth headers, 401 handling, and offline support.
- **`lib/offlineSync.js` + `offlineDb.js` + `sw.js`** — PWA offline layer.
  GET requests are network-first with IndexedDB fallback; mutations that fail
  offline are queued by workbox-background-sync in the service worker and
  replayed later (surface as `MutationQueuedError`, not a hard failure).

### Domain model

- **Schedule** — a recurring chore with `interval_days` and a user assignment.
- **Task** — a concrete dated instance, from a schedule or one-off manual.
  Completing a scheduled task auto-generates the next (completion date +
  `interval_days`). **Ghost tasks** are computed (not stored) future
  occurrences shown in the UI. `runHousekeeping()` moves overdue tasks to
  today (run hourly by cron + on startup).
- **Meal / DailySchedule / DayStatus / List / Calendar event** — see the
  matching repository for each.

### Background jobs (cron in `server/index.js`)

Daily summaries + schedule reminders (every 15 min), calendar sync (30 min),
Bring grocery sync (30 min), session cleanup (daily 3 AM), task housekeeping
(hourly). All also run once on startup where relevant.

### Configuration

- **Env vars**: `PORT`, `DB_PATH`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
  `VAPID_SUBJECT` (push notifications; app runs fine without them).
- **DB-stored settings**: Bring! credentials and the iCal calendar URL are
  stored in the database (configured via the app/`manage.sh`), not env vars.

## Conventions

- ES modules throughout (`"type": "module"`).
- Dates are handled as local `YYYY-MM-DD` strings; timezone logic assumes
  Europe/Amsterdam (see `formatDateLocal`, `getAmsterdamNow`).
- Keep the layer boundaries: no SQL in controllers, no HTTP concerns in
  repositories.
