# tfl-components

React UI components and a shadcn registry for London transport boards, built on [`tfl-ts`](https://www.npmjs.com/package/tfl-ts).

This is **not** an npm component package. You copy the source into your app:

```bash
pnpm dlx shadcn@latest add https://tfl-components.vercel.app/r/tube-status-board.json
```

The registry item declares `tfl-ts` as a dependency. Copied code reads `TFL_APP_ID` / `TFL_APP_KEY` from **your** environment.

## Live demo

Demo: https://tfl-components.vercel.app

Intended custom domain (needs GoDaddy DNS): `tfl.manglekuo.com`

```
CNAME  tfl  cname.vercel-dns.com
```

Vercel project already has the domain attached. Once the CNAME propagates, switch install URLs in README / marketing from `tfl-components.vercel.app` to `tfl.manglekuo.com`.


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
| `/status` | Tube/rail status (disruptions + good service) |
| `/arrivals` | Bus arrivals via geolocation or search |
| `/batch-status` | Status for a fixed set of line IDs |
| `/explore` | Lines grouped by mode |
| `/route` | Route sequence for one line |
| `/arrivals/live` | Polling tube arrivals |
| `/line-badge` | Line colour primitive |

## Branding

- Official **line colours** are fine.
- Do **not** ship the TfL roundel logo or Johnston / Underground typeface (trademarked).

## Rules

- Tube/rail: use `getLineInlineStyles` / `getLineCssProps`.
- Bus: route-number chips only — never tube line colours.
- Cache status ~60s; poll arrivals no faster than every 10–15s per stop.

See [TODO.md](./TODO.md) for the handoff checklist.
