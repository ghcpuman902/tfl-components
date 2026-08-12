import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  arrivalsLineOrderKey,
  compareArrivalsLines,
} from "@/lib/tfl/arrivals-line-sort"

describe("arrivalsLineOrderKey", () => {
  it("ranks known lines by LINE_ORDER", () => {
    assert.ok(
      arrivalsLineOrderKey("central") < arrivalsLineOrderKey("victoria")
    )
    assert.ok(
      arrivalsLineOrderKey("victoria") < arrivalsLineOrderKey("bakerloo")
    )
  })

  it("puts unknown ids after the canonical list", () => {
    assert.ok(
      arrivalsLineOrderKey("not-a-real-line") > arrivalsLineOrderKey("windrush")
    )
  })
})

describe("compareArrivalsLines", () => {
  it("keeps empty lines in canonical LINE_ORDER, not below live lines", () => {
    const emptyCentral = {
      lineId: "central",
      lineName: "Central",
    }
    const busyBakerloo = {
      lineId: "bakerloo",
      lineName: "Bakerloo",
    }
    assert.ok(compareArrivalsLines(emptyCentral, busyBakerloo) < 0)
    assert.ok(compareArrivalsLines(busyBakerloo, emptyCentral) > 0)
  })

  it("uses LINE_ORDER among live rail lines (not soonest train)", () => {
    const victoria = {
      lineId: "victoria",
      lineName: "Victoria",
    }
    const central = {
      lineId: "central",
      lineName: "Central",
    }
    assert.ok(compareArrivalsLines(central, victoria) < 0)
  })

  it("uses LINE_ORDER among empty rail lines too", () => {
    const victoria = {
      lineId: "victoria",
      lineName: "Victoria",
    }
    const bakerloo = {
      lineId: "bakerloo",
      lineName: "Bakerloo",
    }
    assert.ok(compareArrivalsLines(victoria, bakerloo) < 0)
  })
})
