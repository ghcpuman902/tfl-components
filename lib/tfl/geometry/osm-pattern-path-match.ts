/**
 * Join a TfL passenger pattern to the OSM route relation it actually runs
 * on, by matching the relation's ordered stop-position members against the
 * TfL pattern's ordered stations.
 *
 * Why relation membership and not proximity: `contract-track-topology.ts`
 * assigns a station to track by snapping to the nearest surviving vertex
 * within a radius. On shared-track stretches that silently pulls in
 * neighbouring stations that never appear on the service — the clearest
 * case is Waterloo & City, which shares tunnel alignment with other lines
 * near Bank but only ever calls at Waterloo and Bank. An OSM route
 * relation already lists exactly the stops that service calls at, in
 * order, so matching by that membership can't invent a middle station.
 *
 * This does not replace `PatternPathMatch` for Elizabeth line / Overground
 * (those come from an exact Aubin `shape_id`, kept in
 * `lib/tfl/network-model/from-gtfs.ts`). It fills the gap for modes whose
 * GTFS trips have no shape at all: Underground, DLR, Tram.
 */
import {
  matchExternalStopPatterns,
  type CrossSourcePatternMatch,
  type ExternalStopPattern,
} from "@/lib/tfl/cross-source-pattern-matching"
import { getExplorerTubeRailLines } from "@/lib/tfl/explorer/lines-tube-rail"
import type { OsmRouteStopsFile } from "@/lib/tfl/geometry/osm-route-stops"
import { servicePatternEvidenceForLine } from "@/lib/tfl/service-pattern-evidence"

export type OsmMode = "tube" | "dlr" | "tram"

/** `LINE_STATION_SEQUENCES` `modeName` for each supported OSM cache. */
const LINE_MODE_NAME: Record<OsmMode, string> = {
  tube: "tube",
  dlr: "dlr",
  tram: "tram",
}

const STOP_ROLES = new Set(["stop", "stop_entry_only", "stop_exit_only"])

export type OsmRelationPattern = {
  pattern: ExternalStopPattern
  relationId: number
  relationName?: string
}

/** One `ExternalStopPattern` per OSM route relation, in relation member order. */
export const externalPatternsFromOsmRelations = (
  file: OsmRouteStopsFile,
): OsmRelationPattern[] =>
  (file.relations ?? []).flatMap((relation) => {
    const stopNames = relation.stops
      .filter((stop) => STOP_ROLES.has(stop.role))
      .flatMap((stop) => (stop.name ? [stop.name] : []))
    if (stopNames.length < 2) return []
    return [
      {
        pattern: { id: `osm:relation/${relation.relationId}`, stopNames },
        relationId: relation.relationId,
        relationName: relation.tags.name,
      },
    ]
  })

export type OsmPatternPathMatch = CrossSourcePatternMatch & {
  lineId: string
  relationId: number
  relationName?: string
}

/**
 * Match every cached OSM route relation for one mode against every line in
 * that mode's static sequences. A relation only matches a line when its
 * stop order is an exact or limited-stop subsequence of that line's
 * pattern — station membership, never proximity.
 */
export const matchOsmRelationsForMode = (
  mode: OsmMode,
  file: OsmRouteStopsFile,
): OsmPatternPathMatch[] => {
  const modeName = LINE_MODE_NAME[mode]
  const lineIds = getExplorerTubeRailLines()
    .filter((line) => line.modeName === modeName)
    .map((line) => line.id)

  const relationPatterns = externalPatternsFromOsmRelations(file)
  const relationById = new Map(
    relationPatterns.map((entry) => [entry.pattern.id, entry]),
  )

  return lineIds.flatMap((lineId) => {
    const dataset = servicePatternEvidenceForLine(lineId)
    if (!dataset) return []
    return matchExternalStopPatterns(
      dataset,
      relationPatterns.map((entry) => entry.pattern),
    ).map((match) => {
      const relation = relationById.get(match.externalPatternId)
      return {
        ...match,
        lineId,
        relationId: relation?.relationId ?? 0,
        relationName: relation?.relationName,
      }
    })
  })
}
