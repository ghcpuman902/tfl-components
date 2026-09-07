import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  canonicalizeDirectedMatrix,
  directedSignature,
  hasMove,
  pairState,
  scenarioTitle,
} from "./directed-matrix.ts"
import { buildVertexCandidates, planarKey } from "./candidates.ts"
import { directedExact, reconstructDirected } from "./reconstruct.ts"
import type { DirectedMatrix, PortId } from "./types.ts"

const matrix = (ports: PortId[], moves: [PortId, PortId][]): DirectedMatrix => ({
  ports,
  moves: moves.map(([from, to]) => ({ from, to })),
})

describe("directed matrices stay directed", () => {
  it("treats opposite one-way patterns as different signatures", () => {
    const throughY = matrix(["A", "B", "C"], [
      ["A", "C"],
      ["C", "A"],
      ["B", "C"],
      ["C", "B"],
    ])
    const oneWay = matrix(["A", "B", "C"], [
      ["A", "C"],
      ["C", "B"],
    ])
    const mixed = matrix(["A", "B", "C"], [
      ["A", "C"],
      ["C", "A"],
      ["B", "C"],
    ])
    assert.notEqual(directedSignature(throughY), directedSignature(oneWay))
    assert.notEqual(directedSignature(throughY), directedSignature(mixed))
    assert.notEqual(directedSignature(oneWay), directedSignature(mixed))
    assert.equal(pairState(mixed, "B", "C"), "ab")
    assert.equal(hasMove(mixed, "C", "B"), false)
  })

  it("canonicalises rotation but not a different directed pattern", () => {
    const first = canonicalizeDirectedMatrix(
      matrix(["A", "B", "C"], [
        ["A", "C"],
        ["C", "B"],
      ])
    )
    const rotated = canonicalizeDirectedMatrix(
      matrix(["A", "B", "C"], [
        ["B", "A"],
        ["A", "C"],
      ])
    )
    assert.equal(directedSignature(first), directedSignature(rotated))
    const reflected = canonicalizeDirectedMatrix(
      matrix(["A", "B", "C"], [
        ["A", "B"],
        ["B", "C"],
      ])
    )
    assert.notEqual(directedSignature(first), directedSignature(reflected))
  })
})

describe("reconstruct directed movements", () => {
  it("preserves a one-way turn and rejects the reverse", () => {
    const directed = matrix(["A", "B", "C"], [
      ["A", "C"],
      ["C", "B"],
    ])
    const [candidate] = buildVertexCandidates("d3-m-test", directed)
    assert.ok(candidate)
    assert.equal(candidate.exact, true)
    const reconstructed = reconstructDirected(candidate.tree, directed.ports)
    assert.equal(directedExact(directed, reconstructed).exact, true)
    const ac = reconstructed.find((path) => path.from === "A" && path.to === "C")
    const ca = reconstructed.find((path) => path.from === "C" && path.to === "A")
    assert.equal(ac?.permitted, true)
    assert.equal(ca?.permitted, false)
  })

  it("does not invent a reverse movement on a bidirectional-plus-one-way Y", () => {
    const mixed = matrix(["A", "B", "C"], [
      ["A", "C"],
      ["C", "A"],
      ["B", "C"],
    ])
    const candidates = buildVertexCandidates("d3-m-mixed", mixed)
    assert.ok(candidates.length >= 1)
    for (const candidate of candidates) {
      const reconstructed = reconstructDirected(candidate.tree, mixed.ports)
      assert.equal(directedExact(mixed, reconstructed).exact, true)
      assert.equal(reconstructed.find((path) => path.from === "C" && path.to === "B")?.permitted, false)
      assert.equal(reconstructed.find((path) => path.from === "B" && path.to === "C")?.permitted, true)
    }
  })
})

describe("planar candidates", () => {
  it("keeps dual terminus and through+terminus as one station", () => {
    const dual = matrix(["A", "B"], [])
    const split = matrix(["A", "B", "C"], [
      ["A", "C"],
      ["C", "A"],
    ])
    const dualCandidates = buildVertexCandidates("d2-m-dual", dual)
    assert.equal(dualCandidates.length, 1)
    assert.equal(dualCandidates[0]!.passengerVertices, 1)
    assert.match(dualCandidates[0]!.planarNote, /building block/)

    const throughTerminus = buildVertexCandidates("d3-m-tt", split)
    assert.equal(throughTerminus.length, 1)
    assert.equal(throughTerminus[0]!.passengerVertices, 1)
    assert.equal(throughTerminus[0]!.tree.edges.some((edge) => edge.kind === "bond"), false)
    assert.equal(throughTerminus[0]!.planarNote, "through + terminus")
  })

  it("treats a through-Y as one simple-Y building block", () => {
    const throughY = matrix(["A", "B", "C"], [
      ["A", "C"],
      ["C", "A"],
      ["B", "C"],
      ["C", "B"],
    ])
    const candidates = buildVertexCandidates("d3-m-y", throughY)
    assert.equal(candidates.length, 1)
    assert.equal(candidates[0]!.anonymousJunctions, 0)
    assert.match(candidates[0]!.planarNote, /simple Y/)
  })

  it("collapses duplicate construction histories", () => {
    const throughY = matrix(["A", "B", "C"], [
      ["A", "C"],
      ["C", "A"],
      ["B", "C"],
      ["C", "B"],
    ])
    const first = buildVertexCandidates("d3-m-y", throughY)
    const second = buildVertexCandidates("d3-m-y", throughY)
    assert.deepEqual(
      first.map((candidate) => candidate.planarKey),
      second.map((candidate) => candidate.planarKey)
    )
    const trees = first.map((candidate) => planarKey(candidate.tree, throughY.ports))
    assert.equal(new Set(trees).size, trees.length)
  })

  it("orders candidates deterministically", () => {
    const throughY = matrix(["A", "B", "C"], [
      ["A", "C"],
      ["C", "A"],
      ["B", "C"],
      ["C", "B"],
    ])
    const a = buildVertexCandidates("d3-m-y", throughY).map((candidate) => candidate.id)
    const b = buildVertexCandidates("d3-m-y", throughY).map((candidate) => candidate.id)
    assert.deepEqual(a, b)
    assert.ok(a[0]?.endsWith("-c1"))
  })

  it("keeps a disconnected through-pair plus terminus on one station", () => {
    const split = matrix(["A", "B", "C"], [
      ["A", "C"],
      ["C", "A"],
    ])
    const candidates = buildVertexCandidates("d3-m-tt", split)
    assert.ok(candidates.every((candidate) => candidate.passengerVertices === 1))
    assert.ok(candidates.every((candidate) => candidate.tree.edges.every((edge) => edge.kind !== "bond")))
    assert.equal(scenarioTitle(split), "Through + terminus")
  })

  it("finds several planar candidates for a degree-4 diamond", () => {
    const diamond = matrix(["A", "B", "C", "D"], [
      ["A", "C"],
      ["C", "A"],
      ["A", "D"],
      ["D", "A"],
      ["B", "C"],
      ["C", "B"],
      ["B", "D"],
      ["D", "B"],
    ])
    const candidates = buildVertexCandidates("d4-m-diamond", diamond)
    assert.ok(candidates.length >= 2, `expected several candidates, got ${candidates.length}`)
    for (const candidate of candidates) {
      assert.equal(candidate.exact, true)
    }
  })

  it("finds several candidates for a degree-5 through-plus-branches matrix", () => {
    const five = matrix(["A", "B", "C", "D", "E"], [
      ["A", "C"],
      ["C", "A"],
      ["B", "C"],
      ["C", "B"],
      ["D", "C"],
      ["C", "D"],
      ["E", "C"],
      ["C", "E"],
    ])
    const candidates = buildVertexCandidates("d5-m-star", five)
    assert.ok(candidates.length >= 3, `expected several candidates, got ${candidates.length}`)
    for (const candidate of candidates) {
      const reconstructed = reconstructDirected(candidate.tree, five.ports)
      assert.equal(directedExact(five, reconstructed).exact, true)
    }
  })
})
