/**
 * Compass bounds for rail arrivals boards.
 *
 * Vertical lists and LTR tabs share one order: West → East (reading order),
 * North → South (geographic). Omit a bound when arrivals never mention it —
 * unless station metadata seeds that bound via `lines[].bounds`.
 */

export const ARRIVALS_BOUND_IDS = [
  "westbound",
  "eastbound",
  "northbound",
  "southbound",
] as const;

export type ArrivalsBoundId = (typeof ARRIVALS_BOUND_IDS)[number];

const BOUND_ID_SET = new Set<string>(ARRIVALS_BOUND_IDS);

/** Compass prefix on TfL platform labels, e.g. "Westbound - Platform 1". */
export const COMPASS_BOUND_RE =
  /^(northbound|southbound|eastbound|westbound)\b/i;

export const normalizeArrivalsBoundId = (
  value: string,
): ArrivalsBoundId | null => {
  const id = value.trim().toLowerCase();
  return BOUND_ID_SET.has(id) ? (id as ArrivalsBoundId) : null;
};

/** Display label: `westbound` → `Westbound`. */
export const formatArrivalsBoundLabel = (id: ArrivalsBoundId): string =>
  id.charAt(0).toUpperCase() + id.slice(1);

export const parseCompassBoundId = (
  platformName?: string,
): ArrivalsBoundId | null => {
  if (!platformName) return null;
  const match = platformName.match(COMPASS_BOUND_RE);
  if (!match?.[1]) return null;
  return normalizeArrivalsBoundId(match[1]);
};

export const arrivalsBoundOrderKey = (labelOrId: string | null): number => {
  if (!labelOrId) return ARRIVALS_BOUND_IDS.length + 1;
  const id = normalizeArrivalsBoundId(labelOrId);
  if (!id) return ARRIVALS_BOUND_IDS.length;
  return ARRIVALS_BOUND_IDS.indexOf(id);
};

export const compareArrivalsBounds = (
  a: string | null,
  b: string | null,
): number => arrivalsBoundOrderKey(a) - arrivalsBoundOrderKey(b);
