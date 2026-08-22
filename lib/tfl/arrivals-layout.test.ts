import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import type { RealtimePrediction } from "tfl-ts"
import { BusArrivalsBoard } from "@/components/tfl/arrivals/bus-arrivals-board"
import { RailArrivalsBoard } from "@/components/tfl/arrivals/rail-arrivals-board"
import { RiverBusArrivalsBoard } from "@/components/tfl/arrivals/river-bus-arrivals-board"
import { resolveArrivalsHeading } from "@/components/tfl/arrivals/arrivals-board-view"
import { londonDayStartMs } from "@/lib/tfl/london-dates"

/**
 * Structural tests for the arrivals layout API: stable `data-slot` hooks,
 * className/classNames merging, and the default vertical structure. These
 * assert behaviour consumers rely on — not a full markup snapshot.
 */

const prediction = (fields: {
  id: string
  lineId: string
  lineName?: string
  modeName?: string
  platformName?: string
  towards?: string
  timeToStation: number
  expectedArrival?: string
}): RealtimePrediction =>
  ({
    lineName: fields.lineName ?? fields.lineId,
    towards: fields.towards ?? "Somewhere",
    ...fields,
  }) as RealtimePrediction

const railData: RealtimePrediction[] = [
  prediction({
    id: "c-w-1",
    lineId: "central",
    lineName: "Central",
    modeName: "tube",
    platformName: "Westbound - Platform 1",
    towards: "Ealing Broadway",
    timeToStation: 45,
  }),
  prediction({
    id: "c-e-1",
    lineId: "central",
    lineName: "Central",
    modeName: "tube",
    platformName: "Eastbound - Platform 3",
    towards: "Hainault via Newbury Park",
    timeToStation: 100,
  }),
]

// Bakerloo has no predictions and no seeded bounds: it renders the single
// empty-line row. Central contributes Westbound + Eastbound subgroups.
const railLines = [
  { lineId: "central", lineName: "Central", modeName: "tube" },
  { lineId: "bakerloo", lineName: "Bakerloo", modeName: "tube" },
]

const busData: RealtimePrediction[] = [
  prediction({
    id: "9-1",
    lineId: "9",
    towards: "Hammersmith Bus Station",
    timeToStation: 50,
    modeName: "bus",
    platformName: "G",
  }),
  prediction({
    id: "18-1",
    lineId: "18",
    towards: "Euston Station",
    timeToStation: 110,
    modeName: "bus",
    platformName: "G",
  }),
  prediction({
    id: "9-2",
    lineId: "9",
    towards: "Hammersmith Bus Station",
    timeToStation: 290,
    modeName: "bus",
    platformName: "G",
  }),
]

/** Count exact `data-slot="…"` occurrences (closing quote keeps prefixes distinct). */
const slotCount = (html: string, slot: string): number =>
  html.split(`data-slot="${slot}"`).length - 1

/** Opening tag of the nth element carrying a slot, for class assertions. */
const slotTag = (html: string, slot: string, occurrence = 0): string => {
  const matches =
    html.match(new RegExp(`<\\w+[^>]*data-slot="${slot}"[^>]*>`, "g")) ?? []
  return matches[occurrence] ?? ""
}

describe("arrivals board layout API", () => {
  it("renders the default rail structure with stable slots", () => {
    const html = renderToStaticMarkup(
      createElement(RailArrivalsBoard, {
        data: railData,
        lines: railLines,
        stopName: "Oxford Circus",
      })
    )

    assert.equal(slotCount(html, "arrivals-board"), 1)
    assert.equal(slotCount(html, "arrivals-groups"), 1)
    // Central (live) + Bakerloo (seeded empty) line sections.
    assert.equal(slotCount(html, "arrivals-group"), 2)
    // One bounds list per line section (the empty line's single row included).
    assert.equal(slotCount(html, "arrivals-subgroups"), 2)
    // Central has West/East bound subgroups; Bakerloo has none.
    assert.equal(slotCount(html, "arrivals-subgroup"), 2)
    assert.ok(html.includes('data-bound="westbound"'))
    assert.ok(html.includes('data-bound="eastbound"'))
    // One rows list per labeled bound; the empty line renders its row directly.
    assert.equal(slotCount(html, "arrivals-rows"), 2)
    // Default pageSize 3: two 1-train bounds fill to 3 tiles each
    // (arrival + dash + end message); Bakerloo empty fills to 3
    // (No information + two dashes).
    assert.equal(slotCount(html, "arrivals-row"), 9)
    assert.ok(html.includes("No information"))
    assert.ok(html.includes("No more arrivals"))
  })

  it("uses ended copy on a finished line after last Friday service", () => {
    const now = londonDayStartMs("2026-08-22") + 1 * 3_600_000 + 25 * 60_000
    const html = renderToStaticMarkup(
      createElement(RailArrivalsBoard, {
        data: railData,
        lines: railLines,
        stopName: "Oxford Circus",
        now,
      })
    )
    assert.ok(html.includes("Service has ended for tonight."))
    assert.ok(html.includes("Ealing Broadway"))
    assert.equal(html.includes("No information"), false)
  })

  it("does not paint No information under a fetch error", () => {
    const html = renderToStaticMarkup(
      createElement(RailArrivalsBoard, {
        data: [],
        lines: railLines,
        stopName: "Oxford Circus",
        error: "Couldn't load arrivals.",
      })
    )
    assert.ok(html.includes("Couldn") && html.includes("load arrivals."))
    assert.equal(html.includes("No information"), false)
    assert.equal(slotCount(html, "arrivals-group"), 0)
    assert.equal(slotCount(html, "arrivals-board"), 1)
  })

  it("keeps a live line visible when its partner has finished overnight", () => {
    const now = londonDayStartMs("2026-08-22") + 1 * 3_600_000 + 25 * 60_000
    const html = renderToStaticMarkup(
      createElement(RailArrivalsBoard, {
        data: [
          prediction({
            id: "cir-e",
            lineId: "circle",
            lineName: "Circle",
            modeName: "tube",
            platformName: "Eastbound - Platform 1",
            towards: "Edgware Road (Circle)",
            timeToStation: 180,
          }),
        ],
        lines: [
          { lineId: "circle", lineName: "Circle", modeName: "tube" },
          { lineId: "district", lineName: "District", modeName: "tube" },
        ],
        stopName: "Tower Hill",
        now,
      })
    )
    assert.ok(html.includes("Edgware Road"))
    assert.ok(html.includes("Service has ended for tonight."))
    assert.equal(html.includes("No arrivals right now."), false)
  })

  it("uses a fixed 5ch box for mixed-line identity chips", () => {
    const html = renderToStaticMarkup(
      createElement(RailArrivalsBoard, {
        data: [
          prediction({
            id: "cir-e",
            lineId: "circle",
            lineName: "Circle",
            modeName: "tube",
            platformName: "Eastbound - Platform 1",
            towards: "Edgware Road (Circle)",
            timeToStation: 120,
          }),
          {
            ...prediction({
              id: "hc-met",
              lineId: "hammersmith-city",
              lineName: "Hammersmith & City",
              modeName: "tube",
              platformName: "Westbound - Platform 2",
              towards: "Check Front of Train",
              timeToStation: 80,
            }),
            sharedTrackIdentity: {
              confidence: "ambiguous",
              rawLineId: "hammersmith-city",
              rawLineIds: ["hammersmith-city", "metropolitan"],
            },
          } as RealtimePrediction,
        ],
        lineGroups: [{ lines: ["circle", "hammersmith-city", "metropolitan"] }],
        stopName: "Liverpool Street",
      })
    )
    assert.ok(html.includes("w-[5ch]"), html)
    assert.ok(html.includes("tfl-line-codes"), html)
    assert.ok(html.includes("CIR"), html)
  })

  it("keeps the default vertical arrangement classes", () => {
    const html = renderToStaticMarkup(
      createElement(RailArrivalsBoard, {
        data: railData,
        stopName: "Oxford Circus",
      })
    )
    const groups = slotTag(html, "arrivals-groups")
    assert.ok(groups.includes("grid-cols-1"), groups)
    const group = slotTag(html, "arrivals-group")
    assert.ok(group.includes("@container/arrivals-group"), group)
    const subgroups = slotTag(html, "arrivals-subgroups")
    assert.ok(subgroups.includes("grid-cols-1"), subgroups)
  })

  it("merges className onto the board root and classNames onto their levels", () => {
    const html = renderToStaticMarkup(
      createElement(RailArrivalsBoard, {
        data: railData,
        stopName: "Oxford Circus",
        className: "max-w-2xl",
        classNames: {
          groups: "groups-custom",
          group: "group-custom",
          subgroups: "subgroups-custom",
          subgroup: "subgroup-custom",
          rows: "rows-custom",
        },
      })
    )

    const board = slotTag(html, "arrivals-board")
    assert.ok(board.includes("@container/arrivals"), board)
    assert.ok(board.includes("max-w-2xl"), board)

    assert.ok(slotTag(html, "arrivals-groups").includes("groups-custom"))
    assert.ok(slotTag(html, "arrivals-group").includes("group-custom"))
    assert.ok(slotTag(html, "arrivals-subgroups").includes("subgroups-custom"))
    assert.ok(slotTag(html, "arrivals-subgroup").includes("subgroup-custom"))
    assert.ok(slotTag(html, "arrivals-rows").includes("rows-custom"))
    // Defaults survive the merge.
    assert.ok(slotTag(html, "arrivals-groups").includes("grid-cols-1"))
  })

  it("keeps flat bus as one time-ordered list with no group levels", () => {
    const html = renderToStaticMarkup(
      createElement(BusArrivalsBoard, {
        data: busData,
        stopName: "Trafalgar Square",
        stopLetter: "G",
      })
    )

    assert.equal(slotCount(html, "arrivals-board"), 1)
    assert.equal(slotCount(html, "arrivals-groups"), 0)
    assert.equal(slotCount(html, "arrivals-group"), 0)
    assert.equal(slotCount(html, "arrivals-subgroups"), 0)
    assert.equal(slotCount(html, "arrivals-rows"), 1)
    assert.equal(slotCount(html, "arrivals-row"), 3)
    assert.equal(html.includes("No more arrivals"), false)
    // Flat order is global time order, routes interleaved.
    const order = [...html.matchAll(/aria-label="Route (\d+),/g)].map(
      (match) => match[1]
    )
    assert.deepEqual(order, ["9", "18", "9"])
  })

  it("keeps the flat bus pager visible on a dedicated tile", () => {
    const html = renderToStaticMarkup(
      createElement(BusArrivalsBoard, {
        data: busData,
        stopName: "Trafalgar Square",
        stopLetter: "G",
        pageSize: 2,
      })
    )

    assert.ok(html.includes("1/2") || html.includes("Page 1 of 2"), html)
    const pager =
      html.match(/<div class="[^"]*hidden items-center p-0[^"]*"/)?.[0] ?? ""
    assert.ok(pager.includes("[@media(hover:hover)]:flex"), pager)
    assert.equal(pager.includes("opacity-0"), false, pager)
  })

  it("groups bus by route with group slots and no subgroups", () => {
    const html = renderToStaticMarkup(
      createElement(BusArrivalsBoard, {
        data: busData,
        stopName: "Trafalgar Square",
        stopLetter: "G",
        groupBy: "route",
        classNames: { groups: "groups-custom", rows: "rows-custom" },
      })
    )

    assert.equal(slotCount(html, "arrivals-groups"), 1)
    assert.equal(slotCount(html, "arrivals-group"), 2)
    assert.equal(slotCount(html, "arrivals-subgroups"), 0)
    assert.ok(html.includes('data-route="9"'))
    assert.ok(html.includes('data-route="18"'))
    assert.ok(slotTag(html, "arrivals-groups").includes("groups-custom"))
    // Rows class lands on each route's list.
    const rowsTags =
      html.match(/<ul[^>]*data-slot="arrivals-rows"[^>]*>/g) ?? []
    assert.equal(rowsTags.length, 2)
    assert.ok(rowsTags.every((tag) => tag.includes("rows-custom")))
    // Route identity lives on the group header, not on each row.
    assert.equal(html.includes('aria-label="Route 9,'), false)
    assert.equal(html.includes('aria-label="Route 18,'), false)
  })

  it("groups river by route without repeating the route chip on rows", () => {
    const html = renderToStaticMarkup(
      createElement(RiverBusArrivalsBoard, {
        data: [
          prediction({
            id: "rb1-1",
            lineId: "rb1",
            lineName: "RB1",
            towards: "Barking Riverside Pier",
            timeToStation: 1020,
            modeName: "river-bus",
          }),
          prediction({
            id: "rb4-1",
            lineId: "rb4",
            lineName: "RB4",
            towards: "Rotherhithe Pier",
            timeToStation: 180,
            modeName: "river-bus",
          }),
        ],
        stopName: "Canary Wharf Pier",
        groupBy: "route",
      })
    )

    assert.equal(slotCount(html, "arrivals-group"), 2)
    assert.ok(html.includes('data-route="rb1"'))
    assert.ok(html.includes('data-route="rb4"'))
    assert.ok(html.includes(">RB1<"))
    assert.ok(html.includes(">RB4<"))
    assert.equal(html.includes('aria-label="RB1"'), false)
    assert.equal(html.includes('aria-label="RB4"'), false)
  })

  it("uses data.stationName when stopName is omitted", () => {
    const html = renderToStaticMarkup(
      createElement(RailArrivalsBoard, {
        data: railData.map((row) => ({
          ...row,
          stationName: "Oxford Circus",
        })),
      })
    )
    assert.ok(html.includes("Oxford Circus"))
  })

  it("prefers an explicit stopName over data.stationName", () => {
    const html = renderToStaticMarkup(
      createElement(RailArrivalsBoard, {
        data: railData.map((row) => ({
          ...row,
          stationName: "Oxford Circus",
        })),
        stopName: "Custom heading",
      })
    )
    assert.ok(html.includes("Custom heading"))
    assert.equal(html.includes("Oxford Circus"), false)
  })

  it("paints river disruption chips from prepared stop-point warnings", () => {
    const html = renderToStaticMarkup(
      createElement(RiverBusArrivalsBoard, {
        data: [
          prediction({
            id: "rb1-1",
            lineId: "rb1",
            lineName: "RB1",
            towards: "Westminster Pier",
            timeToStation: 80,
            modeName: "river-bus",
          }),
          prediction({
            id: "rb6-1",
            lineId: "rb6",
            lineName: "RB6",
            towards: "Putney Pier",
            timeToStation: 140,
            modeName: "river-bus",
          }),
        ],
        disruptions: [
          { lineId: "rb1", description: "Pier Closed until 17:00" },
        ],
        stopName: "Canary Wharf Pier",
      })
    )
    assert.ok(html.includes("RB1 disruption: Pier Closed until 17:00"))
    assert.equal(html.includes("Route rb1 disruption"), false)
    assert.ok(html.includes("w-auto"))
  })

  it("marks unattended river rows with rank chips", () => {
    const html = renderToStaticMarkup(
      createElement(RiverBusArrivalsBoard, {
        data: [
          prediction({
            id: "rb1-1",
            lineId: "rb1",
            lineName: "RB1",
            towards: "Westminster Pier",
            timeToStation: 80,
            modeName: "river-bus",
          }),
          prediction({
            id: "rb6-1",
            lineId: "rb6",
            lineName: "RB6",
            towards: "Putney Pier",
            timeToStation: 140,
            modeName: "river-bus",
          }),
          prediction({
            id: "rb1-2",
            lineId: "rb1",
            lineName: "RB1",
            towards: "Barking Riverside Pier",
            timeToStation: 260,
            modeName: "river-bus",
          }),
          prediction({
            id: "rb6-2",
            lineId: "rb6",
            lineName: "RB6",
            towards: "North Greenwich Pier",
            timeToStation: 380,
            modeName: "river-bus",
          }),
        ],
        stopName: "Canary Wharf Pier",
        behaviour: "unattended",
        pageSize: 3,
      })
    )
    assert.ok(html.includes("1st arrival"))
    assert.ok(html.includes("2nd arrival"))
    assert.ok(html.includes(">1<"))
    assert.ok(html.includes(">st<"))
    assert.ok(html.includes("w-[3ch]"))
  })

  it("keeps only river-bus line ids from a mixed payload", () => {
    const html = renderToStaticMarkup(
      createElement(RiverBusArrivalsBoard, {
        data: [
          prediction({
            id: "22-1",
            lineId: "22",
            lineName: "22",
            towards: "Putney Bridge",
            timeToStation: 80,
            modeName: "bus",
          }),
          prediction({
            id: "rb6-1",
            lineId: "rb6",
            lineName: "RB6",
            towards: "Putney Pier",
            timeToStation: 140,
            modeName: "river-bus",
          }),
        ],
        stopName: "Putney Pier",
      })
    )
    assert.ok(html.includes("Putney Pier"))
    assert.ok(html.includes(">RB6<"))
    assert.equal(html.includes("Putney Bridge"), false)
    assert.equal(html.includes(">22<"), false)
  })

  it("uses the river empty copy when predictions are missing", () => {
    const html = renderToStaticMarkup(
      createElement(RiverBusArrivalsBoard, {
        data: [],
        stopName: "Rotherhithe",
      })
    )
    assert.ok(html.includes("No live departure times available."))
    assert.equal(html.includes("No river buses due"), false)
  })

  it("shows London clock time for river waits of 30 minutes or more", () => {
    const html = renderToStaticMarkup(
      createElement(RiverBusArrivalsBoard, {
        data: [
          prediction({
            id: "rb1-soon",
            lineId: "rb1",
            lineName: "RB1",
            towards: "Westminster Pier",
            timeToStation: 29 * 60,
            expectedArrival: "2026-08-17T18:29:00Z",
            modeName: "river-bus",
          }),
          prediction({
            id: "rb1-later",
            lineId: "rb1",
            lineName: "RB1",
            towards: "Barking Riverside Pier",
            timeToStation: 31 * 60,
            expectedArrival: "2026-08-17T19:02:00Z",
            modeName: "river-bus",
          }),
          prediction({
            id: "rb6-no-clock",
            lineId: "rb6",
            lineName: "RB6",
            towards: "Putney Pier",
            timeToStation: 40 * 60,
            modeName: "river-bus",
          }),
        ],
        stopName: "Canary Wharf Pier",
        pageSize: 3,
      })
    )
    assert.ok(html.includes("29 min"))
    assert.ok(html.includes("20:02"))
    assert.ok(html.includes("40 min"))
    assert.equal(html.includes("31 min"), false)
  })
})

describe("resolveArrivalsHeading", () => {
  it("prefers the override, then the first stationName on data", () => {
    assert.equal(resolveArrivalsHeading("Home", []), "Home")
    assert.equal(
      resolveArrivalsHeading(undefined, [{ stationName: "Oxford Circus" }]),
      "Oxford Circus"
    )
    assert.equal(resolveArrivalsHeading("  ", []), undefined)
    assert.equal(resolveArrivalsHeading(undefined, []), undefined)
  })
})
