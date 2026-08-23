/**
 * Shared bus-stop normalisation — used by Server Actions and Explorer loaders.
 * Plain module (not `"use server"`).
 */

import { readStopLetter, usableTflText } from "@/lib/tfl/bus-stop-letter"

export type AdditionalProperty = { key?: string; value?: string }
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
  /** Degrees clockwise from north, when TfL exposes a compass / bearing. */
  bearingDegrees?: number
}

export const readTowards = (
  properties?: AdditionalProperty[]
): string | undefined => {
  const value = properties?.find(
    (prop) => prop.key?.toLowerCase() === "towards"
  )?.value
  return usableTflText(value)
}

export const readSmsCode = (
  properties?: AdditionalProperty[]
): string | undefined => {
  const value = properties?.find(
    (prop) => prop.key?.toLowerCase() === "smscode"
  )?.value
  const trimmed = value?.trim()
  return trimmed || undefined
}

const COMPASS_DEGREES: Record<string, number> = {
  N: 0,
  NNE: 22.5,
  NE: 45,
  ENE: 67.5,
  E: 90,
  ESE: 112.5,
  SE: 135,
  SSE: 157.5,
  S: 180,
  SSW: 202.5,
  SW: 225,
  WSW: 247.5,
  W: 270,
  WNW: 292.5,
  NW: 315,
  NNW: 337.5,
}

const COMPASS_RE =
  /^(?:->)?(N|NNE|NE|ENE|E|ESE|SE|SSE|S|SSW|SW|WSW|W|WNW|NW|NNW)$/i

/** `W`, `->NE`, or a 0–359 bearing string → degrees clockwise from north. */
export const compassPointToDegrees = (
  raw?: string | null
): number | undefined => {
  const trimmed = usableTflText(raw)
  if (!trimmed) return undefined
  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const numeric = Number(trimmed)
    if (numeric >= 0 && numeric < 360) return numeric
    return undefined
  }
  const match = trimmed.replace(/\s+/g, "").match(COMPASS_RE)
  if (!match?.[1]) return undefined
  return COMPASS_DEGREES[match[1].toUpperCase()]
}

const readPropValue = (
  properties: AdditionalProperty[] | undefined,
  key: string
): string | undefined =>
  properties?.find((prop) => prop.key?.toLowerCase() === key)?.value

export const readBearingDegrees = (
  properties?: AdditionalProperty[],
  indicator?: string | null,
  stopLetter?: string | null
): number | undefined =>
  compassPointToDegrees(readPropValue(properties, "compasspoint")) ??
  compassPointToDegrees(readPropValue(properties, "bearing")) ??
  compassPointToDegrees(indicator) ??
  compassPointToDegrees(stopLetter)

/** London bus stop points that support live arrivals (not hubs / station parents). */
export const isBoardableBusStopId = (id: string): boolean => /^490\d/i.test(id)

/**
 * Street suffixes that match too many StopPoint names to be useful on their
 * own. Keep distinctive tokens like "silverthorne".
 */
const GENERIC_BUS_SEARCH_WORDS = new Set([
  "and",
  "avenue",
  "bridge",
  "circus",
  "close",
  "common",
  "green",
  "grove",
  "hill",
  "lane",
  "park",
  "place",
  "road",
  "row",
  "square",
  "st",
  "station",
  "stop",
  "street",
  "the",
  "way",
])

export const normaliseBusSearchText = (value: string): string =>
  value.trim().toLowerCase().replace(/['’]/g, "")

/** True when a stop / hub name is a real hit for the typed query. */
export const busSearchNameMatches = (name: string, query: string): boolean => {
  const needle = normaliseBusSearchText(query)
  if (needle.length < 2) return false
  const haystack = normaliseBusSearchText(name)
  if (haystack.includes(needle)) return true
  const tokens = needle
    .split(/[^a-z0-9]+/)
    .filter(
      (token) => token.length >= 4 && !GENERIC_BUS_SEARCH_WORDS.has(token)
    )
  return tokens.some((token) => haystack.includes(token))
}

/** Hubs with coordinates, preferring names that match the query. */
export const pickNamedExpandableMatches = <
  T extends { name?: string; stationName?: string; lat?: number; lon?: number },
>(
  matches: readonly T[],
  query: string,
  limit = 3
): T[] => {
  const withCoords = matches.filter(
    (match) => typeof match.lat === "number" && typeof match.lon === "number"
  )
  const named = withCoords.filter((match) =>
    busSearchNameMatches(match.name ?? match.stationName ?? "", query)
  )
  const chosen = named.length > 0 ? named : withCoords
  return chosen.slice(0, limit)
}

export const mergeStopsById = <T extends { id: string }>(
  groups: readonly (readonly T[])[]
): T[] => {
  const seen = new Set<string>()
  const merged: T[] = []
  for (const group of groups) {
    for (const stop of group) {
      if (seen.has(stop.id)) continue
      seen.add(stop.id)
      merged.push(stop)
    }
  }
  return merged
}

/** Keep name matches when any exist so a street search is not a nearby dump. */
export const preferStopsMatchingSearch = <T extends { name: string }>(
  stops: readonly T[],
  query: string
): T[] => {
  const matched = stops.filter((stop) => busSearchNameMatches(stop.name, query))
  return matched.length > 0 ? matched : [...stops]
}

export const isBusStop = (modes?: string[]): boolean =>
  modes?.includes("bus") ?? false

export const mapStopPoint = (stop: {
  id?: string
  commonName?: string
  name?: string
  indicator?: string
  stopLetter?: string
  towards?: string
  distance?: number
  lat?: number
  lon?: number
  lines?: Array<{ name?: string; id?: string }>
  additionalProperties?: AdditionalProperty[]
}): NearbyBusStop | null => {
  if (!stop.id) return null

  return {
    id: stop.id,
    name: (stop.commonName ?? stop.name)?.trim() || "Unknown stop",
    indicator: stop.indicator,
    stopLetter: readStopLetter(stop.stopLetter, stop.indicator),
    towards:
      usableTflText(stop.towards) || readTowards(stop.additionalProperties),
    distance: stop.distance,
    lines: stop.lines
      ?.map((line) => line.name ?? line.id)
      .filter((value): value is string => Boolean(value)),
    lat: typeof stop.lat === "number" ? stop.lat : undefined,
    lon: typeof stop.lon === "number" ? stop.lon : undefined,
    smsCode: readSmsCode(stop.additionalProperties),
    bearingDegrees: readBearingDegrees(
      stop.additionalProperties,
      stop.indicator,
      stop.stopLetter
    ),
  }
}

export const mapStopsFromGeoResponse = (
  stopPoints: Array<{
    id?: string
    commonName?: string
    indicator?: string
    stopLetter?: string
    distance?: number
    lat?: number
    lon?: number
    modes?: string[]
    lines?: Array<{ name?: string; id?: string }>
    additionalProperties?: AdditionalProperty[]
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
