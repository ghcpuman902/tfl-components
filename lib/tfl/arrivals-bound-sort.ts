/**
 * Compass bounds for rail arrivals boards.
 *
 * Vertical lists and LTR tabs share one order: West → East (reading order),
 * North → South (geographic). Omit a bound when arrivals never mention it —
 * unless station metadata seeds that bound via `lines[].bounds`.
 *
 * Bound *headings* are built by `formatBoundHeading` — grouping keys stay
 * compass / platform / unknown, independent of the display string.
 */

import { ARRIVALS_PLATFORM_UNKNOWN_HEADING } from "@/lib/tfl/arrivals-empty";

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

/**
 * Cleaned platform letter or number from a TfL `platformName`.
 * Drops the compass prefix, the word "Platform", and the literal "Unknown".
 */
export const parseArrivalsPlatformLabel = (
  platformName?: string,
): string | null => {
  if (!platformName) return null;
  if (/\bunknown\b/i.test(platformName)) return null;
  const stripped = platformName
    .replace(COMPASS_BOUND_RE, "")
    .replace(/^\s*[-–—:]\s*/, "")
    .replace(/^platform\s+/i, "")
    .trim();
  return stripped || null;
};

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

/** True for TfL's literal "Platform Unknown" (and close variants). */
export const isUnknownArrivalsPlatform = (platformName?: string): boolean =>
  Boolean(platformName && /\bunknown\b/i.test(platformName));

/** Heading for a platform-only subgroup: `A` → `Platform A`. */
export const formatPlatformHeading = (platformLabel: string): string =>
  `Platform ${platformLabel}`;

export type FormatBoundHeadingInput = {
  boundId?: ArrivalsBoundId | null;
  /** Cleaned platform letter/number, when it belongs in the heading. */
  platformLabel?: string | null;
  /** Live predictions with unknown/missing platform. */
  unknown?: boolean;
};

/**
 * Subgroup heading. Isolated so a future `boundHeadingFormat` prop is a
 * small diff — this default is direction + platform when both exist.
 *
 * - `"Eastbound · Platform 1"`
 * - `"Platform A"`
 * - `"Westbound"` (seeded empty bound, or platforms vary inside the bound)
 * - `"Platform to be confirmed"`
 */
export const formatBoundHeading = ({
  boundId,
  platformLabel,
  unknown = false,
}: FormatBoundHeadingInput): string | null => {
  if (unknown) return ARRIVALS_PLATFORM_UNKNOWN_HEADING;
  const direction = boundId ? formatArrivalsBoundLabel(boundId) : null;
  const platform = platformLabel ? formatPlatformHeading(platformLabel) : null;
  if (direction && platform) return `${direction} · ${platform}`;
  return direction ?? platform;
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
