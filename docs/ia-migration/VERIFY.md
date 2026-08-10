# Post-migration verification (batches executed)

Compared to [BASELINE.md](./BASELINE.md) after mechanical IA moves + data-props / arrivals converge / Blocks.

| Check | Baseline | After |
|-------|----------|-------|
| `pnpm typecheck` | 0 | 0 |
| `pnpm lint` | 0 | 0 |
| `pnpm test` | 0 (21) | 0 (21) |
| `pnpm build` | 0 | 0 |

## New / moved routes

- `/explore/lines`, `/explore/routes`
- `/interfaces/tube-status-board`, `/interfaces/arrivals-board`
- `/primitives/line-strip`, `/primitives/branch-strip`
- `/foundations/tfl-roundel`, `/foundations/line-badge`
- `/blocks`, `/blocks/week-ahead`
- `/maps/geographic` (MapLibre + OSM data), `/maps/schematic` (cross-links)

## Intentional behaviour

- `TubeStatusBoard` requires `data` (fetch via `getCachedLineStatuses` in app/docs)
- Arrivals converged on `ArrivalsBoard` + `data` props
- J4: Primitives primary; Maps/Schematic separate with links
- Old `/components/*` and `/tools/browse-lines|route-stations` redirect to new homes

## Registry

Public install names kept (`tube-status-board`, `live-arrivals-board`, `bus-arrivals-board`). New `arrivals-board` item for the converged presentational board. `TubeStatusBoard` ships with `status-types` (data-as-props; no in-component fetch).
