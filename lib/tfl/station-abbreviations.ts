/**
 * Single source of truth for TfL-style station-name abbreviations.
 * Drives both visual shortening and Cmd/Ctrl+F completions.
 */

export type StationAbbreviationEntry = {
  /** Full word as it appears in canonical names (e.g. "Street"). */
  full: string
  /** Diagram short form (e.g. "St"). */
  short: string
  /**
   * Invisible suffix appended after `short` so find-in-page matches `full`
   * (e.g. "reet" → "Street").
   */
  findCompletion: string
  /**
   * Shortening tier (default 1). Tier 1 is the diagram / board default.
   * Tier 2 is a tighter word list, tier 3 drops a trailing clause (`via …`).
   * Higher tiers apply only when a caller asks (`applyStationAbbreviations(name, tier)`).
   */
  tier?: StationAbbreviationTier
  /** Drop this word and everything after it instead of replacing it. */
  dropsClause?: boolean
}

export type StationAbbreviationTier = 1 | 2 | 3

/**
 * Conservative abbreviations used on diagrams and arrivals boards.
 * Prefer official short forms already common on TfL maps.
 * Do not abbreviate proper-name tokens (Market, Green, Hill, Cross, …) except
 * the curated phrase King's Cross → King's X.
 * Saint / `St.` is search-only — see `station-name-match.ts`.
 *
 * Phrase / non-prefix shorts (`King's X`, `Stn`, `w'y`, `Check Front`) leave
 * `findCompletion` empty — FindableText still exposes the full name.
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
    { full: "King's Cross", short: "King's X", findCompletion: "" },
    { full: "Station", short: "Stn", findCompletion: "" },
    { full: "Way", short: "w'y", findCompletion: "" },
    /**
     * Not a station name — TfL's generic Circle-loop instruction, shown as an
     * arrivals row destination via `StationName` (see arrivals-bound-group's
     * `ArrivalRowItem`). Shares this table only for the shrink + find-in-page
     * machinery; `findCompletion` is empty because the per-token find trick
     * assumes a single-word short form and this one is two words — the outer
     * `FindableText` copy still makes the full phrase findable.
     */
    { full: "Check Front of Train", short: "Check Front", findCompletion: "" },
    /** Tight tier: room-distance glance rows, after tier 1 fails to fit. */
    { full: "Broadway", short: "Bdwy", findCompletion: "", tier: 2 },
    { full: "Walthamstow", short: "W'stow", findCompletion: "", tier: 2 },
    /** Tightest tier: "Ealing Bdwy via Acton Town" → "Ealing Bdwy". */
    { full: "via", short: "", findCompletion: "", tier: 3, dropsClause: true },
  ] as const

/**
 * Arrivals bound-heading shortening ("Northbound · Platform 6" → "NB · P6").
 * `Platform` joins its number (`P6`), the same form as `PlatformChip compact`.
 */
export const ARRIVALS_HEADING_ABBREVIATION_ENTRIES: readonly StationAbbreviationEntry[] =
  [
    { full: "Northbound", short: "NB", findCompletion: "" },
    { full: "Southbound", short: "SB", findCompletion: "" },
    { full: "Eastbound", short: "EB", findCompletion: "" },
    { full: "Westbound", short: "WB", findCompletion: "" },
    { full: "Platform", short: "P", findCompletion: "" },
  ] as const

/** `and` → `&` (not a find-completion pair — handled via aliases). */
export const STATION_AND_ABBREVIATION: StationAbbreviationEntry = {
  full: "and",
  short: "&",
  findCompletion: "",
}

export type StationAbbreviationTableRow = {
  full: string
  short: string
  /**
   * Unique display names containing this token across Tube, Elizabeth line,
   * DLR, Overground, and Tram (deduped across lines and modes).
   */
  count: number
  /** Up to three examples; names already used earlier in the table are skipped. */
  examples: readonly string[]
}

/**
 * Hardwired station counts for the station-labels abbreviations table.
 * Regenerated via `pnpm exec tsx scripts/station-abbreviation-stats.ts`
 * against tfl-ts `LINE_STATION_SEQUENCES` (generated 2026-08-09, 461 unique
 * Tube / Elizabeth / DLR / Overground / Tram names).
 */
export const STATION_ABBREVIATION_TABLE: readonly StationAbbreviationTableRow[] =
  [
    {
      full: "Street",
      short: "St",
      count: 20,
      examples: ["Baker Street", "Bond Street", "Cannon Street"],
    },
    {
      full: "Road",
      short: "Rd",
      count: 31,
      examples: ["Abbey Road", "Avenue Road", "Beckenham Road"],
    },
    {
      full: "Avenue",
      short: "Ave",
      count: 2,
      examples: ["Warwick Avenue"],
    },
    {
      full: "Square",
      short: "Sq",
      count: 4,
      examples: ["Euston Square", "Leicester Square", "Russell Square"],
    },
    {
      full: "Lane",
      short: "Ln",
      count: 13,
      examples: ["Beddington Lane", "Blackhorse Lane", "Chancery Lane"],
    },
    {
      full: "Park",
      short: "Pk",
      count: 40,
      examples: ["Beckton Park", "Belsize Park", "Brondesbury Park"],
    },
    {
      full: "Junction",
      short: "Jct",
      count: 7,
      examples: ["Beckenham Junction", "Clapham Junction", "Dalston Junction"],
    },
    {
      full: "Bridge",
      short: "Br",
      count: 5,
      examples: ["Deptford Bridge", "London Bridge", "Phipps Bridge"],
    },
    {
      full: "Central",
      short: "Ctrl",
      count: 7,
      examples: ["Acton Central", "Finchley Central", "Hackney Central"],
    },
    {
      full: "King's Cross",
      short: "King's X",
      count: 1,
      examples: ["King's Cross St. Pancras"],
    },
    {
      full: "Station",
      short: "Stn",
      count: 0,
      examples: ["King's Cross Station / York Way"],
    },
    {
      full: "Way",
      short: "w'y",
      count: 1,
      examples: ["Ampere Way"],
    },
    {
      full: "and",
      short: "&",
      count: 8,
      examples: [
        "Caledonian Road & Barnsbury",
        "Chalfont & Latimer",
        "Elephant & Castle",
      ],
    },
  ] as const

const abbreviationPattern = (full: string): string =>
  full
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    // ASCII or curly apostrophe, and the no-apostrophe form (`Kings Cross`).
    .replace(/'/g, "['’]?")

const entryTier = (entry: StationAbbreviationEntry): StationAbbreviationTier =>
  entry.tier ?? 1

const entryPattern = (entry: StationAbbreviationEntry): RegExp =>
  entry.dropsClause
    ? new RegExp(`\\s+\\b${abbreviationPattern(entry.full)}\\b.*$`, "i")
    : new RegExp(`\\b${abbreviationPattern(entry.full)}\\b`, "gi")

/** RegExp pairs for applying tier-1 abbreviations to a full name. */
export const STATION_ABBREVIATIONS: ReadonlyArray<readonly [RegExp, string]> = [
  ...STATION_ABBREVIATION_ENTRIES.filter((entry) => entryTier(entry) === 1).map(
    (entry) =>
      [
        new RegExp(`\\b${abbreviationPattern(entry.full)}\\b`, "gi"),
        entry.short,
      ] as const
  ),
  [/\band\b/gi, "&"] as const,
]

/** Short token → find completion (St → reet). */
export const STATION_ABBR_FIND_COMPLETIONS: Readonly<Record<string, string>> =
  Object.fromEntries(
    STATION_ABBREVIATION_ENTRIES.map((entry) => [
      entry.short,
      entry.findCompletion,
    ])
  )

const TIERED_ABBREVIATIONS: ReadonlyArray<
  readonly [RegExp, string, StationAbbreviationTier]
> = [
  ...STATION_ABBREVIATIONS.map(([pattern, short]) => [pattern, short, 1] as const),
  ...STATION_ABBREVIATION_ENTRIES.filter((entry) => entryTier(entry) > 1).map(
    (entry) => [entryPattern(entry), entry.short, entryTier(entry)] as const
  ),
]

/** Apply every entry up to `tier` (default 1, the diagram / board set). */
export const applyStationAbbreviations = (
  name: string,
  tier: StationAbbreviationTier = 1
): string => {
  let next = name
  for (const [pattern, replacement, entry] of TIERED_ABBREVIATIONS) {
    if (entry <= tier) next = next.replace(pattern, replacement)
  }
  return next.replace(/\s+/g, " ").trim()
}

/** Distinct shortenings of `name` from tier 1 up to `maxTier`, shortest last. */
export const stationAbbreviationLadder = (
  name: string,
  maxTier: StationAbbreviationTier = 1
): string[] => {
  const ladder: string[] = []
  for (let tier = 1; tier <= maxTier; tier += 1) {
    const next = applyStationAbbreviations(name, tier as StationAbbreviationTier)
    if (next && next !== name && !ladder.includes(next)) ladder.push(next)
  }
  return ladder
}

const headingPattern = (entry: StationAbbreviationEntry): RegExp =>
  // `Platform 6` → `P6`: the short form joins its number.
  entry.full === "Platform"
    ? /\bPlatform\s+/gi
    : new RegExp(`\\b${entry.full}\\b`, "gi")

const applyHeadingEntries = (
  heading: string,
  entries: readonly StationAbbreviationEntry[]
): string =>
  entries.reduce(
    (next, entry) => next.replace(headingPattern(entry), entry.short),
    heading
  )

/**
 * Bound-heading tiers: full → short platform → short direction too.
 * "Northbound · Platform 6" → "Northbound · P6" → "NB · P6".
 */
export const arrivalsHeadingLadder = (heading: string): string[] => {
  const platformOnly = applyHeadingEntries(
    heading,
    ARRIVALS_HEADING_ABBREVIATION_ENTRIES.filter((e) => e.full === "Platform")
  )
  return [
    heading,
    platformOnly,
    applyHeadingEntries(heading, ARRIVALS_HEADING_ABBREVIATION_ENTRIES),
  ]
}
