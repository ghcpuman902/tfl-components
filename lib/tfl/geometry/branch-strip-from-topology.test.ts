import assert from "node:assert/strict"
import { describe, it } from "node:test"
import {
  buildBranchStripFromTopology,
  isLoopLikeTopology,
} from "./branch-strip-from-topology.ts"
import { requiredGutterPos } from "./branch-strip-joins.ts"
import { validateSchematic, type LineSchematic } from "../line-schematic.ts"

const LINES = ["northern", "district", "metropolitan"] as const

/** Every lane-changing edge must clear `requiredGutterPos` — a 45° S, never a 90° stair. */
const gutterViolations = (schematic: LineSchematic): string[] => {
  const byId = new Map(schematic.nodes.map((node) => [node.id, node]))
  const violations: string[] = []
  for (const edge of schematic.edges) {
    const from = byId.get(edge.from)
    const to = byId.get(edge.to)
    if (!from || !to || from.lane === to.lane) continue
    const deltaPos = Math.abs(from.pos - to.pos)
    const deltaLane = Math.abs(from.lane - to.lane)
    const required = requiredGutterPos(deltaLane)
    if (deltaPos + 1e-6 < required) {
      violations.push(
        `${edge.from}(${from.lane},${from.pos.toFixed(2)})→${edge.to}(${to.lane},${to.pos.toFixed(2)}): Δpos=${deltaPos.toFixed(2)} < required ${required.toFixed(2)}`
      )
    }
  }
  return violations
}

describe("buildBranchStripFromTopology", () => {
  for (const lineId of LINES) {
    it(`${lineId}: produces a schema-valid horizontal schematic with no lane-change stair`, () => {
      const schematic = buildBranchStripFromTopology(lineId)
      assert.ok(schematic, `expected a schematic for ${lineId}`)
      assert.equal(schematic.orientation, "horizontal")
      assert.deepEqual(validateSchematic(schematic), [])
      assert.deepEqual(gutterViolations(schematic), [])
    })

    it(`${lineId}: packs hops along a branch (not across interleaved parallel branches)`, () => {
      const schematic = buildBranchStripFromTopology(lineId)!
      const byId = new Map(schematic.nodes.map((node) => [node.id, node]))
      const sameLaneHops = schematic.edges
        .map((edge) => {
          const from = byId.get(edge.from)
          const to = byId.get(edge.to)
          if (!from || !to || from.lane !== to.lane) return null
          if (from.kind === "virtual" || to.kind === "virtual") return null
          return Math.abs(to.pos - from.pos)
        })
        .filter((gap): gap is number => gap != null)
      assert.ok(sameLaneHops.length > 0, "expected same-lane hops")
      const sorted = [...sameLaneHops].sort((a, b) => a - b)
      const median = sorted[Math.floor(sorted.length / 2)]!
      assert.ok(
        Math.abs(median - 1) < 1e-6,
        `expected the typical same-lane hop to be one pos unit, got median ${median}`
      )
      const stretched = sameLaneHops.filter((gap) => gap > 1.5)
      assert.ok(
        stretched.length / sameLaneHops.length < 0.2,
        `too many stretched same-lane hops: ${stretched.length}/${sameLaneHops.length}`
      )
    })

    it(`${lineId}: almost every stroke is horizontal — lane changes are rare (only at Ys)`, () => {
      const schematic = buildBranchStripFromTopology(lineId)!
      const byId = new Map(schematic.nodes.map((node) => [node.id, node]))
      const laneChanges = schematic.edges.filter((edge) => {
        const from = byId.get(edge.from)
        const to = byId.get(edge.to)
        return from && to && from.lane !== to.lane
      })
      assert.ok(
        laneChanges.length / schematic.edges.length < 0.25,
        `too many lane-changing edges: ${laneChanges.length}/${schematic.edges.length}`
      )
    })
  }

  it("Circle is loop-shaped and declines the linear clip (loops stay on the racetrack layout)", () => {
    assert.equal(buildBranchStripFromTopology("circle"), null)
  })

  it("isLoopLikeTopology recognises a real cycle vs a tree", () => {
    const cycle = [
      { from: "a", to: "b" },
      { from: "b", to: "c" },
      { from: "c", to: "d" },
      { from: "d", to: "a" },
    ]
    assert.equal(isLoopLikeTopology(["a", "b", "c", "d"], cycle), true)
    const tree = [
      { from: "a", to: "b" },
      { from: "b", to: "c" },
      { from: "c", to: "d" },
    ]
    assert.equal(isLoopLikeTopology(["a", "b", "c", "d"], tree), false)
  })

  describe("Northern Kennington — two blobs, strokes stay level, no twin hump", () => {
    const schematic = buildBranchStripFromTopology("northern")!
    const blobs = schematic.nodes.filter(
      (node) => node.stationKey === "kennington"
    )

    it("splits into exactly two blobs sharing one stationKey", () => {
      assert.equal(
        blobs.length,
        2,
        `expected 2 Kennington blobs, got ${blobs.length}`
      )
    })

    it("both blobs are interchange rings so the bond has a dot at each end", () => {
      for (const blob of blobs) {
        assert.equal(
          blob.kind,
          "interchange",
          `${blob.id} should be an interchange, got ${blob.kind}`
        )
      }
    })

    it("both blobs sit at the SAME pos (no parallel pair of bends)", () => {
      const positions = new Set(blobs.map((blob) => blob.pos))
      assert.equal(
        positions.size,
        1,
        `blobs should share one pos, got ${[...positions]}`
      )
    })

    it("each blob keeps its own pair level (dead straight, not a synthetic offset)", () => {
      // A blob may ALSO carry the leftover movement the other blob doesn't
      // share (Kennington's Charing Cross ↔ Morden fork — the "merge AFTER
      // the station" edge) — that one edge is a deliberate lane change, not
      // part of the pair. The blob's OWN pair (at least 2 of its edges)
      // must still be level.
      const byId = new Map(schematic.nodes.map((node) => [node.id, node]))
      for (const blob of blobs) {
        const incident = schematic.edges.filter(
          (edge) => edge.from === blob.id || edge.to === blob.id
        )
        const levelCount = incident.filter((edge) => {
          const otherId = edge.from === blob.id ? edge.to : edge.from
          return byId.get(otherId)?.lane === blob.lane
        }).length
        assert.ok(
          levelCount >= 2,
          `${blob.id} (lane ${blob.lane}) should keep at least 2 level edges, got ${levelCount}`
        )
      }
    })
  })

  it("Northern High Barnet and Edgware pack along their own corridors, not interleaved", () => {
    const schematic = buildBranchStripFromTopology("northern")!
    const byName = (name: string) =>
      schematic.nodes.find((node) => node.name === name)
    const highBarnet = [
      "High Barnet",
      "Totteridge & Whetstone",
      "Woodside Park",
      "West Finchley",
      "Finchley Central",
    ].map((name) => {
      const node = byName(name)
      assert.ok(node, name)
      return node!
    })
    const edgware = ["Edgware", "Burnt Oak", "Colindale", "Hendon Central"].map(
      (name) => {
        const node = byName(name)
        assert.ok(node, name)
        return node!
      }
    )
    for (let i = 1; i < highBarnet.length; i += 1) {
      const from = highBarnet[i - 1]!
      const to = highBarnet[i]!
      assert.equal(
        from.lane,
        to.lane,
        `${from.name} → ${to.name} should stay on one lane (got ${from.lane} → ${to.lane})`
      )
      assert.ok(
        Math.abs(to.pos - from.pos) < 1.5,
        `${from.name} → ${to.name} Δpos=${Math.abs(to.pos - from.pos)} should be ~1`
      )
    }
    for (let i = 1; i < edgware.length; i += 1) {
      const from = edgware[i - 1]!
      const to = edgware[i]!
      assert.equal(
        from.lane,
        to.lane,
        `${from.name} → ${to.name} should stay on one lane`
      )
      assert.ok(
        Math.abs(to.pos - from.pos) < 1.5,
        `${from.name} → ${to.name} Δpos=${Math.abs(to.pos - from.pos)} should be ~1`
      )
    }
    const oval = byName("Oval")
    const stockwell = byName("Stockwell")
    assert.ok(oval && stockwell)
    assert.equal(
      oval.lane,
      stockwell.lane,
      `Oval → Stockwell should continue the southbound trunk (got ${oval.lane} → ${stockwell.lane})`
    )
  })

  it("Northern Euston blobs share a column, adjacent lanes, with Mill Hill above the trunk", () => {
    const schematic = buildBranchStripFromTopology("northern")!
    const eustons = schematic.nodes.filter(
      (node) => node.stationKey === "euston"
    )
    assert.equal(eustons.length, 2, "expected two Euston blobs")
    const positions = new Set(eustons.map((node) => node.pos))
    assert.equal(
      positions.size,
      1,
      `Euston blobs should share one pos, got ${[...positions]}`
    )
    const lanes = eustons.map((node) => node.lane).sort((a, b) => a - b)
    assert.equal(
      lanes[1]! - lanes[0]!,
      1,
      `Euston lanes should be adjacent, got ${lanes}`
    )
    const millHill = schematic.nodes.find(
      (node) => node.name === "Mill Hill East"
    )
    const finchley = schematic.nodes.find(
      (node) => node.name === "Finchley Central"
    )
    const highBarnet = schematic.nodes.find(
      (node) => node.name === "High Barnet"
    )
    const edgware = schematic.nodes.find((node) => node.name === "Edgware")
    assert.ok(millHill && finchley && highBarnet && edgware)
    assert.ok(
      millHill.lane < highBarnet.lane,
      `Mill Hill should sit above High Barnet (got Mill Hill ${millHill.lane}, High Barnet ${highBarnet.lane})`
    )
    assert.equal(
      Math.abs(edgware.lane - highBarnet.lane),
      1,
      `High Barnet and Edgware should be adjacent lanes, got ${highBarnet.lane} vs ${edgware.lane}`
    )
  })

  it("Northern Camden Town stays a real 2-in-2-out diamond (every leg a confirmed through-move)", () => {
    const schematic = buildBranchStripFromTopology("northern")!
    const camden = schematic.nodes.find((node) => node.name === "Camden Town")
    assert.ok(camden)
    const degree = schematic.edges.filter(
      (edge) => edge.from === camden!.id || edge.to === camden!.id
    ).length
    assert.equal(degree, 4)
  })

  it("District Earl's Court decomposes into staggered Ys, not a star, with room before West Kensington", () => {
    const schematic = buildBranchStripFromTopology("district")!
    const byId = new Map(schematic.nodes.map((node) => [node.id, node]))
    const earlsCourt = schematic.nodes.find(
      (node) => node.name === "Earl's Court"
    )
    assert.ok(earlsCourt)
    const degree = schematic.edges.filter(
      (edge) => edge.from === earlsCourt!.id || edge.to === earlsCourt!.id
    ).length
    assert.ok(degree <= 3, `Earl's Court degree ${degree} should be ≤ 3`)

    const westKensington = schematic.nodes.find(
      (node) => node.name === "West Kensington"
    )
    assert.ok(westKensington)
    // The nearest peel's virtual join must not be crammed against West
    // Kensington's own circle — some real gutter must separate them.
    const peelJoins = schematic.nodes.filter(
      (node) =>
        node.kind === "virtual" &&
        schematic.edges.some(
          (edge) =>
            (edge.from === node.id || edge.to === node.id) &&
            (byId.get(edge.from)?.id === westKensington!.id ||
              byId.get(edge.to)?.id === westKensington!.id)
        )
    )
    for (const join of peelJoins) {
      assert.ok(
        Math.abs(join.pos - westKensington!.pos) > 0.5,
        `virtual join ${join.id} sits too close to West Kensington (Δpos=${Math.abs(join.pos - westKensington!.pos).toFixed(2)})`
      )
    }
  })
})
