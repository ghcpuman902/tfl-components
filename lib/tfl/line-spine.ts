import { getTflClient } from "@/lib/tfl/client"
import { toDiagramStation } from "@/lib/tfl/diagram-mappers"
import type { DiagramStation } from "@/lib/tfl/diagram-station"
import {
  type LineSpine,
  sliceLineSpineStations,
} from "@/lib/tfl/line-spine-model"
import { resolveDiagramLineColor } from "@/lib/tfl/route-track"
import { getStaticLineSpine } from "@/lib/tfl/static-line-spines"
import { selectLongestOrderedRoute } from "@/lib/tfl/week-ahead-status"

export type { LineSpine } from "@/lib/tfl/line-spine-model"
export { sliceLineSpineStations } from "@/lib/tfl/line-spine-model"

type StopPoolItem = {
  id?: string | null
  name?: string | null
  lines?: { id?: string | null; name?: string | null }[] | null
  modes?: string[] | null
}

const stationsFromOrderedIds = (
  orderedIds: readonly string[],
  byId: Map<string, StopPoolItem>,
  lineId: string
): DiagramStation[] =>
  orderedIds.map((id) => {
    const stop = byId.get(id)
    if (stop) return toDiagramStation(stop, lineId)
    return { id, name: id, interchange: false }
  })

const buildFromStaticSpine = async (
  lineId: string,
  color: string
): Promise<LineSpine | null> => {
  const staticSpine = getStaticLineSpine(lineId)
  if (!staticSpine) return null

  const client = getTflClient()
  try {
    const stops = await client.line.getStopPoints(lineId)
    const byId = new Map<string, StopPoolItem>()
    for (const stop of stops) {
      const id = stop.id ?? stop.naptanId
      if (!id) continue
      byId.set(id, {
        id,
        name: stop.commonName ?? id,
        lines: stop.lines,
        modes: stop.modes,
      })
    }
    const stations = stationsFromOrderedIds(staticSpine.naptanIds, byId, lineId)
    return {
      lineId,
      lineName: staticSpine.lineName,
      lineColor: color,
      stations,
      spineIds: stations.map((s) => s.id),
    }
  } catch {
    const stations = staticSpine.naptanIds.map((id) => ({ id, name: id }))
    return {
      lineId,
      lineName: staticSpine.lineName,
      lineColor: color,
      stations,
      spineIds: [...staticSpine.naptanIds],
    }
  }
}

/**
 * Resolve a linear outbound spine for any TfL line id.
 * Prefer static spines when present; otherwise longest orderedLineRoute.
 */
export const getLineSpine = async (lineId: string): Promise<LineSpine> => {
  const client = getTflClient()
  const color = resolveDiagramLineColor(lineId)

  const staticFirst = getStaticLineSpine(lineId)
  if (staticFirst) {
    const fromStatic = await buildFromStaticSpine(lineId, color)
    if (fromStatic && fromStatic.stations.length > 0) return fromStatic
  }

  try {
    const loadSequence = async (direction: "inbound" | "outbound") =>
      client.line.getRouteSequence({ id: lineId, direction })

    let sequence = await loadSequence("outbound")
    let spine = selectLongestOrderedRoute(sequence.orderedLineRoutes)

    if (!spine?.naptanIds?.length) {
      const inbound = await loadSequence("inbound")
      const inboundSpine = selectLongestOrderedRoute(inbound.orderedLineRoutes)
      if (
        (inboundSpine?.naptanIds?.length ?? 0) > (spine?.naptanIds?.length ?? 0)
      ) {
        sequence = inbound
        spine = inboundSpine
      }
    }

    const orderedIds = spine?.naptanIds ?? []
    const fromSequences =
      sequence.stopPointSequences?.flatMap((seq) => seq.stopPoint ?? []) ?? []
    const stopPool: StopPoolItem[] =
      fromSequences.length > 0 ? fromSequences : (sequence.stations ?? [])

    const byId = new Map<string, StopPoolItem>()
    for (const stop of stopPool) {
      if (stop.id) byId.set(stop.id, stop)
    }

    let stations: DiagramStation[] = []
    if (orderedIds.length > 0) {
      stations = stationsFromOrderedIds(orderedIds, byId, lineId)
    } else if (stopPool.length > 0) {
      const seen = new Set<string>()
      stations = stopPool
        .filter((stop) => {
          const id = stop.id ?? stop.name ?? ""
          if (!id || seen.has(id)) return false
          seen.add(id)
          return true
        })
        .map((stop) => toDiagramStation(stop, lineId))
    }

    if (stations.length === 0) {
      const fallback = await buildFromStaticSpine(lineId, color)
      if (fallback) return fallback
    }

    return {
      lineId,
      lineName:
        sequence.lineName ?? getStaticLineSpine(lineId)?.lineName ?? lineId,
      lineColor: color,
      stations,
      spineIds: stations.map((s) => s.id),
      routeError:
        stations.length === 0
          ? "TfL returned no stop sequence for this line"
          : undefined,
    }
  } catch (error) {
    const fallback = await buildFromStaticSpine(lineId, color)
    if (fallback) return fallback

    return {
      lineId,
      lineName: lineId,
      lineColor: color,
      stations: [],
      spineIds: [],
      routeError:
        error instanceof Error ? error.message : "Could not load route",
    }
  }
}
