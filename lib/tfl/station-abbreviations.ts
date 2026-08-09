/**
 * Single source of truth for TfL-style station-name abbreviations.
 * Drives both visual shortening and Cmd/Ctrl+F completions.
 */

export type StationAbbreviationEntry = {
  /** Full word as it appears in canonical names (e.g. "Street"). */
  full: string;
  /** Diagram short form (e.g. "St"). */
  short: string;
  /**
   * Invisible suffix appended after `short` so find-in-page matches `full`
   * (e.g. "reet" → "Street").
   */
  findCompletion: string;
};

/**
 * Conservative abbreviations used on diagrams.
 * Prefer official short forms already common on TfL maps.
 * Do not abbreviate proper-name tokens (Market, Green, Hill, Cross, …).
 */
export const STATION_ABBREVIATION_ENTRIES: readonly StationAbbreviationEntry[] =
  [
    { full: "Street", short: "St", findCompletion: "reet" },
    { full: "Road", short: "Rd", findCompletion: "oad" },
    { full: "Avenue", short: "Ave", findCompletion: "nue" },
    { full: "Square", short: "Sq", findCompletion: "uare" },
    { full: "Lane", short: "Ln", findCompletion: "ane" },
    { full: "Park", short: "Pk", findCompletion: "ark" },
    { full: "Junction", short: "Jct", findCompletion: "unction" },
    { full: "Bridge", short: "Br", findCompletion: "idge" },
    { full: "Central", short: "Ctrl", findCompletion: "entral" },
  ] as const;

/** `and` → `&` (not a find-completion pair — handled via aliases). */
export const STATION_AND_ABBREVIATION: StationAbbreviationEntry = {
  full: "and",
  short: "&",
  findCompletion: "",
};

/** RegExp pairs for applying abbreviations to a full name. */
export const STATION_ABBREVIATIONS: ReadonlyArray<readonly [RegExp, string]> = [
  ...STATION_ABBREVIATION_ENTRIES.map(
    (entry) =>
      [new RegExp(`\\b${entry.full}\\b`, "gi"), entry.short] as const,
  ),
  [/\band\b/gi, "&"] as const,
];

/** Short token → find completion (St → reet). */
export const STATION_ABBR_FIND_COMPLETIONS: Readonly<Record<string, string>> =
  Object.fromEntries(
    STATION_ABBREVIATION_ENTRIES.map((entry) => [
      entry.short,
      entry.findCompletion,
    ]),
  );

export const applyStationAbbreviations = (name: string): string => {
  let next = name;
  for (const [pattern, replacement] of STATION_ABBREVIATIONS) {
    next = next.replace(pattern, replacement);
  }
  return next.replace(/\s+/g, " ").trim();
};
