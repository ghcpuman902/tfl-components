import type { NearbyBusStop } from "@/lib/tfl/bus-stop-shape"
import { isBusStopAreaId } from "@/lib/tfl/bus-stop-shape"
import type { ExplorerTubeRailPoint } from "@/lib/tfl/explorer/common"
import type { LiveStopHit, StopRow } from "@/lib/tfl/stop-index"

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

export const BUS_RESULT_LIMIT = 8

export const stationHitOf = (point: ExplorerTubeRailPoint): StationHit => ({
  kind: "station",
  id: point.id,
  name: point.displayName,
  lines: point.lines,
  lat: point.lat,
  lon: point.lon,
  stopIds: point.arrivalsStopIds?.length ? point.arrivalsStopIds : [point.id],
})

/**
 * A row of the shared stop index as something the page can select. Stations
 * resolve through the explorer points, which know which sibling StopPoints
 * carry the arrivals (the index row for King's Cross is the hub `HUBKGX`).
 */
export const placeHitOfRow = (
  row: StopRow,
  stations: readonly ExplorerTubeRailPoint[],
  hubStationIds: Readonly<Record<string, string>> = {}
): PlaceHit => {
  if (row.kind === "bus")
    return {
      kind: "bus",
      id: row.id,
      name: row.name,
      stopLetter: row.letter,
      towards: row.towards,
      routes: [...row.lines],
      lat: row.lat,
      lon: row.lon,
    }
  const point =
    stations.find((p) => p.id === row.id) ??
    stations.find((p) => p.id === hubStationIds[row.id]) ??
    stations.find((p) => p.hubId === row.id)
  if (point) return stationHitOf(point)
  return {
    kind: "station",
    id: row.id,
    name: row.name,
    lines: [...row.lines],
    lat: row.lat,
    lon: row.lon,
    stopIds: [row.id],
  }
}

/** A bus hit from the TfL search action, in the shape the stop index merges. */
export const liveHitOfBus = (hit: BusHit): LiveStopHit => ({
  id: hit.id,
  name: hit.name,
  stopLetter: hit.stopLetter,
  towards: hit.towards,
  lat: hit.lat,
  lon: hit.lon,
  modes: ["bus"],
  lines: hit.routes,
})

const fold = (text: string) =>
  text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()

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
