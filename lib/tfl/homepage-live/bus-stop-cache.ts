import { createHash } from "node:crypto"
import { cacheLife, cacheTag } from "next/cache"
import { getRedis } from "@/lib/redis"
import { getTflClient } from "@/lib/tfl/client"
import {
  createMemoryStore,
  createRedisStore,
  type QuotaStore,
  type RedisLike,
} from "@/lib/tfl/homepage-live/bus-quota"
import {
  refreshBusStop,
  type BusBoardRow,
  type BusStopSnapshot,
} from "@/lib/tfl/homepage-live/bus-stop-arrivals"

const memory = createMemoryStore()

/**
 * Redis when it is configured, so every instance counts against one budget;
 * otherwise this instance alone. Says so once per instance in the server log
 * (never the address, never to visitors).
 */
export const pickQuotaStore = (
  redis: unknown,
  log: (message: string) => void = console.warn
): QuotaStore => {
  if (redis) return createRedisStore(redis as RedisLike)
  if (!memoryStoreAnnounced) {
    memoryStoreAnnounced = true
    log("Bus quota: no Redis, counting the 250/min site budget per instance in memory.")
  }
  return memory
}

let memoryStoreAnnounced = false

export const resetMemoryStoreAnnouncement = () => {
  memoryStoreAnnounced = false
}

export const getQuotaStore = async (): Promise<QuotaStore> =>
  pickQuotaStore(await getRedis())

const fetchStopRows = async (stopId: string): Promise<BusBoardRow[]> => {
  const arrivals = await getTflClient().stopPoint.getArrivals({
    stopPointIds: [stopId],
    sortBy: "timeToStation",
  })
  return arrivals.map((row) => ({
    route: row.lineName ?? "",
    destination: row.destinationName ?? "",
    towards: row.towards,
    etaSec: row.timeToStation ?? 0,
    vehicleId: row.vehicleId,
  }))
}

/**
 * One shared entry per stop, in the remote cache so every function instance
 * reads the same one. 20 s fresh means at most 3 TfL calls a minute for a stop
 * however many people watch it; the entry can be served for 2 minutes while
 * TfL is out of reach.
 */
export async function getCachedBusStop(stopId: string): Promise<BusStopSnapshot> {
  "use cache: remote"
  cacheLife({ stale: 20, revalidate: 20, expire: 120 })
  cacheTag("tfl-stop-arrivals", `tfl-stop-arrivals-${stopId}`)
  return refreshBusStop(stopId, {
    store: await getQuotaStore(),
    fetchRows: fetchStopRows,
    now: Date.now,
  })
}

/** A visitor key that is not their address: a short hash of address and browser. */
export const visitorKeyFrom = (forwardedFor: string | null, userAgent: string | null): string =>
  createHash("sha256")
    .update(`${forwardedFor?.split(",")[0]?.trim() ?? ""}|${userAgent ?? ""}`)
    .digest("hex")
    .slice(0, 16)
