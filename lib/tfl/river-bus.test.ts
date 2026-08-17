import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  filterRiverBusArrivals,
  filterRiverBusLineIds,
  isFerryPortId,
  isRiverBusLineId,
  pointHasRiverBusLine,
  riverRouteChipCopy,
} from "./river-bus"

describe("riverRouteChipCopy", () => {
  it("uppercases rb line ids", () => {
    assert.deepEqual(riverRouteChipCopy("rb1", "RB1"), {
      label: "RB1",
      ariaLabel: "RB1",
    })
  })

  it("abbreviates Woolwich Ferry and keeps the full name for assistive text", () => {
    assert.deepEqual(riverRouteChipCopy("woolwich-ferry", "Woolwich Ferry"), {
      label: "WF",
      ariaLabel: "Woolwich Ferry",
    })
  })
})

describe("filterRiverBusLineIds", () => {
  it("drops bus routes mixed onto a pier", () => {
    assert.deepEqual(
      filterRiverBusLineIds(["rb6", "22", "n22", "RB1"]),
      ["rb6", "rb1"],
    )
  })

  it("canonicalises spaced Woolwich Ferry ids", () => {
    assert.equal(isRiverBusLineId("Woolwich Ferry"), true)
    assert.deepEqual(filterRiverBusLineIds(["Woolwich Ferry", "22"]), [
      "woolwich-ferry",
    ])
  })
})

describe("filterRiverBusArrivals", () => {
  it("drops bus predictions mixed onto a pier payload", () => {
    assert.deepEqual(
      filterRiverBusArrivals([
        { lineId: "22" },
        { lineId: "rb6" },
        { lineId: "n22" },
      ]),
      [{ lineId: "rb6" }],
    )
  })
})

describe("pointHasRiverBusLine", () => {
  it("is true when any river-bus line is present", () => {
    assert.equal(pointHasRiverBusLine(["22", "rb6"]), true)
    assert.equal(pointHasRiverBusLine(["22", "n22"]), false)
  })
})

describe("isFerryPortId", () => {
  it("accepts parent piers and rejects berths", () => {
    assert.equal(isFerryPortId("930GWMR"), true)
    assert.equal(isFerryPortId("9300WMR"), false)
  })
})
