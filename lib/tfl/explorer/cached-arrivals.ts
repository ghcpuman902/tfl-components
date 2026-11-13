import { cacheLife, cacheTag } from "next/cache"
import { connection } from "next/server"
import { getTflClient } from "@/lib/tfl/client"
import { lookupExplorerArrivalsStopIds } from "@/lib/tfl/explorer/hub-membership"
import type { ExplorerCachedArrivals } from "@/lib/tfl/explorer/selection"

export type { ExplorerCachedArrivals }

/**
 * Site-cached arrivals for one Explorer catalog / featured stop.
 * Keyed by stop id, read at request time and never baked into a build:
 * `connection()` keeps it out of the prerender, and the entry is in the remote
 * cache so every function instance shares it. Search hits outside the loaded
 * directory still use the visitor key.
 */
export async function getExplorerCachedArrivals(
  stopPointId: string,
  stopName: string
): Promise<ExplorerCachedArrivals> {
  await connection()
  return readExplorerArrivals(stopPointId, stopName)
}

async function readExplorerArrivals(
  stopPointId: string,
  stopName: string
): Promise<ExplorerCachedArrivals> {
  "use cache: remote"
  // A docs inspector, not a live Board: it shows how old the rows are. Fresh for
  // 2 minutes keeps the directory's many stops cheap; `expire` stops a stop
  // nobody opened for 10 minutes from serving hours-old rows.
  cacheLife({ stale: 60, revalidate: 120, expire: 600 })
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
