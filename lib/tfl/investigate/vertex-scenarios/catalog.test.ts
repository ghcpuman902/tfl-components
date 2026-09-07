import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { catalogVertexScenarios } from "./catalog.ts"
import { undirectedPairs } from "./pattern.ts"

describe("vertex scenario catalogue", () => {
  it("lists degree-2 then degree-3 building blocks", () => {
    const first = catalogVertexScenarios()
    const second = catalogVertexScenarios()
    assert.deepEqual(
      first.map((scenario) => scenario.id),
      [
        "d2-through",
        "d2-dual-terminus",
        "d3-y",
        "d3-through-terminus",
        "d3-triangle",
        "d3-three-termini",
        "d4-independent-corridors",
      ]
    )
    assert.deepEqual(
      first.map((scenario) => scenario.id),
      second.map((scenario) => scenario.id)
    )
    assert.equal(first[0]!.degree, 2)
    assert.equal(first[0]!.title, "Through")
  })

  it("draws Y only when A reaches B and C", () => {
    const scenarios = catalogVertexScenarios()
    const y = scenarios.find((scenario) => scenario.kind === "y")
    const throughTerminus = scenarios.find((scenario) => scenario.kind === "through-terminus")
    assert.ok(y)
    assert.ok(throughTerminus)
    assert.deepEqual(
      undirectedPairs(y.matrix)
        .map((pair) => pair.slice().sort().join("-"))
        .sort(),
      ["A-B", "A-C"]
    )
    assert.deepEqual(undirectedPairs(throughTerminus.matrix), [["A", "B"]])
  })

  it("includes independent corridors as a degree-4 block", () => {
    const corridors = catalogVertexScenarios().find(
      (scenario) => scenario.kind === "independent-corridors"
    )
    assert.ok(corridors)
    assert.equal(corridors.degree, 4)
    assert.deepEqual(
      undirectedPairs(corridors.matrix)
        .map((pair) => pair.slice().sort().join("-"))
        .sort(),
      ["A-B", "C-D"]
    )
    assert.ok(
      corridors.examples.some((example) => /Euston|Poplar/.test(example.stationName)),
      "expected Euston or Poplar among independent-corridor examples"
    )
  })
})
