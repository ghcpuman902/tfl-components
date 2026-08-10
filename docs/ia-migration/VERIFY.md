# Verification log

Compared to [BASELINE.md](./BASELINE.md). Live status: [STATUS.md](./STATUS.md).

## After migration (v0.3.0)

| Check | Baseline | After migration |
|-------|----------|-----------------|
| `pnpm typecheck` | 0 | 0 |
| `pnpm lint` | 0 | 0 |
| `pnpm test` | 0 (21) | 0 (21) |
| `pnpm build` | 0 | 0 |

### New / moved routes

- `/explore/lines`, `/explore/routes`
- `/interfaces/tube-status-board`, `/interfaces/arrivals-board`
- `/primitives/line-strip`, `/primitives/branch-strip`
- `/foundations/tfl-roundel`, `/foundations/line-badge`
- `/blocks`, `/blocks/week-ahead`
- `/maps/geographic` (MapLibre + OSM data), `/maps/schematic` (cross-links)

### Intentional behaviour

- `TubeStatusBoard` requires `data` (fetch via `getCachedLineStatuses` in app/docs)
- Arrivals converged on `ArrivalsBoard` + `data` props
- J4: Primitives primary; Maps/Schematic separate with links
- Old `/components/*` and `/tools/browse-lines|route-stations` redirect to new homes

### Registry

Public install names kept (`tube-status-board`, `live-arrivals-board`, `bus-arrivals-board`). New `arrivals-board` item for the converged presentational board. `TubeStatusBoard` ships with `status-types` (data-as-props; no in-component fetch).

---

## After post-IA polish (this pass)

| Check | Result |
|-------|--------|
| `pnpm typecheck` | 0 |
| `pnpm lint` | 0 |
| `pnpm test` | 0 (21) |
| `pnpm registry:build` | 0 |
| `pnpm build` | 0 (28 static paths) |

### Polish changes

- Section indexes use `SectionHub` (purpose + In this section + Coming soon) — no scaffold badges
- `TubeStatusBoard` / `ArrivalsBoard` treat missing `data` as empty; status demo catches fetch errors
- Shipped MDX aligned to page anatomy; related links on Interfaces / Primitives / Foundations
- IA execution docs marked complete; C3 closed; [STATUS.md](./STATUS.md) added; `TODO.md` refreshed
