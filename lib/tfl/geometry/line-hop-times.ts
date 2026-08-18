export type LineHopTimes = {
  lineId: string
  hops: Record<string, number>
  timedHopCount: number
}

export type LineHopTimesByLine = Record<string, LineHopTimes>

export type LineHopTimesSnapshot = {
  fetchedAt: string
  source: string
  lines: LineHopTimesByLine
}

type TimetableInterval = {
  stopId?: string
  timeToArrival?: number
}

export type TimetableHopSource = {
  timetable?: {
    departureStopId?: string
    routes?: {
      stationIntervals?: {
        intervals?: TimetableInterval[]
      }[]
    }[]
  }
}

export const undirectedHopKey = (left: string, right: string): string =>
  left < right ? `${left}|${right}` : `${right}|${left}`

const stripNodePrefix = (id: string): string =>
  id.startsWith("s:") ? id.slice(2) : id

const median = (values: readonly number[]): number => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2
}

export const hopsFromTimetable = (
  response: TimetableHopSource
): Record<string, number> => {
  const samples = new Map<string, number[]>()
  const add = (from: string, to: string, minutes: number) => {
    if (!from || !to || from === to || minutes <= 0 || minutes > 20) return
    const key = undirectedHopKey(from, to)
    const list = samples.get(key) ?? []
    list.push(minutes)
    samples.set(key, list)
  }

  for (const route of response.timetable?.routes ?? []) {
    for (const interval of route.stationIntervals ?? []) {
      let previousId = response.timetable?.departureStopId
      let previousTime = 0
      for (const stop of interval.intervals ?? []) {
        if (!stop.stopId || stop.timeToArrival == null) continue
        if (previousId) {
          add(previousId, stop.stopId, stop.timeToArrival - previousTime)
        }
        previousId = stop.stopId
        previousTime = stop.timeToArrival
      }
    }
  }

  return Object.fromEntries(
    [...samples].map(([key, values]) => [key, median(values)])
  )
}

export const mergeHopMinutes = (
  ...groups: readonly Record<string, number>[]
): Record<string, number> => {
  const samples = new Map<string, number[]>()
  for (const group of groups) {
    for (const [key, minutes] of Object.entries(group)) {
      const list = samples.get(key) ?? []
      list.push(minutes)
      samples.set(key, list)
    }
  }
  return Object.fromEntries(
    [...samples].map(([key, values]) => [key, median(values)])
  )
}

export const minutesForHop = (
  hops: Record<string, number> | undefined,
  fromId: string | undefined,
  toId: string | undefined,
  canonical: (id: string) => string = (id) => id
): number | undefined => {
  if (!hops || !fromId || !toId) return undefined
  const from = stripNodePrefix(fromId)
  const to = stripNodePrefix(toId)
  const keys = [
    undirectedHopKey(from, to),
    undirectedHopKey(canonical(from), canonical(to)),
  ]
  for (const key of keys) {
    const minutes = hops[key]
    if (minutes != null) return minutes
  }
  return undefined
}

export const edgeLengthsFromHopTimes = (
  edges: readonly { from: string; to: string }[],
  nodeStationId: ReadonlyMap<string, string | undefined>,
  hops: Record<string, number> | undefined,
  canonical: (id: string) => string = (id) => id
): { from: string; to: string; length?: number }[] => {
  const known = edges.flatMap((edge) => {
    const minutes = minutesForHop(
      hops,
      nodeStationId.get(edge.from),
      nodeStationId.get(edge.to),
      canonical
    )
    return minutes != null ? [minutes] : []
  })
  const fallback = median(known) || 1
  return edges.map((edge) => {
    const minutes =
      minutesForHop(
        hops,
        nodeStationId.get(edge.from),
        nodeStationId.get(edge.to),
        canonical
      ) ?? fallback
    return { from: edge.from, to: edge.to, length: minutes }
  })
}
