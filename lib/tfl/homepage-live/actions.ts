"use server"

import { headers } from "next/headers"
import { searchBusStops } from "@/lib/tfl/actions"
import { getCachedBusRouteGeometry } from "@/lib/tfl/bus-route-geometry"
import { isBoardableBusStopId, mapStopPoint } from "@/lib/tfl/bus-stop-shape"
import { getTflClient } from "@/lib/tfl/client"
import {
  compactRound,
  type CompactRound,
} from "@/lib/tfl/homepage-live/compact"
import {
  replayArrivalsRound,
  replayBusArrivalsRound,
  replaySearchData,
} from "@/lib/tfl/homepage-live/fixture"
import { busesNearStop, type MapBus } from "@/lib/tfl/homepage-live/bods-buses"
import {
  getCachedBodsActivities,
  isBodsConfigured,
} from "@/lib/tfl/homepage-live/bods-cache"
import { admitVisitorStop } from "@/lib/tfl/homepage-live/bus-quota"
import {
  serveBusStopBoard,
  unavailableOutcome,
  type BusBoardRow,
} from "@/lib/tfl/homepage-live/bus-stop-arrivals"
import {
  getCachedBusStop,
  getQuotaStore,
  visitorKeyFrom,
} from "@/lib/tfl/homepage-live/bus-stop-cache"
import { toBusHit, type BusHit } from "@/lib/tfl/homepage-live/search"
import { getCachedNetworkRound } from "@/lib/tfl/homepage-live/network-arrivals"
import {
  REPLAY_FIXTURES,
  REPLAY_LAST_ROUND,
  replayRoundsFor,
  type ReplayFixtureName,
} from "@/lib/tfl/homepage-live/replay-params"

export type { BusBoardRow, MapBus }

export type NetworkRoundResult =
  /** `servedAt` is the server clock now; with `round.at` (the TfL read) it gives the data's age with no client clock involved. */
  | { ok: true; rounds: CompactRound[]; servedAt: number }
  | { ok: false; error: string; rateLimited: boolean }

/** The live network poll, shared and cached on the server. */
export async function getNetworkRoundAction(): Promise<NetworkRoundResult> {
  try {
    const state = await getCachedNetworkRound()
    if (!state.ok)
      return {
        ok: false,
        rateLimited: true,
        error: "TfL is busy right now. The map will retry.",
      }
    return { ok: true, rounds: [state.round], servedAt: Date.now() }
  } catch {
    return {
      ok: false,
      rateLimited: false,
      error: "Live trains are unavailable right now. The map will retry.",
    }
  }
}

/** Recorded rounds for `?replay=`, read from the committed fixture, never the network. */
export async function getReplayRoundsAction(
  fixture: string,
  round: number
): Promise<NetworkRoundResult> {
  if (!(fixture in REPLAY_FIXTURES) || !Number.isInteger(round))
    return { ok: false, rateLimited: false, error: "Unknown replay." }
  const request = {
    fixture: fixture as ReplayFixtureName,
    round: Math.min(REPLAY_LAST_ROUND, Math.max(0, round)),
  }
  const rounds = replayRoundsFor(request).map((index) => {
    const recorded = replayArrivalsRound(index)
    return compactRound(recorded.rows, recorded.receivedAt)
  })
  return { ok: true, rounds, servedAt: rounds[rounds.length - 1]?.at ?? 0 }
}

const replayOk = (replay?: { fixture: string; round: number }) =>
  !replay || replay.fixture in REPLAY_FIXTURES

export type BusSearchResult =
  | { ok: true; hits: BusHit[] }
  | { ok: false; error: string }

const foldQuery = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim()

/** Bus stops matching a typed query: TfL's search live, the recorded searches under `?replay=`. */
export async function searchBusStopsAction(
  query: string,
  replay?: { fixture: string; round: number }
): Promise<BusSearchResult> {
  if (!replayOk(replay)) return { ok: false, error: "Unknown replay." }
  if (replay) {
    const q = foldQuery(query)
    const data = replaySearchData()
    const key = Object.keys(data.searches).find((k) => {
      const name = k.replaceAll("-", " ")
      return q.length >= 2 && (name.startsWith(q) || q.startsWith(name))
    })
    return {
      ok: true,
      hits: (key ? data.searches[key]! : [])
        .filter((m) => m.modes?.includes("bus") && !m.modes.includes("tube"))
        .map((m) => ({
          kind: "bus" as const,
          id: m.id,
          name: m.name,
          towards: m.towards,
          routes: [],
          lat: m.lat,
          lon: m.lon,
        })),
    }
  }
  const result = await searchBusStops(query)
  if (!result.ok) {
    // "No match" is an answer, not a failure.
    return /^No bus stops matched/i.test(result.error)
      ? { ok: true, hits: [] }
      : { ok: false, error: result.error }
  }
  return { ok: true, hits: result.stops.map(toBusHit) }
}

const MAX_ENRICH_STOPS = 8

/** Painted letter and routes for a handful of search hits: a hit from TfL's search has neither. */
export async function enrichBusStopsAction(
  stopIds: readonly string[],
  replay?: { fixture: string; round: number }
): Promise<
  | { ok: true; details: Record<string, Pick<BusHit, "stopLetter" | "routes" | "towards">> }
  | { ok: false; error: string }
> {
  const ids = [...new Set(stopIds.map((id) => id.trim()))]
    .filter((id) => isBoardableBusStopId(id))
    .slice(0, MAX_ENRICH_STOPS)
  if (ids.length === 0) return { ok: true, details: {} }
  if (!replayOk(replay)) return { ok: false, error: "Unknown replay." }
  const details: Record<string, Pick<BusHit, "stopLetter" | "routes" | "towards">> = {}
  try {
    if (replay) {
      for (const stop of replaySearchData().kxBusStops)
        if (ids.includes(stop.id))
          details[stop.id] = {
            stopLetter: stop.stopLetter,
            routes: stop.lines ?? [],
            towards: stop.towards,
          }
      return { ok: true, details }
    }
    const result = await getTflClient().stopPoint.get(ids)
    for (const raw of Array.isArray(result) ? result : [result]) {
      const stop = raw ? mapStopPoint(raw) : null
      if (stop)
        details[stop.id] = {
          stopLetter: stop.stopLetter,
          routes: [...new Set(stop.lines ?? [])],
          towards: stop.towards,
        }
    }
    return { ok: true, details }
  } catch {
    return { ok: false, error: "Stop details are unavailable right now." }
  }
}

export type BusStopOverlay = {
  stop: BusHit
  /** One entry per route that serves the stop; `lines` are [lon, lat] strings, both directions. */
  routes: { routeId: string; lines: number[][][] }[]
}

export type BusStopOverlayResult =
  | { ok: true; overlay: BusStopOverlay }
  | { ok: false; error: string }

const MAX_OVERLAY_ROUTES = 8

/** The painted letter, routes and route geometry of one bus stop (a hit from search only has its name). */
export async function getBusStopOverlayAction(
  stopId: string,
  replay?: { fixture: string; round: number }
): Promise<BusStopOverlayResult> {
  const id = stopId.trim()
  if (!id || !isBoardableBusStopId(id))
    return { ok: false, error: "That is not a bus stop." }
  if (!replayOk(replay)) return { ok: false, error: "Unknown replay." }
  try {
    if (replay) {
      const data = replaySearchData()
      const found = data.kxBusStops.find((s) => s.id === id)
      if (!found) return { ok: false, error: "This stop is not in the recording." }
      return {
        ok: true,
        overlay: {
          stop: toBusHit(found),
          routes: (found.lines ?? [])
            .map((routeId) => ({
              routeId,
              lines: ["outbound", "inbound"].flatMap(
                (dir) => data.busRoutes[`${routeId.toLowerCase()}-${dir}`] ?? []
              ),
            }))
            .filter((r) => r.lines.length > 0),
        },
      }
    }
    const details = await getTflClient().stopPoint.get([id])
    const detail = Array.isArray(details) ? details[0] : details
    const stop = detail ? mapStopPoint(detail) : null
    if (!stop) return { ok: false, error: "That stop could not be found." }
    const routeIds = [...new Set(stop.lines ?? [])]
      .filter((r) => !/^n\d/i.test(r))
      .slice(0, MAX_OVERLAY_ROUTES)
    const routes = await Promise.all(
      routeIds.map(async (routeId) => {
        const both = await Promise.all(
          (["outbound", "inbound"] as const).map((dir) =>
            getCachedBusRouteGeometry(routeId.toLowerCase(), dir).catch(() => null)
          )
        )
        return {
          routeId,
          lines: both.flatMap((g) =>
            (g?.segments ?? []).map((s) => s.line.coordinates as number[][])
          ),
        }
      })
    )
    return {
      ok: true,
      overlay: { stop: toBusHit(stop), routes: routes.filter((r) => r.lines.length > 0) },
    }
  } catch {
    return { ok: false, error: "That stop could not be loaded right now." }
  }
}

export type BusVehiclesResult =
  | { ok: true; source: "gps"; buses: MapBus[] }
  | { ok: true; source: "none"; buses: [] }
  | { ok: false; error: string }

const ROUTE_ID = /^[A-Za-z]{0,2}\d{1,3}[A-Za-z]?$/

/**
 * GPS buses on the routes of one stop, from the single all-London BODS read.
 * Without `BODS_API_KEY` (or under `?replay=`) the answer is "none": buses are
 * not drawn, never guessed.
 */
export async function getBusVehiclesAction(
  routeIds: readonly string[],
  stop: { lat: number; lon: number },
  replay?: { fixture: string; round: number }
): Promise<BusVehiclesResult> {
  if (replay || !isBodsConfigured()) return { ok: true, source: "none", buses: [] }
  const routes = [...new Set(routeIds.map((id) => id.trim()))]
    .filter((id) => ROUTE_ID.test(id))
    .slice(0, MAX_OVERLAY_ROUTES)
  if (routes.length === 0 || !Number.isFinite(stop.lat) || !Number.isFinite(stop.lon))
    return { ok: true, source: "none", buses: [] }
  try {
    const activities = await getCachedBodsActivities()
    return { ok: true, source: "gps", buses: busesNearStop(activities, routes, stop, Date.now()) }
  } catch {
    return { ok: false, error: "Bus positions are unavailable right now." }
  }
}

export type BusStopBoardResult =
  | { ok: true; rows: BusBoardRow[]; updatedSecAgo?: number; stale?: boolean }
  | { ok: false; error: string; kind?: "busy" | "failed" }

/**
 * Arrivals for any bus stop: the recording under `?replay=`, otherwise the
 * shared per-stop cache on the site key. Each visitor may open 20 new stops a
 * minute; past that, or when the site's TfL budget is spent, the last rows are
 * served with how old they are.
 */
export async function getBusStopBoardAction(
  stopId: string,
  replay?: { fixture: string; round: number }
): Promise<BusStopBoardResult> {
  if (replay) {
    if (!(replay.fixture in REPLAY_FIXTURES) || !Number.isInteger(replay.round))
      return { ok: false, error: "Unknown replay." }
    const recorded = replayBusArrivalsRound(
      Math.min(REPLAY_LAST_ROUND, Math.max(0, replay.round))
    ).byLine.get(stopId)
    if (!recorded) return { ok: false, error: "This stop is not in the recording." }
    return {
      ok: true,
      rows: recorded
        .map((row) => ({
          route: row.lineId ?? "",
          destination: row.destinationName ?? "",
          towards: row.towards,
          etaSec: row.timeToStation ?? 0,
          vehicleId: row.vehicleId,
        }))
        .sort((a, b) => a.etaSec - b.etaSec),
    }
  }
  const id = stopId.trim()
  if (!isBoardableBusStopId(id)) return { ok: false, error: "That is not a bus stop." }
  try {
    const requestHeaders = await headers()
    const visitor = visitorKeyFrom(
      requestHeaders.get("x-forwarded-for"),
      requestHeaders.get("user-agent")
    )
    const store = await getQuotaStore()
    const outcome = await serveBusStopBoard(id, {
      store,
      admitVisitor: () => admitVisitorStop(store, visitor, id, Date.now()),
      snapshot: () => getCachedBusStop(id),
      now: Date.now,
    })
    return outcome.ok
      ? { ...outcome, rows: [...outcome.rows].sort((a, b) => a.etaSec - b.etaSec) }
      : outcome
  } catch (error) {
    return unavailableOutcome(error)
  }
}

