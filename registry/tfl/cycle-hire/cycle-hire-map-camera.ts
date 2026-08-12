/**
 * Cycle hire map camera helpers (MapLibre-free — keep SDK in client surfaces).
 *
 * Default fit / ease centres the geographic midpoint, but map chrome and
 * station textboxes sit above the pin, so content reads too high under UI.
 * Shift the camera centre south as an interim chrome/textbox compensation
 * until fit padding accounts for marker + label height.
 */

/** Metres south of the geographic centre used for default / fit cameras. */
export const CYCLE_HIRE_MAP_SOUTH_OFFSET_M = 10;

/** Approx. metres per degree of latitude (WGS84, mid-latitudes). */
const METRES_PER_DEGREE_LAT = 111_320;

export type LngLatTuple = [lng: number, lat: number];

/** Degrees of latitude for {@link CYCLE_HIRE_MAP_SOUTH_OFFSET_M} (~0.0000898°). */
export const CYCLE_HIRE_MAP_SOUTH_OFFSET_DEG =
  CYCLE_HIRE_MAP_SOUTH_OFFSET_M / METRES_PER_DEGREE_LAT;

/**
 * Shift a lng/lat south by `metres` (default: chrome/textbox compensation).
 * Longitude is unchanged (pure south).
 */
export const offsetLngLatSouth = (
  [lng, lat]: LngLatTuple,
  metres: number = CYCLE_HIRE_MAP_SOUTH_OFFSET_M,
): LngLatTuple => [lng, lat - metres / METRES_PER_DEGREE_LAT];
