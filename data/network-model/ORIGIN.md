# Network model snapshot — origin

This directory holds the **small derived TfL rail network** used by the Data model page: lines, stations, collapsed service patterns, typical calendars, headway bands, Elizabeth / Overground low-resolution shapes, and through-movements.

It is **not** unique-track geometry, **not** a full GTFS feed, and **not** live buses.

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
