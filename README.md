# 몰입 랭킹

MadCamp GitHub Activity Leaderboard is a static snapshot mode dashboard for GitHub organization activity. It discovers repositories from the `{season}-w{week}-c{class}-{teamNumber}` naming rule, aggregates commits by participant/team/class, and serves a Next.js dashboard without calling GitHub from the public request path.

## Stack

- Next.js, TypeScript, Tailwind CSS, shadcn/ui-style components
- lucide-react, Recharts, zod, date-fns-compatible native date handling
- Vitest, fast-check, Playwright
- Docker Compose with optional PostgreSQL profile

## Setup

```bash
corepack enable
corepack prepare pnpm@10.25.0 --activate
pnpm install
pnpm snapshot:sample
pnpm dev
```

Open `http://127.0.0.1:3000`.

## Quality Gates

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm test:fuzz
pnpm coverage:core
pnpm test:e2e
pnpm build
pnpm audit
```

Docker:

```bash
docker compose build
docker compose up -d
pnpm smoke:test
docker compose down
```

## Static Snapshot Mode

Configuration lives in `config/madcamp.config.json`. Participant input is CSV shaped like:

```csv
participant_id,name,identifier,class,aliases
p001,김가온,gaon-kim,3,gaon
p002,이서준,seojun@example.com,1,
```

Generate fixture data:

```bash
pnpm snapshot:sample
```

Dry-run sync:

```bash
GITHUB_TOKEN=... pnpm sync:github --dry-run
```

Real snapshot sync:

```bash
GITHUB_TOKEN=... pnpm sync:github
GITHUB_TOKEN=... pnpm sync:github --week=2
```

The sync runner lists organization repositories, filters them by `{season}-w{week}-c{class}-{teamNumber}`, fetches default-branch commits inside each configured KST week window, maps authors to the participant CSV, records unknown users, writes `.cache/sync-state.json`, and atomically updates `public/data/snapshots/latest.json`.

The public app reads `public/data/snapshots/latest.json`. GitHub API calls belong in sync jobs only, never in the frontend request path.
The scheduled snapshot workflow runs every 10 minutes. The public home page does not expose admin navigation or manual sync controls.

## Admin

The public dashboard is read-only. Admin pages are served under `/admin` and are protected by an httpOnly session cookie created from `ADMIN_TOKEN`.

```bash
ADMIN_TOKEN=... GITHUB_TOKEN=... pnpm dev
```

Open `/admin/login`, enter `ADMIN_TOKEN`, then manage:

- season, organization, repository pattern, ranking options
- week windows and enabled/disabled status
- participant CSV used by commit author mapping
- GitHub discovery, rate-limit check, dry-run sync, current-week sync

Admin API routes also accept Bearer auth for automation:

```txt
Authorization: Bearer $ADMIN_TOKEN
```

Useful admin endpoints:

```txt
GET  /api/admin/config
PATCH /api/admin/config
GET  /api/admin/discovery
GET  /api/admin/rate-limit
POST /api/admin/sync
POST /api/admin/session
POST /api/admin/upload-participants
```

`PATCH /api/admin/config` atomically writes `config/madcamp.config.json`. `POST /api/admin/upload-participants` validates and atomically writes `src/participants/participants.sample.csv`, which the sync runner reads on the next run. On platforms with immutable runtime filesystems, run these admin writes on a persistent Node server or move the write layer to durable storage before deployment.

API schema:

```txt
GET /openapi.json
```

Optional API fuzzing:

```bash
schemathesis run http://127.0.0.1:3000/openapi.json --base-url http://127.0.0.1:3000
```

## Tailscale Preview

1. Start the app:

```bash
docker compose up -d --build
```

2. Find the Tailscale IP:

```bash
tailscale ip -4
```

3. Open:

```txt
http://<tailscale-ip>:3000
```

Admin page:

```txt
http://<tailscale-ip>:3000/admin
```

Use Tailscale/internal access first. Do not expose the preview publicly until auth and security checks have passed.
