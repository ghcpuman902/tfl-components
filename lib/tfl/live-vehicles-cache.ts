import { cacheLife, cacheTag } from "next/cache"
import {
  buildLiveVehiclesSnapshot,
  type LiveVehiclesSnapshot,
} from "@/lib/tfl/live-vehicles-payload"

const idsOf = (key: string): string[] => (key ? key.split(",") : [])

/** Order and duplicates must not make two callers' keys differ. */
export const liveVehiclesKey = (ids: readonly string[]): string =>
  [...new Set(ids.map((id) => id.trim()).filter(Boolean))].sort().join(",")

/**
 * The site-key snapshot behind `/api/live-vehicles`, one entry per set of lines
 * and routes, shared by every function instance and every tab. Fresh for 15 s
 * (TfL's own source times only change about every 30 s), so a set costs at most
 * 4 TfL calls a minute however many people poll it; the entry is kept 60 s so a
 * failed refresh does not blank the map. `fetchedAt` is stamped here, at the
 * TfL read. A failed read throws and is not cached.
 */
export async function getCachedLiveVehiclesSnapshot(
  railKey: string,
  busKey: string,
  predictions: boolean
): Promise<LiveVehiclesSnapshot> {
  "use cache: remote"
  cacheLife({ stale: 10, revalidate: 15, expire: 60 })
  cacheTag("tfl-live-vehicles")
  return buildLiveVehiclesSnapshot({
    railLineIds: idsOf(railKey),
    busRouteIds: idsOf(busKey),
    predictions,
  })
}
