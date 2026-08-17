import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  areAdjacent,
  hopGraphFromOrderedStops,
  hopGraphForRailLine,
} from "@/lib/tfl/vehicle-hop-graph"

describe("hopGraphFromOrderedStops", () => {
  it("treats consecutive stops as adjacent and skips a hop", () => {
    const graph = hopGraphFromOrderedStops(["A", "B", "C"])
    assert.equal(areAdjacent(graph, "A", "B"), true)
    assert.equal(areAdjacent(graph, "B", "A"), true)
    assert.equal(areAdjacent(graph, "A", "C"), false)
    assert.equal(graph.branched, false)
  })
})

describe("hopGraphForRailLine", () => {
  it("marks Northern as branched and Victoria as a corridor", () => {
    const northern = hopGraphForRailLine("northern")
    const victoria = hopGraphForRailLine("victoria")
    assert.equal(northern.branched, true)
    assert.equal(victoria.branched, false)
    assert.ok(victoria.adjacent.size > 0)
  })
})
