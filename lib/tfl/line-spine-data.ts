import { cacheLife, cacheTag } from "next/cache";
import { getLineSpine, type LineSpine } from "@/lib/tfl/line-spine";

/**
 * Site/demo fetch for line spines — keep out of the reusable LineStrip API.
 * Per-line cache key; geometry rarely changes.
 */
export async function getCachedLineSpine(lineId: string): Promise<LineSpine> {
  "use cache";
  cacheLife({ revalidate: 3600 });
  cacheTag("tfl-route", `tfl-route-${lineId}`);

  return getLineSpine(lineId);
}
