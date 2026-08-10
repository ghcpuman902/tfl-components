import { cacheLife, cacheTag } from "next/cache";
import { sortLinesBySeverityAndOrder } from "tfl-ts";
import { getTflClient } from "@/lib/tfl/client";
import type { StatusLine } from "@/lib/tfl/status-types";

export type { StatusLine } from "@/lib/tfl/status-types";

/**
 * Site/demo fetch for status boards — keep out of the reusable component.
 * Prefer passing the result as `data` into `TubeStatusBoard`.
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
          modes: ["tube", "elizabeth-line", "dlr", "tram", "overground"],
        },
  );
  return sortLinesBySeverityAndOrder(lineStatuses) as StatusLine[];
}
