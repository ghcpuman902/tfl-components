import { TFL_BLUE } from "@/lib/tfl/brand-colours"
import { getLineColourToken } from "@/lib/tfl/line-colour-map"
import type {
  Line,
  PatternCalendar,
  PatternCall,
  PatternFrequency,
  PatternPathMatch,
  PermittedMovement,
  PhysicalPath,
  ServicePattern,
  Station,
  StationHub,
  Weekday,
} from "@/lib/tfl/network-model/types"

/** Agencies that belong in the small TfL rail snapshot. */
export const KEPT_AGENCY_IDS = [
  "LULD",
  "LDLR",
  "TRAM",
  "IFSC",
  "=XR",
  "=LO",
] as const

export const KEPT_AGENCY_ID_SET = new Set<string>(KEPT_AGENCY_IDS)

/** GTFS extended route_type for rail-replacement bus. */
export const RAIL_REPLACEMENT_ROUTE_TYPE = "714"

/** Same LOD as unique-track preview (`TRACK_GRAPH.PREVIEW_SIMPLIFY_M`). */
export const SHAPE_SIMPLIFY_M = 39

const WEEKDAYS: readonly Weekday[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]

const WEEKDAY_SET = new Set<Weekday>([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
])

const DARK_TEXT_LINE_IDS = new Set([
  "circle",
  "hammersmith-city",
  "waterloo-city",
])

const LINE_ID_BY_SHORT_NAME: Record<string, string> = {
  Bakerloo: "bakerloo",
  Central: "central",
  Circle: "circle",
  District: "district",
  "Hammersmith & City": "hammersmith-city",
  Jubilee: "jubilee",
  Metropolitan: "metropolitan",
  Northern: "northern",
  Piccadilly: "piccadilly",
  Victoria: "victoria",
  "Waterloo & City": "waterloo-city",
  DLR: "dlr",
  Tram: "tram",
  "London Cable Car": "cable-car",
  "Elizabeth line": "elizabeth",
  Liberty: "liberty",
  Lioness: "lioness",
  Mildmay: "mildmay",
  Suffragette: "suffragette",
  Weaver: "weaver",
  Windrush: "windrush",
}

const MODE_BY_AGENCY: Record<string, string> = {
  LULD: "Underground",
  LDLR: "DLR",
  TRAM: "Tram",
  IFSC: "Cable Car",
  "=XR": "Elizabeth line",
  "=LO": "Overground",
}

const SHAPED_AGENCIES = new Set(["=XR", "=LO"])

export const FREQUENCY_WINDOWS = [
  { label: "00:00–07:00", start: 0, end: 7 * 3600 },
  { label: "07:00–09:30", start: 7 * 3600, end: 9.5 * 3600 },
  { label: "09:30–16:00", start: 9.5 * 3600, end: 16 * 3600 },
  { label: "16:00–19:00", start: 16 * 3600, end: 19 * 3600 },
  { label: "19:00–24:00", start: 19 * 3600, end: 30 * 3600 },
] as const

export type GtfsRoute = {
  route_id: string
  agency_id: string
  route_short_name?: string
  route_long_name?: string
  route_type?: string
  route_color?: string
  route_text_color?: string
}

export type GtfsTrip = {
  trip_id: string
  route_id: string
  service_id: string
  direction_id?: string
  shape_id?: string
}

export type GtfsStopTime = {
  trip_id: string
  stop_id: string
  stop_sequence: string | number
  arrival_time?: string
  departure_time?: string
}

export type GtfsStop = {
  stop_id: string
  stop_name?: string
  stop_lat?: string | number
  stop_lon?: string | number
  parent_station?: string
  location_type?: string
}

export type GtfsCalendar = {
  service_id: string
  monday: string
  tuesday: string
  wednesday: string
  thursday: string
  friday: string
  saturday: string
  sunday: string
  start_date: string
  end_date?: string
}

export type GtfsShapePoint = {
  shape_id: string
  shape_pt_lat: string | number
  shape_pt_lon: string | number
  shape_pt_sequence: string | number
}

export type NetworkModelSnapshot = {
  lines: Line[]
  stations: Station[]
  hubs: StationHub[]
  patterns: ServicePattern[]
  calls: PatternCall[]
  calendars: PatternCalendar[]
  frequencies: PatternFrequency[]
  paths: PhysicalPath[]
  pathMatches: PatternPathMatch[]
  movements: PermittedMovement[]
}

export const isKeptRoute = (route: GtfsRoute): boolean => {
  if (!KEPT_AGENCY_ID_SET.has(route.agency_id)) return false
  if (route.route_type === RAIL_REPLACEMENT_ROUTE_TYPE) return false
  if (route.route_id.endsWith("_BUS")) return false
  return true
}

export const canonicalLineId = (route: GtfsRoute): string => {
  const shortName = route.route_short_name?.trim() ?? ""
  if (shortName && LINE_ID_BY_SHORT_NAME[shortName]) {
    return LINE_ID_BY_SHORT_NAME[shortName]
  }
  return slugify(shortName || route.route_id)
}

export const callStationId = (stop: GtfsStop | undefined, stopId: string): string => {
  const parent = stop?.parent_station?.trim()
  return parent || stopId
}

export const parseGtfsTime = (value: string | undefined): number | null => {
  if (!value) return null
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(value.trim())
  if (!match) return null
  return (
    Number(match[1]) * 3600 + Number(match[2]) * 60 + Number(match[3] ?? 0)
  )
}

export const formatGtfsDate = (value: string | undefined): string => {
  const raw = value?.trim() ?? ""
  if (/^\d{8}$/.test(raw)) {
    return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`
  }
  return raw
}

export const parseCsvLine = (line: string): string[] => {
  const out: string[] = []
  let current = ""
  let inQuotes = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]!
    if (inQuotes) {
      if (char === '"') {
        if (line[index + 1] === '"') {
          current += '"'
          index += 1
        } else {
          inQuotes = false
        }
      } else {
        current += char
      }
      continue
    }
    if (char === '"') {
      inQuotes = true
      continue
    }
    if (char === ",") {
      out.push(current)
      current = ""
      continue
    }
    current += char
  }
  out.push(current)
  return out
}

export const rowFromCsv = (
  header: readonly string[],
  values: readonly string[],
): Record<string, string> => {
  const row: Record<string, string> = {}
  for (let index = 0; index < header.length; index += 1) {
    row[header[index]!] = values[index] ?? ""
  }
  return row
}

export async function* streamCsvRows(
  input: import("node:stream").Readable,
): AsyncGenerator<Record<string, string>> {
  const { createInterface } = await import("node:readline")
  const lines = createInterface({ input, crlfDelay: Infinity })
  let header: string[] | null = null
  for await (const raw of lines) {
    const line = raw.replace(/^\uFEFF/, "")
    if (!line) continue
    const values = parseCsvLine(line)
    if (!header) {
      header = values
      continue
    }
    yield rowFromCsv(header, values)
  }
}

type LngLat = [number, number]

const METERS_PER_DEG_LAT = 111_320

const metersPerDegLon = (lat: number): number =>
  METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180)

const perpDistanceMetres = (point: LngLat, start: LngLat, end: LngLat): number => {
  const mLon = metersPerDegLon(start[1])
  const px = (point[0] - start[0]) * mLon
  const py = (point[1] - start[1]) * METERS_PER_DEG_LAT
  const bx = (end[0] - start[0]) * mLon
  const by = (end[1] - start[1]) * METERS_PER_DEG_LAT
  const length2 = bx * bx + by * by
  if (length2 === 0) return Math.hypot(px, py)
  const t = Math.max(0, Math.min(1, (px * bx + py * by) / length2))
  return Math.hypot(px - t * bx, py - t * by)
}

export const simplifyLine = (
  coordinates: readonly LngLat[],
  epsilonM: number = SHAPE_SIMPLIFY_M,
): LngLat[] => {
  if (coordinates.length <= 2) return [...coordinates]
  const first = coordinates[0]!
  const last = coordinates[coordinates.length - 1]!
  let maxDistance = 0
  let maxIndex = 0
  for (let index = 1; index < coordinates.length - 1; index += 1) {
    const distance = perpDistanceMetres(coordinates[index]!, first, last)
    if (distance > maxDistance) {
      maxDistance = distance
      maxIndex = index
    }
  }
  if (maxDistance <= epsilonM) return [first, last]
  const left = simplifyLine(coordinates.slice(0, maxIndex + 1), epsilonM)
  const right = simplifyLine(coordinates.slice(maxIndex), epsilonM)
  return [...left.slice(0, -1), ...right]
}

export const assembleShape = (points: readonly GtfsShapePoint[]): LngLat[] => {
  const ordered = [...points].sort(
    (a, b) => Number(a.shape_pt_sequence) - Number(b.shape_pt_sequence),
  )
  const coords: LngLat[] = []
  for (const point of ordered) {
    const lon = Number(point.shape_pt_lon)
    const lat = Number(point.shape_pt_lat)
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue
    coords.push([lon, lat])
  }
  return coords
}

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

const fnv1a = (value: string): string => {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}

const flagOn = (value: string | undefined): boolean => value === "1"

const daysFromCalendar = (calendar: GtfsCalendar): Weekday[] =>
  WEEKDAYS.filter((day) => flagOn(calendar[day]))

const dayClassesFor = (days: readonly Weekday[]): Array<"weekday" | "saturday" | "sunday"> => {
  const classes: Array<"weekday" | "saturday" | "sunday"> = []
  if (days.some((day) => WEEKDAY_SET.has(day))) classes.push("weekday")
  if (days.includes("saturday")) classes.push("saturday")
  if (days.includes("sunday")) classes.push("sunday")
  return classes
}

const directionLabel = (directionId: string | undefined): string =>
  directionId === "1" ? "inbound" : "outbound"

const feedHex = (value: string | undefined): string | undefined => {
  const hex = value?.trim().replace(/^#/, "")
  return hex ? `#${hex}` : undefined
}

const colorsForLine = (
  lineId: string,
  route: GtfsRoute,
): { color: string; textColor: string } => {
  const token = getLineColourToken(lineId)
  if (token) {
    return {
      color: token.hex,
      textColor: token.spec.stripText === "white" ? "#FFFFFF" : TFL_BLUE,
    }
  }
  return {
    color: feedHex(route.route_color) ?? "#767676",
    textColor:
      feedHex(route.route_text_color) ??
      (DARK_TEXT_LINE_IDS.has(lineId) ? TFL_BLUE : "#FFFFFF"),
  }
}

const windowForSeconds = (seconds: number): (typeof FREQUENCY_WINDOWS)[number] | null => {
  for (const window of FREQUENCY_WINDOWS) {
    if (seconds >= window.start && seconds < window.end) return window
  }
  return null
}

const median = (values: readonly number[]): number | undefined => {
  if (values.length === 0) return undefined
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
    : sorted[mid]
}

const headwayFromDepartures = (seconds: readonly number[]): number | undefined => {
  if (seconds.length < 2) return undefined
  const sorted = [...seconds].sort((a, b) => a - b)
  const gaps: number[] = []
  for (let index = 1; index < sorted.length; index += 1) {
    const gap = sorted[index]! - sorted[index - 1]!
    if (gap > 0 && gap <= 3 * 3600) gaps.push(gap)
  }
  return median(gaps)
}

export type BuildNetworkSnapshotInput = {
  routes: readonly GtfsRoute[]
  trips: readonly GtfsTrip[]
  stopTimes: readonly GtfsStopTime[]
  stops: readonly GtfsStop[]
  calendars: readonly GtfsCalendar[]
  shapes?: readonly GtfsShapePoint[]
  simplifyEpsilonM?: number
}

type PatternAcc = {
  lineId: string
  direction: string
  stationIds: string[]
  tripIds: string[]
  serviceIds: Set<string>
  shapeCounts: Map<string, number>
  firstStops: number[]
  dayClassFirstStops: Map<string, number[]>
}

const accumulatePatterns = (
  keptRoutes: readonly GtfsRoute[],
  trips: readonly GtfsTrip[],
  stopTimes: readonly GtfsStopTime[],
  stops: readonly GtfsStop[],
  calendars: readonly GtfsCalendar[],
): Map<string, PatternAcc> => {
  const routeById = new Map(keptRoutes.map((route) => [route.route_id, route]))
  const calendarById = new Map(
    calendars.map((calendar) => [calendar.service_id, calendar]),
  )
  const stopById = new Map(stops.map((stop) => [stop.stop_id, stop]))
  const tripsByRoute = new Map<string, GtfsTrip[]>()
  for (const trip of trips) {
    if (!routeById.has(trip.route_id)) continue
    const list = tripsByRoute.get(trip.route_id) ?? []
    list.push(trip)
    tripsByRoute.set(trip.route_id, list)
  }
  const timesByTrip = new Map<string, GtfsStopTime[]>()
  for (const stopTime of stopTimes) {
    if (!stopTime.trip_id) continue
    const list = timesByTrip.get(stopTime.trip_id) ?? []
    list.push(stopTime)
    timesByTrip.set(stopTime.trip_id, list)
  }

  const patterns = new Map<string, PatternAcc>()
  for (const route of keptRoutes) {
    const lineId = canonicalLineId(route)
    for (const trip of tripsByRoute.get(route.route_id) ?? []) {
      const rawTimes = timesByTrip.get(trip.trip_id)
      if (!rawTimes || rawTimes.length === 0) continue
      const ordered = [...rawTimes].sort(
        (a, b) => Number(a.stop_sequence) - Number(b.stop_sequence),
      )
      const stationIds = ordered.map((stopTime) =>
        callStationId(stopById.get(stopTime.stop_id), stopTime.stop_id),
      )
      const direction = directionLabel(trip.direction_id)
      const key = `${lineId}\0${direction}\0${stationIds.join(">")}`
      let acc = patterns.get(key)
      if (!acc) {
        acc = {
          lineId,
          direction,
          stationIds,
          tripIds: [],
          serviceIds: new Set(),
          shapeCounts: new Map(),
          firstStops: [],
          dayClassFirstStops: new Map(),
        }
        patterns.set(key, acc)
      }
      acc.tripIds.push(trip.trip_id)
      acc.serviceIds.add(trip.service_id)
      const shapeId = trip.shape_id?.trim()
      if (shapeId && SHAPED_AGENCIES.has(route.agency_id)) {
        acc.shapeCounts.set(shapeId, (acc.shapeCounts.get(shapeId) ?? 0) + 1)
      }
      const firstTime =
        parseGtfsTime(ordered[0]?.departure_time) ??
        parseGtfsTime(ordered[0]?.arrival_time)
      if (firstTime === null) continue
      acc.firstStops.push(firstTime)
      const calendar = calendarById.get(trip.service_id)
      const classes = calendar ? dayClassesFor(daysFromCalendar(calendar)) : []
      for (const dayClass of classes) {
        const list = acc.dayClassFirstStops.get(dayClass) ?? []
        list.push(firstTime)
        acc.dayClassFirstStops.set(dayClass, list)
      }
    }
  }
  return patterns
}

const winningShapeId = (counts: ReadonlyMap<string, number>): string | undefined => {
  let bestShapeId: string | undefined
  let bestCount = 0
  for (const [shapeId, count] of counts) {
    if (count > bestCount) {
      bestShapeId = shapeId
      bestCount = count
    }
  }
  return bestShapeId
}

/** Shape ids actually stored (one most-common shape per Elizabeth / Overground pattern). */
export const winningShapeIds = (
  input: Pick<BuildNetworkSnapshotInput, "routes" | "trips" | "stopTimes" | "stops" | "calendars">,
): Set<string> => {
  const patterns = accumulatePatterns(
    input.routes.filter(isKeptRoute),
    input.trips,
    input.stopTimes,
    input.stops,
    input.calendars,
  )
  const ids = new Set<string>()
  for (const acc of patterns.values()) {
    const shapeId = winningShapeId(acc.shapeCounts)
    if (shapeId) ids.add(shapeId)
  }
  return ids
}

export const buildNetworkSnapshot = (
  input: BuildNetworkSnapshotInput,
): NetworkModelSnapshot => {
  const epsilonM = input.simplifyEpsilonM ?? SHAPE_SIMPLIFY_M
  const keptRoutes = input.routes.filter(isKeptRoute)
  const calendarById = new Map(
    input.calendars.map((calendar) => [calendar.service_id, calendar]),
  )
  const stopById = new Map(input.stops.map((stop) => [stop.stop_id, stop]))

  const lineById = new Map<string, Line>()
  for (const route of keptRoutes) {
    const id = canonicalLineId(route)
    if (lineById.has(id)) continue
    const names = colorsForLine(id, route)
    lineById.set(id, {
      id,
      shortName: route.route_short_name?.trim() || id,
      longName: route.route_long_name?.trim() || route.route_short_name?.trim() || id,
      mode: MODE_BY_AGENCY[route.agency_id] ?? "Rail",
      color: names.color,
      textColor: names.textColor,
    })
  }

  const shapeById = new Map<string, LngLat[]>()
  if (input.shapes) {
    const grouped = new Map<string, GtfsShapePoint[]>()
    for (const point of input.shapes) {
      const list = grouped.get(point.shape_id) ?? []
      list.push(point)
      grouped.set(point.shape_id, list)
    }
    for (const [shapeId, points] of grouped) {
      const simplified = simplifyLine(assembleShape(points), epsilonM)
      if (simplified.length >= 2) shapeById.set(shapeId, simplified)
    }
  }

  const patterns = accumulatePatterns(
    keptRoutes,
    input.trips,
    input.stopTimes,
    input.stops,
    input.calendars,
  )

  const servicePatterns: ServicePattern[] = []
  const calls: PatternCall[] = []
  const calendars: PatternCalendar[] = []
  const frequencies: PatternFrequency[] = []
  const paths: PhysicalPath[] = []
  const pathMatches: PatternPathMatch[] = []
  const usedStationIds = new Set<string>()
  const pathByShape = new Map<string, PhysicalPath>()

  const sortedPatterns = [...patterns.values()].sort((a, b) => {
    const line = a.lineId.localeCompare(b.lineId)
    if (line !== 0) return line
    const direction = a.direction.localeCompare(b.direction)
    if (direction !== 0) return direction
    return a.stationIds.join(">").localeCompare(b.stationIds.join(">"))
  })

  for (const acc of sortedPatterns) {
    const patternId = `${acc.lineId}/${acc.direction}/${fnv1a(acc.stationIds.join(">"))}`
    servicePatterns.push({
      id: patternId,
      lineId: acc.lineId,
      direction: acc.direction,
      callIds: acc.stationIds,
    })
    acc.stationIds.forEach((stationId, index) => {
      usedStationIds.add(stationId)
      calls.push({
        patternId,
        stationId,
        sequence: index + 1,
      })
    })

    const days = new Set<Weekday>()
    let validFrom: string | undefined
    let validTo: string | undefined
    for (const serviceId of acc.serviceIds) {
      const calendar = calendarById.get(serviceId)
      if (!calendar) continue
      for (const day of daysFromCalendar(calendar)) days.add(day)
      const from = formatGtfsDate(calendar.start_date)
      const to = formatGtfsDate(calendar.end_date)
      if (from && (!validFrom || from < validFrom)) validFrom = from
      if (to && (!validTo || to > validTo)) validTo = to
    }
    if (days.size > 0 && validFrom) {
      calendars.push({
        patternId,
        daysOfWeek: WEEKDAYS.filter((day) => days.has(day)),
        validFrom,
        validTo,
      })
    }

    for (const [dayClass, times] of [...acc.dayClassFirstStops.entries()].sort()) {
      const byWindow = new Map<string, number[]>()
      for (const seconds of times) {
        const window = windowForSeconds(seconds)
        if (!window) continue
        const list = byWindow.get(window.label) ?? []
        list.push(seconds)
        byWindow.set(window.label, list)
      }
      for (const window of FREQUENCY_WINDOWS) {
        const windowTimes = byWindow.get(window.label)
        if (!windowTimes || windowTimes.length === 0) continue
        frequencies.push({
          patternId,
          timeWindow: `${dayClass} ${window.label}`,
          headwaySeconds: headwayFromDepartures(windowTimes),
        })
      }
    }

    const bestShapeId = winningShapeId(acc.shapeCounts)
    if (bestShapeId) {
      const geometry = shapeById.get(bestShapeId)
      if (geometry && geometry.length >= 2) {
        let path = pathByShape.get(bestShapeId)
        if (!path) {
          const line = lineById.get(acc.lineId)
          path = {
            id: `gtfs:${bestShapeId}`,
            mode: line?.mode ?? "Rail",
            geometry: { type: "LineString", coordinates: geometry },
          }
          pathByShape.set(bestShapeId, path)
          paths.push(path)
        }
        pathMatches.push({
          patternId,
          pathId: path.id,
          confidence: "exact",
        })
      }
    }
  }

  const stations: Station[] = []
  const hubMembers = new Map<string, Set<string>>()

  for (const stop of input.stops) {
    const id = callStationId(stop, stop.stop_id)
    if (!usedStationIds.has(id) && !usedStationIds.has(stop.stop_id)) continue
    if (stop.parent_station?.trim()) {
      const hubId = stop.parent_station.trim()
      const members = hubMembers.get(hubId) ?? new Set()
      members.add(stop.stop_id)
      members.add(hubId)
      hubMembers.set(hubId, members)
    }
    if (stop.location_type === "1") {
      const members = hubMembers.get(stop.stop_id) ?? new Set()
      members.add(stop.stop_id)
      hubMembers.set(stop.stop_id, members)
    }
  }

  const emittedStations = new Set<string>()
  for (const stop of input.stops) {
    const id = callStationId(stop, stop.stop_id)
    if (!usedStationIds.has(id) || emittedStations.has(id)) continue
    if (stop.parent_station?.trim() && stop.stop_id !== id) continue
    const lat = Number(stop.stop_lat)
    const lon = Number(stop.stop_lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
    emittedStations.add(id)
    stations.push({
      id,
      name: stop.stop_name?.trim() || id,
      lat,
      lon,
      hubId: hubMembers.has(id) ? id : stop.parent_station?.trim() || undefined,
    })
  }

  for (const stationId of usedStationIds) {
    if (emittedStations.has(stationId)) continue
    const stop = stopById.get(stationId)
    if (!stop) continue
    const lat = Number(stop.stop_lat)
    const lon = Number(stop.stop_lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue
    emittedStations.add(stationId)
    stations.push({
      id: stationId,
      name: stop.stop_name?.trim() || stationId,
      lat,
      lon,
      hubId: stop.parent_station?.trim() || undefined,
    })
  }

  stations.sort((a, b) => a.id.localeCompare(b.id))

  const hubs: StationHub[] = [...hubMembers.entries()]
    .filter(([, members]) => members.size > 1)
    .filter(([hubId]) => usedStationIds.has(hubId) || stations.some((station) => station.hubId === hubId))
    .map(([id, members]) => ({
      id,
      memberStationIds: [...members].sort(),
    }))
    .sort((a, b) => a.id.localeCompare(b.id))

  const movementMap = new Map<string, PermittedMovement>()
  for (const pattern of servicePatterns) {
    const ids = pattern.callIds
    for (let index = 0; index < ids.length - 2; index += 1) {
      const fromStationId = ids[index]!
      const viaStationId = ids[index + 1]!
      const toStationId = ids[index + 2]!
      const key = `${fromStationId}\0${viaStationId}\0${toStationId}`
      const existing = movementMap.get(key)
      if (existing) {
        if (!existing.patternIds.includes(pattern.id)) {
          existing.patternIds.push(pattern.id)
        }
        continue
      }
      movementMap.set(key, {
        fromStationId,
        viaStationId,
        toStationId,
        patternIds: [pattern.id],
      })
    }
  }

  return {
    lines: [...lineById.values()].sort((a, b) => a.id.localeCompare(b.id)),
    stations,
    hubs,
    patterns: servicePatterns,
    calls,
    calendars,
    frequencies,
    paths,
    pathMatches,
    movements: [...movementMap.values()],
  }
}
