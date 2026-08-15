# Arrival board grouping

How rail arrivals are grouped on the board, what is an unconditional bug fix, and what is a considered default the caller can override.

Investigated against Liverpool Street (`940GZZLULVT` / `910GLIVST`). The engine lives in [`lib/tfl/arrivals-prepare.ts`](../lib/tfl/arrivals-prepare.ts); headings in [`lib/tfl/arrivals-bound-sort.ts`](../lib/tfl/arrivals-bound-sort.ts) (`formatBoundHeading`).

## Must-fix (no config)

These are wrong regardless of grouping preference.

1. **Hoist a uniform platform into the subgroup heading.** If every row in a bound shares one platform, that platform belongs in the heading and **not** on every row. Only paint a compact `P{n}` chip when platforms actually vary inside the bound.
2. **Spell out platform-only headings.** Elizabeth `A` / Weaver `1` are `Platform A` / `Platform 1`, not the bare letter or number.
3. **Unknown platform is a named group.** TfL’s literal `Platform Unknown` (and a missing `platformName` on a live prediction) is **not** “no bound metadata”. It gets the heading `Platform to be confirmed` (`ARRIVALS_PLATFORM_UNKNOWN_HEADING`). A `label: null` bound is reserved for bus lists and empty unseeded lines.
4. **Drop predictions whose `timeToLive` has already expired.** TfL's own field is documented as "the expiry time for the prediction". Confirmed live on Weaver at Liverpool Street and Elizabeth line at Paddington: a "self-destination" row (`destinationName` equals the station you're standing at, `direction` blank) reports `timeToLive` a fixed ~1 minute in the past while `timeToStation` keeps counting up for the next scheduled slot — up to two hours out, 15+ duplicate rows per poll. This isn't a display quirk to reformat, it's TfL telling the client the record is dead; `isExpiredArrivalPrediction` in [`lib/tfl/arrivals-prepare.ts`](../lib/tfl/arrivals-prepare.ts) drops it. Underground rows never trip this — their `timeToLive` always equals `expectedArrival` exactly, so it's never "expired" before the train has actually arrived. Opt-in via `prepareRailArrivals({ now })` / `<RailArrivalsBoard now={…} />` — never a default `Date.now()` inside the pure prepare function (see `.cursor/rules/nextjs-cache-components-time.mdc`); callers pass the same timestamp they captured alongside `data` (`fetchedAt` from `useDualPathArrivals`, the cached home-arrivals payload, etc.). Omitting `now` skips the filter — safe for fixture demos with stale example timestamps.
5. **"Due" is fabricated for `Platform Unknown` mainline rows — show "Scheduled" instead.** Every Weaver row without an assigned platform reports `timeToStation` pinned at ~45 seconds regardless of the real wait, confirmed against `timeToLive` on live Liverpool Street data (real gaps up to 98 minutes for the same fixed ~45s reading). TfL hasn't allocated a platform or live position yet, so there's no train to count down from — Elizabeth line never shows `Platform Unknown` and is unaffected. `formatArrivalsCountdown` in [`arrivals-bound-group.tsx`](../registry/tfl/arrivals/arrivals-bound-group.tsx) returns `"Scheduled"` whenever `isUnknownArrivalsPlatform(platformName)` is true, before it ever looks at `timeToStation`.

## Default, but overridable

These are judgment calls. Change the formatter or the curated table — not the grouping engine.

6. **Heading when direction and platform are 1:1.** Default is `"Eastbound · Platform 1"` via `formatBoundHeading`. Not a prop yet; a future `boundHeadingFormat` should wrap this helper.
7. **Shared-platform line merge.** `RailArrivalsBoard` accepts optional `lineGroups: { lines, label? }[]`. Off by default on the installable component. This site’s `/board` opts in through `BOARD_STATION_LINE_GROUPS` in [`lib/tfl/board-station-lines.ts`](../lib/tfl/board-station-lines.ts), derived from shared-track families (Circle / H&C / Met, Circle / District, District / H&C). Merged sections default to **2×** the single-line page size (3 → 6) so the first page is not three trains to the same destination. Baker Street merges Circle + H&C only — Metropolitan uses different platforms. Paddington Circle (`940GZZLUPAC`) merges Circle + District + Hammersmith & City: repeated live polling shows H&C vehicles — including ones dual-listed with District — landing on the same "Inner Rail" / "Outer Rail" platforms Circle and District already share there, so an unmerged H&C section would just duplicate those platforms under a third heading. `SHARED_TRACK_MERGE_INCLUDE` in `board-station-lines.ts` overrides `getSharedTrackSegments`' static topology for this one stop. The merged header matches Line title’s Shared-track group: `text-foreground` plus equal-width colour stripes. Mixed-line sections show a line chip **before** the destination. A train TfL lists on two or three of those lines uses `LineBadgeGroup variant="codes"` (stripe stack, one 3-letter abbr at a time). When the platform chip is hoisted, the row grid drops the empty leading column so destinations sit flush with the bound heading.
8. **"Inner Rail" / "Outer Rail" platform qualifier.** Paddington Circle/District/H&C's local platforms carry a direction-like qualifier ahead of the number (`"Inner Rail - Platform 1"`), distinct from the compass `Eastbound`/`Westbound` bound and from the bare platform number. Confirmed Paddington-only (plus Bayswater and Notting Hill Gate, the same Circle/H&C stretch) by a network-wide `platformName` survey across every Circle/District/H&C/Metropolitan station (`scripts/probe-platform-names.ts`) — no other subsurface station uses this wording, so it's handled as a stable, named case rather than folded into the generic platform label. `parseArrivalsRailDesignation` / `formatArrivalsRailDesignationLabel` in [`lib/tfl/arrivals-bound-sort.ts`](../lib/tfl/arrivals-bound-sort.ts) parse and format it; the heading composes as `"Inner Rail · Platform 1"`. The bound-heading component (`BoundHeadingLabel` in `arrivals-bound-group.tsx`) steps through a width ladder under space pressure — `"Inner Rail · Platform 1"` → `"Inner Rail · P1"` → a rotation icon (`RotateCcw`/`RotateCw`) + `"P1"` — via the same `@container/arrivals-group` query the platform chip uses, never a JS measurement. The full text stays in `aria-label` at every tier.
9. **Redundant destination text.** A destination that only repeats the line name (Circle loop trains sending `destinationName: "Circle Line"`) or TfL's literal `"Check Front of Train"` placeholder is uninformative on its own — both already say nothing the line heading/chip doesn't. `resolveArrivalsDestinationText` in [`lib/tfl/arrivals-destination-text.ts`](../lib/tfl/arrivals-destination-text.ts) appends `currentLocation` when TfL supplies one (`"Check Front of Train · At Southfields Platform 1"`, matching TfL's own Paddington board), and otherwise leaves the text as-is — it never blanks a row, since even the bare placeholder is real information. Abbreviating the placeholder itself (`"Check Front of Train"` → `"Check Front"`) is deliberately **not** this function's job: it returns the full string and lets `StationName`'s existing shrink ladder abbreviate only when the row doesn't fit, via one shared-table entry in [`lib/tfl/station-abbreviations.ts`](../lib/tfl/station-abbreviations.ts) (documented there as not a station name).

Do **not** infer merges from “these line ids co-occur on the map”. Topology says which naptans share track; Baker Street’s Metropolitan platforms are the counterexample that still needs an exclusion.

## Grouping rule

1. Merge services that share the same physical platforms at this stop (`lineGroups` / curated table).
2. If platform maps cleanly to direction, subgroup = direction + hoisted platform.
3. If there is no compass prefix, subgroup = platform, heading spelled out.
4. If direction is useful but platform varies, group by direction and show compact `P{n}` on the row.
5. If several lines sit in one group, show a line chip on each prediction. A train TfL lists on two member lines at this stop is one row (`vehicleId` dedupe) with a stacked codes chip.
6. If only one line exists, do not repeat a line chip.
7. If every row shares the same platform, hoist it into the heading.
8. If platform is unknown, one stable fallback group — never a blank heading.

## Test stations

| Station | Role |
|---|---|
| Liverpool Street | Shared Circle / H&C / Met platforms; Elizabeth lettered platforms; Weaver numbered + unknown outbound; Weaver self-destination rows dropped via expired `timeToLive`; Weaver `Platform Unknown` shows "Scheduled" |
| Baker Street | Merge Circle + H&C only — Metropolitan stays its own section |
| Paddington (Circle) `940GZZLUPAC` | Merge Circle + District + H&C; "Inner Rail" / "Outer Rail" platform qualifier. Westbound Platform 15 / Eastbound Platform 16 already fit the standard compass+platform heading (`formatBoundHeading`) — no special case needed there. |
| *(open)* | Direction useful, platform varies inside the bound |
| *(open)* | Platform useful, eastbound/westbound is not |
| *(open)* | Lettered-platform Overground besides Elizabeth |

No Board-URL param for `lineGroups` in this pass. Callers pass the prop; the hosted board uses the curated table.

Circle / H&C / Met `lineId` flips on shared track (same train, different colour at Liverpool Street vs Victoria): [circle-hc-metropolitan-shared-track.md](./circle-hc-metropolitan-shared-track.md).
