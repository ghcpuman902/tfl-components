/**
 * Common Explorer point shape used by TfLPointPicker and Find adapters.
 * Domain-specific optional fields are explicit — no `any`.
 */

import { isSmsCodeQuery, normalizeStopPoint } from "tfl-ts"
import { readStopLetter as readPaintedStopLetter } from "@/lib/tfl/bus-stop-letter"

export type ExplorerPointKind = "stopPoint" | "bikePoint"

export type ExplorerHubMember = {
  id: string
  name: string
  lineIds: string[]
}

export type ExplorerPoint = {
  id: string
  name: string
  kind: ExplorerPointKind
  lat?: number
  lon?: number
  modes?: string[]
  lineIds?: string[]
  zone?: string
  stopLetter?: string
  smsCode?: string
  towards?: string
  distanceMeters?: number
  /** CompassPoint additional property (`N`, `NE`, …). */
  compassPoint?: string
  /** Degrees clockwise from north — tfl-ts `compassBearingDegrees`. */
  compassBearingDegrees?: number
  additionalProperties?: Array<{
    key?: string
    value?: string
    category?: string
  }>
  bikes?: number
  eBikes?: number
  spaces?: number
  aliasIds?: string[]
  /** Interchange id when this row is a multi-StopPoint hub. */
  hubId?: string
  /** Sibling StopPoints that carry TfL arrivals. Omitted for a single StopPoint. */
  hubMembers?: ExplorerHubMember[]
  /** Ids to poll for arrivals. Omitted when it is just `[id]`. */
  arrivalsStopIds?: string[]
}

export { isSmsCodeQuery }

type StopLike = {
  id?: string
  commonName?: string
  name?: string
  stationName?: string
  lat?: number
  lon?: number
  modes?: string[]
  lines?: Array<{ id?: string; name?: string }>
  stopLetter?: string
  indicator?: string
  platformName?: string
  towards?: string
  smsCode?: string
  distance?: number
  compassPoint?: string
  compassBearingDegrees?: number
  additionalProperties?: Array<{
    key?: string
    value?: string
    category?: string
  }>
}

const readStopLetter = (stop: StopLike): string | undefined =>
  readPaintedStopLetter(stop.stopLetter, stop.indicator ?? stop.platformName)

/** Normalise a StopPoint / search match into ExplorerPoint. */
export const normaliseStopPoint = (stop: StopLike): ExplorerPoint | null => {
  const id = stop.id?.trim()
  if (!id) return null

  const name =
    (stop.commonName ?? stop.name ?? stop.stationName)?.trim() || "Unknown stop"

  const lineIds = stop.lines
    ?.map((line) => line.id ?? line.name)
    .filter((value): value is string => Boolean(value))

  const lifted = normalizeStopPoint(stop)

  return {
    id,
    name,
    kind: "stopPoint",
    lat: typeof stop.lat === "number" ? stop.lat : undefined,
    lon: typeof stop.lon === "number" ? stop.lon : undefined,
    modes: stop.modes,
    lineIds,
    stopLetter: readStopLetter(stop),
    smsCode: lifted.smsCode,
    towards: lifted.towards,
    distanceMeters:
      typeof stop.distance === "number" ? stop.distance : undefined,
    compassPoint: lifted.compassPoint,
    compassBearingDegrees: lifted.compassBearingDegrees,
    additionalProperties: stop.additionalProperties,
  }
}

type BikeLike = {
  id?: string
  name?: string
  commonName?: string
  lat?: number
  lon?: number
  distance?: number
  bikes?: number
  eBikes?: number
  spaces?: number
}

/** Normalise a BikePoint / search result into ExplorerPoint. */
export const normaliseBikePoint = (dock: BikeLike): ExplorerPoint | null => {
  const id = dock.id?.trim()
  if (!id) return null

  return {
    id,
    name: (dock.name ?? dock.commonName)?.trim() || "Unknown dock",
    kind: "bikePoint",
    lat: typeof dock.lat === "number" ? dock.lat : undefined,
    lon: typeof dock.lon === "number" ? dock.lon : undefined,
    distanceMeters:
      typeof dock.distance === "number" ? dock.distance : undefined,
    bikes: typeof dock.bikes === "number" ? dock.bikes : undefined,
    eBikes: typeof dock.eBikes === "number" ? dock.eBikes : undefined,
    spaces: typeof dock.spaces === "number" ? dock.spaces : undefined,
  }
}

type RailCatalogLike = {
  id: string
  name: string
  displayName?: string
  modes?: string[]
  lines?: string[]
  aliasIds?: string[]
  zone?: string
  lat?: number
  lon?: number
  hubId?: string
  hubMembers?: ExplorerHubMember[]
  arrivalsStopIds?: string[]
}

/** Normalise a Tube & rail catalog station into ExplorerPoint. */
export const normaliseRailPoint = (
  station: RailCatalogLike
): ExplorerPoint => ({
  id: station.id,
  name: station.displayName ?? station.name,
  kind: "stopPoint",
  lat: station.lat,
  lon: station.lon,
  modes: station.modes,
  lineIds: station.lines,
  zone: station.zone,
  aliasIds: station.aliasIds,
  hubId: station.hubId,
  hubMembers: station.hubMembers,
  arrivalsStopIds: station.arrivalsStopIds,
})

/**
 * Collapse live Search / Locate hits onto catalog hub rows when we already
 * know the interchange. Unmatched hits stay as TfL returned them.
 */
export const collapseExplorerPointsToHubs = (
  points: readonly ExplorerPoint[],
  catalog: readonly ExplorerPoint[] = []
): ExplorerPoint[] => {
  const seen = new Set<string>()
  const out: ExplorerPoint[] = []

  for (const point of points) {
    const catalogHit = catalog.find(
      (row) => row.id === point.id || row.aliasIds?.includes(point.id) === true
    )
    const key = catalogHit?.hubId ?? catalogHit?.id ?? point.id
    if (seen.has(key)) continue
    seen.add(key)
    out.push(catalogHit ?? point)
  }

  return out
}
