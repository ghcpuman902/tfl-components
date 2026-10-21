import assert from "node:assert/strict"
import { describe, it } from "node:test"
import type { RealtimePrediction } from "tfl-ts"
import {
  buildGlancePanStrip,
  formatGlanceCountdown,
  formatGlanceThen,
  glanceBoundKey,
  glanceLineKey,
  glancePanColumns,
  groupGlanceArrivals,
  nextGlancePanOffset,
  parseGlancePriorityItem,
  prepareGlanceArrivals,
  resolveGlanceLayout,
  serializeGlancePriorityItem,
} from "@/lib/tfl/board-glance-arrivals"

const arrival = (
  lineId: string,
  platformName: string,
  timeToStation: number,
  towards = "Somewhere"
): RealtimePrediction =>
  ({
    id: `${lineId}-${platformName}-${timeToStation}`,
    lineId,
    lineName: lineId,
    platformName,
    timeToStation,
    towards,
  }) as RealtimePrediction

const OXC = [
  arrival("victoria", "Southbound - Platform 5", 60),
  arrival("central", "Westbound - Platform 1", 30, "Ealing Broadway"),
  arrival("victoria", "Northbound - Platform 6", 120),
  arrival("central", "Eastbound - Platform 2", 600),
  arrival("bakerloo", "Southbound - Platform 4", 180),
  arrival("central", "Westbound - Platform 1", 300, "West Ruislip"),
  arrival("victoria", "Northbound - Platform 6", 240),
  arrival("bakerloo", "Northbound - Platform 3", 90),
]

const keys = (groups: readonly { key: string }[]) => groups.map((g) => g.key)

describe("glance group keys", () => {
  it("keys a group on line and compass bound", () => {
    assert.equal(glanceLineKey(arrival("Central", "x", 1)), "central")
    assert.equal(glanceBoundKey("Westbound - Platform 1"), "westbound")
  })

  it("falls back to Inner / Outer Rail, then platform, then unknown", () => {
    assert.equal(glanceBoundKey("Inner Rail - Platform 1"), "inner")
    assert.equal(glanceBoundKey("Platform 3"), "platform-3")
    assert.equal(glanceBoundKey(undefined), "unknown")
  })
})

describe("groupGlanceArrivals", () => {
  it("groups by line + direction with each group soonest first", () => {
    const groups = groupGlanceArrivals(prepareGlanceArrivals({ data: OXC }))
    assert.equal(groups.length, 6)
    const victoriaNb = groups.find((g) => g.key === "victoria:northbound")
    assert.deepEqual(
      victoriaNb?.rows.map((row) => row.arrival.timeToStation),
      [120, 240]
    )
    // Both Central westbound branches share one direction group.
    assert.equal(
      groups.find((g) => g.key === "central:westbound")?.rows.length,
      2
    )
  })

  it("keeps fixed positions when times change", () => {
    const before = keys(
      groupGlanceArrivals(prepareGlanceArrivals({ data: OXC }))
    )
    const later = OXC.map((row, index) => ({
      ...row,
      timeToStation: 900 - index * 60,
    }))
    const after = keys(
      groupGlanceArrivals(prepareGlanceArrivals({ data: later }))
    )
    assert.deepEqual(after, before)
  })

  it("orders by canonical line, then bound, without priority", () => {
    assert.deepEqual(
      keys(groupGlanceArrivals(prepareGlanceArrivals({ data: OXC }))),
      [
        "central:westbound",
        "central:eastbound",
        "victoria:northbound",
        "victoria:southbound",
        "bakerloo:northbound",
        "bakerloo:southbound",
      ]
    )
  })

  it("puts board priority first, then a.lines order", () => {
    const groups = groupGlanceArrivals(prepareGlanceArrivals({ data: OXC }), {
      priority: [
        { line: "victoria", bound: "southbound" },
        { line: "central" },
      ],
      lineOrder: ["bakerloo", "victoria"],
    })
    assert.deepEqual(keys(groups), [
      "victoria:southbound",
      "central:westbound",
      "central:eastbound",
      "bakerloo:northbound",
      "bakerloo:southbound",
      "victoria:northbound",
    ])
  })
})

describe("parseGlancePriorityItem", () => {
  it("reads line with short or long bounds, or a bare line", () => {
    assert.deepEqual(parseGlancePriorityItem("Victoria:NB"), {
      line: "victoria",
      bound: "northbound",
    })
    assert.deepEqual(parseGlancePriorityItem("central:westbound"), {
      line: "central",
      bound: "westbound",
    })
    assert.deepEqual(parseGlancePriorityItem("circle:inner"), {
      line: "circle",
      bound: "inner",
    })
    assert.deepEqual(parseGlancePriorityItem("bakerloo"), { line: "bakerloo" })
  })

  it("rejects junk and round-trips", () => {
    assert.equal(parseGlancePriorityItem("victoria:up"), undefined)
    assert.equal(parseGlancePriorityItem(" "), undefined)
    assert.equal(
      serializeGlancePriorityItem({ line: "victoria", bound: "northbound" }),
      "victoria:northbound"
    )
  })
})

describe("resolveGlanceLayout", () => {
  const groups = groupGlanceArrivals(prepareGlanceArrivals({ data: OXC }))

  it("anchors the first group and tiles the rest", () => {
    const layout = resolveGlanceLayout(groups)
    assert.equal(layout.layout, "anchor")
    assert.deepEqual(keys(layout.anchors), ["central:westbound"])
    assert.equal(layout.tiles.length, 5)
  })

  it("lets a tap pin any group as the anchor; unknown pins fall back", () => {
    const pinned = resolveGlanceLayout(groups, {
      pinnedKey: "central:eastbound",
    })
    assert.deepEqual(keys(pinned.anchors), ["central:eastbound"])
    assert.ok(!keys(pinned.tiles).includes("central:eastbound"))
    const stale = resolveGlanceLayout(groups, {
      pinnedKey: "jubilee:northbound",
    })
    assert.deepEqual(keys(stale.anchors), ["central:westbound"])
  })

  it("pairs the first two as equals", () => {
    const pair = resolveGlanceLayout(groups, { pair: true })
    assert.equal(pair.layout, "pair")
    assert.deepEqual(keys(pair.anchors), [
      "central:westbound",
      "central:eastbound",
    ])
    assert.equal(pair.tiles.length, 4)
  })

  it("drops to one anchor when a pair has a single group", () => {
    const one = resolveGlanceLayout(groups.slice(0, 1), { pair: true })
    assert.equal(one.layout, "anchor")
    assert.equal(resolveGlanceLayout([]).anchors.length, 0)
  })
})

describe("glance overflow paging", () => {
  it("does not loop when every tile fits", () => {
    assert.deepEqual(buildGlancePanStrip([1, 2, 3, 4]), [1, 2, 3, 4])
  })

  it("pads to whole columns, then clones the first page", () => {
    assert.deepEqual(buildGlancePanStrip([1, 2, 3, 4, 5]), [
      1,
      2,
      3,
      4,
      5,
      null,
      1,
      2,
      3,
      4,
    ])
    assert.deepEqual(
      buildGlancePanStrip([1, 2, 3, 4, 5, 6]),
      [1, 2, 3, 4, 5, 6, 1, 2, 3, 4]
    )
  })

  it("counts real columns per row count", () => {
    assert.equal(glancePanColumns(6, 2), 3)
    assert.equal(glancePanColumns(5, 2), 3)
    assert.equal(glancePanColumns(5, 1), 5)
  })

  it("steps one column at a time and snaps back after the clone", () => {
    assert.deepEqual(nextGlancePanOffset(0, 3), { offset: 1, snap: false })
    assert.deepEqual(nextGlancePanOffset(2, 3), { offset: 3, snap: false })
    assert.deepEqual(nextGlancePanOffset(3, 3), { offset: 0, snap: true })
    assert.deepEqual(nextGlancePanOffset(0, 0), { offset: 0, snap: false })
  })
})

describe("glance time block", () => {
  it("formats the hero time", () => {
    assert.equal(formatGlanceCountdown(30), "Due")
    assert.equal(formatGlanceCountdown(125), "2")
    assert.equal(formatGlanceCountdown(125, "Platform Unknown"), "Sched")
  })

  it("formats 'then' from the next two trains", () => {
    const rows = prepareGlanceArrivals({
      data: [
        arrival("victoria", "Northbound", 120),
        arrival("victoria", "Northbound", 250),
        arrival("victoria", "Northbound", 560),
        arrival("victoria", "Northbound", 900),
      ],
    })
    assert.equal(formatGlanceThen(rows), "then 4, 9")
    assert.equal(formatGlanceThen(rows.slice(0, 1)), null)
  })
})
