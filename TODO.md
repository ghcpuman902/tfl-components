# TODO — build tfl-components to a running demo + registry

Self-contained handoff. No prior chat context required.

## What this repo is

- Next.js 16 + React 19 + Tailwind 4 + shadcn (from `nextjs-starter`)
- Demo site for London transport UI boards
- **shadcn registry** distribution (not an npm component package)
- Depends on **`tfl-ts` from npm** for API + colour/severity helpers

### Consumption model

1. User sees the live board.
2. Runs `pnpm dlx shadcn@latest add https://tfl-components.vercel.app/r/<item>.json`.
3. CLI copies source into their app and installs `tfl-ts`.
4. Copied `getTflClient()` reads `TFL_APP_ID` / `TFL_APP_KEY` from **their** env.

## Env

`.env.local` should already exist (copied from tfl-ts). Keys:

```
TFL_APP_ID=...
TFL_APP_KEY=...
```

Register free credentials at https://api-portal.tfl.gov.uk/ if missing.

Vercel later needs the same two vars (server-only; do not prefix `NEXT_PUBLIC_`).

## Acceptance criteria

`pnpm build` passes and `pnpm dev` serves **all** of these with **live TfL data**:

### Core (must work)

- [x] `/status` — severity-sorted disruptions + good-service grid; official colours; overground/Elizabeth white stripe; night-service indicator; dark-mode hard outlines (Northern stays black)
- [x] `/arrivals` — geolocation nearby stops + name search; boardable `490…` IDs; route-number chips (never tube colours); stop letter badge; countdowns
- [x] `/line-badge` — chip + text variants; Northern dark outline

### Playground feature parity

- [x] `/batch-status` — status for a curated line ID list in one request
- [x] `/explore` — lines grouped by mode (`line.get({ modes })`)
- [x] `/route?lineId=central` — route sequence inbound/outbound
- [x] `/arrivals/live` — polling arrivals (≥10–15s interval)

### Branding / rules

- [x] No TfL roundel SVG and no Johnston typeface
- [x] Bus ≠ tube styling (see `reference/examples-README.md`)
- [x] Status revalidate ~60s; arrivals poll ≥10–15s

### Registry

- [x] `registry.json` lists `line-badge`, `tube-status-board`, `bus-arrivals-board`
- [x] `pnpm registry:build` (or `pnpm dlx shadcn@latest build`) outputs `public/r/*.json`
- [x] Each demo page shows the install command for its registry item
- [x] Registry items declare dependency on `tfl-ts`

## Suggested work order

1. Fix any TypeScript / build errors in migrated files (`components/tfl/*`, `lib/tfl/*`, `app/**`).
2. Confirm each board page loads live data locally.
3. Set up shadcn registry (`registry.json` + `registry/` sources mirroring components).
4. Build registry into `public/r/`.
5. Update landing page install URL once the production subdomain is known (`tfl.manglekuo.com`).

## Source map

| Origin | Path here |
|--------|-----------|
| Showcase status UI | `components/tfl/tube-status-board.tsx` |
| Showcase bus UI | `components/tfl/bus-arrivals.tsx`, `lib/tfl/actions.ts`, `lib/tfl/geo.ts` |
| Client helper | `lib/tfl/client.ts` |
| Line badge primitive | `components/tfl/line-badge.tsx` |
| tfl-ts examples (reference only) | `reference/` |

## Later (out of v1)

- Journey planner board
- Disruption alerts / push-style notifications
- Status map

## Deploy checklist

1. [x] `gh repo create ghcpuman902/tfl-components --public` and push `main`
2. [x] Vercel project linked; `TFL_APP_ID` / `TFL_APP_KEY` set for production + preview
3. [x] Domain `tfl.manglekuo.com` attached to the Vercel project
4. [ ] GoDaddy DNS: `CNAME tfl → cname.vercel-dns.com` (nameservers are still domaincontrol.com)
5. [x] Registry resolves: https://tfl-components.vercel.app/r/tube-status-board.json
6. [x] Screenshots in `docs/assets/` (light + dark)
7. [x] Marketing drafts in `marketing/`

Until DNS propagates, use **https://tfl-components.vercel.app** in posts and install URLs.

