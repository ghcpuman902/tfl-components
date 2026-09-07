/**
 * Orchestrates the independent per-line diagnostic: passenger graph →
 * degree → movement matrix → archetype → candidate decomposition, plus the
 * separate service-pattern catalogue. See the sibling modules for how each
 * step is derived; this file only wires them together and rolls up findings.
 */

import { stationCoord } from "@/lib/tfl/station-coords"
import { classifyArchetype, buildDecomposition } from "./decomposition"
import { buildMovementMatrix, countTripleEvidence, movementComponentsAsRefs } from "./movement-matrix"
import {
  extractStubs,
  extractThroughCorridors,
  isMovementSplit,
  movementSplitNote,
} from "./corridors"
import {
  compassBearingDeg,
  diagnoseOrientation,
  greatCircleDistanceM,
  orderByBearing,
  orientationNotes,
} from "./orientation"
import {
  buildPassengerGraph,
  degreeOf,
  rankStationsByDegree,
  stationRef,
  type PassengerGraph,
} from "./passenger-graph"
import { getHubMembership, getRawSequence } from "./raw-data"
import { derivePatterns } from "./service-patterns"
import type {
  JunctionArchetype,
  JunctionReport,
  LineAnalysis,
  LineFindings,
  NeighbourRef,
  ServicePatternReport,
} from "./types"

const TRIVIAL_DEGREE_CEILING = 2

const neighbourRef = (
  graph: PassengerGraph,
  neighbourId: string,
  viaId: string
): NeighbourRef => {
  const degree = degreeOf(graph, neighbourId)
  const otherNeighbours = [...(graph.adjacency.get(neighbourId) ?? [])].filter((id) => id !== viaId)
  const beyond =
    degree === 2 && otherNeighbours.length === 1 ? stationRef(graph, otherNeighbours[0]!) : null
  const hub = stationCoord(viaId)
  const coord = stationCoord(neighbourId)
  const bearingDeg = hub && coord ? compassBearingDeg(hub, coord) : null
  const distanceM = hub && coord ? greatCircleDistanceM(hub, coord) : null
  return { ...stationRef(graph, neighbourId), degree, beyond, bearingDeg, distanceM }
}

const buildJunctionReport = (graph: PassengerGraph, stationId: string): JunctionReport => {
  const degree = degreeOf(graph, stationId)
  const { pairs, components } = buildMovementMatrix(graph, stationId)
  const supportedPairCount = pairs.filter((pair) => pair.supported).length
  const archetype = classifyArchetype(degree, supportedPairCount, components.length)
  const neighbourIds = [...(graph.adjacency.get(stationId) ?? [])].sort()
  const neighbours = orderByBearing(neighbourIds.map((id) => neighbourRef(graph, id, stationId)))
  const supportedPairs: [string, string][] = pairs
    .filter((pair) => pair.supported)
    .map((pair) => [pair.a.id, pair.b.id])
  const orientation = diagnoseOrientation(neighbours, supportedPairs)
  const componentRefs = movementComponentsAsRefs(graph, components)
  const corridors = extractThroughCorridors(neighbours, pairs, componentRefs)
  const stubs = extractStubs(neighbours, componentRefs)
  const movementSplit = isMovementSplit(neighbours, corridors, stubs)
  const conversionNotes = [
    ...(movementSplit ? [movementSplitNote(corridors, stubs)] : []),
    // Compass order and same-direction spacing only apply to a vertex that
    // is still one after the movement split.
    ...(!movementSplit && orientation ? orientationNotes(neighbours, orientation) : []),
  ]
  const decomposition =
    degree > 3 && components.length === 1
      ? buildDecomposition(graph, stationId, neighbourIds)
      : null

  const warnings: string[] = []
  if (archetype === "isolated-degree-3") {
    warnings.push(
      "No pair of incident edges shares a through-service in the source data — check whether this is a genuine terminus cluster or a Route/Sequence gap."
    )
  }
  if (archetype === "non-through-degree-2" && !movementSplit) {
    warnings.push(
      "Degree 2 but no ordered route runs through both neighbours — treated as a junction, not an ordinary through-station."
    )
  }
  if (archetype === "independent-corridors") {
    for (const component of components) {
      if (component.length === 1) {
        const onlyId = component[0]!
        warnings.push(
          `${graph.stationsById.get(onlyId) ?? onlyId} has no supported through-movement at this station (dead-end incident, or a service that starts/ends here).`
        )
      }
    }
  }

  return {
    station: stationRef(graph, stationId),
    degree,
    neighbours,
    matrix: pairs,
    unsupportedPairCount: pairs.length - supportedPairCount,
    archetype,
    decomposition,
    movementComponents: componentRefs,
    corridors,
    stubs,
    hub: getHubMembership(stationId),
    orientation,
    conversionNotes,
    warnings,
    evidence: "tfl-route-sequence",
  }
}

const summariseArchetypes = (
  junctions: readonly JunctionReport[]
): Partial<Record<JunctionArchetype, number>> => {
  const counts: Partial<Record<JunctionArchetype, number>> = {}
  for (const junction of junctions) {
    counts[junction.archetype] = (counts[junction.archetype] ?? 0) + 1
  }
  return counts
}

const buildFindings = (
  totalStations: number,
  junctions: readonly JunctionReport[],
  patterns: readonly ServicePatternReport[]
): LineFindings => {
  const warnings = junctions.flatMap((junction) =>
    junction.warnings.map((warning) => `${junction.station.name}: ${warning}`)
  )
  return {
    totalStations,
    trivialStationCount: totalStations - junctions.length,
    junctionCount: junctions.length,
    archetypeCounts: summariseArchetypes(junctions),
    expansionCandidateCount: junctions.filter((junction) => junction.archetype === "chained-junction")
      .length,
    splitCandidateCount: junctions.filter((junction) =>
      isMovementSplit(junction.neighbours, junction.corridors, junction.stubs)
    ).length,
    patternCount: patterns.length,
    irregularPatternCount: patterns.filter((pattern) => !pattern.isDominant).length,
    skipPatternCount: patterns.filter((pattern) => pattern.relation === "skip-variant").length,
    orientationConflictCount: junctions.filter(
      (junction) => junction.orientation?.crossingMinAlternatesSides
    ).length,
    sameDirectionPairCount: junctions.reduce(
      (total, junction) => total + (junction.orientation?.sameDirectionPairs.length ?? 0),
      0
    ),
    warnings,
  }
}

export const analyzeLine = (lineId: string): LineAnalysis | null => {
  const graph = buildPassengerGraph(lineId)
  const raw = getRawSequence(lineId)
  if (!graph || !raw) return null

  const ranked = rankStationsByDegree(graph)
  const junctions = ranked
    .filter((entry) => {
      if (entry.degree > TRIVIAL_DEGREE_CEILING) return true
      // Degree 1 is always a terminus. Degree 2 is ordinary only when the
      // sole pair actually through-runs — Hainault / Heathrow T4 are two
      // bonded termini.
      if (entry.degree !== 2) return false
      const [a, b] = [...(graph.adjacency.get(entry.id) ?? [])]
      if (!a || !b) return false
      return countTripleEvidence(graph.sequences, entry.id, a, b) === 0
    })
    .map((entry) => buildJunctionReport(graph, entry.id))

  const patterns = derivePatterns(lineId)

  return {
    lineId: graph.lineId,
    lineName: graph.lineName,
    modeName: raw.modeName,
    totalStations: graph.stationsById.size,
    junctions,
    patterns,
    findings: buildFindings(graph.stationsById.size, junctions, patterns),
  }
}
