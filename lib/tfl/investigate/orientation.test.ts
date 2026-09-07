import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { analyzeLine } from "./analyze-line.ts"
import type { NeighbourRef } from "./types"
import {
  SAME_DIRECTION_GAP_DEG,
  compassOctant,
  crossingMinOrderIds,
  diagnoseOrientation,
  orderByBearing,
  principalAxis,
  sideOf,
  sidesAlternate,
  smallestGapDeg,
  spreadBearings,
} from "./orientation.ts"

const neighbour = (
  id: string,
  name: string,
  bearingDeg: number,
  distanceM = 1000
): NeighbourRef => ({
  id,
  name,
  degree: 2,
  beyond: null,
  bearingDeg,
  distanceM,
})

/** Real Camden Town bearings from the geography bundle. */
const CAMDEN = [
  neighbour("cf", "Chalk Farm", 304.9, 909),
  neighbour("kt", "Kentish Town", 7.0, 1229),
  neighbour("mc", "Mornington Crescent", 152.0, 678),
  neighbour("eu", "Euston", 153.8, 1382),
]

const CAMDEN_THROUGH: [string, string][] = [
  ["cf", "eu"],
  ["cf", "mc"],
  ["kt", "eu"],
  ["kt", "mc"],
]

describe("orientation", () => {
  it("reads Camden Town as a north–south split with a same-direction south pair", () => {
    const orientation = diagnoseOrientation(CAMDEN, CAMDEN_THROUGH)
    assert.ok(orientation)
    assert.equal(orientation.axis, "NS")
    assert.equal(orientation.sameDirectionPairs.length, 1)
    assert.equal(orientation.sameDirectionPairs[0]!.a.id, "mc")
    assert.equal(orientation.sameDirectionPairs[0]!.b.id, "eu")
    assert.ok(orientation.sameDirectionPairs[0]!.gapDeg < SAME_DIRECTION_GAP_DEG)
    assert.equal(orientation.crossingMinAlternatesSides, true)
  })

  it("orders by bearing clockwise from the arm closest to north", () => {
    const ordered = orderByBearing(CAMDEN)
    assert.deepEqual(
      ordered.map((item) => item.id),
      ["kt", "mc", "eu", "cf"]
    )
    const sides = ordered.map((item) => sideOf(item.bearingDeg!, "NS"))
    assert.deepEqual(sides, ["N", "S", "S", "N"])
    assert.equal(sidesAlternate(sides), false)
  })

  it("crossing-min order interleaves north and south for the Camden diamond", () => {
    const ids = crossingMinOrderIds(
      CAMDEN.map((item) => item.id),
      CAMDEN_THROUGH
    )
    const byId = new Map(CAMDEN.map((item) => [item.id, item]))
    const sides = ids.map((id) => sideOf(byId.get(id)!.bearingDeg!, "NS"))
    assert.equal(sidesAlternate(sides), true)
  })

  it("spreads a 2° pair without flipping them onto opposite sides", () => {
    const spread = spreadBearings([7, 152, 153.8, 304.9], 32)
    assert.equal(spread.length, 4)
    assert.ok(smallestGapDeg(spread[1]!, spread[2]!) >= 32 - 1e-6)
    assert.equal(sideOf(spread[1]!, "NS"), "S")
    assert.equal(sideOf(spread[2]!, "NS"), "S")
    assert.equal(sideOf(spread[0]!, "NS"), "N")
    assert.equal(sideOf(spread[3]!, "NS"), "N")
  })

  it("does not call a 3-arm Y an alternating plus-junction", () => {
    const y = [
      neighbour("a", "A", 0),
      neighbour("b", "B", 140),
      neighbour("c", "C", 220),
    ]
    const orientation = diagnoseOrientation(y, [
      ["a", "b"],
      ["a", "c"],
    ])
    assert.ok(orientation)
    assert.equal(orientation.crossingMinAlternatesSides, false)
    assert.equal(principalAxis([0, 140, 220]), "NS")
    assert.equal(compassOctant(153.8), "SE")
  })

  it("annotates Camden Town from Route/Sequence plus coordinates", () => {
    const analysis = analyzeLine("northern")
    assert.ok(analysis)
    const camden = analysis.junctions.find((junction) => junction.station.id === "940GZZLUCTN")
    assert.ok(camden)
    assert.equal(camden.orientation?.axis, "NS")
    assert.equal(camden.orientation?.crossingMinAlternatesSides, true)
    assert.equal(camden.orientation?.sameDirectionPairs.length, 1)
    const pair = camden.orientation!.sameDirectionPairs[0]!
    const names = [pair.a.name, pair.b.name].sort()
    assert.match(names[0]!, /Euston/)
    assert.match(names[1]!, /Mornington Crescent/)
    const euston = camden.neighbours.find((neighbour) => neighbour.id === "940GZZLUEUS")
    const crescent = camden.neighbours.find((neighbour) => neighbour.name.includes("Mornington"))
    assert.ok(euston?.distanceM != null && crescent?.distanceM != null)
    assert.ok(euston.distanceM > crescent.distanceM)
    assert.equal(camden.corridors.length, 0)
  })

  it("splits Northern Euston into two bonded through-corridors", () => {
    const analysis = analyzeLine("northern")
    assert.ok(analysis)
    const euston = analysis.junctions.find((junction) => junction.station.id === "940GZZLUEUS")
    assert.ok(euston)
    assert.equal(euston.archetype, "independent-corridors")
    assert.equal(euston.corridors.length, 2)
    const pairLabels = euston.corridors
      .map((corridor) => [corridor.a.name, corridor.b.name].sort().join(" ↔ "))
      .sort()
    assert.match(pairLabels[0]!, /Camden Town/)
    assert.match(pairLabels[0]!, /King's Cross/)
    assert.match(pairLabels[1]!, /Mornington Crescent/)
    assert.match(pairLabels[1]!, /Warren Street/)
    assert.match(euston.conversionNotes[0] ?? "", /interchange \(H\)/)
    assert.deepEqual(euston.stubs, [])
  })

  it("splits Circle Edgware Road into a through-run and a bonded terminus", () => {
    const analysis = analyzeLine("circle")
    assert.ok(analysis)
    const edgware = analysis.junctions.find((junction) => junction.station.id === "940GZZLUERC")
    assert.ok(edgware)
    assert.equal(edgware.archetype, "ordinary-y")
    assert.equal(edgware.corridors.length, 1)
    assert.equal(edgware.stubs.length, 1)
    const through = [edgware.corridors[0]!.a.name, edgware.corridors[0]!.b.name].join(" ")
    assert.match(through, /Baker Street/)
    assert.match(through, /H&C/)
    assert.match(edgware.stubs[0]!.name, /Paddington/)
    assert.doesNotMatch(edgware.stubs[0]!.name, /H&C/)
    assert.match(edgware.conversionNotes[0] ?? "", /terminus/)
    assert.equal(edgware.conversionNotes.some((note) => /same-direction/.test(note)), false)
  })

  it("keeps Elizabeth Acton Main Line as one through-Y", () => {
    const analysis = analyzeLine("elizabeth")
    assert.ok(analysis)
    const acton = analysis.junctions.find((junction) =>
      junction.station.name.includes("Acton Main Line")
    )
    assert.ok(acton)
    assert.equal(acton.archetype, "through-y")
    assert.equal(acton.corridors.length, 0)
    assert.equal(acton.stubs.length, 0)
    assert.equal(acton.conversionNotes.some((note) => /bonded vertices/.test(note)), false)
  })

  it("splits Central Hainault into two bonded termini", () => {
    const analysis = analyzeLine("central")
    assert.ok(analysis)
    const hainault = analysis.junctions.find((junction) => junction.station.id === "940GZZLUHLT")
    assert.ok(hainault)
    assert.equal(hainault.archetype, "non-through-degree-2")
    assert.equal(hainault.corridors.length, 0)
    assert.equal(hainault.stubs.length, 2)
    const stubNames = hainault.stubs.map((stub) => stub.name).join(" ")
    assert.match(stubNames, /Grange Hill/)
    assert.match(stubNames, /Fairlop/)
    assert.match(hainault.conversionNotes[0] ?? "", /Two independent termini/)
  })
})
