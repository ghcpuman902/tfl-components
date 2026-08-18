# Network model snapshot — origin

This directory holds an **optional inspect snapshot**: collapsed service patterns, calendars, headway bands, and Elizabeth / Overground low-resolution shapes.

It is **not** required to draw the four maps, **not** unique-track geometry, **not** a full GTFS feed, and **not** live buses. The carriage map, platform map, and Tube map draw from TfL station order. The geographic map draws OSM unique-track, joined by station membership.

## What this snapshot is for (and isn't)

| Question | Source of truth | This snapshot's role |
|---|---|---|
| Which stations, in what order, does this product call at? | **TfL** (`tfl-ts` `LINE_STATION_SEQUENCES`) | Not involved. |
| Which metres of track does that product follow? | **OSM** route relations (station membership, not proximity) | Not required. OSM unique-track already covers Elizabeth line and Overground. |
| Is this hop/branch typical, and how often does it run? | **This snapshot** (`PatternCalendar` + `PatternFrequency`) | Inspect overlay only. Not an input to the four maps. |

A GTFS trip is a scheduled working, not a recording of what ran — this snapshot never reads real-time or historical actuals. It collapses thousands of dated trips into ~786 **patterns** (one row per unique line/direction/stop-list), because the trip is the wrong grain: nobody wants "the 08:03," they want "the fast service." GTFS does not name that service as its own object; unioning every distinct stop-list and trusting the union as a map is what produced a jumbled Elizabeth line graph earlier — the fix was to keep the union for typicality scoring only, and let the TfL sequence stay the drawn spine.

### Why this is cached and OSM mostly isn't

OSM's Overpass API is a live, open, queryable primitive — any consumer can requery it, point at a mirror, or pull a fresher extract against the same schema. Caching OSM here is a build-time convenience, not a dependency on us. The Aubin GTFS bundle is different in kind: it is a third party's own aggregation of upstream feeds, ~1 GB, with no equivalent live per-line query. A consumer cannot bring their own live copy without redoing the same collapse-and-classify pipeline this snapshot already does. That asymmetry is why this snapshot's surface stays deliberately narrow (skip-typicality + two modes' shapes) rather than growing into a general-purpose timetable API.

## Rebuild

```bash
pnpm network-model:snapshot
```

Optional:

```bash
pnpm network-model:snapshot -- --from /path/to/great_britain_gtfs.zip
pnpm network-model:snapshot -- --inspect
```

The script inspects first (`HEAD`, zip listing, `feed_info` / `agency` / `routes`). It downloads [Aubin / Transitous Great Britain GTFS](https://beta.aubin.app/gtfs/great_britain_gtfs.zip) **once** into `.cache/gtfs/great_britain_gtfs.zip` only if that cache is missing or unreadable. It streams zip members and never explodes the archive.

Do **not** delete the cached zip from the script. Delete it by hand only after `snapshot.json` is the agreed low-resolution mapping of the useful subset.

## What is kept

Agencies: `LULD` (Underground), `LDLR` (DLR), `TRAM`, `IFSC` (cable car), `=XR` (Elizabeth line), `=LO` (Overground).

Dropped: every bus route (including `TFLO` London Buses and `*_BUS` / route_type `714` rail replacements), unused stops, unused shapes, and survey-grade polylines.

Elizabeth / Overground paths are one most-common trip shape per pattern, simplified to the unique-track **preview** tolerance (39 m). Underground, DLR, Tram, and cable-car map paint stays [OSM unique-track](../geography/ORIGIN.md) — this feed has no useful trip shapes for those modes.

## Outputs

| File | Role |
|------|------|
| `snapshot.json` | Derived records matching `lib/tfl/network-model/types.ts` |
| `manifest.json` | Publisher, feed dates, agency allow-list, counts, attribution |

## Licences / attribution

- Transport for London open data
- DfT Bus Open Data Service (Open Government Licence), already packaged inside the Great Britain feed for Underground / DLR / Tram / cable car
- Powered by National Rail Enquiries (Elizabeth line and Overground)
- © OpenStreetMap contributors (unique-track geometry is a sibling dataset)
- Aubin / Transitous Great Britain GTFS (`https://aubin.app/`, `https://transitous.org/sources-great-britain/`)
