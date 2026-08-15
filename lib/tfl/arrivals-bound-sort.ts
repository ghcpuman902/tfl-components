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
 * Sub-surface loop wording where compass direction is ambiguous (the shared
 * Circle/Hammersmith & City stretch through Paddington, Bayswater, and
 * Notting Hill Gate — confirmed network-wide, see
 * docs/arrivals-shared-platforms.md). TfL's own boards use this instead of a
 * compass bound: "Inner Rail - Platform 1" / "Outer Rail - Platform 2".
 */
export const RAIL_DESIGNATION_RE = /^(inner|outer)\s+rail\b/i;

export type ArrivalsRailDesignation = "inner" | "outer";

export const parseArrivalsRailDesignation = (
  platformName?: string,
): ArrivalsRailDesignation | null => {
  if (!platformName) return null;
  const match = platformName.match(RAIL_DESIGNATION_RE);
  return (match?.[1]?.toLowerCase() as ArrivalsRailDesignation | undefined) ?? null;
};

/** A bare platform letter/number token, e.g. "1", "12", "A" — not a phrase. */
const BARE_PLATFORM_TOKEN_RE = /^[a-z0-9]{1,3}$/i;
/** Pulls the number/letter out of a "... Platform N" phrase anywhere in the string. */
const PLATFORM_WORD_TOKEN_RE = /\bplatform\s+([a-z0-9]+)/i;

/**
 * Cleaned platform letter or number from a TfL `platformName`, for the
 * compact per-row platform chip. Drops compass/rail-designation prefixes and
 * the literal "Unknown". Descriptive-only labels with no platform number
 * (e.g. Chesham's "North / South") return null — there's nothing short
 * enough for a chip; `formatBoundHeading` still shows the full text.
 */
export const parseArrivalsPlatformLabel = (
  platformName?: string,
): string | null => {
  if (!platformName) return null;
  if (/\bunknown\b/i.test(platformName)) return null;
  const withoutBound = platformName
    .replace(COMPASS_BOUND_RE, "")
    .replace(RAIL_DESIGNATION_RE, "")
    .trim();
  const wordToken = withoutBound.match(PLATFORM_WORD_TOKEN_RE)?.[1];
  if (wordToken) return wordToken;
  const bareToken = withoutBound.replace(/^\s*[-–—:]\s*/, "").trim();
  return BARE_PLATFORM_TOKEN_RE.test(bareToken) ? bareToken : null;
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

/** Display label for a rail designation: `inner` → `Inner Rail`. */
export const formatArrivalsRailDesignationLabel = (
  designation: ArrivalsRailDesignation,
): string => (designation === "inner" ? "Inner Rail" : "Outer Rail");

/** Heading for a platform-only subgroup: `A` → `Platform A`. */
export const formatPlatformHeading = (platformLabel: string): string =>
  `Platform ${platformLabel}`;

export type FormatBoundHeadingInput = {
  boundId?: ArrivalsBoundId | null;
  /** Cleaned platform letter/number, when it belongs in the heading. */
  platformLabel?: string | null;
  /** Inner/Outer Rail qualifier, when the platform carries one. */
  railDesignation?: ArrivalsRailDesignation | null;
  /** Live predictions with unknown/missing platform. */
  unknown?: boolean;
};

/**
 * Subgroup heading. Isolated so a future `boundHeadingFormat` prop is a
 * small diff — this default is direction + platform when both exist.
 *
 * - `"Eastbound · Platform 1"`
 * - `"Inner Rail · Platform 1"`
 * - `"Platform A"`
 * - `"Westbound"` (seeded empty bound, or platforms vary inside the bound)
 * - `"Platform to be confirmed"`
 */
export const formatBoundHeading = ({
  boundId,
  platformLabel,
  railDesignation,
  unknown = false,
}: FormatBoundHeadingInput): string | null => {
  if (unknown) return ARRIVALS_PLATFORM_UNKNOWN_HEADING;
  const direction = boundId
    ? formatArrivalsBoundLabel(boundId)
    : railDesignation
      ? formatArrivalsRailDesignationLabel(railDesignation)
      : null;
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
