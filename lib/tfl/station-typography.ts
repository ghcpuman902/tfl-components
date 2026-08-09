import { formatStationName } from "@/lib/tfl/diagram-station";
import { applyStationAbbreviations } from "@/lib/tfl/station-abbreviations";

export {
  STATION_ABBREVIATIONS,
  applyStationAbbreviations,
} from "@/lib/tfl/station-abbreviations";

/** Measure text width in CSS px for a given font size. */
export type StationTextMeasure = (text: string, fontSizePx: number) => number;

export type StationLabelFormatOptions = {
  /** Available label width in CSS px. */
  maxWidth: number;
  /** Target font size in CSS px. */
  fontSize: number;
  /** Prefer one line; allow two when needed (default 2). */
  maxLines?: 1 | 2;
  /** Apply conservative TfL-style abbreviations only when needed. */
  allowAbbreviation?: boolean;
  /** Shrink type as a last resort when still too wide. */
  allowScaleDown?: boolean;
  /** Floor for scale-down (default 0.75). */
  minScale?: number;
  /**
   * Hardwired lines (e.g. horizontal diagram crowding fixes).
   * Skips auto word-break selection when provided.
   */
  forcedLines?: readonly string[];
};

export type StationLabelFormatResult = {
  /** Display lines (1 or 2). Never splits mid-word. */
  lines: string[];
  /** Applied scale relative to requested fontSize (1 = full size). */
  scale: number;
  /** True when an abbreviation was applied to fit. */
  abbreviated: boolean;
  /** True when the result fits within maxWidth at the applied scale. */
  fits: boolean;
  /** Normalised full name before line breaks. */
  displayName: string;
};

/**
 * Conservative abbreviations used only when enabled and required to fit.
 * Prefer official short forms already common on TfL diagrams.
 * @deprecated Import from `@/lib/tfl/station-abbreviations` — re-exported here.
 */
// STATION_ABBREVIATIONS re-exported above from station-abbreviations.

/** Minimum type scale before giving up on fit (documented contract). */
export const STATION_LABEL_MIN_SCALE = 0.75;

const tokenize = (name: string): string[] =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

const applyAbbreviations = applyStationAbbreviations;

const lineWidth = (
  text: string,
  fontSize: number,
  measure: StationTextMeasure,
): number => measure(text, fontSize);

/**
 * All legal word-boundary splits into at most two lines.
 * Never breaks inside a token.
 */
export const stationLabelCandidates = (name: string): string[][] => {
  const tokens = tokenize(name);
  if (tokens.length === 0) return [[""]];
  if (tokens.length === 1) return [[tokens[0]!]];

  const candidates: string[][] = [[tokens.join(" ")]];
  for (let i = 1; i < tokens.length; i += 1) {
    candidates.push([tokens.slice(0, i).join(" "), tokens.slice(i).join(" ")]);
  }
  return candidates;
};

const scoreCandidate = (
  lines: string[],
  fontSize: number,
  maxWidth: number,
  measure: StationTextMeasure,
): { fits: boolean; balance: number; widest: number; lineCount: number } => {
  const widths = lines.map((line) => lineWidth(line, fontSize, measure));
  const widest = Math.max(...widths);
  const narrowest = Math.min(...widths);
  return {
    fits: widest <= maxWidth + 0.5,
    balance: widest - narrowest,
    widest,
    lineCount: lines.length,
  };
};

const pickBestCandidate = (
  candidates: string[][],
  fontSize: number,
  maxWidth: number,
  maxLines: 1 | 2,
  measure: StationTextMeasure,
): { lines: string[]; fits: boolean } => {
  const allowed =
    maxLines === 1
      ? candidates.filter((c) => c.length === 1)
      : candidates;

  let best = allowed[0] ?? [""];
  let bestScore = scoreCandidate(best, fontSize, maxWidth, measure);

  for (const candidate of allowed.slice(1)) {
    const score = scoreCandidate(candidate, fontSize, maxWidth, measure);
    const betterFit = score.fits && !bestScore.fits;
    const sameFit = score.fits === bestScore.fits;
    const preferFewerLines =
      sameFit && score.fits && score.lineCount < bestScore.lineCount;
    const betterBalance =
      sameFit &&
      score.fits &&
      score.lineCount === bestScore.lineCount &&
      score.balance < bestScore.balance;
    const lessOverflow =
      sameFit &&
      !score.fits &&
      score.widest < bestScore.widest;

    if (betterFit || preferFewerLines || betterBalance || lessOverflow) {
      best = candidate;
      bestScore = score;
    }
  }

  return { lines: best, fits: bestScore.fits };
};

/**
 * Deterministic station-name layout for diagrams and the typography lab.
 * Prefer full one-line → balanced two-line → abbreviated → scale-down.
 */
export const formatStationLabel = (
  rawName: string,
  measure: StationTextMeasure,
  options: StationLabelFormatOptions,
): StationLabelFormatResult => {
  const maxLines = options.maxLines ?? 2;
  const allowAbbreviation = options.allowAbbreviation ?? false;
  const allowScaleDown = options.allowScaleDown ?? true;
  const minScale = options.minScale ?? STATION_LABEL_MIN_SCALE;
  const displayName = formatStationName(rawName);
  const maxWidth = Math.max(1, options.maxWidth);
  const fontSize = Math.max(1, options.fontSize);

  if (options.forcedLines && options.forcedLines.length > 0) {
    const lines = [...options.forcedLines];
    const sized = fontSize;
    const widest = Math.max(
      ...lines.map((line) => lineWidth(line, sized, measure)),
    );
    return {
      lines,
      scale: 1,
      abbreviated: lines.join(" ") !== displayName,
      fits: widest <= maxWidth + 0.5,
      // Always the canonical single-line name — not the joined (possibly
      // abbreviated) visual lines. Copy / aria use this via formatStationName.
      displayName,
    };
  }

  const tryName = (
    name: string,
    abbreviated: boolean,
    scale: number,
  ): StationLabelFormatResult => {
    const sized = fontSize * scale;
    const { lines, fits } = pickBestCandidate(
      stationLabelCandidates(name),
      sized,
      maxWidth,
      maxLines,
      measure,
    );
    return {
      lines,
      scale,
      abbreviated,
      fits,
      displayName: name,
    };
  };

  // 1. Full name at full size
  let result = tryName(displayName, false, 1);
  if (result.fits) return result;

  // 2. Abbreviations at full size
  if (allowAbbreviation) {
    const abbreviatedName = applyAbbreviations(displayName);
    if (abbreviatedName !== displayName) {
      result = tryName(abbreviatedName, true, 1);
      if (result.fits) return result;
    }
  }

  // 3. Scale down (full name first, then abbreviated)
  if (allowScaleDown && minScale < 1) {
    const steps = 8;
    for (let i = 1; i <= steps; i += 1) {
      const scale = Math.max(minScale, 1 - (i / steps) * (1 - minScale));
      const full = tryName(displayName, false, scale);
      if (full.fits) return full;

      if (allowAbbreviation) {
        const abbreviatedName = applyAbbreviations(displayName);
        if (abbreviatedName !== displayName) {
          const abbr = tryName(abbreviatedName, true, scale);
          if (abbr.fits) return abbr;
        }
      }
    }
  }

  // Best effort — may overflow slightly
  return result;
};

/**
 * Character-count fallback measure for SSR / tests.
 * Approximate Hammersmith One average advance ≈ 0.55em.
 */
export const approximateStationMeasure: StationTextMeasure = (
  text,
  fontSizePx,
) => text.length * fontSizePx * 0.55;

/** Build a canvas-backed measure for the live document font. */
export const createCanvasStationMeasure = (
  fontFamily: string,
  fontWeight = "400",
): StationTextMeasure => {
  if (typeof document === "undefined") return approximateStationMeasure;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return approximateStationMeasure;

  return (text, fontSizePx) => {
    ctx.font = `${fontWeight} ${fontSizePx}px ${fontFamily}`;
    return ctx.measureText(text).width;
  };
};

/** Resolve the computed sans font stack from an element (or document body). */
export const resolveSansFontFamily = (el?: Element | null): string => {
  if (typeof window === "undefined") {
    return "Hammersmith One, system-ui, sans-serif";
  }
  const target = el ?? document.body;
  const family = getComputedStyle(target).fontFamily;
  return family || "Hammersmith One, system-ui, sans-serif";
};
