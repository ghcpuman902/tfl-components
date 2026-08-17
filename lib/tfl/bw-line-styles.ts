/**
 * Tube-map black & white line patterns (large-print B&W map key).
 * Tuned against B&W key / Overground traces — provisional, not TfL measurements.
 *
 * Coordinate system: Underground outer stroke = 8 (= 1× diagram unit).
 * Non-Underground / Overground borders are ⅓ of total height.
 *
 * Palette tokens (`--tfl-mono-ink` / paper / grey / light) invert in `.dark`.
 * Only Simple line strip and Branch line strip paint these motifs.
 */

export type StrokeLayer = {
  width: number;
  stroke: string;
  dash?: string;
  /** SVG stroke-dashoffset — used to phase-align layered dashes (e.g. pluses). */
  dashoffset?: number;
  linecap?: "butt" | "round" | "square";
};

export const DARK = "var(--tfl-mono-ink)";
export const GREY = "var(--tfl-mono-grey)";
export const LIGHT = "var(--tfl-mono-light)";
export const WHITE = "var(--tfl-mono-paper)";

/** Underground solid-route thickness. */
export const UG = 8;
/** Thin Underground rail borders → white channel = UG − 2×border. */
export const UG_BORDER = 1.5;
export const UG_CHANNEL = UG - 2 * UG_BORDER; // 5

/** Non-Underground / Overground: top & bottom borders are ⅓ each. */
export const NON_UG = 8;
export const THIRD = NON_UG / 3; // ≈ 2.667

/** Cable car is taller; five equal bands. */
export const CABLE = 10;
export const FIFTH = CABLE / 5; // 2

/** Underground: thin outer rails + white channel. */
export const rail = (colour = DARK): StrokeLayer[] => [
  { width: UG, stroke: colour },
  { width: UG_CHANNEL, stroke: WHITE },
];

/** Underground rails + motif inside the white channel. */
export const railWith = (
  colour: string,
  width: number,
  dash: string,
  linecap: StrokeLayer["linecap"] = "butt",
): StrokeLayer[] => [
  ...rail(colour),
  {
    width,
    stroke: colour,
    dash,
    linecap,
  },
];

/**
 * Non-Underground / Overground: borders = ⅓ height each, white middle third.
 * Centre motif is squished inside that middle third.
 */
export const thirdRails = (colour: string): StrokeLayer[] => [
  { width: NON_UG, stroke: colour },
  { width: THIRD, stroke: WHITE },
];

export const thirdWith = (
  colour: string,
  centreWidth: number,
  dash?: string,
  linecap: StrokeLayer["linecap"] = "butt",
): StrokeLayer[] => [
  ...thirdRails(colour),
  {
    width: centreWidth,
    stroke: colour,
    dash,
    linecap,
  },
];

/**
 * Plus marks in the Underground channel.
 * Arm length A = channel height; stroke width W = border width.
 * Gap between pluses = W. Period = A + W.
 * Vertical ticks: strokeWidth A, dash `W A` (tick centred at W/2).
 * Horizontal arms: strokeWidth W, dash `A W`, dashoffset (A−W)/2 so the
 * arm centres on the tick (otherwise the arm reads ~50% right-shifted).
 */
const plusInChannel = (
  colour: string,
  arm = UG_CHANNEL,
  strokeW = UG_BORDER,
): StrokeLayer[] => [
  { width: arm, stroke: colour, dash: `${strokeW} ${arm}` },
  {
    width: strokeW,
    stroke: colour,
    dash: `${arm} ${strokeW}`,
    dashoffset: (arm - strokeW) / 2,
  },
];

/** Hollow rings: round dark blobs + smaller white blobs on the same dash phase. */
const hollowRings = (
  colour: string,
  outer = 3.4,
  hole = 2,
  gap = 5.5,
): StrokeLayer[] => [
  {
    width: outer,
    stroke: colour,
    dash: `0.01 ${gap}`,
    linecap: "round",
  },
  {
    width: hole,
    stroke: WHITE,
    dash: `0.01 ${gap}`,
    linecap: "round",
  },
];

/**
 * Overground: light/dark × dash density (all share ⅓ borders + squished centre).
 *   dash  → Liberty / Lioness     (longer centre dashes)
 *   short → Mildmay / Suffragette (gap > dash)
 *   dense → Weaver / Windrush     (very fine centre dashes)
 */
export type OvergroundBWStyle = {
  tone: "light" | "dark";
  motif: "dash" | "short" | "dense";
};

export const OVERGROUND_BW: Record<string, OvergroundBWStyle> = {
  liberty: { tone: "light", motif: "dash" },
  lioness: { tone: "dark", motif: "dash" },
  mildmay: { tone: "light", motif: "short" },
  suffragette: { tone: "dark", motif: "short" },
  weaver: { tone: "light", motif: "dense" },
  windrush: { tone: "dark", motif: "dense" },
};

/** Squished centre inside the middle third (~55% of a third). */
const OG_CENTRE = THIRD * 0.55; // ≈ 1.47

export const overgroundLayers = ({
  tone,
  motif,
}: OvergroundBWStyle): StrokeLayer[] => {
  const colour = tone === "light" ? LIGHT : DARK;
  if (motif === "dash") return thirdWith(colour, OG_CENTRE, "7 7");
  // Gap longer than dash.
  if (motif === "short") return thirdWith(colour, OG_CENTRE, "2 3.5");
  // Super-dense square ticks (along-path on-length = stroke width).
  return thirdWith(colour, OG_CENTRE, `${OG_CENTRE} ${OG_CENTRE}`);
};

/**
 * Thameslink / National Rail: equal on/off blocks in the middle third.
 * Block width ≈ 2.12 × full line height → 17/8 (= 2.125).
 */
const TL_BLOCK = (NON_UG * 17) / 8; // 17

const thirdDashedCentre = (colour: string): StrokeLayer[] =>
  thirdWith(colour, THIRD, `${TL_BLOCK} ${TL_BLOCK}`);

export const bwLineStyles: Record<string, StrokeLayer[]> = {
  // Solid bars in the thin UG channel.
  bakerloo: railWith(DARK, UG_CHANNEL, "5 4"),

  central: [
    ...rail(DARK),
    {
      width: UG_BORDER,
      stroke: DARK,
      dash: "4 2 1 2",
    },
  ],

  circle: [
    ...rail(DARK),
    {
      width: UG_CHANNEL,
      stroke: GREY,
      dash: "7 11",
    },
  ],

  // Pluses: equal arm length (= channel), gap = stroke width (= border).
  district: [...rail(DARK), ...plusInChannel(DARK)],

  // Ladder; vertical bar thickness matches top/bottom border.
  hammersmithCity: railWith(DARK, UG_CHANNEL, `${UG_BORDER} 2.2`),

  jubilee: [{ width: UG, stroke: GREY }],

  // Three equal-weight horizontals + square ticks in the gaps.
  metropolitan: [
    { width: UG, stroke: DARK },
    { width: UG - 2 * UG_BORDER, stroke: WHITE }, // = channel; rails = UG_BORDER
    { width: UG_BORDER, stroke: DARK }, // centre matches borders
    { width: UG_CHANNEL, stroke: DARK, dash: "2.2 4.5" },
  ],

  northern: [{ width: UG, stroke: DARK }],

  // Thick channel dashes + continuous white strike-through.
  piccadilly: [
    ...rail(DARK),
    { width: UG_CHANNEL, stroke: DARK, dash: "5 4.5" },
    { width: UG_BORDER * 0.75, stroke: WHITE },
  ],

  // Five equal bands: B W B W B (not taller overall).
  victoria: [
    { width: UG, stroke: DARK },
    { width: UG * 0.6, stroke: WHITE }, // 3/5
    { width: UG * 0.2, stroke: DARK }, // 1/5 centre
  ],

  // Hollow rings (unchanged — looks right).
  waterlooCity: [...rail(DARK), ...hollowRings(DARK)],

  // ⅓ borders; verticals match border height; gap ≈ 4× vertical thickness.
  dlr: [
    ...thirdRails(LIGHT),
    { width: THIRD, stroke: LIGHT, dash: `${THIRD} ${THIRD * 4}` },
  ],

  // Black / white / black — equal thirds (like coloured parallel rails).
  elizabeth: thirdRails(DARK),

  // Light / darker-grey / light — equal thirds.
  trams: [
    { width: NON_UG, stroke: LIGHT },
    { width: THIRD, stroke: GREY },
  ],

  // Taller; five equal grey / white / grey / white / grey bands.
  cableCar: [
    { width: CABLE, stroke: LIGHT },
    { width: FIFTH * 3, stroke: WHITE },
    { width: FIFTH, stroke: LIGHT },
  ],

  // ⅓ borders + equal on/off dashes in the middle third.
  thameslink: thirdDashedCentre(GREY),
  nationalRail: thirdDashedCentre(GREY),

  liberty: overgroundLayers(OVERGROUND_BW.liberty),
  lioness: overgroundLayers(OVERGROUND_BW.lioness),
  mildmay: overgroundLayers(OVERGROUND_BW.mildmay),
  suffragette: overgroundLayers(OVERGROUND_BW.suffragette),
  weaver: overgroundLayers(OVERGROUND_BW.weaver),
  windrush: overgroundLayers(OVERGROUND_BW.windrush),
};

export type BwLineStyleKey = keyof typeof bwLineStyles;

const MONO_STYLE_BY_ID: Record<string, BwLineStyleKey> = {
  bakerloo: "bakerloo",
  central: "central",
  circle: "circle",
  district: "district",
  "hammersmith-city": "hammersmithCity",
  jubilee: "jubilee",
  metropolitan: "metropolitan",
  northern: "northern",
  piccadilly: "piccadilly",
  victoria: "victoria",
  "waterloo-city": "waterlooCity",
  dlr: "dlr",
  elizabeth: "elizabeth",
  "elizabeth-line": "elizabeth",
  tram: "trams",
  trams: "trams",
  "cable-car": "cableCar",
  "london-cable-car": "cableCar",
  "emirates-airline": "cableCar",
  thameslink: "thameslink",
  "national-rail": "nationalRail",
  liberty: "liberty",
  lioness: "lioness",
  mildmay: "mildmay",
  suffragette: "suffragette",
  weaver: "weaver",
  windrush: "windrush",
};

/** B&W stroke layers for a TfL line / mode id. Unknown ids fall back to solid ink. */
export const resolveMonoLineStyle = (lineId: string): StrokeLayer[] => {
  const key = MONO_STYLE_BY_ID[lineId.toLowerCase()];
  return key ? bwLineStyles[key] : bwLineStyles.northern;
};

/** Stack height in diagram `x` units (UG 8 = 1×). */
export const monoLineHeightUnits = (layers: readonly StrokeLayer[]): number => {
  const outer = layers.reduce((max, layer) => Math.max(max, layer.width), 0);
  return outer / UG;
};

const scaleDash = (dash: string, factor: number): string =>
  dash
    .split(/\s+/)
    .map((part) => String(Number(part) * factor))
    .join(" ");

/** Scale motif widths, dashes, and offsets so UG 8 maps to diagram unit `x`. */
export const scaleMonoLayers = (
  layers: readonly StrokeLayer[],
  x: number,
): StrokeLayer[] => {
  const factor = x / UG;
  return layers.map((layer) => ({
    ...layer,
    width: layer.width * factor,
    dash: layer.dash ? scaleDash(layer.dash, factor) : undefined,
    dashoffset:
      layer.dashoffset != null ? layer.dashoffset * factor : undefined,
  }));
};
