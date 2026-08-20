import { distanceMeters } from "@/lib/tfl/geo";
import { getStationCatalog } from "@/lib/tfl/station-catalog";
import { stationCoord } from "@/lib/tfl/station-coords";

export type NearbyNamedPlace = {
  id: string;
  name: string;
  meters: number;
};

/** Closest catalogue rail station to a WGS84 point. */
export const nearestCatalogStation = (
  lat: number,
  lon: number,
): NearbyNamedPlace | undefined => {
  let best: NearbyNamedPlace | undefined;
  for (const station of getStationCatalog()) {
    const coord = stationCoord(station.id);
    if (!coord) continue;
    const meters = distanceMeters(lat, lon, coord.lat, coord.lon);
    if (!best || meters < best.meters) {
      best = { id: station.id, name: station.displayName, meters };
    }
  }
  return best;
};

/** Name or id substring match for Board builder search. */
export const filterNamedPlaces = <T extends { id: string; name: string }>(
  places: readonly T[],
  query: string,
  limit = 8,
): T[] => {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  const hits: T[] = [];
  for (const place of places) {
    if (
      place.name.toLowerCase().includes(q) ||
      place.id.toLowerCase().includes(q)
    ) {
      hits.push(place);
      if (hits.length >= limit) break;
    }
  }
  return hits;
};

export const pickClosestNamed = <T extends { id: string; name: string }>(
  lat: number,
  lon: number,
  places: readonly (T & { lat?: number; lon?: number })[],
  maxMeters: number,
): (T & { meters: number }) | undefined => {
  let best: (T & { meters: number }) | undefined;
  for (const place of places) {
    if (typeof place.lat !== "number" || typeof place.lon !== "number") {
      continue;
    }
    const meters = distanceMeters(lat, lon, place.lat, place.lon);
    if (meters > maxMeters) continue;
    if (!best || meters < best.meters) {
      best = { ...place, meters };
    }
  }
  return best;
};
