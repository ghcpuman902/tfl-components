import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  isDefaultBoardSlots,
  moveBoardPanel,
  parseBoardPanels,
  parseDockIdList,
  normalizeBusRouteIds,
  parseRouteIdList,
  resolveBoardSlots,
  sameBusRouteSet,
  serializeBoardPanels,
  serializeDockIdList,
} from "./board-panels"

describe("parseBoardPanels", () => {
  it("normalizes, dedupes, and drops unknown kinds", () => {
    assert.deepEqual(parseBoardPanels("Rail,bus,RAIL,clock,status"), [
      "rail",
      "bus",
      "status",
    ])
  })

  it("returns undefined for empty or all-invalid", () => {
    assert.equal(parseBoardPanels(""), undefined)
    assert.equal(parseBoardPanels("clock"), undefined)
    assert.equal(parseBoardPanels(null), undefined)
  })
})

describe("serializeBoardPanels", () => {
  it("omits empty lists", () => {
    assert.equal(serializeBoardPanels(undefined), undefined)
    assert.equal(serializeBoardPanels([]), undefined)
  })

  it("joins valid kinds", () => {
    assert.equal(serializeBoardPanels(["rail", "cycle"]), "rail,cycle")
  })
})

describe("resolveBoardSlots", () => {
  it("defaults omitted slots to rail + status", () => {
    assert.deepEqual(resolveBoardSlots(undefined, undefined), {
      p1: ["rail"],
      p2: ["status"],
    })
  })

  it("treats a set p1 and omitted p2 as a single column", () => {
    assert.deepEqual(resolveBoardSlots(["rail"], undefined), {
      p1: ["rail"],
      p2: [],
    })
  })

  it("keeps an explicit empty p1", () => {
    assert.deepEqual(resolveBoardSlots([], ["status"]), {
      p1: [],
      p2: ["status"],
    })
  })
})

describe("moveBoardPanel", () => {
  const slots = { p1: ["rail"] as const, p2: ["status"] as const }

  it("adds an unused kind to the wide slot", () => {
    assert.deepEqual(moveBoardPanel(slots, "bus", "p1"), {
      p1: ["rail", "bus"],
      p2: ["status"],
    })
  })

  it("moves a kind from one slot to the other", () => {
    assert.deepEqual(moveBoardPanel(slots, "rail", "p2"), {
      p1: [],
      p2: ["status", "rail"],
    })
  })

  it("returns a kind to the unused pool", () => {
    assert.deepEqual(moveBoardPanel(slots, "status", "pool"), {
      p1: ["rail"],
      p2: [],
    })
  })

  it("appends when the kind is already in the slot and no index is given", () => {
    assert.equal(moveBoardPanel(slots, "rail", "p1"), slots)
  })

  it("reorders within a slot", () => {
    assert.deepEqual(
      moveBoardPanel({ p1: ["rail", "bus"], p2: ["status"] }, "bus", "p1", 0),
      { p1: ["bus", "rail"], p2: ["status"] }
    )
  })

  it("inserts at an index when moving across slots", () => {
    assert.deepEqual(
      moveBoardPanel(
        { p1: ["rail", "bus"], p2: ["status"] },
        "status",
        "p1",
        1
      ),
      { p1: ["rail", "status", "bus"], p2: [] }
    )
  })
})

describe("isDefaultBoardSlots", () => {
  it("is true when both slots match the omitted default", () => {
    assert.equal(isDefaultBoardSlots(undefined, undefined), true)
    assert.equal(isDefaultBoardSlots(["rail"], ["status"]), true)
    assert.equal(isDefaultBoardSlots(["rail"], []), false)
    assert.equal(isDefaultBoardSlots(["status"], []), false)
  })
})

describe("route and dock lists", () => {
  it("parses bus routes", () => {
    assert.deepEqual(parseRouteIdList("73,N8,73,nope"), ["73", "n8"])
  })

  it("sorts serving routes into a stable set", () => {
    assert.deepEqual(normalizeBusRouteIds(["N8", "9", "205", "18"]), [
      "9",
      "18",
      "205",
      "n8",
    ])
    assert.equal(sameBusRouteSet(["n8", "73"], ["73", "N8"]), true)
    assert.equal(sameBusRouteSet(["73"], ["73", "n8"]), false)
  })

  it("normalizes BikePoint ids", () => {
    assert.deepEqual(parseDockIdList("237,BikePoints_46,x"), [
      "BikePoints_237",
      "BikePoints_46",
    ])
    assert.equal(
      serializeDockIdList(["237", "BikePoints_46"]),
      "BikePoints_237,BikePoints_46"
    )
  })
})
