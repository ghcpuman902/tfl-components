# Backlog

IA Stage 1 is frozen; migration executed; homepage catalogue + docs search + direct `tfl-ts` contracts polished (2026-08-10).

## This version — polish existing

- Keep section hubs accurate (Coming soon only for real future slots)
- Harden docs demos when TfL credentials / cache fail
- Page-anatomy consistency on shipped Interfaces / Primitives / Foundations

## Coming soon (do not invent yet)

- Full Explorer information model (WIP notice in place)
- Journeys / service-information Interfaces
- Full geographic map product beyond MapLibre + vendored OSM preview
- Formal Drafts population (only with real experiments)
- Dedicated StraightStrip docs page (atom currently documented via Line strip)

## Open design (implement only when asked)

- Bus hub arrivals — one place, many stands (Hammersmith-scale). Stop letter as a platform-style subgroup heading, not only a single-stop header. Brief: [docs/bus-hub-arrivals.md](./docs/bus-hub-arrivals.md).

## Later — extract Explorer search into components

Pinned 2026-08-23. Inventory only — do not extract until the cut and Board scope are decided.

`TfLPointPicker` is already the presentational shell (input, optional Search/Enter, Locate, list/map, keyboard, empty/error/loading, optional `addable`). It does not fetch, hold a key, or own MapLibre. The `filters` slot is unused. Finders are domain adapters over that shell.

### Existing Explorer surfaces

| Surface | UI | Query model | Data | Locate | Map | Result | Extra |
|---|---|---|---|---|---|---|---|
| Tube & rail stations | `TubeRailPointFinder` → picker | Type-to-filter (no Search button) | Full cached catalogue | Local 800 m / 25 | List + map, no Search here | Name + id + hub count | `filterExplorerPoints` ranking (name / id / hub / line / mode) |
| River piers | `RiverPointFinder` → picker | Same | Full cached catalogue | Same local nearby | Same | Name + id | Same filter |
| Bus stops | `BusPointFinder` → picker | Submit + restore `?q=` | Featured seed until Search / Locate | Remote geo 400 m / 12, **visitor key** | List + map + **Search here** | Name + letter + towards; distance hidden | SMS code; `"Name H"` / `"Name (H)"` letter rank; hub name → geo expand |
| Cycle docks | `CyclePointFinder` → picker | Same submit + restore `?q=` | Featured seed until Search / Locate | Remote geo 400 m / 25, **visitor key** | List + map + **Search here** | Name + id + bike count | Min 2 chars. `addable` / `addedIds` used by Board dialog |
| Bus routes | `LinesBusPanel` (own input) | Type-to-filter; Enter picks first | Full cached lines | None | None | Wrapping `BusNumberChip` | `id` / `name` substring |
| River routes | `LinesRiverPanel` (near-copy) | Same | Full cached river lines | None | None | Wrapping `RiverRouteChip` | Same |
| Tube & rail lines | `LinesTubeRailPanel` | **No search** | Small cached set | None | None | Colour-bar cards | Leave as a static grid |

Shared around those: `ExplorerPoint`, `q` / `view` as query chrome (`history.pushState`, no RSC), optimistic select then inspector stream, `useExplorerKeyedQuery` for live TfL.

### Same picks, different chrome (Board)

| Surface | Chrome | vs Explorer |
|---|---|---|
| `BoardStationSearch` | Combobox over station list | Same catalogue idea as Tube & rail finder |
| `BoardPlaceSearch` river | Combobox, local filter | Same data idea as River finder |
| `BoardPlaceSearch` bus | Input + Search + Locate, Combobox | Same job as `BusPointFinder`; weaker query language (no SMS / letter / hub expand); site action, not visitor key |
| `BoardCycleDockPicker` | Dialog wrapping **`CyclePointFinder`** | Only finder reused outside Explorer |
| `BoardLineChipPicker` | Toggle chips, no text | Different job from route filter |

### Candidate cut (four behaviours, not seven domain widgets)

1. **Catalog point search** — Tube & rail stations, river piers. Complete local list; typing filters; offline locate; optional map; no key.
2. **Live point search** — Bus stops, cycle docks. Seed until submit; Search button; visitor-key TfL; remote geo + Search here; optional `addable`. Domain plug-in is the `tfl-ts` call + normaliser.
3. **Route chip filter** — Bus / river lines. Filter-as-you-type over a complete directory; chip wrap; no map.
4. **Compact combobox pick** *(optional)* — Board station / pier / bus stop. Same data + ranking as 1–2, popover chrome. Do not force the Explorer split into the Board form.

Keep out of the UI: `filterExplorerPoints` / `nearbyExplorerPoints`, `parseBusStopSearchQuery` + letter rank / hub expand, `useExplorerKeyedQuery` + `getGeolocation`.

Do **not** collapse: bus SMS + stop-letter syntax, bus hub→geo expand, cycle occupancy on the row, hub sibling counts on Tube & rail.

**Open:** is Board Combobox (4) in the first extraction, or Explorer-only (1–3)?

## Architecture source of truth

- [docs/product-architecture.md](./docs/product-architecture.md)
- [docs/TARGET_ARCHITECTURE.md](./docs/TARGET_ARCHITECTURE.md)
- [docs/page-anatomy.md](./docs/page-anatomy.md)
