# Multi-line shared-stop maps

Extension point for co-rendering several lines (e.g. District + Circle +
Hammersmith & City) on one SVG/canvas. Not a product UI yet — the data layers
below are what make it possible without renaming everything later.

## What already exists

| Layer | Module | Role |
|-------|--------|------|
| Station identity | [`lib/tfl/station-index.ts`](../lib/tfl/station-index.ts) | Naptan-primary `StationRecord` with `aliasIds` |
| Label recipes | [`lib/tfl/horizontal-station-labels.ts`](../lib/tfl/horizontal-station-labels.ts) | ID-first, name-key fallback |
| Line topology | [`lib/tfl/line-topology.ts`](../lib/tfl/line-topology.ts) | Live branched edges from TfL `orderedLineRoutes` |
| Line schematic | [`lib/tfl/line-schematic.ts`](../lib/tfl/line-schematic.ts) | Orientation-specific `lane × pos` layouts (diverge + converge + duplicate stops) |
| Schematic layout | [`lib/tfl/schematic-layout.ts`](../lib/tfl/schematic-layout.ts) | Shared coordinate space for SVG + HTML labels |
| Schematic UI | [`registry/tfl/diagram/branch-strip.tsx`](../registry/tfl/diagram/branch-strip.tsx) | Atomic SVG branch strip |
| Strip molecule | [`registry/tfl/diagram/line-strip.tsx`](../registry/tfl/diagram/line-strip.tsx) | TfL-aware StraightStrip / BranchStrip compose |
| Station UI | [`components/tfl/station-name.tsx`](../components/tfl/station-name.tsx) | Find/copy/aria independent of line geometry |

## Alignment model (future)

1. Build one `StationIndex` for the region (union of stops on the chosen lines).
2. Author or derive a `LineSchematic` per line (lane/pos), or start from `LineTopology`.
3. Place **one node per `StationRecord.id`** in a shared layout.
4. Draw **one edge colour per line** between nodes that appear consecutive on that line.
5. Render labels once via `StationName` at the shared node coordinate.

Homonyms (e.g. Edgware Road Bakerloo vs Circle) stay distinct Naptans unless
explicitly aliased in `StationRecord.aliasIds`.

## Out of scope for now

- Automatic geographic / schematic packing across lines
- Auto lane assignment from live `LineTopology`
- Conflict resolution when two lines disagree on stop order
- Canvas hit-testing / pan-zoom chrome

When implementing the multi-line map, prefer extending `layoutLineSchematic`
into a multi-line layout that consumes `StationIndex` + `LineSchematic[]`,
rather than inventing a parallel identity system.
