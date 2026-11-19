"use server"

import { getNearbyBusStops } from "@/lib/tfl/actions"
import { NEAREST_BUS_STOPS } from "@/lib/tfl/board-bus-stops"
import { nearestCatalogStation, pickClosestNamed } from "@/lib/tfl/board-nearby"
import { getTflClient } from "@/lib/tfl/client"
import { getExplorerRiverPiers } from "@/lib/tfl/explorer/points-river"
import { isValidLatLon, truncateLatLon } from "@/lib/tfl/geo"
import { formatBikePointId } from "@/lib/tfl/board-panels"
import { stationCoord } from "@/lib/tfl/station-coords"

const RIVER_RADIUS_METERS = 600
const CYCLE_RADIUS_METERS = 100
const CYCLE_LIMIT = 4
const RAIL_RADIUS_METERS = 5_000

export type BoardNearbyResult =
  | {
      ok: true
      rail?: { id: string; name: string }
      bus?: { id: string; name: string }
      /** The nearest few bus stops, nearest first (`bus` is the first). */
      buses?: readonly { id: string; name: string }[]
      river?: { id: string; name: string }
      docks: readonly string[]
    }
  | { ok: false; error: string }

/**
 * Discover nearby rail / bus / river / cycle ids for the Board builder.
 * Pins go into the hash; `/board/view` does not call this.
 */
export async function getBoardNearbyPlaces(
  lat: number,
  lon: number
): Promise<BoardNearbyResult> {
  if (!isValidLatLon(lat, lon)) {
    return { ok: false, error: "Invalid coordinates." }
  }

  const { lat: truncatedLat, lon: truncatedLon } = truncateLatLon(lat, lon)

  try {
    const [busResult, piers, cycleNearby] = await Promise.all([
      getNearbyBusStops(truncatedLat, truncatedLon),
      getExplorerRiverPiers(),
      Promise.resolve()
        .then(() =>
          getTflClient().bikePoint.getByRadius({
            lat: truncatedLat,
            lon: truncatedLon,
            radius: CYCLE_RADIUS_METERS,
          })
        )
        .catch(() => ({ places: [] })),
    ])

    const rail = nearestCatalogStation(
      truncatedLat,
      truncatedLon,
      RAIL_RADIUS_METERS
    )
    const buses = busResult.ok
      ? busResult.stops
          .slice(0, NEAREST_BUS_STOPS)
          .map((stop) => ({ id: stop.id, name: stop.name }))
      : []
    const bus = buses[0]
    const riverPlace = pickClosestNamed(
      truncatedLat,
      truncatedLon,
      piers,
      RIVER_RADIUS_METERS
    )

    const docks = [...cycleNearby.places]
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
      .slice(0, CYCLE_LIMIT)
      .map((place) => formatBikePointId(place.id))
      .filter(Boolean)

    return {
      ok: true,
      rail: rail ? { id: rail.id, name: rail.name } : undefined,
      bus,
      buses,
      river: riverPlace
        ? { id: riverPlace.id, name: riverPlace.name }
        : undefined,
      docks,
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to find nearby stops."
    return { ok: false, error: message }
  }
}

/** Same discovery, using a catalogue station instead of GPS. */
export async function getBoardNearbyPlacesForStop(
  stopId: string
): Promise<BoardNearbyResult> {
  const coord = stationCoord(stopId)
  if (!coord) {
    return { ok: false, error: "Unknown stop." }
  }
  return getBoardNearbyPlaces(coord.lat, coord.lon)
}
