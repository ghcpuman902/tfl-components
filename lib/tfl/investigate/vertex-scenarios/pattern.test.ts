import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  canonicalizePattern,
  classifyPattern,
  drawingVariants,
  patternMatrix,
  undirectedPairs,
} from "./pattern.ts"
import type { DirectedMatrix, PortId } from "./types.ts"

const matrix = (
  ports: PortId[],
  moves: [PortId, PortId][]
): DirectedMatrix => ({
  ports,
  moves: moves.map(([from, to]) => ({ from, to })),
})

describe("pattern classification", () => {
  it("treats one-way and both-ways through as the same block", () => {
    const both = matrix(
      ["A", "B"],
      [
        ["A", "B"],
        ["B", "A"],
      ]
    )
    const oneWay = matrix(["A", "B"], [["A", "B"]])
    assert.equal(classifyPattern(both), "through")
    assert.equal(classifyPattern(oneWay), "through")
    assert.equal(classifyPattern(matrix(["A", "B"], [])), "dual-terminus")
  })

  it("does not call through+terminus a Y", () => {
    const throughTerminus = matrix(
      ["A", "B", "C"],
      [
        ["B", "C"],
        ["C", "B"],
      ]
    )
    const oneWay = matrix(["A", "B", "C"], [["C", "B"]])
    assert.equal(classifyPattern(throughTerminus), "through-terminus")
    assert.equal(classifyPattern(oneWay), "through-terminus")
    const canonical = canonicalizePattern(oneWay)
    assert.deepEqual(canonical.ports, ["A", "B", "C"])
    assert.deepEqual(canonical.moves, [{ from: "A", to: "B" }])
    assert.equal(classifyPattern(canonical), "through-terminus")
  })

  it("puts the Y stem on A", () => {
    const rotated = matrix(
      ["A", "B", "C"],
      [
        ["B", "A"],
        ["A", "B"],
        ["B", "C"],
        ["C", "B"],
      ]
    )
    assert.equal(classifyPattern(rotated), "y")
    const canonical = canonicalizePattern(rotated)
    assert.equal(canonical.ports[0], "A")
    const pairs = undirectedPairs(canonical)
    assert.equal(pairs.length, 2)
    assert.ok(pairs.every(([from, to]) => from === "A" || to === "A"))
  })

  it("keeps the canonical Y matrix as A–B and A–C, not B–C", () => {
    const y = patternMatrix("y")
    const pairs = undirectedPairs(y)
    assert.deepEqual(
      pairs.map((pair) => pair.slice().sort().join("-")).sort(),
      ["A-B", "A-C"]
    )
    const throughTerminus = patternMatrix("through-terminus")
    assert.deepEqual(undirectedPairs(throughTerminus), [["A", "B"]])
  })

  it("lists drawing variants without inventing a bent through", () => {
    assert.deepEqual(
      drawingVariants("through").map((variant) => variant.id),
      ["default"]
    )
    assert.deepEqual(
      drawingVariants("dual-terminus").map((variant) => variant.id),
      ["opposite", "same-side"]
    )
    assert.deepEqual(
      drawingVariants("y").map((variant) => variant.id),
      ["stem", "split"]
    )
    assert.deepEqual(
      drawingVariants("through-terminus").map((variant) => variant.id),
      ["same-as-a", "same-as-b"]
    )
    assert.deepEqual(
      drawingVariants("three-termini").map((variant) => variant.id),
      ["opposite", "same-side"]
    )
    assert.deepEqual(
      drawingVariants("triangle").map((variant) => variant.id),
      ["a-left", "a-right"]
    )
    assert.equal(drawingVariants("independent-corridors").length, 1)
  })

  it("keeps two disjoint through-pairs as independent corridors", () => {
    const corridors = matrix(
      ["A", "B", "C", "D"],
      [
        ["A", "B"],
        ["B", "A"],
        ["C", "D"],
        ["D", "C"],
      ]
    )
    assert.equal(classifyPattern(corridors), "independent-corridors")
    const crossed = matrix(
      ["A", "B", "C", "D"],
      [
        ["A", "C"],
        ["C", "A"],
        ["A", "D"],
        ["D", "A"],
      ]
    )
    assert.equal(classifyPattern(crossed), "other")
  })
})
