import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  decomposeBranchStripJunctions,
  requiredGutterPos,
} from "./branch-strip-joins.ts"
import { validateSchematic, type LineSchematic } from "../line-schematic.ts"

const baseSchematic = (
  nodes: LineSchematic["nodes"],
  edges: LineSchematic["edges"]
): LineSchematic => ({
  lineId: "test",
  lineName: "Test",
  orientation: "horizontal",
  branches: [],
  nodes,
  edges,
})

const degreeOf = (schematic: LineSchematic, id: string): number =>
  schematic.edges.filter((edge) => edge.from === id || edge.to === id).length

const nonVirtualDegrees = (schematic: LineSchematic): Map<string, number> => {
  const map = new Map<string, number>()
  for (const node of schematic.nodes) {
    if (node.kind === "virtual") continue
    map.set(node.id, degreeOf(schematic, node.id))
  }
  return map
}

/**
 * Every edge touching a virtual join must clear `requiredGutterPos` on the
 * lane it changes — otherwise `octilinearLanePath` falls back to a 90°
 * stair instead of a 45° S. Returns violations (empty = all clear).
 */
const virtualJoinClearanceViolations = (schematic: LineSchematic): string[] => {
  const byId = new Map(schematic.nodes.map((node) => [node.id, node]))
  const violations: string[] = []
  for (const edge of schematic.edges) {
    const from = byId.get(edge.from)
    const to = byId.get(edge.to)
    if (!from || !to) continue
    if (from.kind !== "virtual" && to.kind !== "virtual") continue
    if (from.lane === to.lane) continue
    const deltaPos = Math.abs(from.pos - to.pos)
    const deltaLane = Math.abs(from.lane - to.lane)
    const required = requiredGutterPos(deltaLane)
    if (deltaPos + 1e-6 < required) {
      violations.push(
        `${edge.from}(${from.lane},${from.pos})→${edge.to}(${to.lane},${to.pos}): ` +
          `Δpos=${deltaPos.toFixed(3)} < required ${required.toFixed(3)} for Δlane=${deltaLane}`
      )
    }
  }
  return violations
}

describe("decomposeBranchStripJunctions", () => {
  it("leaves a degree-≤3 schematic untouched", () => {
    const schematic = baseSchematic(
      [
        { id: "a", name: "A", lane: 0, pos: 0, kind: "stop" },
        { id: "hub", name: "Hub", lane: 0, pos: 1, kind: "interchange" },
        { id: "b", name: "B", lane: 0, pos: 2, kind: "stop" },
        { id: "c", name: "C", lane: 1, pos: 1, kind: "terminus" },
      ],
      [
        { from: "a", to: "hub" },
        { from: "hub", to: "b" },
        { from: "hub", to: "c" },
      ]
    )
    const result = decomposeBranchStripJunctions(schematic)
    assert.deepEqual(result, schematic)
  })

  it("ignores vertical schematics (horizontal only)", () => {
    const schematic: LineSchematic = {
      ...baseSchematic(
        [
          { id: "a", name: "A", lane: 0, pos: 0, kind: "stop" },
          { id: "hub", name: "Hub", lane: 0, pos: 1, kind: "interchange" },
          { id: "b", name: "B", lane: 0, pos: 2, kind: "stop" },
          { id: "c", name: "C", lane: 1, pos: 1, kind: "stop" },
          { id: "d", name: "D", lane: -1, pos: 1, kind: "stop" },
          { id: "e", name: "E", lane: 2, pos: 1, kind: "terminus" },
        ],
        [
          { from: "a", to: "hub" },
          { from: "hub", to: "b" },
          { from: "hub", to: "c" },
          { from: "hub", to: "d" },
          { from: "hub", to: "e" },
        ]
      ),
      orientation: "vertical",
    }
    const result = decomposeBranchStripJunctions(schematic)
    assert.deepEqual(result, schematic)
  })

  it("decomposes a 5-arm junction into a sequence of degree-≤3 nodes, hub included", () => {
    // "hub" sits on lane 0 with a west/east spine plus 3 extra arms.
    const schematic = baseSchematic(
      [
        { id: "west1", name: "West1", lane: 0, pos: 9, kind: "stop" },
        { id: "hub", name: "Hub", lane: 0, pos: 10, kind: "interchange" },
        { id: "east1", name: "East1", lane: 0, pos: 11, kind: "stop" },
        { id: "arm-a", name: "ArmA", lane: 1, pos: 9, kind: "terminus" },
        { id: "arm-b", name: "ArmB", lane: -1, pos: 9, kind: "terminus" },
        { id: "arm-c", name: "ArmC", lane: -1, pos: 11, kind: "terminus" },
      ],
      [
        { from: "west1", to: "hub" },
        { from: "hub", to: "east1" },
        { from: "hub", to: "arm-a" },
        { from: "hub", to: "arm-b" },
        { from: "hub", to: "arm-c" },
      ]
    )
    const result = decomposeBranchStripJunctions(schematic)
    assert.deepEqual(validateSchematic(result), [])

    const degrees = nonVirtualDegrees(result)
    for (const [id, degree] of degrees) {
      assert.ok(degree <= 3, `${id} has degree ${degree}, expected ≤ 3`)
    }
    // The labelled station is not the high-degree vertex — degree collapses
    // to the kept through-pair, everything else peels onto virtual joins.
    assert.ok(degreeOf(result, "hub") <= 3)

    const virtualNodes = result.nodes.filter((node) => node.kind === "virtual")
    assert.ok(
      virtualNodes.length >= 2,
      "expected virtual joins for the peeled arms"
    )
    for (const node of virtualNodes) {
      assert.equal(node.name, "")
      assert.ok(degreeOf(result, node.id) <= 3)
    }

    // Every original station is still reachable exactly once.
    for (const id of ["west1", "east1", "arm-a", "arm-b", "arm-c"]) {
      assert.equal(degreeOf(result, id), 1)
    }
  })

  it("uses permitted movements to choose the through-pair over the geometric default", () => {
    // Only n3 sits east of hub, so the kept pair's east edge never needs a
    // virtual join — it stays directly attached to hub, making the choice
    // of *which* west neighbour is "kept" directly observable.
    const schematic = baseSchematic(
      [
        { id: "n1", name: "N1", lane: 0, pos: 9, kind: "stop" },
        { id: "n2", name: "N2", lane: 1, pos: 8, kind: "stop" },
        { id: "n5", name: "N5", lane: -1, pos: 9, kind: "terminus" },
        { id: "hub", name: "Hub", lane: 0, pos: 10, kind: "interchange" },
        { id: "n3", name: "N3", lane: 0, pos: 11, kind: "stop" },
      ],
      [
        { from: "n1", to: "hub" },
        { from: "n2", to: "hub" },
        { from: "n5", to: "hub" },
        { from: "hub", to: "n3" },
      ]
    )

    // Geometric default would favour n1↔n3 (same lane as hub on both ends).
    // Declared movements say the real through-move is n2↔n3, and n1↔n3
    // never through-runs at all.
    const result = decomposeBranchStripJunctions(schematic, {
      throughWeight: (via, a, b) => {
        if (via !== "hub") return undefined
        const pair = [a, b].sort().join("|")
        if (pair === ["n2", "n3"].sort().join("|")) return 50
        if (pair === ["n1", "n3"].sort().join("|")) return 0
        return undefined
      },
    })
    assert.deepEqual(validateSchematic(result), [])
    assert.ok(degreeOf(result, "hub") <= 3)

    // n3 had nothing to peel onto it, so it keeps its direct edge to hub.
    assert.ok(
      result.edges.some(
        (edge) =>
          (edge.from === "hub" && edge.to === "n3") ||
          (edge.from === "n3" && edge.to === "hub")
      ),
      "n3 should stay directly attached to hub"
    )
    // n2 is the chosen through-move partner, so it is NOT directly attached
    // to hub — n1 (and n5) sit between it and hub on the peeled chain.
    assert.ok(
      !result.edges.some(
        (edge) =>
          (edge.from === "hub" && edge.to === "n2") ||
          (edge.from === "n2" && edge.to === "hub")
      ),
      "n2 reaches hub through the peeled chain, not directly"
    )
    for (const id of ["n1", "n2", "n5"]) {
      assert.equal(degreeOf(result, id), 1)
    }
  })

  it("leaves a confirmed 4-way diamond alone (Camden Town may stay 2-in-2-out)", () => {
    const schematic = baseSchematic(
      [
        { id: "w1", name: "W1", lane: 0, pos: 9, kind: "stop" },
        { id: "w2", name: "W2", lane: 1, pos: 9, kind: "stop" },
        { id: "hub", name: "Hub", lane: 0, pos: 10, kind: "interchange" },
        { id: "e1", name: "E1", lane: 0, pos: 11, kind: "stop" },
        { id: "e2", name: "E2", lane: 1, pos: 11, kind: "stop" },
      ],
      [
        { from: "w1", to: "hub" },
        { from: "w2", to: "hub" },
        { from: "hub", to: "e1" },
        { from: "hub", to: "e2" },
      ]
    )
    const result = decomposeBranchStripJunctions(schematic, {
      // Every west × east pair is a confirmed, real through-move.
      throughWeight: () => 1,
    })
    assert.deepEqual(result, schematic)
  })

  it("splits into two blobs when the best matching covers every edge but is not a full diamond (Kennington-style)", () => {
    const schematic = baseSchematic(
      [
        {
          id: "elephant-castle",
          name: "Elephant & Castle",
          lane: 0,
          pos: 20,
          kind: "interchange",
        },
        {
          id: "waterloo",
          name: "Waterloo",
          lane: 1,
          pos: 19,
          kind: "interchange",
        },
        {
          id: "kennington",
          name: "Kennington",
          lane: 0,
          pos: 21,
          kind: "interchange",
        },
        { id: "oval", name: "Oval", lane: 0, pos: 22, kind: "stop" },
        { id: "nine-elms", name: "Nine Elms", lane: 1, pos: 22, kind: "stop" },
      ],
      [
        { from: "elephant-castle", to: "kennington", branchId: "bank" },
        { from: "waterloo", to: "kennington", branchId: "charing-cross" },
        { from: "kennington", to: "oval", branchId: "morden" },
        { from: "kennington", to: "nine-elms", branchId: "battersea" },
      ]
    )
    const result = decomposeBranchStripJunctions(schematic, {
      throughWeight: (via, a, b) => {
        if (via !== "kennington") return undefined
        const pair = [a, b].sort().join("|")
        if (pair === ["elephant-castle", "oval"].sort().join("|")) return 6
        if (pair === ["waterloo", "nine-elms"].sort().join("|")) return 4
        // Bank never through-runs to Battersea.
        if (pair === ["elephant-castle", "nine-elms"].sort().join("|")) return 0
        return undefined
      },
    })
    assert.deepEqual(validateSchematic(result), [])

    const blobs = result.nodes.filter(
      (node) => node.stationKey === "kennington"
    )
    assert.equal(
      blobs.length,
      2,
      `expected two Kennington blobs, got ${blobs.length}`
    )
    for (const blob of blobs) {
      assert.equal(degreeOf(result, blob.id), 2)
    }
    assert.ok(
      result.nodes.every((node) => node.id !== "kennington"),
      "the single high-degree Kennington vertex should not survive"
    )

    // Hard ban: two blobs must NOT travel as a parallel pair of bends. Each
    // blob stays on its own pair's existing lane, at the station's own
    // `pos` — never a synthetic shared vertical detour (no twin S-hump).
    const bank = result.nodes.find((n) => n.id === "kennington~a")!
    const charingCross = result.nodes.find((n) => n.id === "kennington~b")!
    const elephantCastle = result.nodes.find((n) => n.id === "elephant-castle")!
    const oval = result.nodes.find((n) => n.id === "oval")!
    const waterloo = result.nodes.find((n) => n.id === "waterloo")!
    const nineElms = result.nodes.find((n) => n.id === "nine-elms")!
    assert.equal(bank.pos, 21, "blob keeps the original station's pos")
    assert.equal(charingCross.pos, 21, "blob keeps the original station's pos")
    assert.equal(bank.lane, elephantCastle.lane)
    assert.equal(bank.lane, oval.lane)
    assert.equal(charingCross.lane, waterloo.lane)
    assert.equal(charingCross.lane, nineElms.lane)
    assert.deepEqual(virtualJoinClearanceViolations(result), [])
  })

  it("clears the 45° gutter for every peeled arm (no 90° stair)", () => {
    // Same 5-arm junction as above, but with tight integer spacing on both
    // sides so a naive placement would land a virtual join too close to
    // its target for `octilinearLanePath` to draw a 45° S.
    const schematic = baseSchematic(
      [
        { id: "west1", name: "West1", lane: 0, pos: 9, kind: "stop" },
        { id: "hub", name: "Hub", lane: 0, pos: 10, kind: "interchange" },
        { id: "east1", name: "East1", lane: 0, pos: 11, kind: "stop" },
        { id: "arm-a", name: "ArmA", lane: 1, pos: 9, kind: "terminus" },
        { id: "arm-b", name: "ArmB", lane: -1, pos: 9, kind: "terminus" },
        { id: "arm-c", name: "ArmC", lane: -1, pos: 11, kind: "terminus" },
      ],
      [
        { from: "west1", to: "hub" },
        { from: "hub", to: "east1" },
        { from: "hub", to: "arm-a" },
        { from: "hub", to: "arm-b" },
        { from: "hub", to: "arm-c" },
      ]
    )
    const result = decomposeBranchStripJunctions(schematic)
    assert.deepEqual(validateSchematic(result), [])
    assert.deepEqual(virtualJoinClearanceViolations(result), [])
  })

  it("stretches the strip so a peel is never crammed against the previous stop", () => {
    // Two peels crowd the same lane-0↔lane-0 gutter that a single unit of
    // `pos` cannot hold — the pass must push `anchor` (and everything
    // beyond it) further out rather than compress the virtual joins.
    const schematic = baseSchematic(
      [
        { id: "anchor", name: "Anchor", lane: 0, pos: 9, kind: "stop" },
        { id: "via", name: "Via", lane: 0, pos: 10, kind: "interchange" },
        { id: "east1", name: "East1", lane: 0, pos: 11, kind: "stop" },
        { id: "peel-a", name: "PeelA", lane: 1, pos: 9, kind: "terminus" },
        { id: "peel-b", name: "PeelB", lane: -1, pos: 9, kind: "terminus" },
        { id: "beyond", name: "Beyond", lane: 0, pos: 8, kind: "stop" },
      ],
      [
        { from: "anchor", to: "via" },
        { from: "via", to: "east1" },
        { from: "via", to: "peel-a" },
        { from: "via", to: "peel-b" },
        { from: "beyond", to: "anchor" },
      ]
    )
    const result = decomposeBranchStripJunctions(schematic)
    assert.deepEqual(validateSchematic(result), [])
    assert.deepEqual(virtualJoinClearanceViolations(result), [])

    const anchor = result.nodes.find((n) => n.id === "anchor")!
    const beyond = result.nodes.find((n) => n.id === "beyond")!
    const viaNode = result.nodes.find((n) => n.id === "via")!
    // The trunk stretched — anchor moved further from `via` than its
    // original single `pos` unit, and `beyond` moved by the same amount so
    // the whole west side stays internally consistent.
    assert.ok(
      viaNode.pos - anchor.pos > 1,
      `expected anchor to move further from via (Δ=${viaNode.pos - anchor.pos})`
    )
    assert.ok(
      Math.abs(anchor.pos - beyond.pos - 1) < 1e-6,
      "beyond should keep its original 1-unit spacing from anchor after the shared shift"
    )
  })
})
