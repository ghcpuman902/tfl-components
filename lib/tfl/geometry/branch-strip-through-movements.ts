/**
 * "Permitted movements" hook for `decomposeBranchStripJunctions`.
 *
 * Reuses the same station-id-based route triples the geographic stress
 * layout derives from `LINE_STATION_SEQUENCES`
 * (`lib/tfl/geometry/tfl-sequences-topology.ts`) instead of inventing a
 * second topology: a real ordered route visiting `…a, via, b…` means a
 * passenger can stay on board through `via` from `a` to `b`. Absence of any
 * triple through a station that DOES have data for other triples means that
 * particular pair is not a through-move (Kennington Bank ↔ Battersea).
 */

import { formatStationName } from "@/lib/tfl/diagram-station"
import { getStaticLineSequence } from "@/lib/tfl/line-topology"
import type { ThroughMovementWeight } from "@/lib/tfl/geometry/branch-strip-joins"
import {
  movementsFromPatterns,
  regularRoutePatterns,
} from "@/lib/tfl/geometry/tfl-sequences-topology"
import type { LineSchematic } from "@/lib/tfl/line-schematic"

const nameKey = (name: string): string =>
  formatStationName(name)
    .toLowerCase()
    .replace(/[\u2018\u2019\u02BC']/g, "")
    .replace(/&/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

const pairKey = (a: string, b: string): string =>
  a < b ? `${a}|${b}` : `${b}|${a}`

/**
 * `via ↔ a ↔ b` counts derived from real inbound Regular ordered routes.
 * `viasWithData` distinguishes "no data at all for this station" (fall back
 * to the geometric heuristic) from "we have data and this pair never
 * appears" (confirmed not a through-move).
 */
const stationMovementCounts = (
  lineId: string
): { counts: Map<string, number>; viasWithData: Set<string> } => {
  const patterns = regularRoutePatterns(lineId)
  const movements = movementsFromPatterns(patterns)
  const counts = new Map<string, number>()
  const viasWithData = new Set<string>()
  for (const movement of movements) {
    viasWithData.add(movement.via)
    const key = `${movement.via}::${pairKey(movement.from, movement.to)}`
    counts.set(key, (counts.get(key) ?? 0) + movement.patternIds.length)
  }
  return { counts, viasWithData }
}

/**
 * Best-effort station id per node for a schematic whose node ids are
 * already slugs (hand-authored fixtures). Matches by formatted station
 * name, so duplicate render nodes (Euston bank/cx) both resolve to the same
 * real station.
 */
export const stationIdByNodeIdFromNames = (
  schematic: LineSchematic,
  lineId: string
): ReadonlyMap<string, string> => {
  const sequence = getStaticLineSequence(lineId)
  if (!sequence) return new Map()
  const idByName = new Map<string, string>()
  for (const station of sequence.stations) {
    idByName.set(nameKey(station.name), station.id)
  }
  const result = new Map<string, string>()
  for (const node of schematic.nodes) {
    const stationId = idByName.get(nameKey(node.stationKey ?? node.name))
    if (stationId) result.set(node.id, stationId)
  }
  return result
}

/**
 * Build a `ThroughMovementWeight` for `decomposeBranchStripJunctions` from
 * real ordered-route data, given a node id → station id map.
 */
export const buildThroughMovementWeight = (
  lineId: string,
  stationIdByNodeId: ReadonlyMap<string, string>
): ThroughMovementWeight => {
  const { counts, viasWithData } = stationMovementCounts(lineId)
  return (viaNodeId, neighborAId, neighborBId) => {
    const viaStationId = stationIdByNodeId.get(viaNodeId)
    const aStationId = stationIdByNodeId.get(neighborAId)
    const bStationId = stationIdByNodeId.get(neighborBId)
    if (!viaStationId || !aStationId || !bStationId) return undefined
    if (!viasWithData.has(viaStationId)) return undefined
    if (aStationId === bStationId) return undefined
    const key = `${viaStationId}::${pairKey(aStationId, bStationId)}`
    return counts.get(key) ?? 0
  }
}
