import { cacheLife, cacheTag } from "next/cache";
import { getTflClient } from "@/lib/tfl/client";
import type { CycleHireDock } from "@/lib/tfl/cycle-hire-types";

export type { CycleHireDock } from "@/lib/tfl/cycle-hire-types";

const formatBikePointId = (id: string): string =>
  id.startsWith("BikePoints_") ? id : `BikePoints_${id}`;

/**
 * Site/demo fetch for cycle hire docks — keep out of the reusable board.
 * Prefer passing the result as `data` into `CycleHireDocks` / Map / Detail.
 */
export async function getCachedBikePoints(
  bikePointIds: readonly string[],
): Promise<CycleHireDock[]> {
  "use cache";
  cacheLife({ revalidate: 60 });
  cacheTag("tfl-bike-points");

  if (bikePointIds.length === 0) return [];

  const client = getTflClient();
  return Promise.all(
    bikePointIds.map((id) => client.bikePoint.getById(formatBikePointId(id))),
  );
}
