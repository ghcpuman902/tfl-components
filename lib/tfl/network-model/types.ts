import type { LineString } from "geojson"

/**
 * GTFS-shaped records for maps and line diagrams.
 * Field names stay portable: another city’s GTFS feed should map onto the same types.
 */

/** GTFS: `routes.txt` — `route_id`, `route_short_name`, `route_long_name`, `route_type`, `route_color`, `route_text_color`. */
export type Line = {
  id: string
  shortName: string
  longName: string
  /** Mode label mapped from GTFS `route_type`, not the numeric code. */
  mode: string
  color: string
  textColor: string
}

/** GTFS: `stops.txt` — `stop_id`, `stop_name`, `stop_lat`, `stop_lon`, `parent_station`. */
export type Station = {
  id: string
  name: string
  lat: number
  lon: number
  hubId?: string
}

/** GTFS: `stops.txt` `location_type=1` parent, or a TfL station hub grouping. */
export type StationHub = {
  id: string
  memberStationIds: string[]
}

/** GTFS-adjacent: a reusable trip pattern, not every dated `trips.txt` row. */
export type ServicePattern = {
  id: string
  lineId: string
  /** GTFS `trips.direction_id` as a label (`inbound` / `outbound` or equivalent). */
  direction: string
  callIds: string[]
}

/** GTFS: `stop_times.txt` — `trip_id`, `stop_id`, `stop_sequence`. Times are omitted; derive service class elsewhere. */
export type PatternCall = {
  patternId: string
  stationId: string
  sequence: number
}

export type Weekday =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday"

/** GTFS: `calendar.txt` weekday flags plus `start_date` / `end_date`. */
export type PatternCalendar = {
  patternId: string
  daysOfWeek: Weekday[]
  validFrom: string
  validTo?: string
}

/** GTFS: `frequencies.txt` — `start_time`, `end_time`, `headway_secs`. */
export type PatternFrequency = {
  patternId: string
  /** Inclusive local time window, e.g. `07:00–09:30`. */
  timeWindow: string
  headwaySeconds?: number
}

/** GTFS: `shapes.txt` — `shape_id` and ordered lat/lon points. */
export type PhysicalPath = {
  id: string
  mode: string
  geometry: LineString
}

/** Not a GTFS table. Assigns a passenger pattern to a physical path. */
export type PatternPathMatch = {
  patternId: string
  pathId: string
  confidence: "exact" | "inferred"
}

/** Not a GTFS table. Through-movement at a station, derived from consecutive pattern calls. */
export type PermittedMovement = {
  fromStationId: string
  viaStationId: string
  toStationId: string
  patternIds: string[]
}

export type MapProduct = "in-carriage" | "platform" | "tube-map" | "geographic"

/** Product policy: which patterns a map product shows. No GTFS equivalent. */
export type MapProductPolicy = {
  product: MapProduct
  patternId: string
  visible: boolean
  emphasis?: "primary" | "secondary"
}

export type NetworkModelClassification =
  | "sufficient"
  | "fetch"
  | "process"
  | "external"
  | "author"

export type SourceOrigin = "api-native" | "processed" | "authored"

export type SourceCache = "tfl-ts" | "this-repo" | "none"

export type SourceRefresh = "build-time" | "manual" | "live" | "n/a"

export type SourceRef = {
  label: string
  href?: string
}

/** Which of the four map products consume this record. Absent = not a map input. */
export type MapProductUse = "all-four" | "geographic"

/**
 * Provenance for a network-model record.
 * GTFS: `feed_info.txt` (publisher, validity) plus our cache and refresh metadata.
 */
export type SourceSnapshot = {
  record: string
  classification: NetworkModelClassification
  origin: SourceOrigin
  cachedIn: SourceCache
  refresh: SourceRefresh
  /** Public docs: what this record is for a map or line diagram. */
  summary: string
  /** Internal: provenance and next engineering step. */
  note: string
  coverage?: string
  sources?: readonly SourceRef[]
  /** Set on records the four maps actually draw. */
  usedOn?: MapProductUse
}

export const NETWORK_MODEL_CLASSIFICATION_LABEL: Record<
  NetworkModelClassification,
  string
> = {
  sufficient: "Sufficient",
  fetch: "Fetch",
  process: "Process",
  external: "External",
  author: "Author",
}

export const SOURCE_ORIGIN_LABEL: Record<SourceOrigin, string> = {
  "api-native": "API native",
  processed: "Processed",
  authored: "Authored",
}

export const SOURCE_CACHE_LABEL: Record<SourceCache, string> = {
  "tfl-ts": "tfl-ts",
  "this-repo": "This repo",
  none: "None",
}

export const SOURCE_REFRESH_LABEL: Record<SourceRefresh, string> = {
  "build-time": "Build time",
  manual: "Manual",
  live: "Live",
  "n/a": "n/a",
}

export const MAP_PRODUCT_USE_LABEL: Record<MapProductUse, string> = {
  "all-four": "All four maps",
  geographic: "Geographic",
}
