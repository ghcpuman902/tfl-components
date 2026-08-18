import { formatStationName } from "@/lib/tfl/diagram-station"
import { getStaticLineSequence } from "@/lib/tfl/line-topology"
import { hopGraphForRailLine } from "@/lib/tfl/vehicle-hop-graph"

export type ServicePatternEvidence = {
  id: string
  source: "tfl-static-sequence"
  name: string
  direction: string
  serviceType: string
  stationIds: string[]
  stationNames: string[]
}

export type StationMovementEvidence = {
  id: string
  fromStationId: string
  viaStationId: string
  toStationId: string
  patternIds: string[]
}

export type DirectionPairEvidence = {
  id: string
  patternIds: string[]
  paired: boolean
}

export type EvidenceField = {
  field: string
  state: "present" | "partial" | "missing"
  source: string
  note: string
}

export type ServicePatternDataset = {
  lineId: string
  lineName: string
  stationCount: number
  branchSegmentCount: number
  patterns: ServicePatternEvidence[]
  movements: StationMovementEvidence[]
  directionPairs: DirectionPairEvidence[]
  fields: EvidenceField[]
}

const displayRouteName = (name: string): string =>
  name
    .replace(/\s*&harr;\s*/g, " ↔ ")
    .replace(/\s+/g, " ")
    .trim()

const reverseKey = (stationIds: readonly string[]): string =>
  [...stationIds].reverse().join("\0")

const directionPairsFor = (
  patterns: readonly ServicePatternEvidence[]
): DirectionPairEvidence[] => {
  const bySequence = new Map<string, ServicePatternEvidence[]>()
  for (const pattern of patterns) {
    const key = pattern.stationIds.join("\0")
    const entries = bySequence.get(key) ?? []
    entries.push(pattern)
    bySequence.set(key, entries)
  }

  const used = new Set<string>()
  const pairs: DirectionPairEvidence[] = []
  for (const pattern of patterns) {
    if (used.has(pattern.id)) continue
    const reverse = bySequence
      .get(reverseKey(pattern.stationIds))
      ?.find(
        (candidate) =>
          !used.has(candidate.id) &&
          candidate.id !== pattern.id &&
          candidate.direction !== pattern.direction
      )
    used.add(pattern.id)
    if (reverse) used.add(reverse.id)
    const patternIds = reverse ? [pattern.id, reverse.id] : [pattern.id]
    pairs.push({
      id: patternIds.join("|"),
      patternIds,
      paired: Boolean(reverse),
    })
  }
  return pairs
}

const movementsFor = (
  lineId: string,
  patterns: readonly ServicePatternEvidence[]
): StationMovementEvidence[] => {
  const canonical = hopGraphForRailLine(lineId).canonical
  const byKey = new Map<string, StationMovementEvidence>()

  for (const pattern of patterns) {
    const stationIds = pattern.stationIds.map(canonical)
    for (let index = 1; index < stationIds.length - 1; index += 1) {
      const fromStationId = stationIds[index - 1]!
      const viaStationId = stationIds[index]!
      const toStationId = stationIds[index + 1]!
      if (
        fromStationId === viaStationId ||
        viaStationId === toStationId ||
        fromStationId === toStationId
      ) {
        continue
      }
      const key = `${fromStationId}|${viaStationId}|${toStationId}`
      const movement = byKey.get(key) ?? {
        id: key,
        fromStationId,
        viaStationId,
        toStationId,
        patternIds: [],
      }
      if (!movement.patternIds.includes(pattern.id)) {
        movement.patternIds.push(pattern.id)
      }
      byKey.set(key, movement)
    }
  }

  return [...byKey.values()]
}

export const servicePatternEvidenceForLine = (
  lineId: string
): ServicePatternDataset | null => {
  const sequence = getStaticLineSequence(lineId)
  if (!sequence) return null
  const stationNames = new Map(
    sequence.stations.map((station) => [
      station.id,
      formatStationName(station.name),
    ])
  )
  const patterns = sequence.orderedRoutes.map((route, index) => ({
    id: `tfl:${lineId}:${route.direction}:${index + 1}`,
    source: "tfl-static-sequence" as const,
    name: displayRouteName(route.name),
    direction: route.direction,
    serviceType: route.serviceType,
    stationIds: [...route.stationIds],
    stationNames: route.stationIds.map(
      (stationId) => stationNames.get(stationId) ?? stationId
    ),
  }))

  return {
    lineId: sequence.lineId,
    lineName: sequence.lineName,
    stationCount: sequence.stations.length,
    branchSegmentCount: sequence.branches.length,
    patterns,
    movements: movementsFor(lineId, patterns),
    directionPairs: directionPairsFor(patterns),
    fields: [
      {
        field: "Ordered station patterns",
        state: "present",
        source: "tfl-ts LINE_STATION_SEQUENCES",
        note: "Direction, service type, branch links, and ordered station ids are present.",
      },
      {
        field: "Physical route geometry",
        state: "present",
        source: "OSM route relations",
        note: "Geometry exists as separate route-relation variants, but it is not yet matched one-to-one with the TfL patterns.",
      },
      {
        field: "Calendar and time windows",
        state: "missing",
        source: "No static timetable calendar in this repository",
        note: "Regular does not mean daily, frequent, or canonical. Weekend and peak-only claims need another source or a dated editorial rule.",
      },
      {
        field: "Frequency and typicality",
        state: "missing",
        source: "No trip-level timetable in this repository",
        note: "Relation count and ordered-route count must not be treated as trains per hour.",
      },
      {
        field: "Editorial map priority",
        state: "missing",
        source: "Renderer policy not yet authored",
        note: "The data does not say which pattern belongs on a carriage, platform, network, or geographic map.",
      },
    ],
  }
}
