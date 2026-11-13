import { railPolylinesForLine, railStationsById } from "@/lib/tfl/rail-vehicle-geometry"
import { trainRoutes } from "@/lib/tfl/rail-train-tracker"
import { pickHopPolyline } from "@/lib/tfl/vehicle-progress"
import { hopGraphForRailLine } from "@/lib/tfl/vehicle-hop-graph"

export type HopCoverage = {
  lineId: string
  hops: number
  /** Hops drawn on their own track polyline. */
  onTrack: number
  /** Hops drawn as the straight segment between their two stations. */
  straight: number
  /** Hops with no coordinates for one end: a train there could not be drawn. */
  undrawable: string[]
}

/** Which hops of a line's routes have their own track polyline, and which fall back to a straight segment. */
export const hopCoverage = (lineId: string): HopCoverage => {
  const polylines = railPolylinesForLine(lineId)
  const canonical = hopGraphForRailLine(lineId).canonical
  const coords = railStationsById()
  const seen = new Set<string>()
  const result: HopCoverage = {
    lineId,
    hops: 0,
    onTrack: 0,
    straight: 0,
    undrawable: [],
  }
  for (const route of trainRoutes(lineId))
    for (let i = 1; i < route.stations.length; i++) {
      const from = route.stations[i - 1]!
      const to = route.stations[i]!
      const key = [canonical(from), canonical(to)].sort().join(">")
      if (seen.has(key)) continue
      seen.add(key)
      result.hops++
      if (!coords.get(from) || !coords.get(to)) result.undrawable.push(key)
      else if (pickHopPolyline(polylines, from, to, canonical)) result.onTrack++
      else result.straight++
    }
  return result
}
