/**
 * Curated display tiers for TfL line names.
 *
 * Prefer full → middle (TfL short forms like H&C) → 3-letter code.
 * `bucket` drives which CSS container-query breakpoints `LineName` uses.
 *
 * Classic Underground short codes follow the table shipped with this library.
 * Elizabeth / DLR / Tram / Overground codes are best-effort first-3-letter
 * forms — adjust here when official abbreviations are confirmed.
 */

export type LineNameWidthBucket = "short" | "medium" | "long";

export type LineNameTiers = {
  full: string;
  middle: string;
  short: string;
  bucket: LineNameWidthBucket;
};

export const LINE_NAME_TIERS: Record<string, LineNameTiers> = {
  bakerloo: {
    full: "Bakerloo",
    middle: "Bakerloo",
    short: "BKL",
    bucket: "short",
  },
  central: {
    full: "Central",
    middle: "Central",
    short: "CEN",
    bucket: "short",
  },
  circle: {
    full: "Circle",
    middle: "Circle",
    short: "CIR",
    bucket: "short",
  },
  district: {
    full: "District",
    middle: "District",
    short: "DIS",
    bucket: "short",
  },
  "hammersmith-city": {
    full: "Hammersmith & City",
    middle: "H & City",
    short: "H&C",
    bucket: "long",
  },
  jubilee: {
    full: "Jubilee",
    middle: "Jubilee",
    short: "JUB",
    bucket: "short",
  },
  metropolitan: {
    full: "Metropolitan",
    middle: "Metropolitan",
    short: "MET",
    bucket: "medium",
  },
  northern: {
    full: "Northern",
    middle: "Northern",
    short: "NOR",
    bucket: "short",
  },
  piccadilly: {
    full: "Piccadilly",
    middle: "Piccadilly",
    short: "PIC",
    bucket: "medium",
  },
  victoria: {
    full: "Victoria",
    middle: "Victoria",
    short: "VIC",
    bucket: "short",
  },
  "waterloo-city": {
    full: "Waterloo & City",
    middle: "W & City",
    short: "W&C",
    bucket: "long",
  },
  // Extended beyond the classic Underground table — review when confirmed.
  elizabeth: {
    full: "Elizabeth line",
    middle: "Elizabeth",
    short: "LIZ",
    bucket: "long",
  },
  dlr: {
    full: "DLR",
    middle: "DLR",
    short: "DLR",
    bucket: "short",
  },
  tram: {
    full: "Tram",
    middle: "Tram",
    short: "TRM",
    bucket: "short",
  },
  liberty: {
    full: "Liberty",
    middle: "Liberty",
    short: "LIB",
    bucket: "short",
  },
  lioness: {
    full: "Lioness",
    middle: "Lioness",
    short: "LIO",
    bucket: "short",
  },
  mildmay: {
    full: "Mildmay",
    middle: "Mildmay",
    short: "MIL",
    bucket: "short",
  },
  suffragette: {
    full: "Suffragette",
    middle: "Suffragette",
    short: "SUF",
    bucket: "medium",
  },
  weaver: {
    full: "Weaver",
    middle: "Weaver",
    short: "WEA",
    bucket: "short",
  },
  windrush: {
    full: "Windrush",
    middle: "Windrush",
    short: "WIN",
    bucket: "short",
  },
};

const DATA_LINE_ALIASES: Record<string, string> = {
  "elizabeth-line": "elizabeth",
  "hammersmith-and-city": "hammersmith-city",
  "waterloo-and-city": "waterloo-city",
};

const resolveLineId = (lineId: string): string => {
  const key = lineId.trim().toLowerCase();
  return DATA_LINE_ALIASES[key] ?? key;
};

const deriveShortCode = (name: string): string => {
  const letters = name.replace(/[^A-Za-z]/g, "").toUpperCase();
  if (letters.length >= 3) return letters.slice(0, 3);
  if (letters.length > 0) return letters.padEnd(3, letters[letters.length - 1]!);
  return "???";
};

/**
 * Resolve display tiers for a line id. Unknown ids fall back to `fallbackName`
 * (or the raw id) with a derived 3-letter short code and a medium bucket.
 */
export const getLineNameTiers = (
  lineId: string,
  fallbackName?: string,
): LineNameTiers => {
  const id = resolveLineId(lineId);
  const known = LINE_NAME_TIERS[id];
  if (known) return known;

  const full =
    (fallbackName?.trim() || lineId).replace(/\s+line$/i, "").trim() || lineId;
  const short = deriveShortCode(full);
  return {
    full: fallbackName?.trim() || full,
    middle: full,
    short,
    bucket: "medium",
  };
};

/**
 * TfL list grammar: "A" | "A and B" | "A, B and C".
 */
export const joinLineNames = (names: readonly string[]): string => {
  const parts = names.map((n) => n.trim()).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!;
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
};
