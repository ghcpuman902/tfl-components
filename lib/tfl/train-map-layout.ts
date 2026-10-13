import { railStationsById } from "@/lib/tfl/rail-vehicle-geometry"
import {
  trainRoutes,
  routeDistanceIndex,
  type TrainMotion,
} from "@/lib/tfl/rail-train-tracker"
import { getStaticLineSequence } from "@/lib/tfl/line-topology"
import { stationHubCanonical } from "@/lib/tfl/vehicle-hop-graph"

export type MapPoint = { x: number; y: number }
export type TrainMapLayout = ReturnType<typeof buildTrainMapLayout>

/** An octilinear elbow keeps the station topology while removing track survey noise. */
export const diagramHop = (a: MapPoint, b: MapPoint): MapPoint[] => {
  const dx = b.x - a.x,
    dy = b.y - a.y
  const diagonal = Math.min(Math.abs(dx), Math.abs(dy))
  const extraX = ((Math.abs(dx) - diagonal) / 2) * Math.sign(dx)
  const extraY = ((Math.abs(dy) - diagonal) / 2) * Math.sign(dy)
  return [
    a,
    { x: a.x + extraX, y: a.y + extraY },
    { x: b.x - extraX, y: b.y - extraY },
    b,
  ]
}

export const pointOnDiagramHop = (
  points: MapPoint[],
  fraction: number
): MapPoint & { angle: number } => {
  const lengths = points
    .slice(1)
    .map((p, i) => Math.hypot(p.x - points[i]!.x, p.y - points[i]!.y))
  let distance =
    lengths.reduce((a, b) => a + b, 0) * Math.min(1, Math.max(0, fraction))
  for (let i = 0; i < lengths.length; i++) {
    const length = lengths[i]!,
      a = points[i]!,
      b = points[i + 1]!
    if (length > 0 && (distance <= length || i === lengths.length - 1)) {
      const f = Math.min(1, distance / length)
      return {
        x: a.x + (b.x - a.x) * f,
        y: a.y + (b.y - a.y) * f,
        angle: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
      }
    }
    distance -= length
  }
  return { ...points.at(-1)!, angle: 0 }
}

export const buildTrainMapLayout = (lineIds: readonly string[]) => {
  const coordinates = railStationsById()
  const nodes = new Map<
    string,
    MapPoint & { id: string; name: string; lines: Set<string> }
  >()
  const edges = new Map<
    string,
    { id: string; lineId: string; points: MapPoint[] }
  >()
  for (const lineId of lineIds) {
    const names = new Map(
      getStaticLineSequence(lineId)?.stations.map((s) => [
        s.id,
        s.name.replace(/ Underground Station| Rail Station/g, ""),
      ])
    )
    for (const route of trainRoutes(lineId)) {
      for (const id of route.stations) {
        const canonical = stationHubCanonical(id),
          coordinate = coordinates.get(id)
        if (!coordinate) continue
        const node = nodes.get(canonical) ?? {
          id: canonical,
          x: coordinate.lon * 6200,
          y: -coordinate.lat * 10000,
          name: names.get(id) ?? id,
          lines: new Set<string>(),
        }
        node.lines.add(lineId)
        nodes.set(canonical, node)
      }
      for (let i = 1; i < route.stations.length; i++) {
        const from = stationHubCanonical(route.stations[i - 1]!),
          to = stationHubCanonical(route.stations[i]!)
        const a = nodes.get(from),
          b = nodes.get(to)
        if (!a || !b) continue
        const id = `${lineId}:${[from, to].sort().join(":")}`
        if (!edges.has(id))
          edges.set(id, { id, lineId, points: diagramHop(a, b) })
      }
    }
  }
  const points = [...nodes.values()]
  const minX = Math.min(...points.map((p) => p.x)),
    maxX = Math.max(...points.map((p) => p.x))
  const minY = Math.min(...points.map((p) => p.y)),
    maxY = Math.max(...points.map((p) => p.y))
  return {
    nodes,
    edges: [...edges.values()],
    bounds: {
      x: minX - 160,
      y: minY - 80,
      width: maxX - minX + 320,
      height: maxY - minY + 160,
    },
  }
}

export const trainDiagramPoint = (
  layout: TrainMapLayout,
  motion: TrainMotion
) => {
  const i = routeDistanceIndex(motion.route, motion.distance)
  const from = layout.nodes.get(
    stationHubCanonical(motion.route.stations[i - 1]!)
  )
  const to = layout.nodes.get(stationHubCanonical(motion.route.stations[i]!))
  if (!from || !to) return undefined
  const fraction =
    (motion.distance - motion.route.metres[i - 1]!) /
    (motion.route.metres[i]! - motion.route.metres[i - 1]!)
  return pointOnDiagramHop(diagramHop(from, to), fraction)
}
