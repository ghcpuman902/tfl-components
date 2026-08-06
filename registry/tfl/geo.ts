/** ~111 m grid; stable enough to avoid mobile GPS jitter re-fetching. */
export const COORD_PRECISION = 3;

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
