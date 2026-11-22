import { TFL_BLUE } from "@/lib/tfl/brand-colours"

/**
 * Lines whose chip text is TfL blue, not white. Mirrors the
 * `[data-line=…] { --line-ink: … }` overrides in `app/tfl-colours.css` that
 * `LineBadge` paints with. Takumi has no CSS variables, so OG chips read this.
 */
export const OG_BLUE_INK_LINE_IDS: ReadonlySet<string> = new Set([
  "circle",
  "hammersmith-city",
  "waterloo-city",
  "coaches",
])

const PAPER = "#FFFFFF"

/**
 * Text colour for an OG line chip: the same `--line-ink` rule as `LineBadge`.
 * Blue on Circle, Hammersmith & City, Waterloo & City and Coaches; white on
 * every other line, buses included. Decided by line id, never by contrast.
 */
export const ogLineChipTextColor = (lineId: string): string =>
  OG_BLUE_INK_LINE_IDS.has(lineId.trim().toLowerCase()) ? TFL_BLUE : PAPER
