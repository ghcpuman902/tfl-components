/**
 * TfL Line diagram standard — Issue 4 (January 2025) geometry.
 * Unit `x` = station-name x-height = solid route-line thickness.
 * These helpers encode published ratios for map/diagram drawing.
 * They do not grant a licence to reproduce TfL maps.
 */

import type { CSSProperties } from "react";

/** Base unit: route line thickness (= station name x-height). */
export type DiagramUnit = number;

export const LINE_DIAGRAM_SOURCE = {
  title: "Line diagram standard",
  issue: 4,
  date: "January 2025",
  referencePdf: "reference/brand/tfl-line-diagram-standard.pdf",
  assetsRoot: "/brand/line-diagram",
  manifest: "/brand/line-diagram/manifest.json",
} as const;

/**
 * Inherited CSS scale for all diagram components on a page.
 * Set once on a parent (e.g. the `/line-diagram` region) with Tailwind
 * breakpoints; do not theme tick/ring/type ratios independently.
 *
 * @example
 * ```tsx
 * <div className="[--tfl-diagram-scale:0.7] sm:[--tfl-diagram-scale:0.85] lg:[--tfl-diagram-scale:1]">
 *   <HorizontalLineDiagram … />
 *   <JourneyDiagram … />
 * </div>
 * ```
 */
export const DIAGRAM_SCALE_VAR = "--tfl-diagram-scale";

/** Resolved route-line thickness used inside each diagram root. */
export const DIAGRAM_X_VAR = "--tfl-diagram-x";

/**
 * Orientation baselines (px at scale 1).
 * Horizontal `10` matches the Victoria strip reference.
 * Vertical `4` keeps §11 proportions (names taller than rings) while landing
 * station type near body/`text-base` size (~17px) on a laptop screen.
 */
export const DIAGRAM_BASELINE = {
  horizontal: 10,
  vertical: 4,
} as const;

export type DiagramOrientation = keyof typeof DIAGRAM_BASELINE;

/**
 * Suggested page-level responsive scale values (unitless multipliers).
 * Apply via Tailwind arbitrary properties on a shared ancestor.
 */
export const DIAGRAM_SCALE = {
  mobile: 0.7,
  tablet: 0.85,
  desktop: 1,
} as const;

/** Tailwind class string that sets `--tfl-diagram-scale` at shared breakpoints. */
export const DIAGRAM_SCALE_CLASS = `[${DIAGRAM_SCALE_VAR}:${DIAGRAM_SCALE.mobile}] sm:[${DIAGRAM_SCALE_VAR}:${DIAGRAM_SCALE.tablet}] lg:[${DIAGRAM_SCALE_VAR}:${DIAGRAM_SCALE.desktop}]`;

/**
 * Sets `--tfl-diagram-x` on a diagram root.
 * Pass `x` to lock an absolute thickness; otherwise baseline × inherited scale.
 */
export const diagramUnitStyle = (
  orientation: DiagramOrientation,
  x?: number,
): CSSProperties =>
  ({
    [DIAGRAM_X_VAR]:
      x != null
        ? `${x}px`
        : `calc(${DIAGRAM_BASELINE[orientation]}px * var(${DIAGRAM_SCALE_VAR}, 1))`,
  }) as CSSProperties;

/** CSS length = `units` × `--tfl-diagram-x`. */
export const ux = (units: number): string =>
  `calc(var(${DIAGRAM_X_VAR}) * ${units})`;

/** Core proportions (§5–§8). All values are multiples of `x`. */
export const LINE_DIAGRAM = {
  /** Solid route line thickness. */
  lineThickness: 1,
  /** Station tick — square on the line (§5). */
  stationTick: 0.66,
  /** Non-Underground parallel lines on Tube map (§5). */
  parallel: {
    stroke: 0.33,
    gap: 0.33,
    /** Total stack ≈ x */
    total: 0.99,
  },
  /** Engineering works / out of use (§5.1). Solid uses theme `--muted` (~zinc-100). */
  outOfUse: {
    m: 0.33,
    /** Dash segment length in units of m (legacy dashed style). */
    dashM: 0.5,
    colorOpacity: 0.3,
  },
  /** Direction changes (§6). */
  angles: [45, 90] as const,
  /** Innermost adjacent curve radius (§6). */
  innerCurveRadius: 3,
  /** Continuation arrow (§7). Total height = 4x. */
  arrow: {
    wing: 1.5,
    stem: 1,
    /** Perpendicular arm thickness */
    armThickness: 1,
    tipHalfAngleDeg: 45,
  },
  /** Interchange circle (§8). Outer diameter = 3x. */
  interchange: {
    stroke: 0.5,
    innerDiameter: 2,
    outerDiameter: 3,
    /** White bridge strip between joined circles */
    bridgeWhite: 0.5,
    /** Black neck walls on dumbbell */
    bridgeBorder: 0.5,
    /** Total neck width = 1.5x */
    neckWidth: 1.5,
  },
  /** Horizontal diagram layout (§10). */
  layout: {
    /** Gap from line underside to station name top when name is below */
    nameBelowLine: 1.66,
    /** Minimum gap between adjacent flag boxes (in CH) — use with cap height */
    flagGapCh: 1,
    /** Single-line flag box height parts in CH: 0.25 + 0.5 + 0.25 */
    flagPaddingCh: { top: 0.25, text: 0.5, bottom: 0.25 },
    /** Overground flag height = 1.5 × CH (§9.3) */
    overgroundFlagHeightCh: 1.5,
  },
  /** Vertical platform diagrams (§11). Unit `n` = route line width. */
  vertical: {
    /** Station name capital-letter height = 3 × route line width. */
    nameCapHeight: 3,
    flagDepth: 1.5,
    curveRadiusMain: 3,
    curveRadiusBranch: 4,
    tick: 0.66,
  },
} as const;

export const scale = (x: DiagramUnit, units: number): number => x * units;

/**
 * Hammersmith One / Johnston-like fonts: capital height ≈ 70% of CSS font-size.
 * Used to convert §11 cap-height (3x) into a CSS `font-size`.
 */
export const DIAGRAM_CAP_HEIGHT_RATIO = 0.7;

/** §11 name size as a multiple of `x` (cap height 3x → CSS font-size). */
export const VERTICAL_NAME_SIZE_UNITS =
  LINE_DIAGRAM.vertical.nameCapHeight / DIAGRAM_CAP_HEIGHT_RATIO;

/** Horizontal station name: x-height ≈ line thickness → CSS font-size ≈ 2x. */
export const HORIZONTAL_NAME_SIZE_UNITS = 2;

/** §11: CSS font-size so station-name capitals match interchange outer Ø (3x). */
export const verticalStationFontSize = (x: DiagramUnit): number =>
  scale(x, VERTICAL_NAME_SIZE_UNITS);

/** Flag chip font roughly half the station name size. */
export const verticalFlagFontSize = (x: DiagramUnit): number =>
  Math.max(10, verticalStationFontSize(x) * 0.45);

/**
 * §5 / §10: CSS font-size so station-name x-height ≈ route line thickness `x`
 * (Johnston-like x-height ≈ half an em).
 */
export const horizontalStationFontSize = (x: DiagramUnit): number =>
  scale(x, HORIZONTAL_NAME_SIZE_UNITS);

/** Capital height from a CSS font-size (Johnston-like). */
export const stationCapHeight = (fontSize: number): number =>
  fontSize * DIAGRAM_CAP_HEIGHT_RATIO;

/**
 * §9 single-line flag box height = 1 CH
 * (0.25 + 0.5 + 0.25 padding/text parts).
 */
export const flagBoxHeight = (capHeight: number): number => {
  const { top, text, bottom } = LINE_DIAGRAM.layout.flagPaddingCh;
  return capHeight * (top + text + bottom);
};

/** §9: font-size so capitals fill the flag text band (0.5 CH). */
export const flagBoxFontSize = (capHeight: number): number =>
  (capHeight * LINE_DIAGRAM.layout.flagPaddingCh.text) /
  DIAGRAM_CAP_HEIGHT_RATIO;

/** §10: gap from route line underside to content below (names / flags). */
export const belowLineClearance = (x: DiagramUnit): number =>
  scale(x, LINE_DIAGRAM.layout.nameBelowLine);

/**
 * Shared CSS lengths for vertical / journey diagrams (multiples of `--tfl-diagram-x`).
 * Keeps JourneyDiagram and LineRouteDiagram from drifting apart.
 *
 * Vertical UI names use §11 sizing (cap height ≈ ring Ø = 3×) so labels read
 * taller than interchange rings. Mid-route ticks protrude right only;
 * terminals use a full crossbar.
 */
export const verticalDiagramMetrics = () => {
  const tickProtrude = LINE_DIAGRAM.vertical.tick;
  /** Full terminal tick (both sides of the route). */
  const tickBothWidth = 1 + tickProtrude * 2;
  /** Mid-route tick: covers the line and extends right only. */
  const tickRightWidth = 1 + tickProtrude;
  const ringOuter = LINE_DIAGRAM.interchange.outerDiameter;
  const ringStroke = LINE_DIAGRAM.interchange.stroke;
  /** §11: capitals ≈ ring Ø → CSS font-size taller than the ring. */
  const nameSize = VERTICAL_NAME_SIZE_UNITS;
  const capHeight = nameSize * DIAGRAM_CAP_HEIGHT_RATIO;
  const { top, text, bottom } = LINE_DIAGRAM.layout.flagPaddingCh;
  const flagHeight = capHeight * (top + text + bottom);
  const flagFont = (capHeight * text) / DIAGRAM_CAP_HEIGHT_RATIO;
  const flagMinWidth = Math.max(8, capHeight * 4);
  const markerCol = Math.max(ringOuter, tickBothWidth);
  const nameGap = 1.5;
  /** Extra pitch so names taller than rings still breathe between stops. */
  const rowGap = Math.max(ringOuter, nameSize) + 2.5;
  const stopGap = 2;

  return {
    tickProtrude: ux(tickProtrude),
    tickBothWidth: ux(tickBothWidth),
    tickRightWidth: ux(tickRightWidth),
    tickHeight: ux(1),
    ringOuter: ux(ringOuter),
    ringStroke: ux(ringStroke),
    markerSlot: ux(ringOuter),
    nameSize: ux(nameSize),
    titleSize: ux(nameSize * 0.75),
    flagHeight: ux(flagHeight),
    flagFont: ux(Math.max(flagFont, 1.6)),
    flagMinWidth: ux(flagMinWidth),
    markerCol: ux(markerCol),
    nameGap: ux(nameGap),
    rowGap: ux(rowGap),
    rowGapUnits: rowGap,
    markerColUnits: markerCol,
    lineWidth: ux(1),
    stopGap: ux(stopGap),
  } as const;
};

/**
 * Shared CSS lengths for horizontal strip diagrams.
 */
export const horizontalDiagramMetrics = () => {
  const tickProtrude = LINE_DIAGRAM.stationTick;
  const tickHeightUnits = 1 + tickProtrude * 2;
  const ringOuter = LINE_DIAGRAM.interchange.outerDiameter;
  const ringStroke = LINE_DIAGRAM.interchange.stroke;
  const nameSize = HORIZONTAL_NAME_SIZE_UNITS;
  const capHeight = nameSize * DIAGRAM_CAP_HEIGHT_RATIO;
  const { top, text, bottom } = LINE_DIAGRAM.layout.flagPaddingCh;
  const flagHeight = capHeight * (top + text + bottom);
  const flagFont = Math.max(
    (capHeight * text) / DIAGRAM_CAP_HEIGHT_RATIO,
    1,
  );
  const flagMinWidth = Math.max(8, capHeight * 4);
  const nameGap = 0.75;
  const nameBand = nameSize * 2.35;
  const markerBand = Math.max(ringOuter, tickHeightUnits);
  const colWidth = Math.max(ringOuter + 10, flagMinWidth + 4, 12);
  const lineTop = nameBand + nameGap + markerBand / 2 - 0.5;
  const flagClearance = LINE_DIAGRAM.layout.nameBelowLine;

  return {
    tickWidth: ux(1),
    tickHeight: ux(tickHeightUnits),
    ringOuter: ux(ringOuter),
    ringStroke: ux(ringStroke),
    nameSize: ux(nameSize),
    titleSize: ux(nameSize * 0.9),
    flagHeight: ux(flagHeight),
    flagFont: ux(flagFont),
    flagMinWidth: ux(flagMinWidth),
    nameGap: ux(nameGap),
    nameBand: ux(nameBand),
    markerBand: ux(markerBand),
    colWidth: ux(colWidth),
    lineTop: ux(lineTop),
    flagClearance: ux(flagClearance),
    lineWidth: ux(1),
    colWidthUnits: colWidth,
  } as const;
};

/** Outer radius of an interchange ring (centre → outer edge). */
export const interchangeOuterRadius = (x: DiagramUnit): number =>
  scale(x, LINE_DIAGRAM.interchange.outerDiameter / 2);

/** Inner (hole) radius of an interchange ring. */
export const interchangeInnerRadius = (x: DiagramUnit): number =>
  scale(x, LINE_DIAGRAM.interchange.innerDiameter / 2);

/** Stroke width of an interchange ring. */
export const interchangeStroke = (x: DiagramUnit): number =>
  scale(x, LINE_DIAGRAM.interchange.stroke);

/** Centreline radius for a 90° bend when the innermost curve is R3x. */
export const bendCenterlineRadius = (x: DiagramUnit): number =>
  scale(x, LINE_DIAGRAM.innerCurveRadius + LINE_DIAGRAM.lineThickness / 2);

/**
 * SVG path for a station tick centred on (cx, cy), for a horizontal line.
 * Tick is a 0.66x square sitting on the line (top-aligned to line top in diagrams;
 * here centred on the line centre for map use).
 */
export const stationTickRect = (
  cx: number,
  cy: number,
  x: DiagramUnit,
): { x: number; y: number; width: number; height: number } => {
  const size = scale(x, LINE_DIAGRAM.stationTick);
  return { x: cx - size / 2, y: cy - size / 2, width: size, height: size };
};

/**
 * Polygon points for a continuation arrow pointing +X, stem centred on y.
 * Geometry from §7: total height 4x, 45° arms, tip forms 90°.
 */
export const continuationArrowPoints = (
  tipX: number,
  cy: number,
  x: DiagramUnit,
  direction: 1 | -1 = 1,
): string => {
  const tipExtent = scale(x, 2);
  const back = tipX - direction * tipExtent;
  const topOuter = cy - 2 * x;
  const botOuter = cy + 2 * x;
  const halfStem = scale(x, LINE_DIAGRAM.arrow.stem) / 2;
  const innerBack = tipX - direction * (tipExtent - x);
  return [
    [tipX, cy],
    [back, topOuter],
    [innerBack, cy - halfStem],
    [innerBack, cy + halfStem],
    [back, botOuter],
  ]
    .map(([px, py]) => `${px},${py}`)
    .join(" ");
};

/** Path `d` for a 90° centreline bend (quarter circle), convex toward +X/+Y. */
export const bend90Path = (
  startX: number,
  startY: number,
  x: DiagramUnit,
  turn: "down-right" | "up-right" | "down-left" | "up-left" = "down-right",
): string => {
  const r = bendCenterlineRadius(x);
  const map = {
    "down-right": { dx: r, dy: r },
    "up-right": { dx: r, dy: -r },
    "down-left": { dx: -r, dy: r },
    "up-left": { dx: -r, dy: -r },
  } as const;
  const { dx, dy } = map[turn];
  const endX = startX + dx;
  const endY = startY + dy;
  const sweepFlag =
    turn === "down-right" || turn === "up-left" ? 1 : 0;
  return `M ${startX} ${startY} A ${r} ${r} 0 0 ${sweepFlag} ${endX} ${endY}`;
};

export type LineDiagramAsset = {
  slug: string;
  title: string;
  path: string;
  kind: "page" | "sheet" | "figure";
};

/** Cropped reference assets under /public/brand/line-diagram. */
export const LINE_DIAGRAM_ASSETS = {
  sheets: [
    {
      slug: "05-line-thickness-sheet",
      title: "§5 Station names and line thickness",
      path: "/brand/line-diagram/figures/05-line-thickness-sheet.png",
    },
    {
      slug: "06-radii-angles-sheet",
      title: "§6 Radii and angles",
      path: "/brand/line-diagram/figures/06-radii-angles-sheet.png",
    },
    {
      slug: "07-arrow-head-sheet",
      title: "§7 Arrow heads",
      path: "/brand/line-diagram/figures/07-arrow-head-sheet.png",
    },
    {
      slug: "08-interchange-circles-sheet",
      title: "§8 Interchange circles",
      path: "/brand/line-diagram/figures/08-interchange-circles-sheet.png",
    },
    {
      slug: "10-construction-sheet",
      title: "§10 Constructing a line diagram",
      path: "/brand/line-diagram/figures/10-construction-sheet.png",
    },
    {
      slug: "10-1-elements-sheet",
      title: "§10.1 Diagram elements",
      path: "/brand/line-diagram/figures/10-1-elements-sheet.png",
    },
    {
      slug: "11-vertical-sheet",
      title: "§11 Vertical platform diagrams",
      path: "/brand/line-diagram/figures/11-vertical-sheet.png",
    },
  ],
  figures: [
    {
      slug: "radii-90-r3x",
      title: "90° bend · R3x",
      path: "/brand/line-diagram/figures/radii-90-r3x.png",
    },
    {
      slug: "radii-45",
      title: "45° shift",
      path: "/brand/line-diagram/figures/radii-45.png",
    },
    {
      slug: "arrow-head",
      title: "Continuation arrow",
      path: "/brand/line-diagram/figures/arrow-head.png",
    },
    {
      slug: "interchange-single",
      title: "Interchange circle",
      path: "/brand/line-diagram/figures/interchange-single.png",
    },
    {
      slug: "interchange-bridge",
      title: "Bridged double circle",
      path: "/brand/line-diagram/figures/interchange-bridge.png",
    },
    {
      slug: "interchange-dumbbell",
      title: "Dumbbell interchange",
      path: "/brand/line-diagram/figures/interchange-dumbbell.png",
    },
  ],
} as const;
