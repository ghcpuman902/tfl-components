export type DiagramConnection = {
  id: string;
  name: string;
  /** Hex colour for flag box; defaults to muted if omitted. */
  color?: string;
  /** When true, use corporate blue text (Circle / H&C / W&C). */
  darkText?: boolean;
};

export type DiagramStation = {
  id: string;
  name: string;
  /** Show interchange ring instead of a tick. */
  interchange?: boolean;
  /** Optional connecting-line flag boxes (Tube / TfL modes — not National Rail). */
  connections?: DiagramConnection[];
  /**
   * National Rail interchange — rendered as the NR pictogram beside the name,
   * not as a §9 text flag.
   */
  nationalRail?: boolean;
};

/** Adjacent route segment state for horizontal diagrams. */
export type DiagramSegmentState = "normal" | "out-of-use";

export type DiagramSegment = {
  fromStationId: string;
  toStationId: string;
  state: DiagramSegmentState;
};

/**
 * Parentheticals that disambiguate which stop / line — strip these.
 * Keep place-name parentheses such as Kensington (Olympia).
 */
const LINE_DISAMBIGUATION_PARENS =
  /\s*\((?:[^)]*\b(?:Line|Lines|Bakerloo|Central|Circle|District|Piccadilly|Northern|Victoria|Jubilee|Metropolitan|Elizabeth|H&C|Dist|Picc|London)\b[^)]*)\)/gi;

/** Short display name for diagrams (drop common TfL suffixes + line brackets). */
export const formatStationName = (name: string): string => {
  let next = name
    .replace(/\s+Underground Station$/i, "")
    .replace(/-Underground(?:\s+Station)?$/i, "")
    .replace(/\s+DLR Station$/i, "")
    .replace(/\s+Rail Station$/i, "")
    .replace(/\s+Tram (?:Stop|Station)$/i, "")
    .replace(/\s+Station$/i, "")
    .trim();

  next = next.replace(LINE_DISAMBIGUATION_PARENS, "").trim();

  // Heathrow Terminals 2 & 3 → 2&3 (no spaces around &)
  next = next.replace(/(\d+)\s*&\s*(\d+)/g, "$1&$2");

  return next.replace(/\s+/g, " ").trim();
};

export const isLikelyInterchange = (stop: {
  lines?: { id?: string | null }[] | null;
  modes?: string[] | null;
}): boolean => {
  const lineCount = stop.lines?.filter((l) => l.id).length ?? 0;
  if (lineCount > 1) return true;
  const modes = stop.modes?.filter(Boolean) ?? [];
  return modes.length > 1;
};
