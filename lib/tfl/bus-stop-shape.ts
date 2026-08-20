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
