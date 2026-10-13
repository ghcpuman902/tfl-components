import type { RealtimePrediction } from "tfl-ts"
import { getTflClient } from "@/lib/tfl/client"

export type LineVehicleArrivals = {
  arrivals: RealtimePrediction[]
  fetchedAt: number
}

const uniqueSortedIds = (lineIds: readonly string[]): string[] =>
  [...new Set(lineIds.map((id) => id.trim()).filter(Boolean))].sort()

/**
 * Requests already on their way to TfL, keyed by line set. Concurrent site-key
 * polls for the same lines share one response. Nothing is kept after it
 * settles, so this adds no staleness. The TfL feed is already ~45 s old when it
 * arrives (`_agent/feed-cadence.json`).
 */
const inFlight = new Map<string, Promise<LineVehicleArrivals>>()

/**
 * Live vehicle positions for the site key. Deliberately uncached: one batched
 * `getArrivals` covers every id in the set.
 */
export const fetchBatchedLineArrivals = (
  lineIds: readonly string[]
): Promise<LineVehicleArrivals> => {
  const ids = uniqueSortedIds(lineIds)
  if (ids.length === 0) {
    return Promise.resolve({ arrivals: [], fetchedAt: Date.now() })
  }
  const key = ids.join(",")
  const pending = inFlight.get(key)
  if (pending) return pending
  const request = getTflClient()
    .line.getArrivals({ lineIds: ids })
    .then((arrivals) => ({ arrivals, fetchedAt: Date.now() }))
    .finally(() => inFlight.delete(key))
  inFlight.set(key, request)
  return request
}
