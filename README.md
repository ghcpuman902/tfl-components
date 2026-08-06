# tfl-components

React UI components and a shadcn registry for London transport boards, built on [`tfl-ts`](https://www.npmjs.com/package/tfl-ts).

This is **not** an npm component package. You copy the source into your app:

```bash
pnpm dlx shadcn@latest add https://tfl-components.vercel.app/r/tube-status-board.json
pnpm dlx shadcn@latest add https://tfl-components.vercel.app/r/tfl-roundel.json
```

The registry item declares `tfl-ts` as a dependency. Copied code reads `TFL_APP_ID` / `TFL_APP_KEY` from **your** environment.

## Live demo

Home page is the live status board: https://tfl-components.vercel.app

Intended custom domain (needs GoDaddy DNS): `tfl.manglekuo.com`

```
CNAME  tfl  cname.vercel-dns.com
```

## Local setup

```bash
pnpm install
cp .env.example .env.local   # or copy from tfl-ts if you already have keys
# fill TFL_APP_ID / TFL_APP_KEY from https://api-portal.tfl.gov.uk/
pnpm dev
```

Press `d` to toggle dark mode.

## Boards

| Path | What it shows |
|------|----------------|
| `/` | Live tube/rail status (home) |
| `/status` | Same status board |
| `/arrivals` | Bus arrivals via geolocation or search |
| `/batch-status` | Status for a fixed set of line IDs |
| `/explore` | Lines grouped by mode |
| `/route` | Route sequence for one line |
| `/arrivals/live` | Polling tube arrivals |
| `/line-badge` | Line colour primitive |
| `/roundel` | Env-gated TfL roundel demo |

## Caching

Status and explore data use Next.js Cache Components (`cacheComponents: true`) with `use cache` and ~60s / ~300s revalidate — not the old `export const revalidate` route segment config.

## Branding and the roundel

- Official **line colours** are fine.
- The **TfL roundel** is trademarked. `TfLRoundel` ships a filled, rounded placeholder by default (same footprint as the real mark so layouts do not jump).
- To show the official SVG in **your** app:

```env
NEXT_PUBLIC_ALLOW_TFL_ROUNDEL=true
```

(Also accepts `VITE_ALLOW_TFL_ROUNDEL` or `ALLOW_TFL_ROUNDEL`.) Setting the flag shifts trademark responsibility to your application layer — this package only delivers the code.

## Rules

- Tube/rail: use `getLineInlineStyles` / `getLineCssProps`.
- Bus: route-number chips only — never tube line colours.
- Cache status ~60s; poll arrivals no faster than every 10–15s per stop.

See [TODO.md](./TODO.md) for the handoff checklist.
