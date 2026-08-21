import { cacheLife, cacheTag } from "next/cache"
import { getTflClient } from "@/lib/tfl/client"
import { lookupExplorerArrivalsStopIds } from "@/lib/tfl/explorer/hub-membership"
import type { ExplorerCachedArrivals } from "@/lib/tfl/explorer/selection"

export type { ExplorerCachedArrivals }

/**
 * Site-cached arrivals for one Explorer catalog / featured stop.
 * Keyed by stop id — on-demand, not build-time. Search hits outside the
 * loaded directory still use the visitor key.
 */
export async function getExplorerCachedArrivals(
  stopPointId: string,
  stopName: string
): Promise<ExplorerCachedArrivals> {
  "use cache"
  cacheLife({ revalidate: 120 })
  cacheTag("tfl-explorer-arrivals", `tfl-explorer-arrivals-${stopPointId}`)

  const fetchedAt = Date.now()
  try {
    const client = getTflClient()
    const stopPointIds = lookupExplorerArrivalsStopIds(stopPointId)
    const arrivals = await client.stopPoint.getArrivals({
      stopPointIds: stopPointIds.length > 0 ? stopPointIds : [stopPointId],
      sortBy: "timeToStation",
    })
    return { stopPointId, stopName, arrivals, fetchedAt }
  } catch (err) {
    return {
      stopPointId,
      stopName,
      arrivals: [],
      fetchedAt,
      error: err instanceof Error ? err.message : "Failed to fetch arrivals.",
    }
  }
}
