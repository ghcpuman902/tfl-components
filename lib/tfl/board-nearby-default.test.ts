import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { draftForStationPick } from "./board-customise"
import { applyNearbyIds } from "./board-nearby-fill"
import { createBoardSetupDraft } from "./board-setup-state"

const OXFORD_CIRCUS = "940GZZLUOXC"
const BOND_STREET = "940GZZLUBND"
const nearOxfordCircus = {
  ok: true as const,
  buses: [
    { id: "490000173RG", name: "Oxford Circus" },
    { id: "490000173RC", name: "Oxford Circus" },
  ],
  docks: ["BikePoints_116", "BikePoints_349"],
}
const pick = (draft: ReturnType<typeof createBoardSetupDraft>, stopId: string) =>
  draftForStationPick(draft, {
    stopId,
    stopName: null,
    lineIds: [],
    extraStatusLineIds: [],
    keepStatusOrder: true,
  })

describe("buses and docks default to the Trains station's nearest", () => {
  const draft = {
    ...createBoardSetupDraft("d"),
    nearbyModes: ["bus" as const, "cycle" as const],
  }

  it("with no stops or docks chosen, both come from the station's nearest", () => {
    const filled = applyNearbyIds(
      pick(draft, OXFORD_CIRCUS),
      OXFORD_CIRCUS,
      OXFORD_CIRCUS,
      nearOxfordCircus
    )
    assert.equal(filled.busStopId, "490000173RG,490000173RC")
    assert.deepEqual(filled.cycleDockIds, ["BikePoints_116", "BikePoints_349"])

    // A new station clears them for its own nearest.
    const moved = pick(filled, BOND_STREET)
    assert.equal(moved.busStopId, null)
    assert.deepEqual(moved.cycleDockIds, [])
  })

  it("stops and docks the user chose survive a station change", () => {
    const chosen = {
      ...draft,
      stopId: OXFORD_CIRCUS,
      busStopId: "490000173RG",
      busStopsCustom: true,
      cycleDockIds: ["BikePoints_313"],
      cycleDocksCustom: true,
    }
    const moved = pick(chosen, BOND_STREET)
    assert.equal(moved.busStopId, "490000173RG")
    assert.deepEqual(moved.cycleDockIds, ["BikePoints_313"])
    const refilled = applyNearbyIds(moved, BOND_STREET, OXFORD_CIRCUS, nearOxfordCircus)
    assert.deepEqual(refilled.cycleDockIds, ["BikePoints_313"])
  })
})
