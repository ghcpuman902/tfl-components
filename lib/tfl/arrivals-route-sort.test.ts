import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { compareBusRouteNames } from "@/lib/tfl/arrivals-route-sort"

describe("compareBusRouteNames", () => {
  it("uses stable natural numeric order", () => {
    assert.ok(compareBusRouteNames("9", "18") < 0)
    assert.ok(compareBusRouteNames("18", "205") < 0)
    assert.ok(compareBusRouteNames("9", "205") < 0)
  })

  it("is case-insensitive for letter prefixes", () => {
    assert.ok(compareBusRouteNames("n9", "N9") === 0)
  })
})
