import { cacheLife, cacheTag } from "next/cache";
import type { RealtimePrediction } from "tfl-ts";
import {
  getBoardArrivalsStopIdsIndex,
  lookupBoardArrivalsStopIds,
} from "@/lib/tfl/board-arrivals-stop-ids";
import { SHARED_TRACK_LINE_SETS } from "@/lib/tfl/board-station-lines";
import { getTflClient } from "@/lib/tfl/client";
import { HOME_BUS_STOP, HOME_RAIL_STOP } from "@/lib/tfl/home-arrivals-stops";

/**
 * Stop IDs the site key is allowed to poll for docs demos.
 * Keeps the Server Action from becoming an open TfL proxy and
 * bounds the shared-cache key space under traffic spikes.
 */
export const DEMO_STOP_ARRIVALS_IDS = new Set<string>([
  HOME_RAIL_STOP.id,
  HOME_BUS_STOP.id,
  // Shared-track Circle / H&C / Met naptans — Board site-key path.
  ...Object.keys(SHARED_TRACK_LINE_SETS).filter((id) =>
    id.startsWith("940GZZ"),
  ),
]);

export const isDemoStopArrivalsId = (stopPointId: string): boolean =>
  DEMO_STOP_ARRIVALS_IDS.has(stopPointId.trim());

/**
 * Shared cache for docs-demo arrivals polling.
 * Many concurrent viewers collapse to a few TfL calls per stop per minute.
 */
export async function getCachedStopArrivals(
  stopPointId: string,
): Promise<RealtimePrediction[]> {
  "use cache";
  cacheLife({ stale: 15, revalidate: 20, expire: 60 });
  cacheTag("tfl-stop-arrivals", `tfl-stop-arrivals-${stopPointId}`);

  const client = getTflClient();
  const stopPointIds = lookupBoardArrivalsStopIds(
    getBoardArrivalsStopIdsIndex(),
    stopPointId,
  );
  return client.stopPoint.getArrivals({
    stopPointIds: stopPointIds.length > 0 ? stopPointIds : [stopPointId],
    sortBy: "timeToStation",
  });
}

const lineSetKey = (lineIds: readonly string[]): string =>
  [...new Set(lineIds.map((id) => id.trim()).filter(Boolean))].sort().join(",");

export const DEMO_LINE_ARRIVALS_SETS = new Set<string>(
  Object.values(SHARED_TRACK_LINE_SETS).map((ids) => lineSetKey(ids)),
);

export const isDemoLineArrivalsSet = (lineIds: readonly string[]): boolean =>
  DEMO_LINE_ARRIVALS_SETS.has(lineSetKey(lineIds));

/**
 * Network-wide arrivals for a curated shared-track line set.
 * One TfL call: GET /Line/{ids}/Arrivals.
 */
export async function getCachedLineArrivals(
  lineIds: readonly string[],
): Promise<RealtimePrediction[]> {
  "use cache";
  cacheLife({ stale: 15, revalidate: 20, expire: 60 });
  const key = lineSetKey(lineIds);
  cacheTag("tfl-line-arrivals", `tfl-line-arrivals-${key}`);

  const client = getTflClient();
  return client.line.getArrivals({
    lineIds: key.split(","),
  });
}
