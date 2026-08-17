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

async function getCachedLineVehicleArrivals(
  lineId: string,
): Promise<CachedVehicleArrivals> {
  "use cache";
  cacheLife({ stale: 15, revalidate: 20, expire: 60 });
  cacheTag("tfl-line-vehicle-arrivals", `tfl-line-vehicle-arrivals-${lineId}`);

  const client = getTflClient();
  const arrivals = await client.line.getArrivals({
    lineIds: [lineId],
  });
  return { arrivals, fetchedAt: Date.now() };
}

export const getCachedTrackedRailArrivals = (): Promise<CachedVehicleArrivals> =>
  getCachedLineVehicleArrivals(TRACKED_RAIL_LINE_ID);

export const getCachedTrackedBusArrivals = (): Promise<CachedVehicleArrivals> =>
  getCachedLineVehicleArrivals(TRACKED_BUS_ROUTE_ID);
