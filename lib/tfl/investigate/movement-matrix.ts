/**
 * Movement matrix: for a station's incident edges, which pairs actually
 * carry a through service? A shared station does not imply a through-move —
 * this checks every raw sequence for the consecutive triple
 * `neighbourA -> station -> neighbourB` before calling a pair supported.
 */

import { stationRef, type PassengerGraph } from "./passenger-graph"
import type { MovementPair, StationRef } from "./types"

export type MovementEvidence = {
  pairs: MovementPair[]
  /** Connected components of the movement graph over incident edges (by neighbour id). */
  components: string[][]
}

/** Count of raw sequences containing the directed triple `from → station → to`. */
export const countDirectedTriple = (
  sequences: string[][],
  station: string,
  from: string,
  to: string
): number => {
  let count = 0
  for (const ids of sequences) {
    for (let i = 1; i < ids.length - 1; i++) {
      if (ids[i] !== station) continue
      if (ids[i - 1] === from && ids[i + 1] === to) count++
    }
  }
  return count
}

/** Either-direction count of the consecutive triple `a - station - b`. */
export const countTripleEvidence = (
  sequences: string[][],
  station: string,
  a: string,
  b: string
): number =>
  countDirectedTriple(sequences, station, a, b) +
  countDirectedTriple(sequences, station, b, a)

export const buildMovementMatrix = (
  graph: PassengerGraph,
  stationId: string
): MovementEvidence => {
  const neighbours = [...(graph.adjacency.get(stationId) ?? [])].sort()
  const pairs: MovementPair[] = []
  const supportedAdjacency = new Map<string, Set<string>>(
    neighbours.map((id) => [id, new Set<string>()])
  )

  for (let i = 0; i < neighbours.length; i++) {
    for (let j = i + 1; j < neighbours.length; j++) {
      const a = neighbours[i]!
      const b = neighbours[j]!
      const aThenB = countDirectedTriple(graph.sequences, stationId, a, b)
      const bThenA = countDirectedTriple(graph.sequences, stationId, b, a)
      const evidenceCount = aThenB + bThenA
      const supported = evidenceCount > 0
      if (supported) {
        supportedAdjacency.get(a)!.add(b)
        supportedAdjacency.get(b)!.add(a)
      }
      pairs.push({
        a: stationRef(graph, a),
        b: stationRef(graph, b),
        aThenB,
        bThenA,
        supported,
        evidenceCount,
      })
    }
  }

  const components = connectedComponents(neighbours, supportedAdjacency)
  return { pairs, components }
}

/** Connected components over the *supported-movement* graph, not raw adjacency. */
const connectedComponents = (
  nodes: string[],
  edges: Map<string, Set<string>>
): string[][] => {
  const visited = new Set<string>()
  const components: string[][] = []
  for (const start of nodes) {
    if (visited.has(start)) continue
    const queue = [start]
    const component: string[] = []
    visited.add(start)
    while (queue.length > 0) {
      const current = queue.shift()!
      component.push(current)
      for (const neighbour of edges.get(current) ?? []) {
        if (visited.has(neighbour)) continue
        visited.add(neighbour)
        queue.push(neighbour)
      }
    }
    components.push(component)
  }
  return components
}

export const movementComponentsAsRefs = (
  graph: PassengerGraph,
  components: string[][]
): StationRef[][] => components.map((component) => component.map((id) => stationRef(graph, id)))
