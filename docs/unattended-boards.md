# Unattended boards

**Status: arrivals, Tube/rail status, and hosted Board follow this contract.**
Cycle hire is still a design spike (`docs/cycle-hire-unattended.md`). Do not
present Board as a finished iPad or signage product until home-screen,
standalone, long-running, reconnect, and wake-from-sleep checks are done.

## Decision

`interactive` and `unattended` describe how a display is used. Touch, hover,
mouse, and keyboard are device capabilities and stay automatic.

- **Interactive:** content changes only after a swipe, click, or keyboard action.
  CSS and native browser behaviour choose dots, arrows, focus, and swipe.
- **Unattended:** pageable content advances without input. A panel does not need
  a second `rotate` setting. Rotation is the default consequence of unattended
  use.

A future per-panel override may pause one panel or change its dwell time. It must
not restate the board-wide default.

## Shared unattended contract

Every component admitted to an unattended Board must meet these rules.

1. **Its outer height is fixed by configuration.** Live data must not add rows,
   move neighbouring panels, or change the Board's height.
2. **Overflow becomes a sequence of frames.** Do not vertically scroll,
   continuously marquee, shrink text below the component's readable minimum,
   or clip information with no later opportunity to read it.
3. **Each frame has a stable reading interval.** Start with 10 seconds for body
   copy and test on real displays. Short identity-only frames may use less time,
   but fast cycling is not a goal.
4. **Live refresh does not gratuitously reset the sequence.** Keep the current
   item when it still exists. Move to the nearest valid item when it disappears.
5. **Empty and error states occupy the same allocated height.** A failed fetch
   must not collapse a panel.
6. **Only content changes.** Prefer an instant replacement or restrained
   crossfade. Do not slide the whole layout. Reduced-motion users get the same
   information changes without animated movement.
7. **Interactive attention pauses automatic changes.** Focus, pointer hover, or
   touch pauses the affected panel long enough to use it. An unattended display
   with no input continues normally.
8. **Hidden documents do not race through frames.** Pause while the page is not
   visible. On return, show a complete frame for a full reading interval.
9. **Readers can tell where they are in a sequence.** Use the position marker
   that matches the content. Arrival ranks can replace a page count. Status
   line chips can identify the active line. Use dots or a count only when the
   content still has a meaningful page model. Never render a lone `1/1`.

Several panels may rotate at once. Avoid changing all of them on the same frame.
A shared Board clock should stagger panel changes while each component retains
its own sequence length and reading interval.

## Tube and rail arrivals

The existing pager is already the interactive baseline: native swipe for touch,
arrows for hover-capable pointers, and a fixed number of rows per page.

In unattended use it advances when a bound has more arrivals than its configured
row count. The default keeps the first arrival visible and rotates the remaining
slots:

```text
Four visible rows

Frame 1  1  2  3  4
Frame 2  1  5  6  7
Frame 3  1  8  9  10
```

Every row gets a stable rank chip in the full ordered list. The chips reuse the
quiet neutral treatment used for status severity labels. They do not restart
when the frame changes. There is no page number because a frame is only the set
of rotating slots currently visible, not a page the reader navigates.

Pinning the first arrival is the unattended default. Authors can turn pinning
off when equal rotation matters more than keeping the next service visible.
This is an arrivals presentation choice, not a second meaning of unattended
mode.

When polling changes the order, keep the currently visible arrival where
possible. The newly earliest arrival replaces the pinned row immediately.

## Bus arrivals

Bus arrivals follow the same fixed-row and paging rules. Flat and route-grouped
boards must both preserve their configured height.

Bus disruption information is unresolved. It may become:

- a compact disruption band inside Bus Arrivals, when the message applies to
  the routes already shown; or
- a separate Bus disruption information surface, when the Board needs status
  without arrivals or needs to cover more routes.

Do not make the arrivals rows variable-height to fit disruption prose. Prototype
both compositions against the same prepared disruption model before deciding
the public component boundary.

## Fixed-height status display

The current `TubeStatusBoard` expands to show every disrupted line and every
announcement. That remains useful for documents and interactive pages, but it
is not suitable for unattended Board placement.

The unattended display uses one fixed tile allocation chosen by its author. It
does not reserve separate summary and detail regions. One tile is the compact
minimum. Four or more tiles is the comfortable default because it leaves a
title tile and room for useful detail.

```text
Four allocated tiles

Service disruptions                 Bakerloo  Central
Central
Severe delays between ...
Valid tickets are accepted on ...
```

The first tile is the phase heading. It carries the relevant line chips on the
right when they fit. The remaining tiles show the current line and its detail.
The whole display keeps the same outer height as content changes.

A one-tile display is summary-only. It can name the phase and show a compact
line identity, but it must not squeeze or clip reason copy. Authors who need
reasons must allocate more tiles.

### Rotation sequence

The display has two phases inside the same space.

1. **Service disruptions.** Show a quiet chip for each disrupted line in the
   heading and rotate through those lines below it. Long reasons use further
   frames within the same allocation.
2. **Good service.** After the last disruption frame, change the heading to
   `Good service` and use the body tiles to show the good-service lines. Then
   return to Service disruptions.

If every line has good service, the display stays in the Good service phase. If
no line has good service, it loops through disruptions without inserting an
empty phase. Timetable-closed lines remain disruptions and keep the existing
severity sort.

The header chips take their visual cue from the Bus arrivals disruption chips,
but they are indicators on an unattended display, not buttons. The active line
needs a quiet selected state. If all chips do not fit in the title tile, show
the chip group that contains the active line. Do not wrap the title into a
second tile or change the panel height.

The rotation model works with tile counts rather than fixed subregions:

```text
allocated tiles  1   summary only
allocated tiles  2   heading + one content tile
allocated tiles  4   heading + three content tiles
allocated tiles  N   heading + N - 1 content tiles
```

When the detailed lines are filtered, the display scope stays explicit:

- `network`: summarise every fetched line, but show detail only for the filter;
- `selection`: summarise and detail only the selected lines; or
- `none`: omit phase-wide line chips and give the title row to the current
  line.

Do not say "all other lines" when only the selected subset was fetched. If the
Board has network-wide data but details only selected lines, "Good service on
all other lines" is accurate. Prefer line chips over that sentence when the
available tile count is small.

Long reasons break at readable boundaries. Prefer complete announcements or
sentences. If one announcement exceeds the body allocation, split it into text
frames and repeat the line identity. Do not continuously scroll the text.
After the final text frame, advance to the next disrupted line.

This can take time during a major incident. That is acceptable. Reading every
frame matters more than completing a fast loop.

### Horizontal status strip

A wide, shallow placement has a different anatomy from the vertical board and
should be a sibling surface over the same prepared status model, not a responsive
accident. Keep both surfaces on one documentation page.

The full strip has three regions:

```text
disrupted-line summary | current line + reason | other-lines summary
```

The left and right regions are optional. A compact two-unit placement may show
only line identity and reason. Wider placements may reserve more units for the
reason or show both summaries.

Long reasons page or crossfade. Do not use a continuous marquee as the default:
it forces the reader to chase text and makes reading time unpredictable.

## Component boundary

Use one Board-wide behaviour choice, then let each component implement that
intent at the right boundary.

```text
Hosted Board behaviour
  interactive
    device capabilities choose hover controls, keyboard controls, or swipe
  unattended
    panels keep fixed allocations and advance without input
```

Do not infer the behaviour from a touchscreen, hover query, or pointer type. A
touchscreen can be an unattended sign. Device detection only chooses the input
mechanism after the author has chosen interactive behaviour.

The installable components should use a hybrid API:

- Keep Rail arrivals and Bus arrivals as their existing components. Their row
  anatomy stays the same, so a `behaviour="interactive|unattended"` prop can
  select the paging policy. The hosted Board passes its global choice down.
- Build the fixed-height status display as a sibling surface over the shared
  prepared status model. Its tile allocation and rotation sequence are too
  different from the expanding `TubeStatusBoard` to hide behind a variant
  branch in that component.
- Keep both status surfaces on the existing Tube and rail status documentation
  page. Do not create Interactive and Unattended sidebar groups.
- Leave the Cycle hire boundary open until its unattended anatomy is designed.
  If it changes only which dock rows are visible, it can extend Detail. If it
  introduces a fixed display sequence with different chrome, it should become
  a sibling surface over the same dock data.

The hosted Board can expose one global toggle. Registry components should not
read hidden Board context as their only API. A developer using one component
outside the hosted Board needs an explicit, local prop or an explicit sibling
surface.

### Rough implementation size

These are production-logic estimates, not commitments. They exclude docs,
fixtures, generated registry JSON, and tests. Tests will add roughly the same
order of code again because rotation, refresh, pausing, and fixed-height states
need deterministic coverage.

| Area | Current relevant code | Expected addition | Boundary consequence |
|------|-----------------------|------------------:|----------------------|
| Shared unattended sequence controller | None | 120 to 180 lines | One reusable controller is smaller than timers inside every board. |
| Arrivals pinned frames and rank chips | About 450 lines of current paging and page paint | 150 to 240 lines, plus the shared controller | Extending the existing arrivals components avoids duplicating row rendering. |
| Fixed-height status display | 518-line expanding renderer and 110-line prepared model | 300 to 450 lines, plus the shared controller | A sibling keeps the existing renderer readable and shares the prepared model. |
| Status as a branch inside `TubeStatusBoard` | Same 628-line base | Similar 280 to 420 lines | It saves a public export, not much logic. The main file would approach 800 to 950 lines with two incompatible anatomies. |
| Cycle hire unattended display | 248-line Detail and 47-line compound root | 120 to 220 lines if row paint is reused | Estimate is provisional until the sequence and one-tile state are designed. |
| Hosted Board mode plumbing | About 1,170 lines across display, settings, resolver, and URL state | 80 to 140 lines | Keep it as orchestration that passes intent down, not a second rendering system. |

The size estimate favours the hybrid. One prop everywhere would make the status
renderer harder to reason about without removing much code. Separate components
for every mode would duplicate arrivals rows and split one product concept into
two catalogue entries.

## Configuration consequences

The URL should eventually express author choices, not browser capabilities.
Names remain provisional until implementation:

```text
behaviour=interactive|unattended

p1=status
p1.surface=display|strip
p1.tiles=4
p1.lines=central,victoria
p1.overview=network|selection|none
p1.dwell=10

p2=arrivals
p2.rows=3
p2.pinFirst=true
```

`p1.dwell` is an override. With no override, unattended panels use the shared
default. There is no `p1.page=rotate` parameter.

Presets are configuration-side recipes. They help someone produce an ordinary
URL, but the URL is not constrained to a preset and does not need to name one.
The first recipes remain:

- station and network status;
- home weekday, biased toward selected lines, bounds, routes, and docks; and
- home weekend, with broader directions, routes, and network status.

The public UI should stay small: examples, a URL preview, and documentation with
diagrams. A general drag-and-drop Board builder is not required.

## Layout and fitting

Do not implement automatic height fitting yet.

- Width remains CSS-responsive.
- Authors choose component tile counts and density.
- Unattended panels keep those heights through live, empty, and error states.
- A clock or branded filler region may consume remaining space with CSS
  flexible layout. The author should not enter a measured pixel remainder.
- Examples should include common device aspect ratios and state their tile
  budgets.

If configured content exceeds a display, fix the configuration. Do not introduce
JavaScript measurement and whole-Board scaling as a hidden second layout engine.

## Future geographic capabilities

These belong to the existing geographic map product rather than separate
transport-mode component trees:

- bus route geometry;
- live bus vehicle positions, subject to source quality and availability; and
- live train positions, subject to source quality and availability.

Treat route geometry and vehicle positions as optional map layers over a common
geographic representation. Investigate data coverage before promising real-time
tracking semantics.

## Delivery order

### 1. Prove the shared contract

- Specify frame state, dwell, pause, visibility, refresh, and reduced-motion
  behaviour in a small framework-neutral model.
- Add deterministic fixtures for one frame, several frames, data reorder, empty,
  error, and extremely long copy.
- Define fixed-height acceptance tests before adding timers.

### 2. Finish arrivals unattended behaviour

- Add automatic advancement to the existing pager.
- Add the pinned-first sequence, author override, and stable rank chips.
- Remove page counts in unattended mode. The ranks carry sequence position.
- Verify flat bus, grouped bus, and rail bounds.
- Test live refresh without unnecessary resets.

### 3. Build the fixed-height status display

- Extract a prepared model shared with the existing expanding board.
- Implement one fixed tile allocation with a phase heading in its first tile.
- Rotate disruption lines and long reasons, then show the Good service phase.
- Keep header chip groups inside the title tile when many lines are affected.
- Cover all-good, one disruption, many disruptions, and filtered-detail cases.

### 4. Build the horizontal status strip

- Reuse the prepared status model and unattended controller.
- Support full and compact region allocations.
- Test two-unit and four-or-more-unit placements.

### 5. Decide bus disruption composition

- Prototype an arrivals-integrated band and a separate surface.
- Test a single-route commute board and a multi-route stop.
- Promote one or both only after the information hierarchy is clear.

### 6. Return to hosted Board

- Replace the reserved mouse/touch URL model with use intent.
- Compose only panels that satisfy the unattended contract.
- Publish example URLs and device tile budgets.
- Complete home-screen, standalone, long-running, reconnect, and wake-from-sleep
  testing before making the "quickest way to set up an iPad" claim.

### 7. Extend the geographic map

- Add bus route geometry as a provider-independent layer.
- Investigate live bus and train position sources.
- Add vehicle layers only when freshness, identity, interpolation, and stale-data
  behaviour have explicit contracts.
