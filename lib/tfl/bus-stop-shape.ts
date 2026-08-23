/**
 * Site adapters over tfl-ts bus-stop helpers.
 * Direction / SMS lifts and name-search expansion live in tfl-ts 2.11+.
 */

import {
  isBoardableBusStopId,
  normalizeStopPoint,
  parseCompassPoint,
} from "tfl-ts"
import { readStopLetter } from "@/lib/tfl/bus-stop-letter"

export type AdditionalProperty = {
  key?: string
  value?: string
  category?: string
}

export {
  busSearchNameMatches,
  isBoardableBusStopId,
  parseBusStopSearchQuery,
  pickNamedExpandableMatches,
  preferStopsMatchingSearch,
  rankStopsBySearchLetter,
  resolveBusNameSearchHits,
} from "tfl-ts"
export { readStopLetter } from "@/lib/tfl/bus-stop-letter"

export type NearbyBusStop = {
  id: string
  name: string
  indicator?: string
  stopLetter?: string
  towards?: string
  distance?: number
  lines?: string[]
  lat?: number
  lon?: number
  smsCode?: string
  compassPoint?: string
  compassBearingDegrees?: number
  additionalProperties?: AdditionalProperty[]
}

/** NaPTAN stop-area / cluster (`490G…`). Arrivals are on child `490`+digit ids. */
export const isBusStopAreaId = (id: string): boolean => /^490G/i.test(id)

/** tfl-ts keeps this helper internal; same check as `modes?.includes("bus")`. */
export const isBusStop = (modes?: string[]): boolean =>
  modes?.includes("bus") ?? false

const readPropValue = (
  properties: AdditionalProperty[] | undefined,
  key: string
): string | undefined =>
  properties?.find((prop) => prop.key?.toLowerCase() === key)?.value

/** Compass from a leftover additionalProperties bag (pre-normalise payload). */
export const readCompassPoint = (
  properties?: AdditionalProperty[]
): string | undefined =>
  parseCompassPoint(readPropValue(properties, "compasspoint"))?.compassPoint

/** Arrow indicators only — a painted letter `W` is Stop W, not west. */
const compassFromArrow = (raw?: string | null) =>
  raw?.replace(/\s+/g, "").startsWith("->") ? parseCompassPoint(raw) : undefined

export const readCompassBearingDegrees = (
  properties?: AdditionalProperty[],
  indicator?: string | null,
  stopLetter?: string | null
): number | undefined =>
  parseCompassPoint(readPropValue(properties, "compasspoint"))
    ?.compassBearingDegrees ??
  compassFromArrow(indicator)?.compassBearingDegrees ??
  compassFromArrow(stopLetter)?.compassBearingDegrees

export const mapStopPoint = (stop: {
  id?: string
  commonName?: string
  name?: string
  indicator?: string
  stopLetter?: string
  towards?: string
  smsCode?: string
  distance?: number
  lat?: number
  lon?: number
  lines?: Array<{ name?: string; id?: string } | string>
  additionalProperties?: AdditionalProperty[]
  compassPoint?: string
  compassBearingDegrees?: number
}): NearbyBusStop | null => {
  if (!stop.id) return null
  const lifted = normalizeStopPoint(stop)

  return {
    id: stop.id,
    name: (stop.commonName ?? stop.name)?.trim() || "Unknown stop",
    indicator: stop.indicator,
    stopLetter: readStopLetter(stop.stopLetter, stop.indicator),
    towards: lifted.towards,
    distance: stop.distance,
    lines: stop.lines
      ?.map((line) =>
        typeof line === "string" ? line : (line.name ?? line.id)
      )
      .filter((value): value is string => Boolean(value)),
    lat: typeof stop.lat === "number" ? stop.lat : undefined,
    lon: typeof stop.lon === "number" ? stop.lon : undefined,
    smsCode: lifted.smsCode,
    compassPoint: lifted.compassPoint,
    compassBearingDegrees: lifted.compassBearingDegrees,
    additionalProperties: stop.additionalProperties,
  }
}

export const mapStopsFromGeoResponse = (
  stopPoints: Array<{
    id?: string
    commonName?: string
    indicator?: string
    stopLetter?: string
    towards?: string
    smsCode?: string
    distance?: number
    lat?: number
    lon?: number
    modes?: string[]
    lines?: Array<{ name?: string; id?: string }>
    additionalProperties?: AdditionalProperty[]
    compassPoint?: string
    compassBearingDegrees?: number
  }>,
  limit: number
): NearbyBusStop[] =>
  stopPoints
    .filter(
      (stop) =>
        stop.id && isBusStop(stop.modes) && isBoardableBusStopId(stop.id)
    )
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))
    .slice(0, limit)
    .map(mapStopPoint)
    .filter((stop): stop is NearbyBusStop => stop !== null)
