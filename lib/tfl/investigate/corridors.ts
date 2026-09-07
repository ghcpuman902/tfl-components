/**
 * Movement-component split at a shared station name.
 *
 * The movement graph over incident edges (supported A–via–B pairs) is the
 * first conversion, before any drawing. Each connected component becomes
 * its own vertex; halves of the same name are bonded by an interchange.
 *
 * - size 2: an ordinary degree-2 through-run (Euston Bank, Euston CX)
 * - size 1: a terminus / stub (Circle Paddington at Edgware Road)
 * - two size-1 components at degree 2: two termini that share a name
 *   (Hainault, Heathrow T4)
 *
 * A single component — diamond, through-Y, triangle — stays one vertex.
 * Acton Main Line is a through-Y (both Paddingtons through-run from
 * Ealing Broadway): one component, do not split the station.
 * Three or more isolated stubs with no through-pair stay one vertex —
 * that is still a Route/Sequence gap, not a proven dual terminus.
 */

import { smallestGapDeg } from "./orientation"
import type { MovementPair, NeighbourRef, StationRef, ThroughCorridor } from "./types"

export type { ThroughCorridor }

const pairOf = (matrix: readonly MovementPair[], idA: string, idB: string): MovementPair | undefined =>
  matrix.find(
    (pair) =>
      (pair.a.id === idA && pair.b.id === idB) || (pair.a.id === idB && pair.b.id === idA)
  )

const moreNorthern = (left: NeighbourRef, right: NeighbourRef): NeighbourRef => {
  if (left.bearingDeg == null || right.bearingDeg == null) return left
  return smallestGapDeg(left.bearingDeg, 0) <= smallestGapDeg(right.bearingDeg, 0) ? left : right
}

const westness = (neighbour: NeighbourRef): number => {
  if (neighbour.bearingDeg == null) return 0
  return Math.sin((neighbour.bearingDeg * Math.PI) / 180)
}

export const extractThroughCorridors = (
  neighbours: readonly NeighbourRef[],
  matrix: readonly MovementPair[],
  components: readonly StationRef[][]
): ThroughCorridor[] => {
  const byId = new Map(neighbours.map((neighbour) => [neighbour.id, neighbour]))
  const corridors: ThroughCorridor[] = []
  for (const component of components) {
    if (component.length !== 2) continue
    const first = byId.get(component[0]!.id)
    const second = byId.get(component[1]!.id)
    if (!first || !second) continue
    const pair = pairOf(matrix, first.id, second.id)
    if (!pair?.supported) continue
    const a = moreNorthern(first, second)
    const b = a.id === first.id ? second : first
    corridors.push({ a, b, evidenceCount: pair.evidenceCount })
  }
  return corridors.sort((left, right) => westness(left.a) - westness(right.a) || left.a.id.localeCompare(right.a.id))
}

export const extractStubs = (
  neighbours: readonly NeighbourRef[],
  components: readonly StationRef[][]
): NeighbourRef[] => {
  const byId = new Map(neighbours.map((neighbour) => [neighbour.id, neighbour]))
  const stubs: NeighbourRef[] = []
  for (const component of components) {
    if (component.length !== 1) continue
    const stub = byId.get(component[0]!.id)
    if (stub) stubs.push(stub)
  }
  return stubs.sort(
    (left, right) => westness(left) - westness(right) || left.id.localeCompare(right.id)
  )
}

const coveredIds = (corridors: readonly ThroughCorridor[], stubs: readonly NeighbourRef[]): Set<string> =>
  new Set([
    ...corridors.flatMap((corridor) => [corridor.a.id, corridor.b.id]),
    ...stubs.map((stub) => stub.id),
  ])

/** True when every neighbour sits on a 2-ended through-corridor — a clean H split. */
export const isCleanCorridorSplit = (
  neighbours: readonly NeighbourRef[],
  corridors: readonly ThroughCorridor[]
): boolean => {
  if (corridors.length < 2) return false
  const covered = coveredIds(corridors, [])
  return neighbours.length === covered.size && neighbours.every((neighbour) => covered.has(neighbour.id))
}

const isFullyCovered = (
  neighbours: readonly NeighbourRef[],
  corridors: readonly ThroughCorridor[],
  stubs: readonly NeighbourRef[]
): boolean => {
  const covered = coveredIds(corridors, stubs)
  return neighbours.length === covered.size && neighbours.every((neighbour) => covered.has(neighbour.id))
}

/**
 * Split when the movement graph is already several vertices:
 * 2+2 H, 2+1 through+terminus, or exactly two isolated stubs (dual
 * terminus). Three or more stubs with no through-pair stay one vertex.
 */
export const isMovementSplit = (
  neighbours: readonly NeighbourRef[],
  corridors: readonly ThroughCorridor[],
  stubs: readonly NeighbourRef[]
): boolean => {
  if (!isFullyCovered(neighbours, corridors, stubs)) return false
  if (corridors.length >= 1) return corridors.length + stubs.length >= 2
  return stubs.length === 2 && neighbours.length === 2
}

const short = (name: string) => name.replace(/ (Underground|Rail|DLR) Station$/, "")

export const corridorSplitNote = (corridors: readonly ThroughCorridor[]): string => {
  const labels = corridors.map((corridor) => `${short(corridor.a.name)}–${short(corridor.b.name)}`)
  return `Independent corridors: ${corridors.length} through-pairs (${labels.join("; ")}) and no cross-running. Split into ${corridors.length} degree-2 vertices joined by an interchange (H). A single ring with four arms makes a forbidden pair look like a straight through.`
}

/** +1 = south / corridor.b side; −1 = north / corridor.a side. */
export const stubAttachDirection = (
  stub: NeighbourRef,
  corridors: readonly ThroughCorridor[]
): -1 | 1 => {
  const corridor = corridors[0]
  if (corridor && stub.bearingDeg != null && corridor.a.bearingDeg != null && corridor.b.bearingDeg != null) {
    return smallestGapDeg(stub.bearingDeg, corridor.b.bearingDeg) <=
      smallestGapDeg(stub.bearingDeg, corridor.a.bearingDeg)
      ? 1
      : -1
  }
  if (stub.bearingDeg != null) return Math.cos((stub.bearingDeg * Math.PI) / 180) >= 0 ? -1 : 1
  return 1
}

export const movementSplitNote = (
  corridors: readonly ThroughCorridor[],
  stubs: readonly NeighbourRef[]
): string => {
  if (stubs.length === 0) return corridorSplitNote(corridors)
  const terminus = stubs.map((stub) => short(stub.name))
  if (corridors.length === 0) {
    return `Two independent termini (${terminus.join("; ")}). No A–via–B run. Split into two bonded terminus vertices. A single stroke through the name pretends trains continue.`
  }
  const through = corridors.map((corridor) => `${short(corridor.a.name)}–${short(corridor.b.name)}`)
  const terminusWord = stubs.length === 1 ? "terminus" : "termini"
  return `Movement graph splits: ${corridors.length} through-run${corridors.length === 1 ? "" : "s"} (${through.join("; ")}) and ${stubs.length} ${terminusWord} (${terminus.join("; ")}). Split into bonded vertices — through-station and terminus joined by an interchange. A single Y makes the stub look like a branch you can ride through.`
}
