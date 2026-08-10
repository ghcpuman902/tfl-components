# Geographic data — origin declaration

This directory holds **supplementary geographic datasets** used by the Maps → Geographic surface in `tfl-components`.

They are **not** produced by the TfL Unified API alone. Line track geometry originates from OpenStreetMap; station matching may involve TfL open data in the upstream pipeline.

## Provenance

| Dataset | Path | Copied from | Upstream |
|--------|------|-------------|----------|
| Consolidated Tube lines + stations GeoJSON | `tube-geometry.json` (+ `public/data/geography/` mirror) | `ssh.ldn/data/public-noise/tube-geometry-cache.json` (= `osm-cache/tube-geometry/8b90968….json`) | Built in [ssh.ldn](https://github.com/ghcpuman902/ssh.ldn) via Overpass + TfL station enrichment (`lib/server/tfl-transit-geometry.ts`) |
| Consolidated Elizabeth / Overground / DLR / Tram GeoJSON | `{elizabeth,overground,dlr,tram}-geometry.json` (+ public mirrors) | `ssh.ldn/data/osm-cache/{mode}-geometry/` current cache-key cells (`elizabeth-v3`, `overground-v3`, `dlr-v1`, `tram-v1`) | Same builder as Tube; non-Tube modes are API-built in ssh.ldn and persisted in the geometry disk cache |
| Per-mode geometry cache cells | `osm-cache/{tube,dlr,elizabeth,overground,tram}-geometry/` | `ssh.ldn/data/osm-cache/…` | OpenStreetMap Overpass + TfL enrichment caches from ssh.ldn |
| Attribution note (Tube) | `sources-osm-tube.txt` | `ssh.ldn/data/public-noise/sources/osm-tube-geometry/source.txt` | — |

**Copied into this repo:** 2026-08-10 (Tube first; Elizabeth / Overground / DLR / Tram demo bundles mirrored the same day).

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
2. Do **not** hard-wire core geography helpers to MapLibre / Mapbox / Google — adapters sit above the data (frozen product architecture).  
3. Always surface origin/licence on geographic docs and map chrome.  
4. Re-fetch / refresh from Overpass via ssh.ldn tooling when geometry goes stale; do not pretend live TfL API returns track polylines.
