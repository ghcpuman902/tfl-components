# tfl-components

React UI components and a shadcn registry for London transport boards, built on [`tfl-ts`](https://www.npmjs.com/package/tfl-ts).

This is **not** an npm component package. You copy the source into your app:

```bash
pnpm dlx shadcn@latest add https://tfl-components.vercel.app/r/tube-status-board.json
pnpm dlx shadcn@latest add https://tfl-components.vercel.app/r/tfl-roundel.json
```

The registry item declares `tfl-ts` as a dependency. Copied code reads `TFL_APP_ID` / `TFL_APP_KEY` from **your** environment.

## Live demo

Home page is the live status board plus docs catalog: https://tfl-components.vercel.app

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

Press `d` to toggle dark mode. Use the left sidebar (or `b`) to browse components.

## Docs layout

Grouped the way Londoners think about transport — not by TfL API mode IDs:

| Group | Contents |
|-------|----------|
| Foundations | Roundel, line colours & badges, line diagram |
| Tube & rail | Status board, live arrivals |
| Bus | Bus arrivals |
| Tools | Browse lines, route stations |

Paths are flat under `/components/[slug]` and `/tools/[slug]`. Old URLs redirect.

## Install targets (pre-1.0)

Components install into nested folders:

```
components/tfl/brand/…
components/tfl/status/…
components/tfl/arrivals/…
components/tfl/diagram/…
lib/tfl/…
```

Import example:

```tsx
import { TubeStatusBoard } from "@/components/tfl/status/tube-status-board"
import { LineBadge } from "@/components/tfl/brand/line-badge"
```

## Caching

Status and browse data use Next.js Cache Components (`cacheComponents: true`) with `use cache` and ~60s / ~300s revalidate — not the old `export const revalidate` route segment config.

## Branding and the roundel

- Official **line colours** are fine.
- The **TfL roundel** is trademarked. `TfLRoundel` ships a filled, rounded placeholder by default (same footprint as the real mark so layouts do not jump).
- In **development** only, the placeholder shows a short tooltip and opens a modal with a link to [TfL brand IP](https://tfl.gov.uk/info-for/business-and-advertisers/using-tfl-brand-ip). Production builds render the placeholder silently.
- To show the official SVG in **your** app:

```env
NEXT_PUBLIC_ALLOW_TFL_ROUNDEL=true
```

(Also accepts `VITE_ALLOW_TFL_ROUNDEL`.) Use a public-prefixed env var so SSR and the client agree — a bare `ALLOW_TFL_ROUNDEL` is server-only in Next.js and will hydrate incorrectly. Setting the flag shifts trademark responsibility to your application layer — this package only delivers the code.

Once enabled, customise freely:

```tsx
<TfLRoundel text="MY APP" ringColor="#E32017" barColor="#0019A8" />
<TfLRoundel variant="elizabeth" />
<TfLRoundel variant="overground" artwork className="h-8 w-auto" />
```

Mode presets and Wikimedia paths are exported as `ROUNDEL_PRESETS`, `ROUNDEL_LOGO_PATHS`, and `ROUNDEL_LOGO_SOURCES`. SVG files ship in `public/transit-logos/`.

Brand helpers live in `@/lib/tfl/brand`: modal colours, Underground / Overground line colours, `getRoundelExclusion()`, font/do-not constants, and **line-diagram geometry** (`LINE_DIAGRAM`, SVG shape components).

Cropped references from *Line diagram standard* Issue 4 are in `public/brand/line-diagram/`; source PDF in `reference/brand/`. Demo: `/components/line-diagram`.

**Fonts:** this demo app uses [Hammersmith One](https://fonts.google.com/specimen/Hammersmith+One) as a Johnston-like stand-in. Do **not** download Johnston without a licence — [apply via TfL](https://tfl.gov.uk/info-for/business-and-advertisers/font-requests?intcmp=5840), or use Hammersmith One / [P22 Underground](https://fonts.adobe.com/fonts/p22-underground) (Adobe Fonts). Prefer your own product typeface in shipping apps.

## Rules

See [AGENTS.md](./AGENTS.md) and [docs/](./docs/) for agent workflow, design system, and product principles.
