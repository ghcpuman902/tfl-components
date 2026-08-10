/**
 * Perceptual colour + contrast analysis for TfL Go day/night research.
 *
 * AirDrop / screenshot shift resistance:
 * - Prefer day→night OKLCH deltas (same capture pipeline) over brand→night absolute hex.
 * - Treat brand→day residual as capture bias estimate; subtract from brand→night.
 * - Contrast verdicts use ratio improvement on a fixed paper, not exact hex match.
 */

import { parseHex, type Srgb } from "@/lib/tfl/colour-formats";
import {
  GO_COLOUR_ROWS,
  GO_DAY_PAPER,
  GO_NIGHT_PAPER,
  type GoColourRow,
} from "./samples";

export type Oklch = { L: number; C: number; H: number };

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const srgbChannelToLinear = (c: number): number => {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};

const linearToSrgbChannel = (c: number): number => {
  const s =
    c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  return Math.round(clamp01(s) * 255);
};

const linearSrgbToOklab = (r: number, g: number, b: number) => {
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const l_ = Math.cbrt(l);
  const m_ = Math.cbrt(m);
  const s_ = Math.cbrt(s);
  return {
    L: 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_,
    a: 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_,
    b: 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_,
  };
};

export const srgbToOklch = (srgb: Srgb): Oklch => {
  const lab = linearSrgbToOklab(
    srgbChannelToLinear(srgb.r),
    srgbChannelToLinear(srgb.g),
    srgbChannelToLinear(srgb.b),
  );
  const C = Math.hypot(lab.a, lab.b);
  let H = (Math.atan2(lab.b, lab.a) * 180) / Math.PI;
  if (H < 0) H += 360;
  return { L: lab.L, C, H };
};

export const hexToOklch = (hex: string): Oklch => srgbToOklch(parseHex(hex));

export const oklchToHex = ({ L, C, H }: Oklch): string => {
  const a = C * Math.cos((H * Math.PI) / 180);
  const b = C * Math.sin((H * Math.PI) / 180);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const mm = m_ ** 3;
  const s = s_ ** 3;
  const r =
    +4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * s;
  const g =
    -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * s;
  const bl =
    -0.0041960863 * l - 0.7034186147 * mm + 1.707614701 * s;
  const rgb = {
    r: linearToSrgbChannel(r),
    g: linearToSrgbChannel(g),
    b: linearToSrgbChannel(bl),
  };
  const h = (n: number) => n.toString(16).padStart(2, "0");
  return `#${h(rgb.r)}${h(rgb.g)}${h(rgb.b)}`.toUpperCase();
};

export type OklchDelta = {
  dL: number;
  dC: number;
  dH: number;
  /** Shortest signed hue delta degrees (−180…180). */
  dHSigned: number;
};

export const oklchDelta = (from: Oklch, to: Oklch): OklchDelta => {
  let dHSigned = to.H - from.H;
  if (dHSigned > 180) dHSigned -= 360;
  if (dHSigned < -180) dHSigned += 360;
  return {
    dL: to.L - from.L,
    dC: to.C - from.C,
    dH: Math.abs(dHSigned),
    dHSigned,
  };
};

const relativeLuminance = (hex: string): number => {
  const { r, g, b } = parseHex(hex);
  return (
    0.2126 * srgbChannelToLinear(r) +
    0.7152 * srgbChannelToLinear(g) +
    0.0722 * srgbChannelToLinear(b)
  );
};

/** WCAG 2.1 contrast ratio (1–21). */
export const wcagContrast = (fg: string, bg: string): number => {
  const L1 = relativeLuminance(fg);
  const L2 = relativeLuminance(bg);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
};

/**
 * APCA-W3 (0.1.9) Lc — perceptual contrast for text/UI on surfaces.
 * Positive ⇒ light text on dark bg; negative ⇒ dark text on light bg.
 * Soft reference thresholds: |Lc|≥60 body, ≥45 large, ≥30 non-text / map stroke.
 */
export const apcaContrast = (textHex: string, bgHex: string): number => {
  const txt = parseHex(textHex);
  const bg = parseHex(bgHex);
  const trc = 2.4;
  const channelY = (c: number) => srgbChannelToLinear(c) ** trc;
  const rawY = (s: Srgb) =>
    0.2126729 * channelY(s.r) +
    0.7151522 * channelY(s.g) +
    0.072175 * channelY(s.b);

  const softClamp = (Y: number) => {
    const blackClamp = 0.022;
    if (Y >= blackClamp) return Y;
    return Y + (blackClamp - Y) ** 1.414;
  };

  const Yt = softClamp(rawY(txt));
  const Yb = softClamp(rawY(bg));
  if (Math.abs(Yb - Yt) < 0.0005) return 0;

  const scale = 1.14;
  const loOffset = 0.027;
  const loClip = 0.1;

  if (Yb > Yt) {
    // Darker “text” on lighter bg → WoB → negative Lc
    const sapc = (Yb ** 0.65 - Yt ** 0.62) * scale;
    if (sapc < loClip) return 0;
    return Math.round((sapc - loOffset) * -100 * 10) / 10;
  }

  // Lighter “text” on darker bg → BoW → positive Lc
  const sapc = (Yb ** 0.56 - Yt ** 0.57) * scale;
  if (sapc > -loClip) return 0;
  return Math.round((sapc + loOffset) * -100 * 10) / 10;
};

export const fmtOklch = (o: Oklch): string => {
  const L = (o.L * 100).toFixed(1);
  const C = o.C.toFixed(3);
  const H = o.H.toFixed(0);
  return `${L}% ${C} ${H}°`;
};

export const fmtDelta = (n: number, digits = 3): string => {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(digits)}`;
};

const median = (values: number[]): number | null => {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1]! + sorted[mid]!) / 2
    : sorted[mid]!;
};

/** Lines used for transform fit (chromatic map paints; skip outline / NR placeholder). */
const FIT_IDS = new Set([
  "bakerloo",
  "central",
  "circle",
  "district",
  "hammersmithCity",
  "jubilee",
  "metropolitan",
  "piccadilly",
  "victoria",
  "waterlooCity",
  "dlr",
  "elizabeth",
  "overground",
  "trams",
]);

export type ContrastRow = {
  id: string;
  label: string;
  brand: string;
  goDay: string | null;
  goNight: string | null;
  notes?: string;
  brandPlaceholder?: boolean;
  /** Brand on Go night paper */
  brandOnNightWcag: number;
  brandOnNightApca: number;
  /** Go night sample on night paper */
  nightOnNightWcag: number | null;
  nightOnNightApca: number | null;
  /** Δ WCAG (night − brand) on night paper */
  wcagGain: number | null;
  apcaGain: number | null;
  /**
   * Likely intentional contrast tweak for dark paper.
   * APCA |Lc| gain, or WCAG gain when APCA soft-clips near black-on-charcoal.
   */
  contrastSeeking: boolean | null;
  /** Night sample is quieter than brand on charcoal (hierarchy / capture). */
  contrastQuieter: boolean | null;
  /** Brand on white (day paper) */
  brandOnDayWcag: number;
  goDayOnDayWcag: number | null;
};

export type TransformRow = {
  id: string;
  label: string;
  brandOklch: string;
  dayOklch: string | null;
  nightOklch: string | null;
  /** Capture-biased: night − brand */
  brandToNight: OklchDelta | null;
  /** Capture estimate: day − brand */
  brandToDay: OklchDelta | null;
  /**
   * AirDrop-resistant theme tweak: night − day
   * (same screenshot pipeline; cancels shared capture shift).
   */
  dayToNight: OklchDelta | null;
  /**
   * Debiased brand→night ≈ (night−brand) − (day−brand) = night−day
   * (same as dayToNight when day exists).
   */
  debiasedNight: OklchDelta | null;
};

export type TransformFit = {
  /** Median day→night ΔL (OKLCH L 0–1). */
  medianDL: number | null;
  medianDC: number | null;
  medianDHSigned: number | null;
  /** Median brand→day ΔL — proxy for capture wash. */
  captureBiasDL: number | null;
  captureBiasDC: number | null;
  n: number;
  pattern: string;
};

/** Apply fitted day→night OKLCH median deltas to a brand hex. */
export const applyBrandNightMethod = (
  brandHex: string,
  fit: TransformFit,
): string | null => {
  if (fit.medianDL == null || fit.medianDC == null) return null;
  const o = hexToOklch(brandHex);
  let H = o.H + (fit.medianDHSigned ?? 0);
  if (H < 0) H += 360;
  if (H >= 360) H -= 360;
  return oklchToHex({
    L: Math.min(1, Math.max(0, o.L + fit.medianDL)),
    C: Math.max(0, o.C + fit.medianDC),
    H,
  });
};

export type GoColourAnalysis = {
  nightPaper: string;
  dayPaper: string;
  contrastRows: ContrastRow[];
  transformRows: TransformRow[];
  fit: TransformFit;
  summary: {
    contrastSeekingCount: number;
    contrastSeekingIds: string[];
    contrastQuieterIds: string[];
    avgWcagGain: number | null;
    avgApcaGain: number | null;
  };
};

const analyseRow = (row: GoColourRow): ContrastRow => {
  const brandOnNightWcag = wcagContrast(row.brand, GO_NIGHT_PAPER);
  const brandOnNightApca = apcaContrast(row.brand, GO_NIGHT_PAPER);
  const nightOnNightWcag = row.goNight
    ? wcagContrast(row.goNight, GO_NIGHT_PAPER)
    : null;
  const nightOnNightApca = row.goNight
    ? apcaContrast(row.goNight, GO_NIGHT_PAPER)
    : null;
  const wcagGain =
    nightOnNightWcag != null ? nightOnNightWcag - brandOnNightWcag : null;
  const apcaGain =
    nightOnNightApca != null
      ? Math.abs(nightOnNightApca) - Math.abs(brandOnNightApca)
      : null;

  let contrastSeeking: boolean | null = null;
  let contrastQuieter: boolean | null = null;

  if (row.brandPlaceholder || row.goNight == null) {
    contrastSeeking = null;
    contrastQuieter = null;
  } else {
    const apcaSeek =
      apcaGain != null &&
      apcaGain >= 3 &&
      Math.abs(brandOnNightApca) < 60;
    // APCA soft-clips very dark-on-charcoal (Piccadilly); WCAG still moves.
    const wcagSeek =
      brandOnNightWcag < 3 &&
      wcagGain != null &&
      wcagGain >= 0.25;
    contrastSeeking = apcaSeek || wcagSeek;
    contrastQuieter =
      (apcaGain != null && apcaGain <= -5) ||
      (wcagGain != null && wcagGain <= -0.4);
  }

  return {
    id: row.id,
    label: row.label,
    brand: row.brand,
    goDay: row.goDay,
    goNight: row.goNight,
    notes: row.notes,
    brandPlaceholder: row.brandPlaceholder,
    brandOnNightWcag,
    brandOnNightApca,
    nightOnNightWcag,
    nightOnNightApca,
    wcagGain,
    apcaGain,
    contrastSeeking,
    contrastQuieter,
    brandOnDayWcag: wcagContrast(row.brand, GO_DAY_PAPER),
    goDayOnDayWcag: row.goDay
      ? wcagContrast(row.goDay, GO_DAY_PAPER)
      : null,
  };
};

const transformRow = (row: GoColourRow): TransformRow => {
  const brandO = hexToOklch(row.brand);
  const dayO = row.goDay ? hexToOklch(row.goDay) : null;
  const nightO = row.goNight ? hexToOklch(row.goNight) : null;
  const brandToNight =
    nightO != null ? oklchDelta(brandO, nightO) : null;
  const brandToDay = dayO != null ? oklchDelta(brandO, dayO) : null;
  const dayToNight =
    dayO != null && nightO != null ? oklchDelta(dayO, nightO) : null;

  return {
    id: row.id,
    label: row.label,
    brandOklch: fmtOklch(brandO),
    dayOklch: dayO ? fmtOklch(dayO) : null,
    nightOklch: nightO ? fmtOklch(nightO) : null,
    brandToNight,
    brandToDay,
    dayToNight,
    debiasedNight: dayToNight,
  };
};

export const analyseGoColours = (
  rows: GoColourRow[] = GO_COLOUR_ROWS,
): GoColourAnalysis => {
  const contrastRows = rows.map(analyseRow);
  const transformRows = rows.map(transformRow);

  const fitRows = transformRows.filter((r) => FIT_IDS.has(r.id));
  const dayNight = fitRows
    .map((r) => r.dayToNight)
    .filter((d): d is OklchDelta => d != null);
  const brandDay = fitRows
    .map((r) => r.brandToDay)
    .filter((d): d is OklchDelta => d != null);

  const medianDL = median(dayNight.map((d) => d.dL));
  const medianDC = median(dayNight.map((d) => d.dC));
  const medianDHSigned = median(dayNight.map((d) => d.dHSigned));
  const captureBiasDL = median(brandDay.map((d) => d.dL));
  const captureBiasDC = median(brandDay.map((d) => d.dC));

  const patternParts: string[] = [];
  if (medianDL != null) {
    patternParts.push(
      medianDL >= 0.01
        ? `raise OKLCH L by ~${(medianDL * 100).toFixed(1)}%`
        : medianDL <= -0.01
          ? `lower OKLCH L by ~${(Math.abs(medianDL) * 100).toFixed(1)}%`
          : "keep L roughly stable",
    );
  }
  if (medianDC != null) {
    patternParts.push(
      medianDC >= 0.01
        ? `boost chroma C by ~${medianDC.toFixed(3)}`
        : medianDC <= -0.01
          ? `ease chroma C by ~${Math.abs(medianDC).toFixed(3)}`
          : "keep C roughly stable",
    );
  }
  patternParts.push("hue mostly held (identity colour)");

  const seeking = contrastRows.filter((r) => r.contrastSeeking);
  const quieter = contrastRows.filter((r) => r.contrastQuieter);
  const gainsW = contrastRows
    .filter((r) => !r.brandPlaceholder)
    .map((r) => r.wcagGain)
    .filter((n): n is number => n != null);
  const gainsA = contrastRows
    .filter((r) => !r.brandPlaceholder)
    .map((r) => r.apcaGain)
    .filter((n): n is number => n != null);

  return {
    nightPaper: GO_NIGHT_PAPER,
    dayPaper: GO_DAY_PAPER,
    contrastRows,
    transformRows,
    fit: {
      medianDL,
      medianDC,
      medianDHSigned,
      captureBiasDL,
      captureBiasDC,
      n: dayNight.length,
      pattern:
        patternParts.join("; ") +
        " — measured as median day→night (capture-resistant).",
    },
    summary: {
      contrastSeekingCount: seeking.length,
      contrastSeekingIds: seeking.map((r) => r.id),
      contrastQuieterIds: quieter.map((r) => r.id),
      avgWcagGain:
        gainsW.length > 0
          ? gainsW.reduce((a, b) => a + b, 0) / gainsW.length
          : null,
      avgApcaGain:
        gainsA.length > 0
          ? gainsA.reduce((a, b) => a + b, 0) / gainsA.length
          : null,
    },
  };
};
