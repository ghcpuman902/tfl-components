# Cycle hire unattended display

**Status: design decided, implementation pending.** Keep the current map and
expanding detail list. Add a compact dock display for fixed-height Board
placements and other small layouts.

## Purpose

A person checking one dock needs its name, standard-bike count, e-bike count,
and empty-space count. The occupancy bar helps compare nearby docks, but it
does not replace the exact counts.

Unattended use does not add more information. It only fixes the display height
and advances when the supplied docks exceed that allocation. One dock stays
still and refreshes in place.

## Component boundary

Keep the three forms on the existing Cycle hire docks documentation page:

- `CycleHireDocksDetail` remains the expanding list for documents, sheets, and
  inspectors.
- `CycleHireDocksMap` remains the geographic comparison. It has no interactive
  or unattended behaviour prop.
- Add a compact sibling display over the same dock data. It composes a reusable
  one-tile dock row and owns fixed-height paging.

Do not hide the compact anatomy behind a density branch in
`CycleHireDocksDetail`. The current detail row uses three lines and natural
height. The compact row has a locked height, one-line identity, fixed count
positions, and paging rules.

Names remain provisional until implementation. `CycleHireDockTile` and
`CycleHireDocksDisplay` describe the intended split.

## One dock tile

One dock occupies one arrivals tile, `3rem` or 48px. It follows the same box
rules as arrivals and the fixed-height status display.

```text
Dock Street, Wapping       23 bikes   2 e-bikes   4 spaces
██████████████████████████████████████████░░░░░░░░░░
```

- Keep the tile at exactly one row. Text, hairlines, and the occupancy bar do
  not add height.
- Give the dock name the remaining width. Fit it on one line using the shared
  station-name fitting rules. Keep the canonical name available to find, copy,
  and assistive technology.
- Keep standard bikes, e-bikes, and spaces in stable positions. Use shorter
  visible labels at narrow widths, but keep the full accessible labels.
- Paint the segmented occupancy bar inside the bottom of the tile. Use the
  existing standard-bike, e-bike, empty, and optional broken-dock colours.
- `Locked` replaces the availability counts because the dock cannot be used.
  `Temporary` stays as a quiet status beside the name while counts remain.
- A dock with no reported capacity keeps the tile and says `No docks reported`.

The compact display has no heading tile by default. A one-dock Board placement
therefore costs one tile, not a title tile plus a content tile.

## Frames

The author chooses a positive tile count. One frame contains that many dock
tiles in the supplied order.

```text
1 tile, 1 dock:    1
1 tile, 3 docks:   1 -> 2 -> 3
3 tiles, 5 docks:  1 2 3 -> 3 4 5
```

Backfill only the short final frame so the panel keeps its allocation. Do not
pin the first dock. A main dock should be supplied alone or shown in every
frame by the caller when that is genuinely required.

Interactive use pages the same frames with native swipe, keyboard, and compact
controls. Unattended use advances them after the shared dwell interval. Show a
compact page count because these frames are equal pages of docks. Omit controls,
the count, and the dwell indicator when there is only one frame.

Focus pauses unattended advancement. Hover does not. A hidden document pauses
the sequence and resumes with a full reading interval.

## Refresh

The component takes dock rows as props and does not fetch them.

- Update counts and lock or temporary state in place when fresh rows arrive.
- Keep the current docks visible when they still exist.
- Adopt a changed membership or order at the next frame boundary.
- If the current frame no longer exists, move to the nearest valid frame.
- Empty and error states occupy the full configured tile allocation. Put the
  message in the first tile and leave the remaining tiles quiet.

Do not animate individual occupancy segments between counts. An instant paint
avoids a false impression that bikes moved during the transition. Frame changes
may use the same restrained crossfade as the status display. Reduced-motion
users get an instant replacement.

## Map

The current map already suits unattended use. Give it a fixed height in whole
Board tiles and refresh its markers in place. It does not join the dock paging
sequence.

Keep the marker as a ratio glance. Three exact values around every marker would
make nearby docks harder to compare. Compose the compact dock display beside or
below the map when exact counts matter. Do not add a selected metric or
map-detail linkage until a real use case establishes which count should win.

For one known dock, prefer the one-tile display. The map earns its space when
location helps someone compare two or more docks.

## Acceptance cases

Cover these before admitting cycle hire to the hosted Board:

- one dock in one tile, with no paging chrome;
- several docks that fit exactly;
- a short final frame that backfills without reordering;
- long dock names at narrow and wide widths;
- zero standard bikes, zero e-bikes, and zero spaces;
- locked, temporary, broken, missing-capacity, empty, and error states;
- refreshed counts without a sequence reset;
- changed membership adopted at a frame boundary;
- reduced motion, focus pause, document visibility, and wake from sleep; and
- a fixed-height map beside arrivals and status panels on the shared tile grid.
