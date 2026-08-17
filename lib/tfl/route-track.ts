/**
 * Route-track paint for straight strips (Issue 4 §5 parallel geometry).
 * Solid Underground corridors are 1× thick; non-Underground parallels use
 * 0.33× rails with 0.33× white gaps. Cable car is three rails + two gaps.
 */

import { getLineColor } from "tfl-ts";
import {
  CABLE_CAR_MAP_COLOUR,
  OVERGROUND_LINE_COLOURS,
  TFL_MODAL_COLOURS,
  UNDERGROUND_LINE_COLOURS,
} from "@/lib/tfl/brand-colours";
import { LINE_DIAGRAM } from "@/lib/tfl/line-diagram";

/** How the route centreline is painted. */
export type RouteTrackStyle = "solid" | "parallel" | "cable-car";

/** Tube-map cable-car red (triple rails); mode roundel stays purple. */
export const CABLE_CAR_DIAGRAM_COLOR = CABLE_CAR_MAP_COLOUR.hex;

/** Theme-aware diagram red — follows `--tfl-line-central` in light / dark. */
export const CABLE_CAR_DIAGRAM_CSS_COLOR = "var(--tfl-diagram-cable-car)";

const OVERGROUND_LINE_IDS = new Set([
  "liberty",
  "lioness",
  "mildmay",
  "suffragette",
  "weaver",
  "windrush",
  "overground",
]);

const CABLE_CAR_LINE_IDS = new Set([
  "cable-car",
  "london-cable-car",
  "emirates-airline",
]);

const ELIZABETH_LINE_IDS = new Set(["elizabeth", "elizabeth-line"]);

const UNDERGROUND_COLOR_BY_ID: Record<string, string> = {
  bakerloo: UNDERGROUND_LINE_COLOURS.bakerloo.hex,
  central: UNDERGROUND_LINE_COLOURS.central.hex,
  circle: UNDERGROUND_LINE_COLOURS.circle.hex,
  district: UNDERGROUND_LINE_COLOURS.district.hex,
  "hammersmith-city": UNDERGROUND_LINE_COLOURS.hammersmithCity.hex,
  jubilee: UNDERGROUND_LINE_COLOURS.jubilee.hex,
  metropolitan: UNDERGROUND_LINE_COLOURS.metropolitan.hex,
  northern: UNDERGROUND_LINE_COLOURS.northern.hex,
  piccadilly: UNDERGROUND_LINE_COLOURS.piccadilly.hex,
  victoria: UNDERGROUND_LINE_COLOURS.victoria.hex,
  "waterloo-city": UNDERGROUND_LINE_COLOURS.waterlooCity.hex,
};

const OVERGROUND_COLOR_BY_ID: Record<string, string> = {
  liberty: OVERGROUND_LINE_COLOURS.liberty.hex,
  lioness: OVERGROUND_LINE_COLOURS.lioness.hex,
  mildmay: OVERGROUND_LINE_COLOURS.mildmay.hex,
  suffragette: OVERGROUND_LINE_COLOURS.suffragette.hex,
  weaver: OVERGROUND_LINE_COLOURS.weaver.hex,
  windrush: OVERGROUND_LINE_COLOURS.windrush.hex,
  overground: TFL_MODAL_COLOURS.overground.hex,
};

/**
 * Linear corridors suitable for Simple Line strip demos (no authored branch
 * schematic). Liberty stands in for Overground; cable car is two terminals.
 */
export const SIMPLE_LINE_STRIP_IDS = [
  "waterloo-city",
  "jubilee",
  "piccadilly",
  "victoria",
  "liberty",
  "london-cable-car",
] as const;

export type SimpleLineStripId = (typeof SIMPLE_LINE_STRIP_IDS)[number];

export const isSimpleLineStripId = (lineId: string): lineId is SimpleLineStripId =>
  (SIMPLE_LINE_STRIP_IDS as readonly string[]).includes(lineId.toLowerCase());

export const resolveRouteTrackStyle = (lineId: string): RouteTrackStyle => {
  const id = lineId.toLowerCase();
  if (CABLE_CAR_LINE_IDS.has(id)) return "cable-car";
  if (OVERGROUND_LINE_IDS.has(id) || ELIZABETH_LINE_IDS.has(id)) {
    return "parallel";
  }
  return "solid";
};

export const routeTrackRailCount = (style: RouteTrackStyle): number => {
  if (style === "cable-car") return 3;
  if (style === "parallel") return 2;
  return 1;
};

/** Total stack height in diagram units (multiples of x). */
export const routeTrackHeightUnits = (style: RouteTrackStyle): number => {
  if (style === "solid") return LINE_DIAGRAM.lineThickness;
  const { stroke, gap } = LINE_DIAGRAM.parallel;
  const rails = routeTrackRailCount(style);
  return stroke * rails + gap * (rails - 1);
};

/**
 * Theme-aware CSS variable for a line id (picks up `.dark` tokens).
 * Cable car uses diagram red, not the purple mode token.
 */
export const resolveDiagramLineCssColor = (lineId: string): string | null => {
  const id = lineId.toLowerCase();
  if (CABLE_CAR_LINE_IDS.has(id)) return CABLE_CAR_DIAGRAM_CSS_COLOR;
  if (UNDERGROUND_COLOR_BY_ID[id]) return `var(--tfl-line-${id})`;
  if (id === "overground") return "var(--tfl-mode-overground)";
  if (OVERGROUND_COLOR_BY_ID[id]) return `var(--tfl-line-${id})`;
  if (ELIZABETH_LINE_IDS.has(id)) return "var(--tfl-mode-elizabeth)";
  if (id === "dlr") return "var(--tfl-mode-dlr)";
  if (id === "tram") return "var(--tfl-mode-trams)";
  return null;
};

/**
 * Diagram paint colour for a line id. Prefers Issue 4 brand tokens; cable car
 * uses map red (not the purple modal / roundel colour).
 */
export const resolveDiagramLineColor = (lineId: string): string => {
  const id = lineId.toLowerCase();
  if (CABLE_CAR_LINE_IDS.has(id)) return CABLE_CAR_DIAGRAM_COLOR;
  if (UNDERGROUND_COLOR_BY_ID[id]) return UNDERGROUND_COLOR_BY_ID[id];
  if (OVERGROUND_COLOR_BY_ID[id]) return OVERGROUND_COLOR_BY_ID[id];
  if (ELIZABETH_LINE_IDS.has(id)) return TFL_MODAL_COLOURS.elizabeth.hex;
  if (id === "dlr") return TFL_MODAL_COLOURS.dlr.hex;
  if (id === "tram") return TFL_MODAL_COLOURS.trams.hex;
  return getLineColor(id).hex;
};
