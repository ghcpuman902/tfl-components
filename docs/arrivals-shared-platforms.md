# Arrival board grouping

How rail arrivals are grouped on the board, what is an unconditional bug fix, and what is a considered default the caller can override.

Investigated against Liverpool Street (`940GZZLULVT` / `910GLIVST`). The engine lives in [`lib/tfl/arrivals-prepare.ts`](../lib/tfl/arrivals-prepare.ts); headings in [`lib/tfl/arrivals-bound-sort.ts`](../lib/tfl/arrivals-bound-sort.ts) (`formatBoundHeading`).

## Must-fix (no config)

These are wrong regardless of grouping preference.

1. **Hoist a uniform platform into the subgroup heading.** If every row in a bound shares one platform, that platform belongs in the heading and **not** on every row. Only paint a compact `P{n}` chip when platforms actually vary inside the bound.
2. **Spell out platform-only headings.** Elizabeth `A` / Weaver `1` are `Platform A` / `Platform 1`, not the bare letter or number.
3. **Unknown platform is a named group.** TfL’s literal `Platform Unknown` (and a missing `platformName` on a live prediction) is **not** “no bound metadata”. It gets the heading `Platform to be confirmed` (`ARRIVALS_PLATFORM_UNKNOWN_HEADING`). A `label: null` bound is reserved for bus lists and empty unseeded lines.

## Default, but overridable

These are judgment calls. Change the formatter or the curated table — not the grouping engine.

4. **Heading when direction and platform are 1:1.** Default is `"Eastbound · Platform 1"` via `formatBoundHeading`. Not a prop yet; a future `boundHeadingFormat` should wrap this helper.
5. **Shared-platform line merge.** `RailArrivalsBoard` accepts optional `lineGroups: { lines, label? }[]`. Off by default on the installable component. This site’s `/board` opts in through `BOARD_STATION_LINE_GROUPS` in [`lib/tfl/board-station-lines.ts`](../lib/tfl/board-station-lines.ts) (Liverpool Street Circle + Hammersmith & City + Metropolitan, six rows per bound). The merged header matches Line title’s Shared-track group: `text-foreground` plus equal-width colour stripes. Mixed-line sections show a line chip **before** the destination. When the platform chip is hoisted, the row grid drops the empty leading column so destinations sit flush with the bound heading.

Do **not** infer merges from “these line ids co-occur on the map”. Baker Street also carries Circle / H&C / Metropolitan, but Metropolitan uses different platforms — it is absent from the table on purpose.

## Grouping rule

1. Merge services that share the same physical platforms at this stop (`lineGroups` / curated table).
2. If platform maps cleanly to direction, subgroup = direction + hoisted platform.
3. If there is no compass prefix, subgroup = platform, heading spelled out.
4. If direction is useful but platform varies, group by direction and show compact `P{n}` on the row.
5. If several lines sit in one group, show a line chip on each prediction.
6. If only one line exists, do not repeat a line chip.
7. If every row shares the same platform, hoist it into the heading.
8. If platform is unknown, one stable fallback group — never a blank heading.

## Test stations

| Station | Role |
|---|---|
| Liverpool Street | Shared Circle / H&C / Met platforms; Elizabeth lettered platforms; Weaver numbered + unknown outbound |
| Baker Street | Counterexample — do not merge Circle / H&C / Met |
| *(open)* | Direction useful, platform varies inside the bound |
| *(open)* | Platform useful, eastbound/westbound is not |
| *(open)* | Lettered-platform Overground besides Elizabeth |

No Board-URL param for `lineGroups` in this pass. Callers pass the prop; the hosted board uses the curated table.
