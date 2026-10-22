import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  applyNearbyIds,
  createNearbyFillTracker,
  nearbyFillKey,
} from "./board-nearby-fill"
import { createBoardSetupDraft } from "./board-setup-state"

const EXAMPLE = "940GZZLUOXC"
const lookup = {
  ok: true as const,
  bus: { id: "490000173RC", name: "Oxford Circus" },
  docks: [],
}

describe("nearby fill", () => {
  it("looks up the bus stop again when the example stop is picked deliberately", () => {
    const fill = createNearbyFillTracker()
    // First paint: no stop yet, so the example stop is looked up and filled.
    const fresh = {
      ...createBoardSetupDraft("d"),
      nearbyModes: ["bus" as const],
    }
    assert.equal(fill.claim(nearbyFillKey(fresh, EXAMPLE)), true)
    const filled = applyNearbyIds(fresh, EXAMPLE, EXAMPLE, lookup)
    assert.equal(filled.busStopId, "490000173RC")
    assert.equal(nearbyFillKey(filled, EXAMPLE), null)

    // Picking Oxford Circus clears the nearby ids; its key matches the first
    // lookup, so without a reset the board link would have no b.stop.
    const picked = { ...filled, stopId: EXAMPLE, busStopId: null }
    const key = nearbyFillKey(picked, EXAMPLE)
    assert.equal(fill.claim(key), false)
    fill.reset()
    assert.equal(fill.claim(key), true)
    assert.equal(
      applyNearbyIds(picked, EXAMPLE, EXAMPLE, lookup).busStopId,
      "490000173RC"
    )
  })

  it("does not look up the same key twice while it is in flight", () => {
    const fill = createNearbyFillTracker()
    assert.equal(fill.claim("a:bus"), true)
    assert.equal(fill.claim("a:bus"), false)
    assert.equal(fill.claim(null), false)
  })

  it("ignores a lookup that lands after the station changed", () => {
    const draft = {
      ...createBoardSetupDraft("d"),
      stopId: "940GZZLUGPK",
      busStopId: null,
    }
    assert.equal(applyNearbyIds(draft, EXAMPLE, EXAMPLE, lookup), draft)
  })

  it("keeps a bus stop that is already set", () => {
    const draft = {
      ...createBoardSetupDraft("d"),
      stopId: EXAMPLE,
      busStopId: "x",
    }
    assert.equal(applyNearbyIds(draft, EXAMPLE, EXAMPLE, lookup).busStopId, "x")
  })
})
