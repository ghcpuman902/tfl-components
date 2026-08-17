# Cycle hire unattended display

**Status: implemented.** The map, expanding detail list, and compact
fixed-height display share the same dock data.

## Purpose

A person checking one dock needs its name, standard-bike count, e-bike count,
and empty-space count. The occupancy bar helps compare nearby docks, but it
does not replace the exact counts.

Unattended use does not add more information. It only fixes the display height
and advances when the supplied docks exceed that allocation. One dock stays
still and refreshes in place.

The panel height is configurable. The tile height is not. `tiles` sets the
total number of 48px tiles. The first tile carries the cycle roundel and
identity; the rest show dock or slot information.

## Component boundary

Keep the three forms on the existing Cycle hire docks documentation page:

- `CycleHireDocksDetail` remains the expanding list for documents, sheets, and
  inspectors.
- `CycleHireDocksMap` remains the geographic comparison. It has no interactive
  or unattended behaviour prop.
- `CycleHireDocksDisplay` is a compact sibling over the same dock data. It
  composes a reusable one-tile dock row and owns fixed-height paging.

Do not hide the compact anatomy behind a density branch in
`CycleHireDocksDetail`. The current detail row uses three lines and natural
height. The compact row has a locked height, one-line identity, fixed count
positions, and paging rules.

`CycleHireDockTile` owns one row. `CycleHireDocksDisplay` owns the fixed-height
allocation and paging.

## Configuration

`tiles` is a positive integer with a default of `2`. The outer height is
`tiles * 48px` in live, empty, loading, and error states.

```tsx
<CycleHireDocksDisplay data={data} tiles={3} behaviour="unattended" />
```

| Prop           | Type                            | Behaviour                                                                            |
| -------------- | ------------------------------- | ------------------------------------------------------------------------------------ |
| `data`         | `readonly CycleHireDock[]`      | Dock rows in display order. Missing or empty data renders the fixed empty state.     |
| `tiles`        | `number`                        | Total tile allocation, including the heading. Default `2`. Does not resize a row.    |
| `behaviour`    | `"interactive" \| "unattended"` | Manual pages, or automatic pages using the same allocation. Default `"interactive"`. |
| `dwellMs`      | `number`                        | Unattended page interval. Defaults to the shared 10 seconds.                         |
| `startDelayMs` | `number`                        | Delay before unattended paging starts. Default `0`.                                  |
| `idleReturnMs` | `number`                        | Delay before an interactive display returns to page one. Default 30 seconds.         |
| `showBroken`   | `boolean`                       | Include broken slots in the counts and slot blocks. Default `false`.                 |
| `error`        | `string \| null`                | Replace dock content with a fixed-height error state.                                |
| `className`    | `string`                        | Classes for width and placement. Does not override the tile allocation.              |

Do not accept a pixel height or fit rows automatically. A Board author chooses
the tile count. A standalone map still takes its height from `className`; the
Board wrapper can size that map to a whole number of the same 48px rows.

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
- Paint one block per reported slot inside the bottom of the tile. Keep a
  visible gap between blocks. Use the existing standard-bike, e-bike, empty,
  and optional broken-dock colours.
- `Locked` replaces the availability counts because the dock cannot be used.
  `Temporary` stays as a quiet status beside the name while counts remain.
- A dock with no reported capacity keeps the tile and says `No docks reported`.

## Multiple docks

The first tile shows the cycle roundel and `Cycle hire docks`. When there is
more than one page, its right edge holds the page indicator. Interactive
controls occupy the same reserved area, so dock names and counts do not shift
when controls appear. The remaining tiles show one dock each.

## One dock

When `data` contains one dock, use the first tile for the cycle roundel, dock
name, and exact Bike, E-bike, and Space counts. Use every remaining tile for a
single enlarged slot field. Each physical slot remains a separate block with a
visible gap. Do not repeat the dock name in a body row or show paging chrome.

A one-tile allocation can only show the dock heading and counts. Use two or
more tiles when the slot field matters.

## Behaviour

One page contains `tiles - 1` dock rows in the supplied order. Extra docks
create more pages.

```text
1 tile:             heading only
2 tiles, 3 docks:   heading + 1 -> 2 -> 3
3 tiles, 5 docks:   heading + 1 2 -> 3 4 -> 5 —
```

Pages are sequential and do not overlap. A short final page uses quiet empty
rows to keep the panel height. A main dock should be supplied alone or repeated
by the caller when that is genuinely required.

Interactive use matches the arrivals pager. Pages sit in a native horizontal
scroll-snap track below the heading. Hover-capable pointers get controls in the
heading; touch can swipe the dock rows. After inactivity on a later page,
return to the first page. Hide all paging chrome when there is only one page.

Unattended keeps the configured height and advances without input. Pages are
not swipeable. Use dots in the heading because these are equal pages of docks;
rank chips would imply a nearest or best dock order that the component does not
know. Omit the dots when there is only one page.

Focus pauses unattended advancement. Hover does not. A hidden document pauses
the sequence and resumes with a full reading interval.

## Refresh

The component takes dock rows as props and does not fetch them.

- Interactive pages stay live. Update counts, membership, and order on the
  current page. Clamp to the nearest valid page when the page count shrinks.
- Unattended pages update counts and lock or temporary state in place. Keep the
  current docks visible when they still exist. Adopt changed membership or
  order at the next page boundary.
- If the current unattended page no longer exists, move to the nearest valid
  page.
- Empty and error states occupy the full configured tile allocation. Keep the
  heading in the first tile, put the message in the first body tile, and leave
  the remaining tiles quiet.

Paint count updates and page changes instantly. Do not animate occupancy
segments: movement would imply that bikes changed while the page was visible.

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

- one dock with its name and counts in the heading and a full slot field below;
- several docks that fit exactly;
- a short final page with quiet empty rows and no overlap;
- long dock names at narrow and wide widths;
- zero standard bikes, zero e-bikes, and zero spaces;
- locked, temporary, broken, missing-capacity, empty, and error states;
- refreshed counts without a sequence reset;
- changed membership adopted at a page boundary;
- instant page changes, focus pause, document visibility, and wake from sleep;
- a fixed-height map beside arrivals and status panels on the shared tile grid.
