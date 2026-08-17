import { cacheLife, cacheTag } from "next/cache";
import type { RealtimePrediction } from "tfl-ts";
import { getTflClient } from "@/lib/tfl/client";
import {
  TRACKED_BUS_ROUTE_ID,
  TRACKED_RAIL_LINE_ID,
} from "@/lib/tfl/live-vehicles-stops";

export type CachedVehicleArrivals = {
  arrivals: RealtimePrediction[];
  fetchedAt: number;
};

const uniqueSortedIds = (lineIds: readonly string[]): string[] =>
  [...new Set(lineIds.map((id) => id.trim()).filter(Boolean))].sort();

/**
 * Shared across every visitor without a personal TfL key via Next's Data
 * Cache. One batched `getArrivals` covers every id in the set.
 */
async function getCachedLineVehicleArrivalsByKey(
  lineIdsKey: string,
): Promise<CachedVehicleArrivals> {
  "use cache";
  cacheLife({ stale: 5, revalidate: 10, expire: 30 });
  cacheTag("tfl-line-vehicle-arrivals", `tfl-line-vehicle-arrivals-${lineIdsKey}`);

  const lineIds = lineIdsKey.split(",").filter(Boolean);
  if (lineIds.length === 0) {
    return { arrivals: [], fetchedAt: Date.now() };
  }
  const client = getTflClient();
  const arrivals = await client.line.getArrivals({ lineIds });
  return { arrivals, fetchedAt: Date.now() };
}

export const getCachedBatchedLineArrivals = (
  lineIds: readonly string[],
): Promise<CachedVehicleArrivals> =>
  getCachedLineVehicleArrivalsByKey(uniqueSortedIds(lineIds).join(","));

export const getCachedTrackedRailArrivals = (): Promise<CachedVehicleArrivals> =>
  getCachedBatchedLineArrivals([TRACKED_RAIL_LINE_ID]);

export const getCachedTrackedBusArrivals = (): Promise<CachedVehicleArrivals> =>
  getCachedBatchedLineArrivals([TRACKED_BUS_ROUTE_ID]);
