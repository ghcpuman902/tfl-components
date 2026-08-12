import { cacheLife, cacheTag } from "next/cache";
import { getTflClient } from "@/lib/tfl/client";
import { TRAFALGAR_SQUARE } from "@/lib/tfl/geo";
import { mapStopsFromGeoResponse } from "@/lib/tfl/bus-stop-shape";
import type { ExplorerBusPoint } from "@/lib/tfl/explorer/common";

const FEATURED_RADIUS_METERS = 400;
/** Featured Browse example size — not the full London bus network. */
const FEATURED_LIMIT = 12;

/**
 * Cached Trafalgar Square bus-stop example for Points / Bus / Browse.
 * Arbitrary search and nearby lookup require a visitor key (Find).
 */
export async function getExplorerFeaturedBusStops(): Promise<{
  stops: ExplorerBusPoint[];
  label: string;
  lat: number;
  lon: number;
  radiusMeters: number;
}> {
  "use cache";
  cacheLife({ revalidate: 300 });
  cacheTag("tfl-explorer-featured-bus-stops");

  const client = getTflClient();
  const response = await client.stopPoint.getByGeoPoint({
    lat: TRAFALGAR_SQUARE.lat,
    lon: TRAFALGAR_SQUARE.lon,
    radius: FEATURED_RADIUS_METERS,
    modes: ["bus"],
    returnLines: true,
  });

  return {
    stops: mapStopsFromGeoResponse(response.stopPoints ?? [], FEATURED_LIMIT),
    label: TRAFALGAR_SQUARE.label,
    lat: TRAFALGAR_SQUARE.lat,
    lon: TRAFALGAR_SQUARE.lon,
    radiusMeters: FEATURED_RADIUS_METERS,
  };
}
