/**
 * Downstream branch descriptions for later scoring. Displayed only —
 * they do not choose a candidate.
 */

import { getHubMembership } from "../raw-data"
import { stationCoord } from "@/lib/tfl/station-coords"
import { degreeOf, type PassengerGraph } from "../passenger-graph"
import { countTripleEvidence } from "../movement-matrix"
import { greatCircleDistanceM } from "../orientation"
import type { NeighbourRef } from "../types"
import type { BranchDescription } from "./types"

const walkBranch = (
  graph: PassengerGraph,
  startId: string,
  blockedId: string
): { stationCount: number; laterJunctionCount: number; isTerminus: boolean; lengthM: number } => {
  const seen = new Set([blockedId, startId])
  const queue = [startId]
  let stationCount = 1
  let laterJunctionCount = 0
  let isTerminus = degreeOf(graph, startId) === 1
  let lengthM = 0
  while (queue.length > 0) {
    const current = queue.shift()!
    const neighbours = [...(graph.adjacency.get(current) ?? [])].filter((id) => !seen.has(id))
    if (neighbours.length === 0 && degreeOf(graph, current) <= 1) isTerminus = true
    for (const next of neighbours) {
      seen.add(next)
      stationCount++
      const degree = degreeOf(graph, next)
      if (degree > 2) laterJunctionCount++
      if (degree === 2) {
        const [left, right] = [...(graph.adjacency.get(next) ?? [])]
        if (left && right && countTripleEvidence(graph.sequences, next, left, right) === 0) {
          laterJunctionCount++
        }
      }
      const from = stationCoord(current)
      const to = stationCoord(next)
      if (from && to) lengthM += greatCircleDistanceM(from, to)
      queue.push(next)
    }
  }
  return { stationCount, laterJunctionCount, isTerminus, lengthM }
}

export const describeBranches = (
  graph: PassengerGraph,
  junctionId: string,
  neighbours: readonly NeighbourRef[]
): BranchDescription[] =>
  neighbours.map((neighbour) => {
    const walked = walkBranch(graph, neighbour.id, junctionId)
    const hub = getHubMembership(neighbour.id)
    const patterns = graph.sequences.filter((sequence) => {
      for (let index = 0; index < sequence.length - 1; index++) {
        const here = sequence[index]
        const next = sequence[index + 1]
        if (
          (here === junctionId && next === neighbour.id) ||
          (here === neighbour.id && next === junctionId)
        ) {
          return true
        }
      }
      return false
    }).length
    return {
      leafId: neighbour.id,
      leafName: neighbour.name,
      downstreamStationCount: walked.stationCount,
      distanceM: neighbour.distanceM ?? (walked.lengthM > 0 ? walked.lengthM : null),
      isTerminus: walked.isTerminus || neighbour.degree === 1,
      laterJunctionCount: walked.laterJunctionCount,
      servicePatternCount: patterns,
      bearingDeg: neighbour.bearingDeg,
      hubIds: hub ? [hub.hubId] : [],
    }
  })
