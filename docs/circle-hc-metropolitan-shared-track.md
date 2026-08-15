# Shared-track line identity (Circle / H&C / Metropolitan)

TfL's Arrivals API assigns `lineId` **per station**, not per physical train. On the Baker Street ↔ Aldgate stretch the same `vehicleId` is `circle` at Victoria and `hammersmith-city` at Liverpool Street in one poll. `tripId` is null for tube.

The engine lives in tfl-ts (`getSharedTrackSegments`, `resolveSharedTrackIdentity`, `withSharedTrackIdentity`). This site's Board opts in at every Circle / H&C / Met shared-track station through `SHARED_TRACK_LINE_SETS` in [`lib/tfl/board-station-lines.ts`](../lib/tfl/board-station-lines.ts).

## Must-fix (no config)

These are wrong regardless of grouping preference.

1. **Do not mutate TfL's raw fields.** `arrival.lineId` / `lineName` stay as sent. Reconciliation is an additive `sharedTrackIdentity` (`canonicalLineId` and/or `rawLineIds`, `confidence`, `rawLineId`).
2. **Do not invent a line when exclusive-segment evidence is missing.** A vehicle that only appears on shared track (often terminating near Aldgate, dual-listed H&C + Metropolitan, `Check Front of Train`) stays uncanonical. When TfL lists it on two or more of the set, tag `ambiguous` + `rawLineIds` so the row can paint a stacked codes chip.
3. **Do not tag a row whose `lineId` is outside the set.** TfL reuses `vehicleId` across lines — a Central train can share an id with a Circle train. `withSharedTrackIdentity` skips those rows. The board also collapses the same `vehicleId` listed on two member lines into one row.

## Default, but overridable

4. **Canonical paint when exclusive-segment evidence exists.** One extra cached call — `GET /Line/circle,hammersmith-city,metropolitan/Arrivals` — plus static `LINE_STATION_SEQUENCES`. If the vehicle also appears at a Circle-only station (Victoria, Westminster, Cannon Street, …), every stop row for that vehicle paints Circle. Same for H&C-only (Aldgate East, Whitechapel) and Metropolitan-only (Amersham, …).
5. **Transparency when canonical ≠ raw.** No extra chip. `title` and `aria-label` name TfL's raw label. Example: “TfL currently labels this arrival Hammersmith & City on this platform; it's running the Circle line loop.”
6. **Every shared-track station.** Identity uses the three-line set at every Circle / H&C / Met shared naptan. `lineGroups` merges the lines that actually share platforms there. Baker Street merges Circle + H&C only — Metropolitan uses different platforms. Paddington Circle/District (`940GZZLUPAC`) does not inherit the H&C-branch merge.

## Grouping vs identity

`lineGroups` merges the lines that share platforms at that stop (three at Liverpool Street / King's Cross / Farringdon; Circle + H&C at Baker Street and on the Hammersmith branch; Circle + Met at Aldgate). Identity reconciliation only changes which **line chip / colour** a row uses inside that section (and which section it would join if `lineGroups` were off). Exclusive-segment rows keep a single `LineBadge`. Ambiguous 2–3 line vehicles use `LineBadgeGroup variant="codes"` (stacked 3-letter abbrs).

## Test vehicles

| Vehicle pattern | Exclusive evidence | Outcome |
|---|---|---|
| Circle loop train labelled H&C at Liverpool Street | Appears at Cannon Street / Victoria as `circle` | Canonical `circle` |
| `"Check Front of Train"` on Westminster + Liverpool Street | Westminster is Circle-only | Canonical `circle` |
| Dual H&C + Met near Aldgate, never leaves shared track | None | Tagged `ambiguous` + `rawLineIds` — stacked codes chip, no canonical line |

Via text for Circle (`Edgware Road via Victoria`) is **out of scope**. TfL does not send it on predictions; do not fabricate it.

See also [arrivals-shared-platforms.md](./arrivals-shared-platforms.md).
