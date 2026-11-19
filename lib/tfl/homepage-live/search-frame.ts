import {
  MAP_SEARCH_RADIUS_METERS,
  TRAFALGAR_SQUARE,
  circleBounds,
  distanceMeters,
  pointsCentroid,
} from "@/lib/tfl/geo"
import type { StopRow, StopSearchKit } from "@/lib/tfl/stop-index"

export type LatLon = { lat: number; lon: number }
export type Frame = {
  center: LatLon
  bounds: { west: number; south: number; east: number; north: number }
}

/** The list's cap per kind (stations first, then stops); the map is not capped. */
export const BROWSE_CAP = 30
/** From this zoom the map draws bus pins; below it, every bus stop in view is a dot. */
export const PIN_MIN_ZOOM = 15
const BROWSE_SCAN = 150
const FIT_ROWS = 10
/** How many index matches to scan for the frame: enough for a common word (Road) in a zoomed-out frame. */
const FRAME_SCAN = 500
const FIT_NEAR_BEST_METERS = 1_000

/** The frame before the map reports its real view: the 400 m box around the Board place. */
export const provisionalFrame = (anchor?: {
  lat?: number
  lon?: number
}): Frame => {
  const center =
    anchor?.lat != null && anchor.lon != null
      ? { lat: anchor.lat, lon: anchor.lon }
      : { lat: TRAFALGAR_SQUARE.lat, lon: TRAFALGAR_SQUARE.lon }
  const [[west, south], [east, north]] = circleBounds(
    center.lon,
    center.lat,
    MAP_SEARCH_RADIUS_METERS
  )
  return { center, bounds: { west, south, east, north } }
}

export const inFrame = (row: { lat?: number; lon?: number }, frame: Frame) =>
  row.lat != null &&
  row.lon != null &&
  row.lat >= frame.bounds.south &&
  row.lat <= frame.bounds.north &&
  row.lon >= frame.bounds.west &&
  row.lon <= frame.bounds.east

/**
 * What the empty field lists: stations and bus stops inside the frame, nearest
 * its centre first, at most BROWSE_CAP of each. A station inside a listed hub
 * (King's Cross St. Pancras) is left out.
 */
export const browseRows = (
  kit: Pick<StopSearchKit, "index" | "searchStops">,
  frame: Frame
): StopRow[] => {
  const pick = (kind: "station" | "bus") =>
    kit
      .searchStops(kit.index, "", {
        near: frame.center,
        kinds: [kind],
        limit: BROWSE_SCAN,
      })
      .filter((row) => inFrame(row, frame))
  const stations = pick("station")
  const listed = new Set(stations.map((row) => row.id))
  return [
    ...stations
      .filter((row) => !row.hubId || !listed.has(row.hubId))
      .slice(0, BROWSE_CAP),
    ...pick("bus").slice(0, BROWSE_CAP),
  ].sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
}

/**
 * Every bus stop inside the frame as [lon, lat], for the map's one dot layer
 * when zoomed out. Reads the index's coordinate columns, so no rows are built.
 */
export const dotKey = (lon: number, lat: number) =>
  `${lon.toFixed(5)},${lat.toFixed(5)}`

export const busStopDots = (
  kit: Pick<StopSearchKit, "index">,
  frame: Frame,
  /** Stops drawn as pins instead (a typed search's results), by `dotKey`. */
  skip?: ReadonlySet<string>
): [number, number][] => {
  const { index } = kit
  const { lat, lon } = index.columns
  const { west, south, east, north } = frame.bounds
  const dots: [number, number][] = []
  for (let i = index.stationCount; i < index.size; i++) {
    const la = lat[i]! / 1e5
    const lo = lon[i]! / 1e5
    if (
      la >= south &&
      la <= north &&
      lo >= west &&
      lo <= east &&
      !skip?.has(dotKey(lo, la))
    )
      dots.push([lo, la])
  }
  return dots
}

/** Moves the first row that `isLead` picks to the top; the rest keep their order. */
export const leadWith = (
  rows: readonly StopRow[],
  isLead: (row: StopRow) => boolean
): StopRow[] => {
  const at = rows.findIndex(isLead)
  return at <= 0
    ? [...rows]
    : [rows[at]!, ...rows.slice(0, at), ...rows.slice(at + 1)]
}

/** 0 exact, 1 prefix, 2 anything else the search found (contains / word / fuzzy). */
export const matchStrength = (name: string, query: string): 0 | 1 | 2 => {
  const norm = (text: string) =>
    text
      .toLowerCase()
      .replace(/\s*\((?:[^)]*)\)\s*$/, "")
      .replace(
        /\s+(?:underground|dlr|rail|tram|overground|elizabeth line)?\s*station$/,
        ""
      )
      .replace(/[^\p{L}\p{N}]+/gu, " ")
      .trim()
  const n = norm(name)
  const q = norm(query)
  if (!q) return 2
  return n === q ? 0 : n.startsWith(q) ? 1 : 2
}

const bestStrength = (rows: readonly StopRow[], query: string) =>
  rows.reduce<number>(
    (best, row) => Math.min(best, matchStrength(row.name, query)),
    3
  )

/**
 * Match quality first, then in view: the frame's matches win unless a row
 * outside it matches strictly better (a prefix outside beats a contains inside;
 * exact inside still beats exact outside, and contains inside beats contains outside).
 */
export const frameWins = (
  query: string,
  inFrameRows: readonly StopRow[],
  allRows: readonly StopRow[],
  frame: Frame
): boolean => {
  if (inFrameRows.length === 0) return false
  const outside = allRows.filter(
    (row) => row.lat != null && row.lon != null && !inFrame(row, frame)
  )
  return bestStrength(inFrameRows, query) <= bestStrength(outside, query)
}

/** The rows of the strongest match quality, ranked order kept: what the map fits to. */
export const strongestRows = (
  rows: readonly StopRow[],
  query: string
): StopRow[] => {
  const best = bestStrength(rows, query)
  return rows.filter((row) => matchStrength(row.name, query) === best)
}

/** Typed matches inside the frame, in their ranked order. */
export const frameMatches = (
  rows: readonly StopRow[],
  frame: Frame
): StopRow[] => rows.filter((row) => inFrame(row, frame))

/**
 * A typed query searched inside the frame: the stop index's matches there (not
 * only the few of London's top matches that happen to fall in it), ranked as the
 * index ranks them, then any live-only rows in the frame. A row the live search
 * already merged or enriched is used in place of the bare index row.
 */
export const searchInFrame = (
  kit: Pick<StopSearchKit, "index" | "searchStops">,
  query: string,
  frame: Frame,
  rows: readonly StopRow[]
): StopRow[] => {
  const fromIndex = query.trim()
    ? kit
        .searchStops(kit.index, query, {
          near: frame.center,
          limit: FRAME_SCAN,
        })
        .filter((row) => inFrame(row, frame))
    : []
  const merged = new Map(rows.map((row) => [row.id, row]))
  const listed = new Set(fromIndex.map((row) => row.id))
  return [
    ...fromIndex.map((row) => merged.get(row.id) ?? row),
    ...frameMatches(rows, frame).filter((row) => !listed.has(row.id)),
  ]
}

/**
 * The circle the map fits to when no match is in the frame: around the best
 * match and the other top matches within FIT_NEAR_BEST_METERS of it, so a far
 * namesake (a Bank Road in Barnet) does not zoom the map out to all London.
 */
export const fitFor = (
  rows: readonly StopRow[]
): { origin: LatLon; radiusMeters: number } | null => {
  const located = rows.filter((row) => row.lat != null && row.lon != null)
  const lead = located[0]
  if (!lead) return null
  const near = located
    .filter(
      (row) =>
        distanceMeters(lead.lat!, lead.lon!, row.lat!, row.lon!) <=
        FIT_NEAR_BEST_METERS
    )
    .slice(0, FIT_ROWS)
  const origin = pointsCentroid(near)
  if (!origin) return null
  const farthest = Math.max(
    ...near.map((row) =>
      distanceMeters(origin.lat, origin.lon, row.lat!, row.lon!)
    )
  )
  return { origin, radiusMeters: Math.max(MAP_SEARCH_RADIUS_METERS, farthest) }
}
