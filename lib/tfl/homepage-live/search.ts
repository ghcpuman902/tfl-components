import type { NearbyBusStop } from "@/lib/tfl/bus-stop-shape"
import { isBusStopAreaId } from "@/lib/tfl/bus-stop-shape"
import type { ExplorerTubeRailPoint } from "@/lib/tfl/explorer/common"
import { normaliseRailPoint } from "@/lib/tfl/explorer-point-normalise"
import { filterExplorerPoints } from "@/lib/tfl/explorer-point-search"

export type StationHit = {
  kind: "station"
  id: string
  name: string
  lines: string[]
  lat?: number
  lon?: number
  /** Naptans that carry this station's arrivals (hub members, rail + tube). */
  stopIds: string[]
}

export type BusHit = {
  kind: "bus"
  id: string
  name: string
  stopLetter?: string
  towards?: string
  routes: string[]
  lat?: number
  lon?: number
}

export type PlaceHit = StationHit | BusHit

export const placeKey = (hit: PlaceHit) => `${hit.kind}:${hit.id}`

export const STATION_RESULT_LIMIT = 6
export const BUS_RESULT_LIMIT = 8
export const MIN_BUS_QUERY = 2

const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()

/** Stations rank offline, instantly, with the explorer's ranking (name, id, line, mode). */
export const searchStations = (
  points: readonly ExplorerTubeRailPoint[],
  query: string,
  limit = STATION_RESULT_LIMIT
): StationHit[] => {
  const byId = new Map(points.map((point) => [point.id, point]))
  return filterExplorerPoints(points.map(normaliseRailPoint), query)
    .slice(0, limit)
    .flatMap((hit) => {
      const point = byId.get(hit.id)
      if (!point) return []
      return [
        {
          kind: "station" as const,
          id: point.id,
          name: point.displayName,
          lines: point.lines,
          lat: point.lat,
          lon: point.lon,
          stopIds: point.arrivalsStopIds?.length
            ? point.arrivalsStopIds
            : [point.id],
        },
      ]
    })
}

export const toBusHit = (stop: NearbyBusStop): BusHit => ({
  kind: "bus",
  id: stop.id,
  name: stop.name,
  stopLetter: stop.stopLetter,
  towards: stop.towards,
  routes: stop.lines ?? [],
  lat: stop.lat,
  lon: stop.lon,
})

const metres = (
  a: { lat?: number; lon?: number },
  b: { lat?: number; lon?: number }
) => {
  if (a.lat == null || a.lon == null || b.lat == null || b.lon == null)
    return Infinity
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLon = (b.lon - a.lon) * rad
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(h))
}

const nameRank = (name: string, query: string) => {
  const n = fold(name)
  const q = fold(query)
  if (n === q) return 0
  if (n.startsWith(q)) return 1
  return n.includes(q) ? 2 : 3
}

/**
 * TfL's order is not trusted (`tow` returns Tower Hill outside its first eight).
 * Best name match first, then nearest to the current selection, then stop
 * letter A to Z. Stop-area clusters (`490G…`) are not boarding points: dropped.
 */
export const rankBusHits = (
  hits: readonly BusHit[],
  query: string,
  anchor?: { lat?: number; lon?: number }
): BusHit[] => {
  const seen = new Set<string>()
  return hits
    .filter((hit) => {
      if (seen.has(hit.id) || isBusStopAreaId(hit.id)) return false
      seen.add(hit.id)
      return true
    })
    .sort((a, b) => {
      const byName = nameRank(a.name, query) - nameRank(b.name, query)
      if (byName) return byName
      if (anchor) {
        const byDistance = metres(anchor, a) - metres(anchor, b)
        if (Number.isFinite(byDistance) && byDistance) return byDistance
      }
      return (a.stopLetter ?? "~").localeCompare(b.stopLetter ?? "~", "en-GB")
    })
    .slice(0, BUS_RESULT_LIMIT)
}

/** Stations first, then bus stops; neither list reorders under the other. */
export const mergePlaces = (
  stations: readonly StationHit[],
  buses: readonly BusHit[]
): PlaceHit[] => [...stations, ...buses]

export type BusSearchStatus =
  | "idle"
  | "pending"
  | "slow"
  | "ok"
  | "empty"
  | "failed"

export type SearchState = {
  query: string
  attempt: number
  status: BusSearchStatus
  hits: BusHit[]
  message?: string
}

export const initialSearchState: SearchState = {
  query: "",
  attempt: 0,
  status: "idle",
  hits: [],
}

export type SearchAction =
  | { type: "typed"; query: string }
  | { type: "slow"; attempt: number }
  | { type: "result"; attempt: number; hits: BusHit[] }
  | { type: "failed"; attempt: number }
  | { type: "timeout"; attempt: number }
  | { type: "enriched"; attempt: number; details: Record<string, Partial<BusHit>> }

export const BUS_SEARCH_FAILED = "Bus stop search is unavailable right now. Stations still work."
export const BUS_SEARCH_TIMEOUT = "Bus stop search took too long. Stations still work."
export const NO_PLACES = "No stations or bus stops match that."

/**
 * Bus stops come from a server round trip. Each keystroke starts a new attempt;
 * results, failures and timeouts of an older attempt are ignored, and the
 * previous hits stay on screen until the new ones replace them, so rows do not jump.
 */
export const searchReducer = (
  state: SearchState,
  action: SearchAction
): SearchState => {
  if (action.type === "typed") {
    const query = action.query
    const attempt = state.attempt + 1
    if (fold(query).length < MIN_BUS_QUERY)
      return { query, attempt, status: "idle", hits: [] }
    return { ...state, query, attempt, status: "pending", message: undefined }
  }
  if (action.attempt !== state.attempt) return state
  switch (action.type) {
    case "slow":
      return state.status === "pending" ? { ...state, status: "slow" } : state
    case "result":
      return {
        ...state,
        status: action.hits.length ? "ok" : "empty",
        hits: rankBusHits(action.hits, state.query),
      }
    case "failed":
      return { ...state, status: "failed", hits: [], message: BUS_SEARCH_FAILED }
    case "timeout":
      return state.status === "pending" || state.status === "slow"
        ? { ...state, status: "failed", hits: [], message: BUS_SEARCH_TIMEOUT }
        : state
    case "enriched":
      return {
        ...state,
        hits: state.hits.map((hit) => ({ ...hit, ...action.details[hit.id] })),
      }
  }
}

/** Combobox keyboard: arrows wrap, Home and End jump. */
export const nextActiveIndex = (
  active: number,
  key: "ArrowDown" | "ArrowUp" | "Home" | "End",
  count: number
): number => {
  if (count <= 0) return -1
  if (key === "Home") return 0
  if (key === "End") return count - 1
  if (key === "ArrowDown") return active < 0 ? 0 : (active + 1) % count
  return active <= 0 ? count - 1 : active - 1
}
