import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { liveVehiclesKey } from "@/lib/tfl/live-vehicles-cache"

describe("live vehicles cache key", () => {
  it("is the same for the same lines in any order, with repeats and spaces", () => {
    assert.equal(liveVehiclesKey(["victoria", "central"]), "central,victoria")
    assert.equal(liveVehiclesKey([" central", "victoria", "central"]), "central,victoria")
  })

  it("is empty for no lines", () => {
    assert.equal(liveVehiclesKey([]), "")
  })
})
