# Launch review (fresh-eyes pass)

Date: 2026-08-13. Reviewed against production build on `localhost:3999`.

**Verdict: BORDERLINE → ready after ops checklist** — code-side launch blockers from the plan are fixed; confirm Vercel spend / prod `TFL_APP_KEY` before posting.

## Rubric assumed

- Do not break under traffic / TfL quota exhaustion
- Do not get HN “kiss of death” from broken first clicks or missing install artifacts
- Improve SEO / OG for LinkedIn sharing
- Mobile usable at ~375px (not polished)
- First 3 clicks from landing are not dead ends

## Findings closed in this pass

| Severity | Issue | Fix |
|---|---|---|
| SEV-1 | Docs arrivals poll every 15s via uncached Server Action (site key fan-out) | Shared `"use cache"` + two-stop allowlist; poll 20s |
| SEV-1 | `tfl-geographic-map.json` install URL 404 | `pnpm registry:build` + `scripts/check-registry-urls.ts` in `pnpm test` |
| SEV-1 | Coming-soon sidebar/catalogue dead clicks | Filtered `comingSoon` from sidebar, catalogue, and search (routes kept live) |
| SEV-1 | No error / 404 chrome | `app/error.tsx`, `global-error.tsx`, `not-found.tsx`; soft-fail `getCachedLineStatuses` |
| SEV-2 | No OG / twitter card / sitemap / robots | Existing `opengraph-image.png` wired; twitter card; `sitemap.ts`; `robots.ts` |
| SEV-2 | Doubled homepage title | `title: { absolute: "tfl-components" }` |
| SEV-2 | MapLibre scroll trap on home / docs | `cooperativeGestures: true` on MapLibre surfaces |
| SEV-3 | Tiny pager / header taps | Invisible hit padding on pagers; nav `px-1.5 py-2` |
| SEV-3 | Grey placeholder favicon | **Reverted** — the grey filled placeholder *is* the site mark. Do not replace with line-colour bars. See `.cursor/rules/site-favicon.mdc`. |

## Hostile interaction evidence

- `/` title is `tfl-components` (not doubled). Live boards + cycle map markers render.
- `/docs/components` — River bus / TubeMap / Skills for AI absent from sidebar and catalogue.
- `/docs/tube-rail-arrivals` — live preview shows `Poll #N · every 20s`; Westbound pager advances to page 2.
- `/docs/map-geographic` — map preview loads; install command present; `/r/tfl-geographic-map.json` returns 200.
- `/blocks` links to Week ahead; `/tools` links to typography tool; `/drafts` has related hub links (not a hard dead end).
- `/this-does-not-exist` → 404 with branded “Page not found”.
- `/opengraph-image.png`, `/robots.txt`, `/sitemap.xml`, `/icon.svg`, `/apple-icon` → 200.
- Mobile (375×812): sidebar collapses to Sheet trigger; header still usable.

## Remaining / untested risks

### Ops checklist (manual — do before posting)

1. **Vercel spend alert / hard limit** — Dashboard → Settings → Billing. Set an alert (and a hard limit if available on the plan).
2. **Prod `TFL_APP_KEY`** — confirm present in the Vercel project env for Production (local `.env.local` has a key; that does not prove Production).
3. **TfL API portal** — confirm the product still shows ~500 req/min headroom and the key is not near daily caps.
4. **LinkedIn Post Inspector** — paste `https://tfl.manglekuo.com` after deploy and confirm the OG image + title/description render. (Cannot verify against production from this pass until the branch is live.)

### Soft residual risks

- `/tools` and `/drafts` still show non-link “Coming soon” bullet lists; related links exist so they are not hard dead ends, but they read thin.
- Coming-soon routes (`/docs/river-bus-arrivals`, `/docs/map-tubemap`, `/docs/skills`) remain reachable by direct URL — intentional.
- `getNearbyBusStops` / `searchBusStops` remain uncached; no live docs route mounts them today (`registry/tfl/arrivals/bus-arrivals.tsx` is unused).
- Client-side Next.js clicks in the automation browser sometimes failed to navigate (direct URL loads were fine). Treat as tool quirk, not a confirmed site bug — still worth a human click-through after deploy.

## Strengths

- Homepage proof surface already shows live TfL boards without polling fan-out.
- Registry + install path for Geographic map now resolves.
- Share meta is no longer text-only.
