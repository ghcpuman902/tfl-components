# Changelog

## [0.4.0] - 2026-08-10

Discovery chrome and docs surfaces catch up to the frozen IA. Station labels stay findable when abbreviated. Arrivals boards lock to a fixed tile rhythm.

### Added

- `FindableText` so abbreviated or wrapped station names still match find-in-page and copy as the full canonical name
- Docs search in the site header
- Canonical `/docs/*` routes for components, foundations, and maps (with redirects from older paths)
- Homepage editorial proof surface: short product thesis plus live Week ahead / arrivals composition instead of a catalog-first hero
- Section hubs and Coming soon docs shells for unfinished entries
- Station name labels foundations explainer and abbreviation stats script
- Agent rules for proof surfaces, Open Code composition, arrivals board rhythm, and findable identity text

### Changed

- Header / sidebar follow J6: Docs · Components · Blocks · Tools; flat Components list with mode markers; homepage full-width without sidebar
- `ArrivalsBoard` layout uses fixed tiles and absolute hairlines so brand bars and rows stay aligned
- Component MDX and demos lean example-first (purpose → preview → install → data → render)
- Registry descriptions and roundel presets tightened for install consumers

### Fixed

- Tube status / arrivals demos guard empty or failed fetches instead of rendering broken boards

## [0.3.0] - 2026-08-10

Stage 2 IA routes went live. Published boards take normalised data as props; fetching stays in the app or docs demo.

- Explore, Interfaces, Primitives, Foundations, Blocks, Maps routes
- Week-ahead Block under `/blocks`
- `ArrivalsBoard` + `data`; `LiveArrivalsBoard` as polling helper
- MapLibre geographic placeholder with vendored OSM Tube geometry
- Registry item `arrivals-board`

## [0.2.0] - 2026-08-09

Documented the two-layer model: data-aware interfaces over rendering primitives, with line-strip / schematic work and aligned sidebar versioning.

## [0.1.0] - 2026-08-09

First public release: roundel, badges, diagrams, status and arrivals boards, docs site, and shadcn registry install.
