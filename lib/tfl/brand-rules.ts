/**
 * Helpers for adhering to TfL Basic Elements roundel rules (§3 / §3.1).
 * These do not grant a licence — they encode published layout constraints.
 */

/** Clear space around a roundel = 0.25 × bar width (x). */
export const ROUNDEL_EXCLUSION_RATIO = 0.25;

/**
 * Minimum display width when the bar contains a mode name.
 * Brand guide: 12mm. At 96dpi ≈ 45px; at CSS 96 CSS-px/inch ≈ 45px.
 */
export const ROUNDEL_MIN_WIDTH_MM = 12;
export const ROUNDEL_MIN_WIDTH_PX = Math.ceil((12 / 25.4) * 96);

export const ROUNDEL_DO_NOT = [
  "Do not re-draw, distort, or modify the roundel",
  "Do not place on a background that impairs legibility",
  "Do not place on patterned or busy backgrounds that interfere with the mark",
  "Do not display below 12mm width when the bar contains a mode name",
  "Do not crop, rotate, flip, or recolour licensed artwork outside brand rules",
  "Do not amend bar text on licensed artwork unless TfL has authorised it",
] as const;

export type RoundelExclusion = {
  /** Bar width in the same unit as input (CSS px recommended). */
  barWidth: number;
  /** Clear space on each side = 0.25 × barWidth. */
  exclusion: number;
  /** Total box including exclusion on both sides. */
  outerSize: number;
  /** Inline style padding for a wrapping element. */
  paddingStyle: { padding: string };
  /** Tailwind-friendly arbitrary padding class, e.g. `p-[12px]`. */
  paddingClass: string;
};

/**
 * Compute the exclusion zone for a roundel whose bar width is `barWidth`
 * (CSS pixels). Apply `paddingStyle` / `paddingClass` on a wrapper so no
 * other graphics sit closer than 0.25×.
 */
export const getRoundelExclusion = (barWidth: number): RoundelExclusion => {
  const width = Math.max(0, barWidth);
  const exclusion = width * ROUNDEL_EXCLUSION_RATIO;
  const rounded = Math.round(exclusion * 100) / 100;
  return {
    barWidth: width,
    exclusion: rounded,
    outerSize: width + rounded * 2,
    paddingStyle: { padding: `${rounded}px` },
    paddingClass: `p-[${rounded}px]`,
  };
};

/** True when a named roundel is at least the 12mm minimum (approx CSS px). */
export const isRoundelAboveMinSize = (widthPx: number): boolean =>
  widthPx >= ROUNDEL_MIN_WIDTH_PX;

/**
 * Johnston is licensed by TfL. Prefer your own typeface, or a lookalike:
 * Hammersmith One (Google) or P22 Underground (Adobe Fonts).
 * Apply for Johnston only via TfL font requests.
 */
export const ROUNDEL_FONT_POLICY = {
  preferred: "Use your own brand typeface for product UI.",
  johnston:
    "Do not download or redistribute Johnston without a TfL licence.",
  alternatives: [
    {
      name: "Hammersmith One",
      provider: "Google Fonts",
      note: "Free geometric sans used in this repo as a Johnston-like stand-in.",
    },
    {
      name: "P22 Underground",
      provider: "Adobe Fonts",
      note: "Closer commercial match; requires an Adobe Fonts subscription.",
    },
  ],
} as const;

/**
 * CSS font stack for roundel bar text in this library.
 * Maps to `--font-sans` (Hammersmith One in this app).
 */
export const ROUNDEL_FONT_FAMILY =
  "var(--font-sans), 'Hammersmith One', system-ui, sans-serif";
