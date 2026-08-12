import { cacheLife, cacheTag } from "next/cache";
import { getTflClient } from "@/lib/tfl/client";
import { HOME_CYCLE_HIRE } from "@/lib/tfl/cycle-hire-data";
import type { ExplorerCyclePoint } from "@/lib/tfl/explorer/common";

/**
 * Featured Browse example size — larger than the homepage mini map (4),
 * still small enough that map labels stay restrained.
 */
const FEATURED_LIMIT = 12;

/**
 * Cached central-London cycle-hire example for Points / Cycle hire / Browse.
 * Arbitrary search, nearby, and live occupancy require a visitor key (Find).
 */
export async function getExplorerFeaturedCycleHireDocks(): Promise<{
  docks: ExplorerCyclePoint[];
  label: string;
  lat: number;
  lon: number;
  radiusMeters: number;
}> {
  "use cache";
  cacheLife({ revalidate: 60 });
  cacheTag("tfl-explorer-featured-cycle-hire");

  const client = getTflClient();
  const nearby = await client.bikePoint.getByRadius({
    lat: HOME_CYCLE_HIRE.lat,
    lon: HOME_CYCLE_HIRE.lon,
    radius: HOME_CYCLE_HIRE.radiusMeters,
  });

  const docks = [...nearby.places]
    .sort((a, b) => (a.distance ?? 0) - (b.distance ?? 0))
    .slice(0, FEATURED_LIMIT);

  return {
    docks,
    label: HOME_CYCLE_HIRE.label,
    lat: HOME_CYCLE_HIRE.lat,
    lon: HOME_CYCLE_HIRE.lon,
    radiusMeters: HOME_CYCLE_HIRE.radiusMeters,
  };
}
