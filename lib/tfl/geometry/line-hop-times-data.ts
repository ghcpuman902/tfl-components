import { LINE_STATION_SEQUENCES } from "tfl-ts"
import { hopGraphForRailLine } from "@/lib/tfl/vehicle-hop-graph"
import {
  hopsFromTimetable,
  mergeHopMinutes,
  undirectedHopKey,
  type LineHopTimesByLine,
  type LineHopTimesSnapshot,
  type TimetableHopSource,
} from "@/lib/tfl/geometry/line-hop-times"

export type { LineHopTimesSnapshot }

type HopTimesClient = {
  line: {
    getTimetable: (query: {
      id: string
      fromStopPointId: string
    }) => Promise<TimetableHopSource>
  }
  journey: {
    plan: (query: {
      from: string
      to: string
      mode: string[]
      journeyPreference: "LeastTime"
    }) => Promise<{ journeys?: { duration?: number }[] }>
  }
}

type StaticRoute = {
  serviceType?: string
  stationIds: readonly string[]
}

type StaticSequence = {
  lineId: string
  modeName?: string
  orderedRoutes: readonly StaticRoute[]
}

const SKIP_MODES = new Set(["river-bus"])
const JOURNEY_CONCURRENCY = 6
const MAX_HOP_MINUTES = 20

const mapPool = async <T, R>(
  items: readonly T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> => {
  const results: R[] = []
  let cursor = 0
  const workerCount = Math.min(concurrency, items.length)
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (cursor < items.length) {
        const index = cursor
        cursor += 1
        results[index] = await fn(items[index]!)
      }
    })
  )
  return results
}

const timetableOrigins = (sequence: StaticSequence): string[] => {
  const regular = sequence.orderedRoutes.filter(
    (route) => !route.serviceType || route.serviceType === "Regular"
  )
  const routes = regular.length > 0 ? regular : sequence.orderedRoutes
  return [
    ...new Set(
      routes.flatMap((route) => {
        const first = route.stationIds[0]
        return first ? [first] : []
      })
    ),
  ]
}

const uniqueAdjacentHops = (
  sequence: StaticSequence
): { from: string; to: string }[] => {
  const seen = new Set<string>()
  const hops: { from: string; to: string }[] = []
  for (const route of sequence.orderedRoutes) {
    for (let index = 0; index < route.stationIds.length - 1; index += 1) {
      const from = route.stationIds[index]!
      const to = route.stationIds[index + 1]!
      const key = undirectedHopKey(from, to)
      if (seen.has(key)) continue
      seen.add(key)
      hops.push({ from, to })
    }
  }
  return hops
}

const timetableHopsForLine = async (
  client: HopTimesClient,
  lineId: string,
  origins: readonly string[]
): Promise<Record<string, number>> => {
  const groups = await mapPool(origins, 4, async (fromStopPointId) => {
    try {
      const response = await client.line.getTimetable({
        id: lineId,
        fromStopPointId,
      })
      return hopsFromTimetable(response)
    } catch {
      return {}
    }
  })
  return mergeHopMinutes(...groups)
}

const journeyMinutesForHop = async (
  client: HopTimesClient,
  from: string,
  to: string,
  modeName: string
): Promise<number | null> => {
  try {
    const planned = await client.journey.plan({
      from,
      to,
      mode: [modeName],
      journeyPreference: "LeastTime",
    })
    const duration = planned.journeys?.[0]?.duration
    if (duration == null || duration <= 0 || duration > MAX_HOP_MINUTES) {
      return null
    }
    return duration
  } catch {
    return null
  }
}

const hopTimesForLine = async (
  client: HopTimesClient,
  sequence: StaticSequence
): Promise<Record<string, number>> => {
  const origins = timetableOrigins(sequence)
  const fromTimetable = await timetableHopsForLine(
    client,
    sequence.lineId,
    origins
  )
  const graph = hopGraphForRailLine(sequence.lineId)
  const missing = uniqueAdjacentHops(sequence).filter((hop) => {
    const key = undirectedHopKey(
      graph.canonical(hop.from),
      graph.canonical(hop.to)
    )
    const raw = undirectedHopKey(hop.from, hop.to)
    return fromTimetable[key] == null && fromTimetable[raw] == null
  })
  if (missing.length === 0 || !sequence.modeName) return fromTimetable

  const journeyHops: Record<string, number> = {}
  await mapPool(missing, JOURNEY_CONCURRENCY, async (hop) => {
    const minutes = await journeyMinutesForHop(
      client,
      hop.from,
      hop.to,
      sequence.modeName!
    )
    if (minutes == null) return
    journeyHops[undirectedHopKey(hop.from, hop.to)] = minutes
  })
  return mergeHopMinutes(fromTimetable, journeyHops)
}

/** One-shot TfL fetch for the on-disk hop-time snapshot. Not used at render. */
export const fetchLineHopTimes = async (
  client: HopTimesClient
): Promise<LineHopTimesSnapshot> => {
  const sequences = Object.values(
    LINE_STATION_SEQUENCES as Record<string, StaticSequence>
  ).filter((sequence) => !SKIP_MODES.has(sequence.modeName ?? ""))

  const lines: LineHopTimesByLine = {}
  await mapPool(sequences, 3, async (sequence) => {
    const hops = await hopTimesForLine(client, sequence)
    const timedHopCount = Object.keys(hops).length
    lines[sequence.lineId] = {
      lineId: sequence.lineId,
      hops,
      timedHopCount,
    }
    console.log(`  ${sequence.lineId}: ${timedHopCount} hops`)
  })

  return {
    fetchedAt: new Date().toISOString().slice(0, 10),
    source:
      "tfl-ts line.getTimetable, with journey.plan for hops the timetable omits",
    lines,
  }
}
