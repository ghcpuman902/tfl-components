import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { compareMatrices, inferForbiddenTurns, reconstructPairs } from "./reconstruct.ts"
import type { CandidateTree } from "./types.ts"
import type { MovementPair } from "../types.ts"

const leaf = (id: string) => ({
  id: `L:${id}`,
  kind: "boundary" as const,
  leafId: id,
  leafName: id,
})

const station = {
  id: "S",
  kind: "station" as const,
  stationId: "hub",
  stationName: "Hub",
}

const edge = (a: string, b: string) => ({
  id: `e:${a}-${b}`,
  a,
  b,
  kind: "track" as const,
})

const sourcePair = (a: string, b: string, supported: boolean): MovementPair => ({
  a: { id: a, name: a },
  b: { id: b, name: b },
  aThenB: supported ? 1 : 0,
  bThenA: supported ? 1 : 0,
  supported,
  evidenceCount: supported ? 2 : 0,
})

describe("reconstruct movement matrix", () => {
  it("permits every pair through an unrestricted Y", () => {
    const tree: CandidateTree = {
      nodes: [station, leaf("a"), leaf("b"), leaf("c")],
      edges: [edge("S", "L:a"), edge("S", "L:b"), edge("S", "L:c")],
      forbiddenTurns: [],
    }
    const pairs = reconstructPairs(tree, ["a", "b", "c"])
    assert.equal(pairs.filter((pair) => pair.permitted).length, 3)
    assert.deepEqual(pairs.find((pair) => pair.a === "a" && pair.b === "b")?.pathNodeIds, [
      "L:a",
      "S",
      "L:b",
    ])
  })

  it("detects missing and extra movements", () => {
    const tree: CandidateTree = {
      nodes: [station, leaf("a"), leaf("b"), leaf("c")],
      edges: [edge("S", "L:a"), edge("S", "L:b"), edge("S", "L:c")],
      forbiddenTurns: [{ at: "S", neighborA: "L:b", neighborB: "L:c" }],
    }
    const reconstructed = reconstructPairs(tree, ["a", "b", "c"])
    const comparison = compareMatrices(
      ["a", "b", "c"],
      [sourcePair("a", "b", true), sourcePair("a", "c", true), sourcePair("b", "c", true)],
      reconstructed
    )
    assert.equal(comparison.exact, false)
    assert.equal(comparison.missing, 1)
    assert.equal(comparison.extra, 0)
    assert.equal(comparison.cells.find((cell) => cell.a === "b" && cell.b === "c")?.verdict, "missing")
  })

  it("does not treat a passenger bond as a track path", () => {
    const left = { ...station, id: "S1" }
    const right = { ...station, id: "S2" }
    const tree: CandidateTree = {
      nodes: [left, right, leaf("a"), leaf("b")],
      edges: [
        edge("S1", "L:a"),
        edge("S2", "L:b"),
        { id: "bond:S1-S2", a: "S1", b: "S2", kind: "bond" },
      ],
      forbiddenTurns: [],
    }
    const pairs = reconstructPairs(tree, ["a", "b"])
    assert.equal(pairs[0]!.permitted, false)
    assert.deepEqual(pairs[0]!.pathNodeIds, [])
  })

  it("infers a forbidden turn that removes an extra without creating a missing", () => {
    const open = {
      nodes: [station, leaf("a"), leaf("b"), leaf("c")],
      edges: [edge("S", "L:a"), edge("S", "L:b"), edge("S", "L:c")],
    }
    const source = [sourcePair("a", "b", true), sourcePair("a", "c", true), sourcePair("b", "c", false)]
    const forbidden = inferForbiddenTurns(open, ["a", "b", "c"], source)
    assert.equal(forbidden.length, 1)
    const tree: CandidateTree = { ...open, forbiddenTurns: forbidden }
    const comparison = compareMatrices(["a", "b", "c"], source, reconstructPairs(tree, ["a", "b", "c"]))
    assert.equal(comparison.exact, true)
  })
})
