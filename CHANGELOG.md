# Changelog

Releases are split into two tracks. See [docs/releases.md](./docs/releases.md).

- **Web app** — `web-vX.Y.Z` (docs site, demos, feedback, site chrome)
- **Components** — `vX.Y.Z` (installable registry under `registry/tfl/`)

Tags `v0.1.0`–`v0.4.0` predate the split and mixed both tracks. From `web-v0.5.0` onward, web and component bumps are tagged separately.

---

## Web app

### [web-v0.5.0] - 2026-08-11

Docs site polish: in-page feedback, typography preference, and cleaner MDX chrome. No separate component tag in this release; registry work that landed on `main` since `v0.4.0` waits for the next `v*` components release.

#### Added

- Feedback dialog with screenshot capture, draft autosave, and Resend delivery
- Adobe Fonts (P22 Underground) option beside Hammersmith One, with a site-wide font preference control
- Typography docs and demos for the docs surface

#### Changed

- MDX title / heading styles and sticky scroll padding for docs pages
- Feedback cooldown handled in the browser so repeat submit notices stay local

#### Note on unreleased component work

These registry items already exist on `main` but are **not** part of `web-v0.5.0`. They will ship under the next `v*` tag:

- Cycle Hire Docks (map + detail surfaces)
- `platform-chip`, `bus-number-chip`
- Generated `tfl-colours` tokens and production CSS retention fixes
- `tfl-ts` ^2.6.0

---

## Components

### [0.4.0] - 2026-08-10

Discovery chrome and docs surfaces catch up to the frozen IA. Station labels stay findable when abbreviated. Arrivals boards lock to a fixed tile rhythm.

#### Added

- `FindableText` so abbreviated or wrapped station names still match find-in-page and copy as the full canonical name
- Docs search in the site header
- Canonical `/docs/*` routes for components, foundations, and maps (with redirects from older paths)
- Homepage editorial proof surface: short product thesis plus live Week ahead / arrivals composition instead of a catalog-first hero
- Section hubs and Coming soon docs shells for unfinished entries
- Station name labels foundations explainer and abbreviation stats script
- Agent rules for proof surfaces, Open Code composition, arrivals board rhythm, and findable identity text

#### Changed

- Header / sidebar follow J6: Docs · Components · Blocks · Tools; flat Components list with mode markers; homepage full-width without sidebar
- `ArrivalsBoard` layout uses fixed tiles and absolute hairlines so brand bars and rows stay aligned
- Component MDX and demos lean example-first (purpose → preview → install → data → render)
- Registry descriptions and roundel presets tightened for install consumers

#### Fixed

- Tube status / arrivals demos guard empty or failed fetches instead of rendering broken boards

### [0.3.0] - 2026-08-10

Stage 2 IA routes went live. Published boards take normalised data as props; fetching stays in the app or docs demo.

- Explore, Interfaces, Primitives, Foundations, Blocks, Maps routes
- Week-ahead Block under `/blocks`
- `ArrivalsBoard` + `data`; `LiveArrivalsBoard` as polling helper
- MapLibre geographic placeholder with vendored OSM Tube geometry
- Registry item `arrivals-board`

### [0.2.0] - 2026-08-09

Documented the two-layer model: data-aware interfaces over rendering primitives, with line-strip / schematic work and aligned sidebar versioning.

### [0.1.0] - 2026-08-09

First public release: roundel, badges, diagrams, status and arrivals boards, docs site, and shadcn registry install.
