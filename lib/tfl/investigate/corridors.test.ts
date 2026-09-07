import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { extractStubs, extractThroughCorridors, isCleanCorridorSplit, isMovementSplit } from "./corridors.ts"
import type { MovementPair, NeighbourRef, StationRef } from "./types"

const neighbour = (id: string, name: string, bearingDeg: number): NeighbourRef => ({
  id,
  name,
  degree: 2,
  beyond: null,
  bearingDeg,
  distanceM: 800,
})

const pair = (a: NeighbourRef, b: NeighbourRef, supported: boolean): MovementPair => ({
  a: { id: a.id, name: a.name },
  b: { id: b.id, name: b.name },
  aThenB: supported ? 1 : 0,
  bThenA: supported ? 1 : 0,
  supported,
  evidenceCount: supported ? 2 : 0,
})

describe("extractThroughCorridors", () => {
  it("keeps a 2+2 movement split as two corridors and rejects a diamond", () => {
    const camden = neighbour("ctn", "Camden Town", 320)
    const crescent = neighbour("mtc", "Mornington Crescent", 340)
    const kings = neighbour("kxx", "King's Cross", 50)
    const warren = neighbour("wrr", "Warren Street", 210)
    const neighbours = [camden, crescent, kings, warren]
    const matrix = [
      pair(camden, kings, true),
      pair(crescent, warren, true),
      pair(camden, crescent, false),
      pair(camden, warren, false),
      pair(crescent, kings, false),
      pair(kings, warren, false),
    ]
    const components: StationRef[][] = [
      [camden, kings],
      [crescent, warren],
    ]
    const corridors = extractThroughCorridors(neighbours, matrix, components)
    assert.equal(corridors.length, 2)
    assert.equal(isCleanCorridorSplit(neighbours, corridors), true)

    const diamondComponents: StationRef[][] = [[camden, crescent, kings, warren]]
    assert.equal(extractThroughCorridors(neighbours, matrix, diamondComponents).length, 0)
    assert.equal(isCleanCorridorSplit(neighbours, []), false)
  })

  it("treats a through-pair plus isolated stub as a movement split", () => {
    const baker = neighbour("bak", "Baker Street", 68)
    const padHc = neighbour("phc", "Paddington (H&C Line)", 227)
    const pad = neighbour("pad", "Paddington", 227)
    const neighbours = [baker, padHc, pad]
    const matrix = [pair(baker, padHc, true), pair(baker, pad, false), pair(padHc, pad, false)]
    const components: StationRef[][] = [[baker, padHc], [pad]]
    const corridors = extractThroughCorridors(neighbours, matrix, components)
    const stubs = extractStubs(neighbours, components)
    assert.equal(corridors.length, 1)
    assert.equal(stubs.length, 1)
    assert.equal(stubs[0]!.id, "pad")
    assert.equal(isCleanCorridorSplit(neighbours, corridors), false)
    assert.equal(isMovementSplit(neighbours, corridors, stubs), true)
  })

  it("does not split three isolated stubs with no through-pair", () => {
    const a = neighbour("a", "A", 0)
    const b = neighbour("b", "B", 120)
    const c = neighbour("c", "C", 240)
    const neighbours = [a, b, c]
    const components: StationRef[][] = [[a], [b], [c]]
    const corridors = extractThroughCorridors(neighbours, [], components)
    const stubs = extractStubs(neighbours, components)
    assert.equal(corridors.length, 0)
    assert.equal(stubs.length, 3)
    assert.equal(isMovementSplit(neighbours, corridors, stubs), false)
  })

  it("treats exactly two isolated stubs as a dual-terminus split", () => {
    const grange = neighbour("ggh", "Grange Hill", 357)
    const fairlop = neighbour("flp", "Fairlop", 191)
    const neighbours = [grange, fairlop]
    const components: StationRef[][] = [[grange], [fairlop]]
    const corridors = extractThroughCorridors(neighbours, [pair(grange, fairlop, false)], components)
    const stubs = extractStubs(neighbours, components)
    assert.equal(corridors.length, 0)
    assert.equal(stubs.length, 2)
    assert.equal(isMovementSplit(neighbours, corridors, stubs), true)
  })
})

