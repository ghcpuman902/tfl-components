"use server"

import { getTflClient } from "@/lib/tfl/client"
import {
  getCachedStopArrivals,
  isDemoStopArrivalsId,
} from "@/lib/tfl/cached-stop-arrivals"
import { isValidLatLon, truncateLatLon } from "@/lib/tfl/geo"
import {
  isBoardableBusStopId,
  isBusStop,
  mapStopPoint,
  mapStopsFromGeoResponse,
  type NearbyBusStop,
} from "@/lib/tfl/bus-stop-shape"

export type BusArrival = {
  lineName?: string
  destinationName?: string
  towards?: string
  direction?: string
  bearing?: string
  platformName?: string
  timeToStation?: number
  expectedArrival?: string
  vehicleId?: string
}

export type { NearbyBusStop }

export type GetBusArrivalsResult =
  | { ok: true; arrivals: BusArrival[]; stopName?: string }
  | { ok: false; error: string }

export type GetNearbyBusStopsResult =
  | {
      ok: true
      stops: NearbyBusStop[]
      lat: number
      lon: number
      radius: number
    }
  | { ok: false; error: string }

export type SearchBusStopsResult =
  { ok: true; stops: NearbyBusStop[] } | { ok: false; error: string }

const NEARBY_RADIUS_METERS = 400
const MAX_NEARBY_STOPS = 8
const MAX_SEARCH_STOPS = 6

const fetchBusStopsNear = async (
  lat: number,
  lon: number,
  limit: number
): Promise<NearbyBusStop[]> => {
  const client = getTflClient()
  const response = await client.stopPoint.getByGeoPoint({
    lat,
    lon,
    radius: NEARBY_RADIUS_METERS,
    modes: ["bus"],
    returnLines: true,
  })
  return mapStopsFromGeoResponse(response.stopPoints ?? [], limit)
}

/** Enrich search hits with stop letter / towards from full stop details. */
const enrichStops = async (
  stops: NearbyBusStop[]
): Promise<NearbyBusStop[]> => {
  if (stops.length === 0) return stops

  try {
    const client = getTflClient()
    const details = await client.stopPoint.get(stops.map((stop) => stop.id))
    const detailList = Array.isArray(details) ? details : [details]
    const byId = new Map(
      detailList
        .map((detail) => mapStopPoint(detail))
        .filter((stop): stop is NearbyBusStop => stop !== null)
        .map((stop) => [stop.id, stop] as const)
    )

    return stops.map((stop) => {
      const detail = byId.get(stop.id)
      if (!detail) return stop
      return {
        ...stop,
        stopLetter: stop.stopLetter ?? detail.stopLetter,
        towards: stop.towards ?? detail.towards,
        lines: stop.lines?.length ? stop.lines : detail.lines,
        name: stop.name || detail.name,
        smsCode: stop.smsCode ?? detail.smsCode,
        lat: stop.lat ?? detail.lat,
        lon: stop.lon ?? detail.lon,
      }
    })
  } catch {
    return stops
  }
}

export async function getNearbyBusStops(
  lat: number,
  lon: number
): Promise<GetNearbyBusStopsResult> {
  if (!isValidLatLon(lat, lon)) {
    return { ok: false, error: "Invalid coordinates." }
  }

  const { lat: truncatedLat, lon: truncatedLon } = truncateLatLon(lat, lon)

  try {
    const stops = await fetchBusStopsNear(
      truncatedLat,
      truncatedLon,
      MAX_NEARBY_STOPS
    )

    if (stops.length === 0) {
      return {
        ok: false,
        error: `No bus stops found within ${NEARBY_RADIUS_METERS}m. Try searching by street name instead.`,
      }
    }

    return {
      ok: true,
      stops,
      lat: truncatedLat,
      lon: truncatedLon,
      radius: NEARBY_RADIUS_METERS,
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to find nearby stops."
    return { ok: false, error: message }
  }
}

export async function searchBusStops(
  query: string
): Promise<SearchBusStopsResult> {
  const trimmed = query.trim()
  if (trimmed.length < 2) {
    return { ok: false, error: "Enter at least 2 characters to search." }
  }

  try {
    const client = getTflClient()
    const response = await client.stopPoint.search({
      query: trimmed,
      modes: ["bus"],
      maxResults: MAX_SEARCH_STOPS,
    })

    const matches = (response.matches ?? []).filter(
      (match) => match.id && isBusStop(match.modes)
    )

    // Prefer real boarding points (490…). Hubs like HUBLBG have no bus arrivals.
    const boardable = matches
      .filter((match) => match.id && isBoardableBusStopId(match.id))
      .map((match) =>
        mapStopPoint({
          id: match.id,
          commonName: match.name ?? match.stationName,
          indicator: match.platformName,
          lines: match.lines,
          lat: match.lat,
          lon: match.lon,
        })
      )
      .filter((stop): stop is NearbyBusStop => stop !== null)

    if (boardable.length > 0) {
      const enriched = await enrichStops(boardable.slice(0, MAX_SEARCH_STOPS))
      return { ok: true, stops: enriched }
    }

    // Expand the first hub/station hit to nearby bus stops via its coordinates.
    const expandable = matches.find(
      (match) =>
        typeof match.lat === "number" &&
        typeof match.lon === "number" &&
        isValidLatLon(match.lat, match.lon)
    )

    if (expandable?.lat != null && expandable.lon != null) {
      const nearby = await fetchBusStopsNear(
        expandable.lat,
        expandable.lon,
        MAX_SEARCH_STOPS
      )
      if (nearby.length > 0) {
        return { ok: true, stops: nearby }
      }
    }

    return { ok: false, error: "No bus stops matched that search." }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to search stops."
    return { ok: false, error: message }
  }
}

/**
 * Site-key bus arrivals. Only allowlisted demo stop IDs are served
 * (shared cache) — same bound as `getStopArrivalsAction`.
 * Nearby / search below remain on-demand; no live route mounts them today
 * (`registry/tfl/arrivals/bus-arrivals.tsx` is unused by docs pages).
 */
export async function getBusArrivals(
  stopId: string,
  stopName?: string
): Promise<GetBusArrivalsResult> {
  const trimmed = stopId.trim()
  if (!trimmed) {
    return { ok: false, error: "No stop selected." }
  }

  if (!isDemoStopArrivalsId(trimmed)) {
    return {
      ok: false,
      error:
        "This stop is not available on the site key. Add your own TfL API key.",
    }
  }

  try {
    const arrivals = await getCachedStopArrivals(trimmed)
    const mapped: BusArrival[] = arrivals.map((arrival) => ({
      lineName: arrival.lineName,
      destinationName: arrival.destinationName,
      towards: arrival.towards,
      direction: arrival.direction,
      bearing: arrival.bearing,
      platformName: arrival.platformName,
      timeToStation: arrival.timeToStation,
      expectedArrival: arrival.expectedArrival,
      vehicleId: arrival.vehicleId,
    }))
    return { ok: true, arrivals: mapped, stopName }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch arrivals."
    if (message.includes("404")) {
      return {
        ok: false,
        error:
          "This stop has no live bus arrivals. Pick a stop with a letter (e.g. Stop R).",
      }
    }
    return { ok: false, error: message }
  }
}
