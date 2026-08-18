# Geographic data — origin declaration

This directory holds **supplementary geographic datasets** used by the Maps → Geographic surface in `tfl-components`.

They are **not** produced by the TfL Unified API alone. Line track geometry originates from OpenStreetMap; station matching may involve TfL open data in the upstream pipeline.

## Source and derived layers (do not confuse them)

| Layer | Path | Purpose |
|-------|------|---------|
| **Full OSM route variants** | `{tube,elizabeth,overground,dlr,tram}-geometry.json` (+ `osm-cache/`) | Every mapped route relation and direction. Kept for pattern analysis, explorer station coordinates, and rebuilds. **Not** what the map draws. |
| **OSM relation evidence** | `osm-cache/{mode}-route-stops.json` | Relation tags and ordered stop-position members, plus a unique-stop index. Supports route-pattern inspection; it does not supply trip frequency or a service calendar. |
| **Merged centreline** | `unique-track/{mode}/{full,preview}.json` → `public/data/geography/{mode}-geometry.json` | Directional twin tracks collapsed to one corridor; real branches kept. Default map paint. |
| **Dual directional tracks** | `unique-track/{mode}/dual-{full,preview}.json` → `public/data/geography/{mode}-geometry-dual.json` | Both directions kept as continuous polylines (`trackGroup` 0 / 1). |
| **Welded junction graph** | `unique-track/{mode}/graph.json` → `public/data/geography/{mode}-graph.json` | Nodes (junction / terminus) and edges. Branch attachments share the exact same vertex (6 decimal places) as the corridor they leave. |

OSM stores separate route relations for mapped directions and variants. Drawing all of them stacks the same corridor many times (Elizabeth 24 → 5; Tube 208 → 31). A relation count is not a train frequency. Preview is a cheaper LOD of the **same** unique track, not a different overlapping set. Rebuild with `pnpm geography:unique-track`.

## Provenance

| Dataset | Path | Copied from | Upstream |
|--------|------|-------------|----------|
| Consolidated Tube lines + stations GeoJSON (full variants) | `tube-geometry.json` | `ssh.ldn/data/public-noise/tube-geometry-cache.json` (= `osm-cache/tube-geometry/8b90968….json`) | Built in [ssh.ldn](https://github.com/ghcpuman902/ssh.ldn) via Overpass + TfL station enrichment (`lib/server/tfl-transit-geometry.ts`) |
| Consolidated Elizabeth / Overground / DLR / Tram GeoJSON (full variants) | `{elizabeth,overground,dlr,tram}-geometry.json` | `ssh.ldn/data/osm-cache/{mode}-geometry/` current cache-key cells | Same builder as Tube |
| Per-mode geometry cache cells | `osm-cache/{tube,dlr,elizabeth,overground,tram}-geometry/` | `ssh.ldn/data/osm-cache/…` | OpenStreetMap Overpass + TfL enrichment caches from ssh.ldn |
| Unique-track centreline / dual / graph | `unique-track/{mode}/` + `public/data/geography/{mode}-geometry.json` (+ `-dual`, `-graph`) | Built here via `lib/tfl/geometry/transit-track-graph.ts` | Derived from the consolidated variant files above |
| Attribution note (Tube) | `sources-osm-tube.txt` | `ssh.ldn/data/public-noise/sources/osm-tube-geometry/source.txt` | — |

**Copied into this repo:** 2026-08-10 (Tube first; Elizabeth / Overground / DLR / Tram demo bundles mirrored the same day).  
**Unique-track map layer:** 2026-08-17 (`pnpm geography:unique-track` — centreline, dual, and welded graph).

## Licences / attribution

### OpenStreetMap (route / track geometry)

- **Provider:** OpenStreetMap contributors  
- **Licence:** [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/)  
- **Copyright:** https://www.openstreetmap.org/copyright  
- **Required attribution:** © OpenStreetMap contributors  

### Transport for London (station metadata where present in the bundle)

- **Provider:** Transport for London  
- **Licence:** [TfL Open Data](https://tfl.gov.uk/info-for/open-data-users/)  
- Station names / ids / colours in enriched bundles should credit TfL where applicable.

### Basemap (MapLibre)

The geographic, cycle-hire, and Explorer maps use **OpenFreeMap** vector Positron tiles (OpenMapTiles + OSM), not CARTO PNG rasters. Credit OSM + OpenFreeMap in the UI.

## Consumer rules

1. Prefer **provider-independent** GeoJSON from this folder (or future normalised exports).  
2. **Map / docs demos** must load the **unique-track** files under `public/data/geography/` (centreline by default, or `*-geometry-dual.json`). Do not paint full route variants on the map.  
3. Do **not** hard-wire core geography helpers to MapLibre / Mapbox / Google — adapters sit above the data (frozen product architecture).  
4. Always surface origin/licence on geographic docs and map chrome.  
5. Re-fetch / refresh from Overpass via ssh.ldn tooling when geometry goes stale; then re-run `pnpm geography:unique-track`. Do not pretend live TfL API returns track polylines.
