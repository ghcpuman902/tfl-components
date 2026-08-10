import { cacheLife, cacheTag } from "next/cache";
import { sortLinesBySeverityAndOrder } from "tfl-ts";
import { getTflClient } from "@/lib/tfl/client";
import type { StatusLine } from "@/lib/tfl/status-types";

export type { StatusLine } from "@/lib/tfl/status-types";

/**
 * Modes on TfL’s Tube & Rail status surface (Cable Car is listed separately).
 * Keep in sync with `DEFAULT_STATUS_MODES` on `TubeStatusBoard`.
 */
export const CACHED_STATUS_MODES = [
  "tube",
  "elizabeth-line",
  "dlr",
  "tram",
  "overground",
] as const;

/**
 * Site/demo fetch for status boards — keep out of the reusable component.
 * Prefer passing the result as `data` into `TubeStatusBoard`.
 * With no `lineIds`, fetches TfL Tube & Rail modes (excludes Cable Car).
 */
export async function getCachedLineStatuses(
  lineIds?: readonly string[],
): Promise<StatusLine[]> {
  "use cache";
  cacheLife({ revalidate: 60 });
  cacheTag("tfl-line-status");

  const client = getTflClient();
  const lineStatuses = await client.line.getStatus(
    lineIds && lineIds.length > 0
      ? { lineIds: [...lineIds] }
      : {
          modes: [...CACHED_STATUS_MODES],
        },
  );
  return sortLinesBySeverityAndOrder(lineStatuses);
}
