import { formatStationName } from "@/lib/tfl/diagram-station"
import type { TransitGeometryBundle, TransitMode } from "@/lib/tfl/geography-types"
import type {
  ContractedEdge,
  ContractedNode,
  ContractedTopology,
} from "@/lib/tfl/geometry/contract-track-topology"
import type { DirectedTopologyMovement } from "@/lib/tfl/geometry/topology-movements"
import type { NetworkModelSnapshot } from "@/lib/tfl/network-model/from-gtfs"
import type {
  Line,
  PatternCalendar,
  PatternFrequency,
  PatternPathMatch,
  PermittedMovement,
  PhysicalPath,
  ServicePattern,
  Station,
  StationHub,
  Weekday,
} from "@/lib/tfl/network-model/types"

export type LineNetworkSlice = {
  line: Line
  stations: Station[]
  hubs: StationHub[]
  patterns: ServicePattern[]
  calendars: PatternCalendar[]
  frequencies: PatternFrequency[]
  paths: PhysicalPath[]
  pathMatches: PatternPathMatch[]
  movements: PermittedMovement[]
}

export type NetworkModelManifest = {
  publisher: string
  publisherUrl?: string
  retrievedAt: string
  feedVersion: string
  feedStartDate: string
  feedEndDate: string
  counts: Record<string, number>
}

const MODE_BY_LINE_MODE: Record<string, TransitMode | undefined> = {
  Underground: "tube",
  DLR: "dlr",
  Tram: "tram",
  "Elizabeth line": "elizabeth",
  Overground: "overground",
}

export const transitModeForSnapshotLine = (
  line: Line,
): TransitMode | undefined => MODE_BY_LINE_MODE[line.mode]

const stationNodeId = (stationId: string): string => `s:${stationId}`

const MERGE_STATION_M = 250

const stationDisplayKey = (name: string): string =>
  formatStationName(name)
    .replace(/^London\s+/i, "")
    .toLowerCase()

const stationDistanceM = (left: Station, right: Station): number => {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180
  const dLat = toRad(right.lat - left.lat)
  const dLon = toRad(right.lon - left.lon)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(left.lat)) *
      Math.cos(toRad(right.lat)) *
      Math.sin(dLon / 2) ** 2
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(a)))
}

const preferStation = (cluster: readonly Station[]): Station =>
  cluster.find((station) => station.id.startsWith("940GZZ")) ??
  cluster.find((station) => station.id.startsWith("910G")) ??
  cluster[0]!

export const mergeSnapshotStations = (
  stations: readonly Station[],
): {
  canonicalId: (id: string) => string
  stations: Station[]
} => {
  const byKey = new Map<string, Station[]>()
  for (const station of stations) {
    const key = stationDisplayKey(station.name)
    const list = byKey.get(key) ?? []
    list.push(station)
    byKey.set(key, list)
  }
  const canonicalOf = new Map<string, string>()
  const merged: Station[] = []
  for (const group of byKey.values()) {
    const clusters: Station[][] = []
    for (const station of group) {
      const cluster = clusters.find((candidate) =>
        candidate.some(
          (other) => stationDistanceM(station, other) <= MERGE_STATION_M,
        ),
      )
      if (cluster) cluster.push(station)
      else clusters.push([station])
    }
    for (const cluster of clusters) {
      const preferred = preferStation(cluster)
      merged.push({
        ...preferred,
        name: formatStationName(preferred.name).replace(/^London\s+/i, ""),
      })
      for (const station of cluster) {
        canonicalOf.set(station.id, preferred.id)
      }
    }
  }
  return {
    canonicalId: (id) => canonicalOf.get(id) ?? id,
    stations: merged,
  }
}

const hopKey = (left: string, right: string): string =>
  left < right ? `${left}|${right}` : `${right}|${left}`

const WEEKDAYS: readonly Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
]

const isWeekdayCalendar = (days: readonly Weekday[]): boolean =>
  days.some((day) => WEEKDAYS.includes(day))

const isDaytimeWeekdayWindow = (timeWindow: string): boolean =>
  timeWindow === "weekday 07:00–09:30" ||
  timeWindow === "weekday 09:30–16:00" ||
  timeWindow === "weekday 16:00–19:00"

const isWeekdayWindow = (timeWindow: string): boolean =>
  timeWindow.startsWith("weekday")

export const isTimetableSkip = (
  service: ContractedEdge["service"],
): boolean => service === "fast" || service === "occasional"

export const classifySkipHop = (
  calendars: readonly PatternCalendar[],
  frequencies: readonly PatternFrequency[],
): "fast" | "occasional" => {
  const weekdayPatternIds = new Set(
    calendars
      .filter((row) => isWeekdayCalendar(row.daysOfWeek))
      .map((row) => row.patternId),
  )
  const hasDaytimeHeadway = frequencies.some(
    (row) =>
      weekdayPatternIds.has(row.patternId) &&
      row.headwaySeconds != null &&
      isDaytimeWeekdayWindow(row.timeWindow),
  )
  return hasDaytimeHeadway ? "fast" : "occasional"
}

const mappedCalls = (
  pattern: ServicePattern,
  canonicalId: (id: string) => string,
): string[] => {
  const ids: string[] = []
  for (const raw of pattern.callIds) {
    const id = canonicalId(raw)
    if (ids[ids.length - 1] !== id) ids.push(id)
  }
  return ids
}

export const sliceNetworkModel = (
  snapshot: NetworkModelSnapshot,
  lineId: string,
): LineNetworkSlice | null => {
  const line = snapshot.lines.find((entry) => entry.id === lineId)
  if (!line) return null
  const patterns = snapshot.patterns.filter((pattern) => pattern.lineId === lineId)
  const patternIds = new Set(patterns.map((pattern) => pattern.id))
  const callIds = new Set(patterns.flatMap((pattern) => pattern.callIds))
  const pathIds = new Set(
    snapshot.pathMatches
      .filter((match) => patternIds.has(match.patternId))
      .map((match) => match.pathId),
  )
  const stations = snapshot.stations.filter((station) => callIds.has(station.id))
  const stationIds = new Set(stations.map((station) => station.id))
  return {
    line,
    stations,
    hubs: snapshot.hubs.filter(
      (hub) =>
        stationIds.has(hub.id) ||
        hub.memberStationIds.some((id) => stationIds.has(id)),
    ),
    patterns,
    calendars: snapshot.calendars.filter((row) => patternIds.has(row.patternId)),
    frequencies: snapshot.frequencies.filter((row) =>
      patternIds.has(row.patternId),
    ),
    paths: snapshot.paths.filter((path) => pathIds.has(path.id)),
    pathMatches: snapshot.pathMatches.filter((match) =>
      patternIds.has(match.patternId),
    ),
    movements: snapshot.movements.filter((movement) =>
      movement.patternIds.some((patternId) => patternIds.has(patternId)),
    ),
  }
}

export const snapshotPassengerTopology = (
  slice: LineNetworkSlice,
): ContractedTopology => {
  const merged = mergeSnapshotStations(slice.stations)
  const consecutive = new Map<string, string[]>()
  const skippedOver = new Set<string>()
  const spineNeighbors = new Map<string, Set<string>>()
  const calendarsByPattern = new Map(
    slice.calendars.map((row) => [row.patternId, row]),
  )
  const frequenciesByPattern = new Map<string, PatternFrequency[]>()
  for (const row of slice.frequencies) {
    const list = frequenciesByPattern.get(row.patternId) ?? []
    list.push(row)
    frequenciesByPattern.set(row.patternId, list)
  }

  for (const pattern of slice.patterns) {
    const calls = mappedCalls(pattern, merged.canonicalId)
    for (let index = 0; index < calls.length - 1; index += 1) {
      const key = hopKey(calls[index]!, calls[index + 1]!)
      const supporters = consecutive.get(key) ?? []
      supporters.push(pattern.id)
      consecutive.set(key, supporters)
    }
    for (let start = 0; start < calls.length - 2; start += 1) {
      for (let end = start + 2; end < calls.length; end += 1) {
        skippedOver.add(hopKey(calls[start]!, calls[end]!))
      }
    }
  }

  const addSpine = (from: string, to: string) => {
    const fromSet = spineNeighbors.get(from) ?? new Set<string>()
    const toSet = spineNeighbors.get(to) ?? new Set<string>()
    fromSet.add(to)
    toSet.add(from)
    spineNeighbors.set(from, fromSet)
    spineNeighbors.set(to, toSet)
  }

  const hops = [...consecutive.entries()].map(([key, patternIds]) => {
    const [left, right] = key.split("|") as [string, string]
    if (!skippedOver.has(key)) {
      addSpine(left, right)
      return {
        left,
        right,
        service: "spine" as const,
        serviceNote: "Usual passenger hop on this corridor.",
      }
    }
    const calendars = patternIds.flatMap((id) => {
      const row = calendarsByPattern.get(id)
      return row ? [row] : []
    })
    const frequencies = patternIds.flatMap(
      (id) => frequenciesByPattern.get(id) ?? [],
    )
    const service = classifySkipHop(calendars, frequencies)
    return {
      left,
      right,
      service,
      serviceNote: skipHopNote(service, calendars, frequencies),
    }
  })

  const usedIds = new Set(hops.flatMap((hop) => [hop.left, hop.right]))
  const byId = new Map(merged.stations.map((station) => [station.id, station]))
  const nodes: ContractedNode[] = []
  for (const stationId of usedIds) {
    const station = byId.get(stationId)
    if (!station) continue
    const degree = spineNeighbors.get(stationId)?.size ?? 0
    nodes.push({
      id: stationNodeId(stationId),
      coordinates: [station.lon, station.lat],
      stationId,
      stationName: formatStationName(station.name),
      kind: degree <= 1 ? "terminus" : "station",
    })
  }

  const nodeIds = new Set(nodes.map((node) => node.id))
  const edges: ContractedEdge[] = hops.flatMap((hop, index) => {
    const from = stationNodeId(hop.left)
    const to = stationNodeId(hop.right)
    if (!nodeIds.has(from) || !nodeIds.has(to)) return []
    return [
      {
        id: `${slice.line.id}-gtfs-e${index}`,
        from,
        to,
        featureId: `${slice.line.id}-gtfs`,
        service: hop.service,
        serviceNote: hop.serviceNote,
      },
    ]
  })
  return { nodes, edges }
}

export const snapshotMovementsForTopology = (
  slice: LineNetworkSlice,
  topology: ContractedTopology,
): DirectedTopologyMovement[] => {
  const merged = mergeSnapshotStations(slice.stations)
  const nodeByStationId = new Map<string, string>()
  for (const node of topology.nodes) {
    if (!node.stationId) continue
    nodeByStationId.set(node.stationId, node.id)
  }
  for (const station of slice.stations) {
    const canon = merged.canonicalId(station.id)
    const nodeId = nodeByStationId.get(canon)
    if (nodeId) nodeByStationId.set(station.id, nodeId)
  }
  const byNodeTriplet = new Map<string, DirectedTopologyMovement>()
  for (const movement of slice.movements) {
    const from = nodeByStationId.get(movement.fromStationId)
    const via = nodeByStationId.get(movement.viaStationId)
    const to = nodeByStationId.get(movement.toStationId)
    if (!from || !via || !to || from === via || via === to) continue
    const key = `${from}|${via}|${to}`
    const existing = byNodeTriplet.get(key)
    if (existing) {
      for (const patternId of movement.patternIds) {
        if (!existing.patternIds.includes(patternId)) {
          existing.patternIds.push(patternId)
        }
      }
      continue
    }
    byNodeTriplet.set(key, {
      id: key,
      from,
      via,
      to,
      patternIds: [...movement.patternIds],
      source: "tfl-station-pattern",
      confidence: "declared",
    })
  }
  return [...byNodeTriplet.values()]
}

export const snapshotPathsBundle = (
  slice: LineNetworkSlice,
): TransitGeometryBundle | null => {
  if (slice.paths.length === 0) return null
  return {
    lines: {
      type: "FeatureCollection",
      features: slice.paths.map((path) => ({
        type: "Feature",
        id: path.id,
        properties: {
          featureId: path.id,
          lineId: slice.line.id,
          lineName: slice.line.longName || slice.line.shortName,
          color: slice.line.color,
        },
        geometry: path.geometry,
      })),
    },
    stations: {
      type: "FeatureCollection",
      features: slice.stations.map((station) => ({
        type: "Feature",
        id: station.id,
        properties: {
          featureId: station.id,
          name: station.name,
          label: formatStationName(station.name),
          lineIds: [slice.line.id],
        },
        geometry: {
          type: "Point",
          coordinates: [station.lon, station.lat],
        },
      })),
    },
  }
}

const WEEKDAY_LABEL: Record<Weekday, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
}

export const formatDaysOfWeek = (days: readonly Weekday[]): string => {
  const keys: Weekday[] = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ]
  const present = keys.filter((day) => days.includes(day))
  if (
    present.length === 5 &&
    present[0] === "monday" &&
    present[4] === "friday"
  ) {
    return "Mon–Fri"
  }
  if (present.length === 7) return "Daily"
  return present.map((day) => WEEKDAY_LABEL[day]).join("·")
}

export const formatHeadway = (seconds: number | undefined): string => {
  if (seconds == null) return "—"
  const minutes = Math.round(seconds / 60)
  return minutes <= 0 ? `${seconds}s` : `${minutes} min`
}

export const skipHopNote = (
  service: "fast" | "occasional",
  calendars: readonly PatternCalendar[],
  frequencies: readonly PatternFrequency[],
): string => {
  const days = [
    ...new Set(calendars.flatMap((row) => row.daysOfWeek)),
  ] as Weekday[]
  const dayLabel = days.length > 0 ? formatDaysOfWeek(days) : null
  const weekdayPatternIds = new Set(
    calendars
      .filter((row) => isWeekdayCalendar(row.daysOfWeek))
      .map((row) => row.patternId),
  )
  const daytimeSeconds = frequencies
    .filter(
      (row) =>
        weekdayPatternIds.has(row.patternId) &&
        row.headwaySeconds != null &&
        isDaytimeWeekdayWindow(row.timeWindow),
    )
    .reduce<number | undefined>(
      (best, row) =>
        best == null || (row.headwaySeconds ?? Infinity) < best
          ? row.headwaySeconds
          : best,
      undefined,
    )
  const hasEveningOnly =
    daytimeSeconds == null &&
    frequencies.some(
      (row) =>
        weekdayPatternIds.has(row.patternId) &&
        row.headwaySeconds != null &&
        isWeekdayWindow(row.timeWindow),
    )
  if (service === "fast") {
    const peak =
      daytimeSeconds != null ? ` · peak ${formatHeadway(daytimeSeconds)}` : ""
    return dayLabel
      ? `Regular scheduled skip · ${dayLabel}${peak}`
      : "Regular scheduled skip"
  }
  if (hasEveningOnly) {
    return "Evening or weekend skip · not a daytime service"
  }
  return dayLabel
    ? `Occasional or weekend-only · ${dayLabel}`
    : "Occasional or weekend-only"
}

export const patternLabel = (
  pattern: ServicePattern,
  stations: readonly Station[],
): string => {
  const byId = new Map(stations.map((station) => [station.id, station.name]))
  const first = pattern.callIds[0]
  const last = pattern.callIds[pattern.callIds.length - 1]
  const from = first ? formatStationName(byId.get(first) ?? first) : "?"
  const to = last ? formatStationName(byId.get(last) ?? last) : "?"
  return `${from} → ${to}`
}
