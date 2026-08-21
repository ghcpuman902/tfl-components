# Changelog

Releases are split into two tracks. See [docs/releases.md](./docs/releases.md).

- **Web app** — `web-vX.Y.Z` (docs site, demos, feedback, site chrome)
- **Components** — `vX.Y.Z` (installable registry under `registry/tfl/`)

Tags `v0.1.0`–`v0.4.0` predate the split and mixed both tracks. From `web-v0.5.0` onward, web and component bumps are tagged separately.

---

## Web app

### [web-v0.7.0] - 2026-08-21

Room landing, staged Board onboarding, and a performance pass that keeps first paint stable without changing the loaded UI. Installable registry work from this range ships as **[0.6.0](#060---2026-08-21)** on the components track.

#### Added

- Homepage is the 3D room landing, with Board as the staged builder at `/board`
- Public TfL metadata observatory
- Homepage PPR shell now reserves the room’s scroll height and paper colour so the footer does not jump when the scene streams in
- Board builder Suspense fallback reserves the device preview slot
- Live board shows arrivals skeletons until the URL hash hydrates, matching status and cycle hire

#### Changed

- Next.js 16.3.1 → 16.3.2
- Feedback screenshots load `modern-screenshot` only when a capture runs, so it is not on every page’s initial JS
- Font preference context value is stable across unrelated renders

#### Fixed

- Search-result options expose `aria-selected` for the listbox role
- API-key walkthrough test asserts the subscribe step, not a second product URL that was never on that step

---

### [web-v0.6.0] - 2026-08-15

Board builder, Explorer credentials, and Cache Components polish on the docs site. Installable registry work from this range ships as **[0.5.0](#050---2026-08-15)** on the components track.

#### Added

- Board builder (`/board`) with URL-backed config, live preview, and chromeless `/board/view`
- Explorer Browse/Find with user-supplied TfL credentials instead of a shared server key
- Geographic map docs (MapLibre default; Google/Mapbox remain vendor examples)

#### Changed

- Homepage hero sits in the PPR static shell so first paint is not blocked by live TfL fetches
- Site favicon is the grey placeholder roundel (not line-colour bars or the trademarked mark)
- Line Badge docs renamed to Line Chip; Colours treated as a tokens foundation
- Next.js 16.3.0 → 16.3.1

#### Fixed

- Metadata base URL construction no longer throws when `NEXT_PUBLIC_APP_URL` is not a valid URL
- Homepage photo rotator no longer nests `setState` inside another updater
- Station-name formatter no longer crashes when TfL supplies a non-string label

---

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

### [0.6.0] - 2026-08-21

River boards, unattended display, live bus geography, and a registry rebuild so install payloads match current source. Registry installs pin `tfl-ts@^2.10.0`.

#### Added

- `river-bus-arrivals-board` and `river-route-chip`
- Unattended / pin-first behaviour on arrivals and status surfaces
- `tfl-bus-geo-map` for live bus vehicles
- Cycle Hire map/detail polish already on `main` since 0.5.0

#### Changed

- Registry `tfl-ts` dependency is `tfl-ts@^2.10.0`
- Rebuilt `/r/*.json` from current `registry/tfl` source

---

### [0.5.0] - 2026-08-15

Cycle Hire, geographic MapLibre map, colour tokens, and arrivals that match how TfL actually shares platforms and track. Registry installs now pin `tfl-ts@^2.9.0` and ship every helper the boards import.

#### Added

- Cycle Hire Docks: map + detail surfaces over normalised dock data
- `tfl-geographic-map` with MapLibre as the default renderer (pass `data`, or serve unique-track GeoJSON at `/data/geography/{mode}-geometry.json`)
- Generated `tfl-colours` tokens
- `platform-chip` and `bus-number-chip`
- Bus stop disruption rows on the bus arrivals board
- Shared-platform grouping, Circle / H&C / Metropolitan shared-track identity, destination text that keeps `currentLocation` when TfL sends a placeholder, bound-group compass order, and pagination so every serving line stays on the board

#### Changed

- Registry `tfl-ts` dependency is `tfl-ts@^2.9.0` (shared-track prediction types and status helpers). Bare `tfl-ts` resolved 2.6.2 and failed typecheck
- Bus disruption prep lives in `lib/tfl/prepare-bus-stop-disruptions.ts` so the shadcn CLI does not collide it with `bus-stop-disruptions.tsx`
- Arrivals pager clamps the page index in an effect instead of an impure `setState` updater

#### Fixed

- `rail-arrivals-board` / `bus-arrivals-board` now include `lib/tfl/arrivals-destination-text.ts` in the registry payload
- `tfl-geographic-map` declares `@types/geojson` so consumer typecheck passes

#### Note for install consumers

The geographic map’s default fetch is **not** inlined in the registry JSON (the GeoJSON is large). Copy `public/data/geography/*.json` from this repo, or pass geometry as `data`. Google Maps and Mapbox adapters are optional and not part of the default install.

---

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
