import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import type { RealtimePrediction } from "tfl-ts"
import { BusArrivalsBoard } from "@/components/tfl/arrivals/bus-arrivals-board"
import { RailArrivalsBoard } from "@/components/tfl/arrivals/rail-arrivals-board"
import { resolveArrivalsHeading } from "@/components/tfl/arrivals/arrivals-board-view"

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
        lineGroups: [
          { lines: ["circle", "hammersmith-city", "metropolitan"] },
        ],
        stopName: "Liverpool Street",
      }),
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
    const pager = html.match(
      /<div class="hidden items-center p-0 transition-opacity[^"]*"/
    )?.[0] ?? ""
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
  })

  it("uses data.stationName when stopName is omitted", () => {
    const html = renderToStaticMarkup(
      createElement(RailArrivalsBoard, {
        data: railData.map((row) => ({
          ...row,
          stationName: "Oxford Circus",
        })),
      }),
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
      }),
    )
    assert.ok(html.includes("Custom heading"))
    assert.equal(html.includes("Oxford Circus"), false)
  })
})

describe("resolveArrivalsHeading", () => {
  it("prefers the override, then the first stationName on data", () => {
    assert.equal(resolveArrivalsHeading("Home", []), "Home")
    assert.equal(
      resolveArrivalsHeading(undefined, [{ stationName: "Oxford Circus" }]),
      "Oxford Circus",
    )
    assert.equal(resolveArrivalsHeading("  ", []), undefined)
    assert.equal(resolveArrivalsHeading(undefined, []), undefined)
  })
})
