# tfl-components

React UI for London transport boards, distributed as a [shadcn](https://ui.shadcn.com) registry on [`tfl-ts`](https://www.npmjs.com/package/tfl-ts).

This is **not** an npm UI package. You copy source into your app.

## Install components

Source of truth for installable files: **[`registry/tfl/`](./registry/tfl/)** ([readme](./registry/tfl/README.md)).

```bash
pnpm dlx shadcn@latest add https://tfl-components.vercel.app/r/tube-status-board.json
pnpm dlx shadcn@latest add https://tfl-components.vercel.app/r/arrivals-board.json
pnpm dlx shadcn@latest add https://tfl-components.vercel.app/r/tfl-roundel.json
```

Registry items declare `tfl-ts` as a dependency. Copied code reads `TFL_APP_ID` / `TFL_APP_KEY` from **your** environment.

Install targets (pre-1.0):

```
components/tfl/brand/…
components/tfl/status/…
components/tfl/arrivals/…
components/tfl/diagram/…
lib/tfl/…
```

```tsx
import { TubeStatusBoard } from "@/components/tfl/status/tube-status-board"
import { LineBadge } from "@/components/tfl/brand/line-badge"
```

## Releases

Same GitHub repo, **two version tracks** ([docs/releases.md](./docs/releases.md)):

| Track | Tags | Follow if you… |
|-------|------|----------------|
| Components | `v0.4.0`, … | Install from `/r/*.json` |
| Web app | `web-v0.5.0`, … | Run or contribute to the docs/demo site |

Changelog: [CHANGELOG.md](./CHANGELOG.md).

## Docs / demo site

Live site: https://tfl-components.vercel.app  
Intended custom domain: `tfl.manglekuo.com` (`CNAME tfl → cname.vercel-dns.com`).

The Next.js app in this repo is the developer environment (docs, demos, Blocks). It is **not** what the shadcn CLI copies. Prefer [`registry/tfl/`](./registry/tfl/) when browsing for installable code.

### Local setup

```bash
pnpm install
cp .env.example .env.local
# fill TFL_APP_ID / TFL_APP_KEY from https://api-portal.tfl.gov.uk/
pnpm dev
```

Press `d` for dark mode. Browse via the header (Docs · Components · Blocks · Tools).

Frozen Stage 1 IA: [docs/TARGET_ARCHITECTURE.md](./docs/TARGET_ARCHITECTURE.md).

### Caching

Status and browse data use Next.js Cache Components (`cacheComponents: true`) with `use cache` and ~60s / ~300s revalidate.

## Branding and the roundel

- Official **line colours** are fine.
- The **TfL roundel** is trademarked. `TfLRoundel` ships a filled, rounded placeholder by default (same footprint as the real mark so layouts do not jump).
- In **development** only, the placeholder shows a short tooltip and opens a modal with a link to [TfL brand IP](https://tfl.gov.uk/info-for/business-and-advertisers/using-tfl-brand-ip). Production builds render the placeholder silently.
- To show the official SVG in **your** app:

```env
NEXT_PUBLIC_ALLOW_TFL_ROUNDEL=true
```

(Also accepts `VITE_ALLOW_TFL_ROUNDEL`.) Use a public-prefixed env var so SSR and the client agree. Setting the flag shifts trademark responsibility to your application layer.

```tsx
<TfLRoundel text="MY APP" ringColor="#E32017" barColor="#0019A8" />
<TfLRoundel variant="elizabeth" />
<TfLRoundel variant="overground" artwork className="h-8 w-auto" />
```

Mode presets and Wikimedia paths are exported as `ROUNDEL_PRESETS`, `ROUNDEL_LOGO_PATHS`, and `ROUNDEL_LOGO_SOURCES`. SVG files ship in `public/transit-logos/`.

Brand helpers live in `@/lib/tfl/brand`. Cropped line-diagram references are in `public/brand/line-diagram/`; source PDF in `reference/brand/`.

**Fonts:** the demo site may use Hammersmith One or Adobe Fonts P22 Underground as Johnston stand-ins. Do **not** download Johnston without a licence. Prefer your own product typeface in shipping apps.

## Rules

See [AGENTS.md](./AGENTS.md) and [docs/](./docs/) for agent workflow, design system, and product principles.
