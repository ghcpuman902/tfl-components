import { distanceMeters } from "@/lib/tfl/geo"
import type { StopIndex, StopRow } from "@/lib/tfl/stop-index"
import { NO_PLACES } from "@/lib/tfl/homepage-live/combined-search"

/** A Board editor's search shows one kind of place; no mode is the homepage's mixed search. */
export type SearchMode = "rail" | "bus" | "cycle"

export const NEAREST_LIMIT = 8
const NEAREST_RADIUS_METERS = 800

/** The rows a mode lists: stations only, bus stops only, or (docks) none from the stop index. */
export const rowsForMode = (
  rows: StopRow[],
  mode: SearchMode | undefined
): StopRow[] => {
  if (!mode) return rows
  const kind = mode === "rail" ? "station" : mode === "bus" ? "bus" : null
  const kept = kind ? rows.filter((row) => row.kind === kind) : []
  return kept.length === rows.length ? rows : kept
}

/**
 * Drops bus stops that no route serves. NaPTAN keeps some of them in the index
 * (e.g. 490000024Z "Blackhorse Road Station", indicator "->E", no letter, no
 * lines): they have no arrivals, so they would only add a letterless pin on top
 * of the real stops. TfL's own live hits stay, because their routes arrive later.
 * Returns the same array when nothing is dropped.
 */
export const servedRows = (rows: StopRow[]): StopRow[] => {
  const kept = rows.filter(
    (row) => row.kind !== "bus" || row.liveOnly === true || row.lines.length > 0
  )
  return kept.length === rows.length ? rows : kept
}

/** TfL's bus stop search runs on the homepage and for bus stops, not for stations or docks. */
export const searchesBusStops = (mode: SearchMode | undefined) =>
  mode === undefined || mode === "bus"

export const noMatchFor = (mode: SearchMode | undefined) =>
  mode === "rail"
    ? "No stations match that."
    : mode === "bus"
      ? "No bus stops match that."
      : mode === "cycle"
        ? "No docks match that."
        : NO_PLACES

type NearIndex = Pick<StopIndex, "size" | "stationCount" | "columns" | "at">

/** The bus stops of the index nearest `near`, nearest first, within walking distance. */
export const nearestBusRows = (
  index: NearIndex,
  near: { lat: number; lon: number },
  limit = NEAREST_LIMIT
): StopRow[] => {
  const { lat, lon } = index.columns
  const found: { at: number; distance: number }[] = []
  for (let at = index.stationCount; at < index.size; at += 1) {
    const rowLat = lat[at]! / 1e5
    const rowLon = lon[at]! / 1e5
    // Cheap box first: about 0.0075 degrees of latitude is 830 m.
    if (Math.abs(rowLat - near.lat) > 0.0075 || Math.abs(rowLon - near.lon) > 0.012)
      continue
    const distance = distanceMeters(near.lat, near.lon, rowLat, rowLon)
    if (distance <= NEAREST_RADIUS_METERS) found.push({ at, distance })
  }
  return found
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit)
    .flatMap(({ at, distance }) => {
      const row = index.at(at)
      return row ? [{ ...row, distance: Math.round(distance) }] : []
    })
}
