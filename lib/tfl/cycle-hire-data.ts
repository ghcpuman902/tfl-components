import { cacheLife, cacheTag } from "next/cache";
import { getTflClient } from "@/lib/tfl/client";
import type { CycleHireDock } from "@/lib/tfl/cycle-hire-types";

export type { CycleHireDock } from "@/lib/tfl/cycle-hire-types";

const formatBikePointId = (id: string): string =>
  id.startsWith("BikePoints_") ? id : `BikePoints_${id}`;

/**
 * Trafalgar Square — matches the homepage bus board, for nearby cycle hire.
 */
export const HOME_CYCLE_HIRE = {
  lat: 51.508039,
  lon: -0.128069,
  radiusMeters: 400,
  /** Closest docks only — keeps the mini map readable. */
  limit: 4,
  label: "Trafalgar Square",
} as const;

export type CachedHomeCycleHirePayload = {
  docks: CycleHireDock[];
  fetchedAt: number;
  error?: string;
};

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

/**
 * Homepage mini map — closest docks near Trafalgar Square.
 */
export async function getCachedHomeCycleHireDocks(): Promise<CachedHomeCycleHirePayload> {
  "use cache";
  cacheLife({ revalidate: 60 });
  cacheTag("tfl-bike-points", "tfl-home-cycle-hire");

  const fetchedAt = Date.now();
  try {
    const client = getTflClient();
    const nearby = await client.bikePoint.getByRadius({
      lat: HOME_CYCLE_HIRE.lat,
      lon: HOME_CYCLE_HIRE.lon,
      radius: HOME_CYCLE_HIRE.radiusMeters,
    });
    const docks = [...nearby.places]
      .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
      .slice(0, HOME_CYCLE_HIRE.limit);

    return { docks, fetchedAt };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch cycle hire docks.";
    return { docks: [], fetchedAt, error: message };
  }
}
