"use server"

import { searchBusStops } from "@/lib/tfl/actions"
import { filterNamedPlaces } from "@/lib/tfl/board-nearby"
import {
  formatBikePointId,
  normalizeBusRouteIds,
} from "@/lib/tfl/board-panels"
import { isBoardableBusStopId, mapStopPoint } from "@/lib/tfl/bus-stop-shape"
import { getTflClient } from "@/lib/tfl/client"
import { getExplorerRiverPiers } from "@/lib/tfl/explorer/points-river"
import { normaliseBikePoint } from "@/lib/tfl/explorer-point-normalise"

export type BoardPlaceKind = "bus" | "river" | "cycle"

export type BoardPlaceHit = {
  id: string
  name: string
  context?: string
  stopLetter?: string
}

export type SearchBoardPlacesResult =
  { ok: true; places: BoardPlaceHit[] } | { ok: false; error: string }

export type BoardBusStopRoutesResult =
  | { ok: true; routes: readonly string[] }
  | { ok: false; error: string }

export type BoardCycleDockLabelsResult =
  | { ok: true; labels: Record<string, string> }
  | { ok: false; error: string }

export type BoardPlaceLabelResult =
  | { ok: true; place: BoardPlaceHit }
  | { ok: false; error: string }

const MAX_CYCLE_DOCK_LABELS = 16

/**
 * Routes that serve a boarding-point bus stop. Used to prefill `b.routes`.
 */
export async function getBoardBusStopRoutes(
  stopId: string
): Promise<BoardBusStopRoutesResult> {
  const trimmed = stopId.trim()
  if (!trimmed || !isBoardableBusStopId(trimmed)) {
    return { ok: false, error: "No bus stop selected." }
  }

  try {
    const client = getTflClient()
    const details = await client.stopPoint.get([trimmed])
    const detail = Array.isArray(details) ? details[0] : details
    const stop = detail ? mapStopPoint(detail) : null
    return { ok: true, routes: normalizeBusRouteIds(stop?.lines ?? []) }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not load routes."
    return { ok: false, error: message }
  }
}

export async function getBoardRiverPiers(): Promise<SearchBoardPlacesResult> {
  try {
    const piers = await getExplorerRiverPiers()
    return {
      ok: true,
      places: piers.map((pier) => ({
        id: pier.id,
        name: pier.name,
        context: pier.lines.join(", "),
      })),
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not load piers."
    return { ok: false, error: message }
  }
}

export async function getBoardPlaceLabel(
  kind: "bus" | "river",
  id: string
): Promise<BoardPlaceLabelResult> {
  const trimmed = id.trim()
  if (!trimmed) return { ok: false, error: "No stop selected." }

  try {
    if (kind === "river") {
      const piers = await getExplorerRiverPiers()
      const pier = piers.find((item) => item.id === trimmed)
      if (!pier) return { ok: false, error: "Unknown pier." }
      return {
        ok: true,
        place: {
          id: pier.id,
          name: pier.name,
          context: pier.lines.join(", "),
        },
      }
    }

    if (!isBoardableBusStopId(trimmed)) {
      return { ok: false, error: "Unknown bus stop." }
    }
    const client = getTflClient()
    const details = await client.stopPoint.get([trimmed])
    const detail = Array.isArray(details) ? details[0] : details
    const stop = detail ? mapStopPoint(detail) : null
    if (!stop) return { ok: false, error: "Unknown bus stop." }
    return {
      ok: true,
      place: {
        id: stop.id,
        name: stop.name,
        stopLetter: stop.stopLetter,
        context: stop.towards ? `towards ${stop.towards}` : undefined,
      },
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not load stop name."
    return { ok: false, error: message }
  }
}

/**
 * Names for docks already on the board. Caps the list so this is not an
 * open BikePoint proxy.
 */
export async function getBoardCycleDockLabels(
  ids: readonly string[]
): Promise<BoardCycleDockLabelsResult> {
  const unique = [
    ...new Set(ids.map((id) => formatBikePointId(id)).filter(Boolean)),
  ].slice(0, MAX_CYCLE_DOCK_LABELS)
  if (unique.length === 0) return { ok: true, labels: {} }

  try {
    const client = getTflClient()
    const labels: Record<string, string> = {}
    await Promise.all(
      unique.map(async (id) => {
        try {
          const dock = await client.bikePoint.getById(id)
          const point = normaliseBikePoint(dock)
          if (!point) return
          labels[formatBikePointId(point.id)] = point.name
        } catch {
          // Skip unknown or failed ids; chips fall back to a short id.
        }
      })
    )
    return { ok: true, labels }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not load dock names."
    return { ok: false, error: message }
  }
}

/**
 * Discover a bus stop, river pier, or cycle dock for the Board builder.
 * Pins go into the hash; `/board/view` does not search.
 */
export async function searchBoardPlaces(
  kind: BoardPlaceKind,
  query: string
): Promise<SearchBoardPlacesResult> {
  const trimmed = query.trim()
  if (trimmed.length < 2) {
    return { ok: false, error: "Enter at least 2 characters to search." }
  }

  try {
    if (kind === "bus") {
      const result = await searchBusStops(trimmed)
      if (!result.ok) return result
      return {
        ok: true,
        places: result.stops.map((stop) => ({
          id: stop.id,
          name: stop.name,
          stopLetter: stop.stopLetter,
          context: stop.towards ? `towards ${stop.towards}` : undefined,
        })),
      }
    }

    if (kind === "river") {
      const piers = await getExplorerRiverPiers()
      return {
        ok: true,
        places: filterNamedPlaces(piers, trimmed).map((pier) => ({
          id: pier.id,
          name: pier.name,
          context: pier.lines.join(", "),
        })),
      }
    }

    const client = getTflClient()
    const docks = await client.bikePoint.search({ query: trimmed })
    const places: BoardPlaceHit[] = []
    const seen = new Set<string>()
    for (const dock of docks) {
      const point = normaliseBikePoint(dock)
      if (!point) continue
      const id = formatBikePointId(point.id)
      if (!id || seen.has(id)) continue
      seen.add(id)
      places.push({ id, name: point.name })
      if (places.length >= 8) break
    }
    return { ok: true, places }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Search failed."
    return { ok: false, error: message }
  }
}
