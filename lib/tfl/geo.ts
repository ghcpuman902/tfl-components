import type { Polygon } from "geojson";

/** ~111 m grid; stable enough to avoid mobile GPS jitter re-fetching. */
export const COORD_PRECISION = 3;

/** Demo / fallback pin — Nelson’s Column, Trafalgar Square. */
export const TRAFALGAR_SQUARE = {
  lat: 51.508,
  lon: -0.128,
  label: "Trafalgar Square",
} as const;

export type LatLonLabel = {
  lat: number;
  lon: number;
  label: string;
};

export const truncateCoord = (value: number, precision = COORD_PRECISION): number => {
  const factor = 10 ** precision;
  return Math.round(value * factor) / factor;
};

export const truncateLatLon = (
  lat: number,
  lon: number,
  precision = COORD_PRECISION,
): { lat: number; lon: number } => ({
  lat: truncateCoord(lat, precision),
  lon: truncateCoord(lon, precision),
});

export const isValidLatLon = (lat: number, lon: number): boolean =>
  Number.isFinite(lat) &&
  Number.isFinite(lon) &&
  lat >= -90 &&
  lat <= 90 &&
  lon >= -180 &&
  lon <= 180;

/** Nearby search from a map centre — keeps bus/cycle results to one cluster. */
export const MAP_SEARCH_RADIUS_METERS = 400;

const METERS_PER_DEG_LAT = 111_320;

const metersPerDegLon = (lat: number): number =>
  METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180);

/** Closed GeoJSON ring around a WGS84 point. */
export const circlePolygon = (
  lon: number,
  lat: number,
  radiusMeters: number,
  steps = 64,
): Polygon => {
  const mPerDegLon = metersPerDegLon(lat);
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    coords.push([
      lon + (radiusMeters * Math.sin(angle)) / mPerDegLon,
      lat + (radiusMeters * Math.cos(angle)) / METERS_PER_DEG_LAT,
    ]);
  }
  return { type: "Polygon", coordinates: [coords] };
};

/** Axis-aligned bounds that enclose a metre-radius circle. */
export const circleBounds = (
  lon: number,
  lat: number,
  radiusMeters: number,
): [[number, number], [number, number]] => {
  const latDelta = radiusMeters / METERS_PER_DEG_LAT;
  const lonDelta = radiusMeters / metersPerDegLon(lat);
  return [
    [lon - lonDelta, lat - latDelta],
    [lon + lonDelta, lat + latDelta],
  ];
};

const toRad = (degrees: number): number => (degrees * Math.PI) / 180;

/** Great-circle distance in metres. */
export const distanceMeters = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(a)));
};

export const pointsCentroid = (
  points: readonly { lat?: number; lon?: number }[],
): { lat: number; lon: number } | null => {
  let lat = 0;
  let lon = 0;
  let count = 0;
  for (const point of points) {
    if (typeof point.lat !== "number" || typeof point.lon !== "number") continue;
    lat += point.lat;
    lon += point.lon;
    count += 1;
  }
  if (count === 0) return null;
  return { lat: lat / count, lon: lon / count };
};

/** Share of samples that sit outside a metre-radius circle (0–1). */
export const fractionOutsideCircle = (
  samples: readonly { lat: number; lon: number }[],
  circle: { lat: number; lon: number; radiusMeters: number },
): number => {
  if (samples.length === 0) return 0;
  let outside = 0;
  for (const sample of samples) {
    if (
      distanceMeters(circle.lat, circle.lon, sample.lat, sample.lon) >
      circle.radiusMeters
    ) {
      outside += 1;
    }
  }
  return outside / samples.length;
};
