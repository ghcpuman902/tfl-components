/**
 * Passenger-service adjacency graph, derived independently from raw TfL
 * Route/Sequence station-id sequences. Two stations are adjacent if any
 * ordered route or branch lists them back to back — nothing more.
 */

import { getEvidenceSequences, getRawSequence } from "./raw-data"
import type { StationRef } from "./types"

export type PassengerGraph = {
  lineId: string
  lineName: string
  stationsById: Map<string, string>
  adjacency: Map<string, Set<string>>
  /** Raw id-sequences used as evidence (ordered routes + branches). */
  sequences: string[][]
}

export const buildPassengerGraph = (lineId: string): PassengerGraph | null => {
  const raw = getRawSequence(lineId)
  if (!raw) return null

  const stationsById = new Map<string, string>()
  for (const station of raw.stations) stationsById.set(station.id, station.name)

  const adjacency = new Map<string, Set<string>>()
  const addEdge = (a: string, b: string) => {
    if (a === b) return
    if (!adjacency.has(a)) adjacency.set(a, new Set())
    if (!adjacency.has(b)) adjacency.set(b, new Set())
    adjacency.get(a)!.add(b)
    adjacency.get(b)!.add(a)
  }

  const sequences = getEvidenceSequences(raw)
  for (const ids of sequences) {
    for (let i = 0; i < ids.length - 1; i++) addEdge(ids[i]!, ids[i + 1]!)
  }

  return { lineId: raw.lineId, lineName: raw.lineName, stationsById, adjacency, sequences }
}

export const stationRef = (graph: PassengerGraph, id: string): StationRef => ({
  id,
  name: graph.stationsById.get(id) ?? id,
})

export const degreeOf = (graph: PassengerGraph, id: string): number =>
  graph.adjacency.get(id)?.size ?? 0

/** Stations ordered by degree, highest first — the entry point for "what's non-trivial". */
export const rankStationsByDegree = (
  graph: PassengerGraph
): { id: string; degree: number }[] =>
  [...graph.adjacency.entries()]
    .map(([id, neighbours]) => ({ id, degree: neighbours.size }))
    .sort((a, b) => b.degree - a.degree || a.id.localeCompare(b.id))
