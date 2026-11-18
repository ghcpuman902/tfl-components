import { cacheLife, cacheTag } from "next/cache"
import { connection } from "next/server"
import type { RealtimePrediction } from "tfl-ts"
import {
  resolveArrivalsEmptyKind,
  type ArrivalsEmptyKind,
} from "@/lib/tfl/arrivals-empty"
import { getTflClient } from "@/lib/tfl/client"
import {
  HOME_BUS_STOP,
  HOME_RAIL_LINES,
  HOME_RAIL_STOP,
} from "@/lib/tfl/home-arrivals-stops"

export { HOME_BUS_STOP, HOME_RAIL_LINES, HOME_RAIL_STOP }

export type CachedArrivalsPayload = {
  arrivals: RealtimePrediction[]
  stopPointId: string
  stopName: string
  fetchedAt: number
  error?: string
}

/**
 * Marketing demo, not a live Board: it prints how old the rows are. Fresh for
 * 2 minutes (as before, so it adds no TfL load); `expire` stops a quiet site
 * serving hours-old rows. Remote, so it is one shared entry and never baked
 * into a build (the callers below await `connection()` first).
 */
const HOME_DEMO_CACHE_LIFE = { stale: 60, revalidate: 120, expire: 600 }

/**
 * Site/demo fetch for homepage arrivals — keep out of the reusable board.
 * Request time only; revalidates about every two minutes.
 */
export async function getCachedHomeRailArrivals(): Promise<CachedArrivalsPayload> {
  await connection()
  return readHomeRailArrivals()
}

async function readHomeRailArrivals(): Promise<CachedArrivalsPayload> {
  "use cache: remote"
  cacheLife(HOME_DEMO_CACHE_LIFE)
  cacheTag("tfl-home-rail-arrivals")

  const fetchedAt = Date.now()
  try {
    const client = getTflClient()
    const arrivals = await client.stopPoint.getArrivals({
      stopPointIds: [HOME_RAIL_STOP.id],
      sortBy: "timeToStation",
    })
    return {
      arrivals,
      stopPointId: HOME_RAIL_STOP.id,
      stopName: HOME_RAIL_STOP.name,
      fetchedAt,
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch arrivals."
    return {
      arrivals: [],
      stopPointId: HOME_RAIL_STOP.id,
      stopName: HOME_RAIL_STOP.name,
      fetchedAt,
      error: message,
    }
  }
}

/**
 * Compact bus board for the homepage — fixed Trafalgar Square stop, cached.
 */
export async function getCachedHomeBusArrivals(): Promise<CachedArrivalsPayload> {
  await connection()
  return readHomeBusArrivals()
}

async function readHomeBusArrivals(): Promise<CachedArrivalsPayload> {
  "use cache: remote"
  cacheLife(HOME_DEMO_CACHE_LIFE)
  cacheTag("tfl-home-bus-arrivals")

  const fetchedAt = Date.now()
  try {
    const client = getTflClient()
    const arrivals = await client.stopPoint.getArrivals({
      stopPointIds: [HOME_BUS_STOP.id],
      sortBy: "timeToStation",
    })
    return {
      arrivals,
      stopPointId: HOME_BUS_STOP.id,
      stopName: HOME_BUS_STOP.name,
      fetchedAt,
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch bus arrivals."
    return {
      arrivals: [],
      stopPointId: HOME_BUS_STOP.id,
      stopName: HOME_BUS_STOP.name,
      fetchedAt,
      error: message,
    }
  }
}

/**
 * Relative cache age. Pass an explicit `now` — never default to `Date.now()`
 * here; with Cache Components that blocks prerender (call `await connection()`
 * first, or format on the client).
 */
export const formatCacheAgeLabel = (fetchedAt: number, now: number): string => {
  const minutes = Math.max(0, Math.round((now - fetchedAt) / 60_000))
  if (minutes <= 0) return "Updated just now"
  if (minutes === 1) return "Updated 1 minute ago"
  return `Updated ${minutes} minutes ago`
}

/**
 * Cache age at request time. Owning `connection()` and the clock read here
 * keeps it out of component render, which has to stay pure.
 */
export const readCacheAgeLabel = async (fetchedAt: number): Promise<string> => {
  await connection()
  return formatCacheAgeLabel(fetchedAt, Date.now())
}

const ARRIVALS_LOAD_ERROR = "Couldn't load arrivals."

/**
 * Friendly board props for a cached arrivals payload. Owns `connection()` so
 * empty-kind heuristics can read London local time without leaking into the
 * static shell.
 */
export const readHomeArrivalsBoardState = async (
  payload: CachedArrivalsPayload,
  domain: "rail" | "bus" = "rail"
): Promise<{
  error: string | null
  emptyKind: ArrivalsEmptyKind
}> => {
  await connection()
  const nowMs = Date.now()
  if (payload.error) {
    return { error: ARRIVALS_LOAD_ERROR, emptyKind: "empty" }
  }
  return {
    error: null,
    emptyKind:
      resolveArrivalsEmptyKind({
        rowCount: payload.arrivals.length,
        domain,
        nowMs,
        lineIds:
          domain === "rail"
            ? HOME_RAIL_LINES.map((line) => line.lineId)
            : undefined,
      })?.kind ?? "empty",
  }
}
