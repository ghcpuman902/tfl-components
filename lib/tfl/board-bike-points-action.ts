"use server";

import { formatBikePointId } from "@/lib/tfl/board-panels";
import { getCachedBikePoints } from "@/lib/tfl/cycle-hire-data";
import type { CycleHireDock } from "@/lib/tfl/cycle-hire-types";

export type GetBikePointsResult =
  | { ok: true; docks: CycleHireDock[] }
  | { ok: false; error: string };

const DEMO_DOCKS = new Set([
  "BikePoints_237",
  "BikePoints_490",
  "BikePoints_46",
]);

/**
 * Site-key cycle hire fetch. Only demo dock ids are served so this cannot
 * be used as an open TfL proxy. Arbitrary docks need the visitor key.
 */
export async function getBikePointsAction(
  bikePointIds: readonly string[],
): Promise<GetBikePointsResult> {
  const allowed = [
    ...new Set(
      bikePointIds
        .map((id) => formatBikePointId(id))
        .filter((id) => DEMO_DOCKS.has(id)),
    ),
  ];

  if (allowed.length === 0) {
    return {
      ok: false,
      error:
        "These docks are not available on the site key. Add your own TfL API key.",
    };
  }

  try {
    const docks = await getCachedBikePoints(allowed);
    return { ok: true, docks };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch cycle hire docks.";
    return { ok: false, error: message };
  }
}
