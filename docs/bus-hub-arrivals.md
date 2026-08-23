# Bus hub arrivals (open design)

Status: **not implemented.** Product brief only. Do not start this unless explicitly asked.

Rail already has a hub story (`STATION_HUBS`, sibling StopPoints, platform headings). Bus has a parallel NaPTAN tree that this site currently treats as a search expansion problem, not a board. The open question is how a person at a large stop-area should see arrivals.

Related: [station hubs](../.cursor/rules/station-hubs.mdc) (rail only), [shared-platform grouping](./arrivals-shared-platforms.md), bus search expansion in [`lib/tfl/bus-stop-shape.ts`](../lib/tfl/bus-stop-shape.ts).

## What a bus hub is

A `490G…` id is a **stop-area** (NaPTAN StopArea), not a boarding point. Children are the painted stands: `490` + digit… ids such as `490012162E`. Arrivals exist only on those children. Polling the area is the same class of trap as polling `HUBLST`.

The `G` that matters is immediately after `490`. A trailing letter on a child (`490000091G`, Stop G) is the painted stop letter, not a hub.

There is **no** static bus catalogue like `STATION_HUBS`. Today, name search uses `tfl-ts` `stopPoint.searchBusStops`, which expands named `490G…` hubs into boarding stands. That is discovery, not a hub board.

## What a user is likely doing

Someone who lives by **Hammersmith** is not standing at one flag. They are next to a bus station: many letters, many towards, overlapping routes. The useful question is often “what is leaving this place soon?”, not “what is leaving Stop K?”.

That is the same *job* as a rail station board that shows several platforms on one page. The difference is scale. A tube station has a handful of platforms. Hammersmith Bus Station can have twenty-plus stands. A naive “list every child” page will be much longer than a rail arrivals board.

So the product is not “always flatten the hub” and not “always one letter”. It is: **one place, several stands, still readable.**

## Current behaviour (do not change in this brief)

| Surface | Today |
|---|---|
| `BusArrivalsBoard` | One boardable stop. Stop letter sits on the **board header** (red circle). Rows are route + destination + time. Optional `groupBy="route"`. |
| Board URL / landing presets | One child id (e.g. Clapham Common eastbound `490012162E`, not `490G00012162`). |
| Explorer bus | Pick **one** nearby / search hit. Inspector is that stop. |
| Search | Expand `490G…` areas into nearby boardable stops, then still select one. |

Rail’s analogue already exists: bound heading + hoisted platform (`Platform 1` / compact `P1` via `BoundHeadingLabel`). Bus letters should reuse that heading pattern when a board is showing **more than one** stand — letter next to the **sub-stop heading**, not only on the page title. A single-stop board can keep the letter on the header as it does now.

## Design direction (when this is picked up)

Treat a bus hub like a station with many platforms:

1. **Place heading** — the shared name (“Hammersmith”), not a letter.
2. **Stand sections** — one subgroup per boardable child. Heading carries the stop letter in the same slot rail uses for a hoisted platform (badge + “Stop K” / compact letter). Rows under it are that stand’s arrivals.
3. **Towards stays on the stand** — Stop K and Stop A are often opposite directions. Do not merge letters that share a route number.
4. **Scale is the hard part** — default cannot be “paint every child in full”. Need paging, a stand picker, a “soonest across the hub” summary, or a capped nearby subset. Unattended height rules still apply ([unattended-boards.md](./unattended-boards.md)): adding stands must not grow the panel.

Do **not** fold bus areas into `STATION_HUBS`. Rail hubs are interchange siblings for *lines*. Bus hubs are stop-area parents for *stands*. Hammersmith already has two rail buildings (`940GZZLUHSC` vs `940GZZLUHSD`); the bus station is a third cluster. Mixing those trees will leak the Circle/H&C merge onto the wrong building again.

Do **not** poll `490G…`. Resolve children, then poll those ids (same rule as `resolveArrivalsStopIds` refusing the interchange id).

## Open decisions

Leave these unresolved until a real Hammersmith-sized prototype:

1. **Default selection.** Search / Explorer / Board: land on one nearest letter, or on the area as a composite page?
2. **Membership.** TfL StopPoint children of the `490G…` area, vs today’s geo expansion (which also pulls nearby street flags that are not “the bus station”).
3. **Which stands.** Whole area, walking-radius subset, or user-pinned letters (the Hammersmith-resident case).
4. **Second grouping axis.** Per stand then route, or soonest-first across stands with a letter chip on the row (inverse of today’s header letter).
5. **Board URL.** One area id that expands, vs an explicit list of child ids.
6. **Density.** Interactive long page vs unattended frames that rotate stands. Twenty platform-style headings will not fit a 3-row tile board.

## Suggested probe (when implementing)

Use Hammersmith Bus Station as the stress case, plus a small two-letter street pair (e.g. opposite flags on one road) as the easy case. Confirm child ids, letters, towards, and whether one `490G…` covers the station or several areas sit side by side. Do not infer membership from the shared display name.

## Out of scope until then

- Changing `BusArrivalsBoard` to accept multiple stops
- A static bus-hub catalogue in tfl-ts
- Teaching this in Interface MDX (no shipped behaviour yet)
- Treating river-bus `930G…` ports as the same pattern (those *are* the arrivals id; berths are the children you must not poll)
