# Pi Home Drive

Self-hosted web file explorer for a Raspberry Pi home server. It gives one admin user a Google Drive style interface for browsing, previewing, uploading, downloading, renaming, moving, trashing, and restoring files from a configured filesystem root.

## Stack

- React + Vite frontend in [`apps/web`](/Users/moonjunho/Documents/repos/homeserver-cloud-storage/apps/web)
- Fastify API server in [`apps/server`](/Users/moonjunho/Documents/repos/homeserver-cloud-storage/apps/server)
- SQLite-backed admin/session/trash metadata using Node 24 `node:sqlite`
- Docker Compose deployment for Raspberry Pi / ARM64

## Features

- Single built-in admin login with Argon2 password hashing
- Session cookies plus CSRF protection on mutating routes
- One configured storage root with traversal protection
- Folder browsing, uploads, downloads, create folder, rename, move, delete-to-trash
- Trash view with restore and permanent delete
- Inline previews for images, PDFs, text, audio, and browser-playable video
- On-demand image thumbnails with fallback to the original image when thumbnail generation fails
- Periodic polling refresh and manual refresh from the UI

## Environment

Copy [`.env.example`](/Users/moonjunho/Documents/repos/homeserver-cloud-storage/.env.example) and set real values before running outside local development.

The server auto-loads env files from the repo root when it starts. Supported files follow mode-aware precedence: `.env.[NODE_ENV].local`, `.env.local` (except in tests), `.env.[NODE_ENV]`, then `.env`.

- `PORT`: HTTP port for the app container or process
- `ROOT_DIR`: bind-mounted directory the file explorer manages
- `DATA_DIR`: separate writable directory for SQLite, trash storage, and preview cache
- `ADMIN_USERNAME`: bootstrap admin username
- `ADMIN_PASSWORD`: bootstrap admin password; required on first boot
- `SESSION_SECRET`: 32+ character secret used for session security
- `TRUST_PROXY`: set to `true` behind your reverse proxy so Fastify trusts forwarded headers
- `POLL_INTERVAL_MS`: UI refresh interval for picking up external filesystem changes

## Local development

Requirements:

- Node.js 24+
- pnpm 10+

Install dependencies:

```bash
pnpm install
```

Run the web client and API server together:

```bash
pnpm dev
```

The Vite UI runs on `http://localhost:5173` and proxies API traffic to the Fastify server on `http://localhost:3000`.

Checks:

```bash
pnpm typecheck
pnpm test
pnpm build
```

## Docker deployment

Build and run with Docker Compose:

```bash
docker compose up --build -d
```

The compose setup binds:

- `./storage/root` to `/storage/root`
- `./storage/data` to `/storage/data`

Point your reverse proxy at the container on port `3000`. TLS termination stays in your existing proxy. The app expects standard forwarded headers when `TRUST_PROXY=true`.

## Reverse proxy notes

- Keep the app on private HTTP behind your proxy.
- Forward `Host`, `X-Forwarded-For`, and `X-Forwarded-Proto`.
- Leave request bodies streaming-enabled for large uploads.
- Preserve range requests for media preview and downloads.

## Project layout

- [`apps/server/src/app.ts`](/Users/moonjunho/Documents/repos/homeserver-cloud-storage/apps/server/src/app.ts): Fastify app, auth/session hooks, API routes, static serving
- [`apps/server/src/storage.ts`](/Users/moonjunho/Documents/repos/homeserver-cloud-storage/apps/server/src/storage.ts): filesystem operations, preview detection, thumbnail handling, trash moves
- [`apps/web/src/App.tsx`](/Users/moonjunho/Documents/repos/homeserver-cloud-storage/apps/web/src/App.tsx): login flow, explorer UI, preview modal, trash UI, upload queue

## Current scope

Included in v1:

- single admin account
- one storage root
- built-in auth
- browser-native previews
- trash and restore

Not included in v1:

- share links
- multi-user permissions
- search indexing
- resumable uploads
- collaborative editing
- media transcoding
