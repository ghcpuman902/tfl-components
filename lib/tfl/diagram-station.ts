export type DiagramConnection = {
  id: string
  name: string
  /** Hex colour for flag box; defaults to muted if omitted. */
  color?: string
  /** When true, use corporate blue text (Circle / H&C / W&C). */
  darkText?: boolean
}

export type DiagramStation = {
  id: string
  name: string
  /** Show interchange ring instead of a tick. */
  interchange?: boolean
  /** Optional connecting-line flag boxes (Tube / TfL modes — not National Rail). */
  connections?: DiagramConnection[]
  /**
   * National Rail interchange — rendered as the NR pictogram beside the name,
   * not as a §9 text flag.
   */
  nationalRail?: boolean
}

/** Adjacent route segment state for horizontal diagrams. */
export type DiagramSegmentState = "normal" | "out-of-use"

export type DiagramSegment = {
  fromStationId: string
  toStationId: string
  state: DiagramSegmentState
}

/**
 * Parentheticals that disambiguate which stop / line — strip these.
 * Keep place-name parentheses such as Kensington (Olympia).
 */
const LINE_DISAMBIGUATION_PARENS =
  /\s*\((?:[^)]*\b(?:Line|Lines|Bakerloo|Central|Circle|District|Piccadilly|Northern|Victoria|Jubilee|Metropolitan|Elizabeth|H&C|Dist|Picc|London)\b[^)]*)\)/gi

/** Short display name for diagrams (drop common TfL suffixes + line brackets). */
export const formatStationName = (name: string): string => {
  const raw = typeof name === "string" ? name : name == null ? "" : String(name)
  let next = raw
    .replace(/\s+Underground Station$/i, "")
    .replace(/-Underground(?:\s+Station)?$/i, "")
    .replace(/\s+DLR Station$/i, "")
    .replace(/\s+Rail Station$/i, "")
    .replace(/\s+Tram (?:Stop|Station)$/i, "")
    .replace(/\s+Station$/i, "")
    .trim()

  next = next.replace(LINE_DISAMBIGUATION_PARENS, "").trim()

  // Heathrow Terminals 2 & 3 → 2&3 (no spaces around &)
  next = next.replace(/(\d+)\s*&\s*(\d+)/g, "$1&$2")

  return next.replace(/\s+/g, " ").trim()
}

/**
 * Attraction / destination pointers such as Cutty Sark (for Maritime Greenwich)
 * and Custom House (for ExCel). These do not fit a two-line name box — the
 * core name stays in the box; the bracket is painted outside at half size.
 * Place-name parens (Olympia, London, Berks) are not this pattern.
 */
const PLACE_QUALIFIER_RE = /\s*(\(for\s+[^)]+\))\s*$/i

export type StationPlaceQualifier = {
  /** Name that belongs in the label box. */
  core: string
  /** Bracketed pointer, including parentheses, when present. */
  qualifier?: string
}

/**
 * Split a `(for …)` pointer from an already-formatted or raw TfL name.
 * Canonical copy / aria still use the full `formatStationName` result.
 */
export const splitStationPlaceQualifier = (
  name: string
): StationPlaceQualifier => {
  const displayName = formatStationName(name)
  const match = PLACE_QUALIFIER_RE.exec(displayName)
  if (!match || match.index == null) return { core: displayName }
  const core = displayName.slice(0, match.index).trim()
  return { core: core || displayName, qualifier: match[1] }
}

/** Side of the label that faces the route line. Qualifier paints opposite. */
export type StationNameLineAnchor = "above" | "below" | "left" | "right"

/** Qualifier sits away from the line; unknown anchor defaults to below. */
export const stationQualifierSide = (
  lineAnchor?: StationNameLineAnchor
): StationNameLineAnchor => {
  if (lineAnchor === "above") return "below"
  if (lineAnchor === "below") return "above"
  if (lineAnchor === "left") return "right"
  if (lineAnchor === "right") return "left"
  return "below"
}

export const isLikelyInterchange = (stop: {
  lines?: { id?: string | null }[] | null
  modes?: string[] | null
}): boolean => {
  const lineCount = stop.lines?.filter((l) => l.id).length ?? 0
  if (lineCount > 1) return true
  const modes = stop.modes?.filter(Boolean) ?? []
  return modes.length > 1
}
