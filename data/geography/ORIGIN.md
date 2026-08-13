# Geographic data — origin declaration

This directory holds **supplementary geographic datasets** used by the Maps → Geographic surface in `tfl-components`.

They are **not** produced by the TfL Unified API alone. Line track geometry originates from OpenStreetMap; station matching may involve TfL open data in the upstream pipeline.

## Two line layers (do not confuse them)

| Layer | Path | Purpose |
|-------|------|---------|
| **Full OSM route variants** | `{tube,elizabeth,overground,dlr,tram}-geometry.json` (+ `osm-cache/`) | Every timetable pattern / direction as its own relation. Kept for internal analysis, explorer station coords, and rebuilds. **Not** what the map draws. |
| **Unique-track (map drawing)** | `unique-track/{mode}/{full,preview}.json` → mirrored to `public/data/geography/{mode}-geometry.json` | Longest spine + leftover branches only, then Douglas–Peucker. Rebuild with `pnpm geography:unique-track`. |

OSM stores every service pattern as its own route. Drawing all variants stacks the same corridor many times (Elizabeth 24 → 4; Tube 208 → 31). Preview is a cheaper LOD of the **same** unique track, not a different overlapping set.

## Provenance

| Dataset | Path | Copied from | Upstream |
|--------|------|-------------|----------|
| Consolidated Tube lines + stations GeoJSON (full variants) | `tube-geometry.json` | `ssh.ldn/data/public-noise/tube-geometry-cache.json` (= `osm-cache/tube-geometry/8b90968….json`) | Built in [ssh.ldn](https://github.com/ghcpuman902/ssh.ldn) via Overpass + TfL station enrichment (`lib/server/tfl-transit-geometry.ts`) |
| Consolidated Elizabeth / Overground / DLR / Tram GeoJSON (full variants) | `{elizabeth,overground,dlr,tram}-geometry.json` | `ssh.ldn/data/osm-cache/{mode}-geometry/` current cache-key cells | Same builder as Tube |
| Per-mode geometry cache cells | `osm-cache/{tube,dlr,elizabeth,overground,tram}-geometry/` | `ssh.ldn/data/osm-cache/…` | OpenStreetMap Overpass + TfL enrichment caches from ssh.ldn |
| Unique-track full / preview | `unique-track/{mode}/` + `public/data/geography/{mode}-geometry.json` | Built here via `scripts/collapse-transit-geometry.mjs` (same algorithm as ssh.ldn) | Derived from the consolidated variant files above |
| Attribution note (Tube) | `sources-osm-tube.txt` | `ssh.ldn/data/public-noise/sources/osm-tube-geometry/source.txt` | — |

**Copied into this repo:** 2026-08-10 (Tube first; Elizabeth / Overground / DLR / Tram demo bundles mirrored the same day).  
**Unique-track map layer:** 2026-08-13 (`pnpm geography:unique-track`).

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

### Basemap (MapLibre placeholder)

The geographic placeholder uses a **CARTO** raster basemap (Positron) built on OpenStreetMap. Credit OSM (+ CARTO where required by their terms) in the UI.

## Consumer rules

1. Prefer **provider-independent** GeoJSON from this folder (or future normalised exports).  
2. **Map / docs demos** must load the **unique-track** files under `public/data/geography/` (or `unique-track/*/full.json`). Do not paint full route variants on the map.  
3. Do **not** hard-wire core geography helpers to MapLibre / Mapbox / Google — adapters sit above the data (frozen product architecture).  
4. Always surface origin/licence on geographic docs and map chrome.  
5. Re-fetch / refresh from Overpass via ssh.ldn tooling when geometry goes stale; then re-run `pnpm geography:unique-track`. Do not pretend live TfL API returns track polylines.
