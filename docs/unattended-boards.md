# Unattended boards

**Status: product design, not an implementation contract.** Board should not be
presented as a finished iPad or signage product until the behaviours below work
across the components it composes.

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
2. **Overflow becomes pages.** Do not vertically scroll, continuously marquee,
   shrink text below the component's readable minimum, or clip information with
   no later opportunity to read it.
3. **Each page has a stable reading interval.** Start with 10 seconds for body
   copy and test on real displays. Short identity-only pages may use less time,
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
8. **Hidden documents do not race through pages.** Pause while the page is not
   visible. On return, show a complete page for a full reading interval.
9. **Announcements identify their position.** Use an unobtrusive page count or
   dots when more than one page exists. Do not render a lone `1/1`.

Several panels may be pageable at once. Avoid changing all of them on the same
frame. A shared Board clock should stagger panel changes while each component
retains its own page count and reading interval.

## Tube and rail arrivals

The existing pager is already the interactive baseline: native swipe for touch,
arrows for hover-capable pointers, and a fixed number of rows per page.

In unattended use it advances when a bound has more arrivals than its configured
row count. The recommended default keeps the first arrival visible on every
page and rotates the remaining slots:

```text
Four visible rows

Page 1  1  2  3  4
Page 2  1  5  6  7
Page 3  1  8  9  10
```

The visible numbers are ranks in the full arrivals list. They do not restart on
each page. Pinning the first arrival is an arrivals presentation rule, not a
second meaning of unattended mode. It may later be configurable, but it should
be the initial unattended default.

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

## Fixed-height status board

The current `TubeStatusBoard` expands to show every disrupted line and every
announcement. That remains useful for documents and interactive pages, but it
is not suitable for unattended Board placement.

The unattended vertical surface has a fixed allocation chosen by its author:

```text
summary        1 or 2 tiles
line identity  1 tile
detail         N tiles
```

The summary allocation never grows because more lines become disrupted. If its
chips do not fit, the summary pages through chip groups inside the same one or
two tiles.

### Summary

The summary answers which lines need attention. Examples:

```text
Disruptions on  Bakerloo  Central  Victoria
Good service on all other lines
```

When the detailed lines are filtered, overview scope stays explicit:

- `network`: summarise every fetched line, but show detail only for the filter;
- `selection`: summarise and detail only the selected lines; or
- `none`: omit the summary and give the space to detail.

Do not say "all other lines" when only the selected subset was fetched. If the
Board has network-wide data but details only selected lines, "Good service on
all other lines" is accurate and useful.

When every line in scope has good service, the summary becomes the main state.
The detail allocation must still keep the panel height stable. It can show the
in-scope line chips or a calm branded message rather than collapsing.

### Detail rotation

Only disrupted lines enter the detail sequence. Each line gets:

- one fixed identity tile; and
- the configured number of fixed detail tiles.

Long reasons paginate at readable boundaries. Prefer complete announcements or
sentences. If one announcement still exceeds the allocation, split it into
text pages with a repeated line identity. Do not continuously scroll the text.
After the final text page, advance to the next disrupted line.

This can take time during a major incident. That is acceptable. Reading every
page matters more than completing a fast loop.

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

## Configuration consequences

The URL should eventually express author choices, not browser capabilities.
Names remain provisional until implementation:

```text
behaviour=interactive|unattended

p1=status
p1.surface=vertical|strip
p1.rows=5
p1.summaryRows=1
p1.lines=central,victoria
p1.overview=network|selection|none
p1.dwell=10
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

- Specify page state, dwell, pause, visibility, refresh, and reduced-motion
  behaviour in a small framework-neutral model.
- Add deterministic fixtures for one page, several pages, data reorder, empty,
  error, and extremely long copy.
- Define fixed-height acceptance tests before adding timers.

### 2. Finish arrivals unattended behaviour

- Add automatic advancement to the existing pager.
- Add the pinned-first sequence and stable rank labels.
- Verify flat bus, grouped bus, and rail bounds.
- Test live refresh without unnecessary resets.

### 3. Build the fixed-height vertical status surface

- Extract a prepared model shared with the existing expanding board.
- Implement summary scope and fixed summary allocation.
- Paginate announcements and rotate disrupted lines.
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
