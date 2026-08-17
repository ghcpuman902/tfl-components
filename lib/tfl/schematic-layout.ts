import {
  bendCenterlineRadius,
  LINE_DIAGRAM,
  scale,
} from "@/lib/tfl/line-diagram";
import {
  schematicBounds,
  schematicNodeMap,
  schematicStationKey,
  type LineSchematic,
  type SchematicEdge,
  type SchematicNode,
} from "@/lib/tfl/line-schematic";

export type SchematicOrientation = "horizontal" | "vertical";

/** Screen-space direction of the route through a node (for tick/terminus). */
export type SchematicTrackAxis = "x" | "y";

export type SchematicLayoutPoint = {
  id: string;
  stationKey: string;
  name: string;
  x: number;
  y: number;
  lane: number;
  pos: number;
  kind: NonNullable<SchematicNode["kind"]>;
  branchIds?: readonly string[];
  /**
   * Local track tangent at this node (tick/terminus must be ⊥ to this).
   * Line-diagram lane joins end tangent to the corridor main axis.
   */
  trackAxis: SchematicTrackAxis;
  /**
   * Local track heading in degrees from +x. Corridor nodes are 0 (horizontal)
   * or 90 (vertical). A horizontal 45° spur tip reports ±45 / ±135.
   */
  trackAngle: number;
};

export type SchematicLayoutEdge = {
  from: string;
  to: string;
  branchId?: string;
  state: NonNullable<SchematicEdge["state"]>;
  path: string;
};

export type SchematicLayout = {
  width: number;
  height: number;
  orientation: SchematicOrientation;
  points: SchematicLayoutPoint[];
  edges: SchematicLayoutEdge[];
  mainPitch: number;
  lanePitch: number;
  padding: number;
  minLane: number;
  maxLane: number;
};

export type SchematicLayoutOptions = {
  orientation?: SchematicOrientation;
  /** Spacing along the main axis (pos). */
  mainPitch?: number;
  /** Spacing across lanes. */
  lanePitch?: number;
  padding?: number;
  /** Absolute diagram unit x for curve radii. */
  x?: number;
  /** Override centreline corner radius (skips LINE_DIAGRAM scaling). */
  cornerRadius?: number;
};

const DEFAULT_MAIN_PITCH = 72;
const DEFAULT_LANE_PITCH = 64;
const DEFAULT_PADDING = 48;
const DEFAULT_X = 10;

const SQRT2 = Math.SQRT2;
const SIN45 = SQRT2 / 2;
/** 1 − cos(45°) — cross-axis travel of a 45° arc. */
const ONE_MINUS_COS45 = 1 - SIN45;
/** Extra main-axis length a 45° S needs beyond |Δcross| when s0=s1=0. */
const S45_MAIN_EXTRA = 2 * (SQRT2 - 1);
/** Extra main-axis length a single 45° spur fillet needs beyond |Δcross|. */
const SPUR_MAIN_EXTRA = SQRT2 - 1;
/** Minimum |Δcross| for a 45° S of radius R: 2R(1 − cos45). */
const S45_CROSS_MIN = 2 * ONE_MINUS_COS45;

/**
 * @deprecated Prefer `octilinearLanePath` / `orthogonalRoundedPath` (Line
 * Diagram §6 circular arcs). Kept for callers that still import the old helper.
 */
export const bezierLanePath = (
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  mainAxis: "x" | "y" = "x",
  mainPitch = DEFAULT_MAIN_PITCH,
): string => {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  if (absDx < 0.5 && absDy < 0.5) {
    return `M ${x0} ${y0}`;
  }
  const mainDelta = mainAxis === "x" ? absDx : absDy;
  const crossDelta = mainAxis === "x" ? absDy : absDx;
  if (crossDelta < 0.5 || mainDelta < 0.5) {
    return `M ${x0} ${y0} L ${x1} ${y1}`;
  }

  const handle = Math.min(mainPitch * 0.75, mainDelta * 0.4, crossDelta * 0.85);

  if (mainAxis === "x") {
    const sx = Math.sign(dx);
    return `M ${x0} ${y0} C ${x0 + sx * handle} ${y0}, ${x1 - sx * handle} ${y1}, ${x1} ${y1}`;
  }
  const sy = Math.sign(dy);
  return `M ${x0} ${y0} C ${x0} ${y0 + sy * handle}, ${x1} ${y1 - sy * handle}, ${x1} ${y1}`;
};

/**
 * Orthogonal connector with a quarter-circle corner (§6 90° / §11 branch).
 * Travels main-axis first, then cross-axis.
 */
export const orthogonalRoundedPath = (
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  radius: number,
  mainAxis: "x" | "y" = "x",
): string => {
  const dx = x1 - x0;
  const dy = y1 - y0;
  if (Math.abs(dx) < 0.5 || Math.abs(dy) < 0.5) {
    return `M ${x0} ${y0} L ${x1} ${y1}`;
  }

  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  const r = Math.min(radius, absDx * 0.5, absDy * 0.5);
  if (r < 0.5) {
    return mainAxis === "x"
      ? `M ${x0} ${y0} L ${x1} ${y0} L ${x1} ${y1}`
      : `M ${x0} ${y0} L ${x0} ${y1} L ${x1} ${y1}`;
  }

  const sx = Math.sign(dx);
  const sy = Math.sign(dy);

  if (mainAxis === "x") {
    const bendX = x1 - sx * r;
    const bendY = y0 + sy * r;
    const sweep = sx * sy > 0 ? 1 : 0;
    return [
      `M ${x0} ${y0}`,
      `L ${bendX} ${y0}`,
      `A ${r} ${r} 0 0 ${sweep} ${x1} ${bendY}`,
      `L ${x1} ${y1}`,
    ].join(" ");
  }

  const bendY = y1 - sy * r;
  const bendX = x0 + sx * r;
  const sweep = sx * sy < 0 ? 1 : 0;
  return [
    `M ${x0} ${y0}`,
    `L ${x0} ${bendY}`,
    `A ${r} ${r} 0 0 ${sweep} ${bendX} ${y1}`,
    `L ${x1} ${y1}`,
  ].join(" ");
};

/**
 * Largest centreline R that still fits a 45° S between the two deltas.
 * Returns 0 when a 45° S is impossible.
 */
export const maxOctilinearRadius = (
  mainDelta: number,
  crossDelta: number,
): number => {
  if (mainDelta < 0.5 || crossDelta < 0.5) return 0;
  const fromCross = crossDelta / S45_CROSS_MIN;
  const mainExtra = mainDelta - crossDelta;
  if (mainExtra < 0) return 0;
  const fromMain = mainExtra / S45_MAIN_EXTRA;
  return Math.min(fromCross, fromMain);
};

/**
 * In-carriage §6 lane join: 45° S with circular fillets when space allows,
 * otherwise a 90° R-corner (`orthogonalRoundedPath`).
 *
 * End tangents stay on the diagram main axis so ticks stay ⊥ at both nodes.
 */
export const octilinearLanePath = (
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  radius: number,
  mainAxis: "x" | "y" = "x",
): string => {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  if (absDx < 0.5 && absDy < 0.5) {
    return `M ${x0} ${y0}`;
  }

  const mainDelta = mainAxis === "x" ? absDx : absDy;
  const crossDelta = mainAxis === "x" ? absDy : absDx;
  if (crossDelta < 0.5 || mainDelta < 0.5) {
    return `M ${x0} ${y0} L ${x1} ${y1}`;
  }

  const maxR = maxOctilinearRadius(mainDelta, crossDelta);
  const r = Math.min(radius, maxR);
  if (r < 0.5) {
    return orthogonalRoundedPath(x0, y0, x1, y1, radius, mainAxis);
  }

  const sx = Math.sign(dx) || 1;
  const sy = Math.sign(dy) || 1;
  const leftover = mainDelta - crossDelta - r * S45_MAIN_EXTRA;
  const s0 = leftover * 0.5;
  const s1 = leftover - s0;
  const arcMain = r * SIN45;
  const arcCross = r * ONE_MINUS_COS45;

  if (mainAxis === "x") {
    const a0x = x0 + sx * s0;
    const a0y = y0;
    const a1x = a0x + sx * arcMain;
    const a1y = a0y + sy * arcCross;
    const b0x = x1 - sx * s1 - sx * arcMain;
    const b0y = y1 - sy * arcCross;
    const b1x = x1 - sx * s1;
    const b1y = y1;
    // First arc turns toward the cross axis; second reverses onto the corridor.
    const sweep1 = sx * sy > 0 ? 1 : 0;
    const sweep2 = sweep1 === 1 ? 0 : 1;
    const parts = [`M ${x0} ${y0}`];
    if (s0 > 0.5) parts.push(`L ${a0x} ${a0y}`);
    parts.push(`A ${r} ${r} 0 0 ${sweep1} ${a1x} ${a1y}`);
    parts.push(`L ${b0x} ${b0y}`);
    parts.push(`A ${r} ${r} 0 0 ${sweep2} ${b1x} ${b1y}`);
    if (s1 > 0.5) parts.push(`L ${x1} ${y1}`);
    else if (Math.abs(b1x - x1) > 0.5 || Math.abs(b1y - y1) > 0.5) {
      parts.push(`L ${x1} ${y1}`);
    }
    return parts.join(" ");
  }

  // mainAxis === "y": corridor runs along y; lane is x.
  const a0x = x0;
  const a0y = y0 + sy * s0;
  const a1x = a0x + sx * arcCross;
  const a1y = a0y + sy * arcMain;
  const b0x = x1 - sx * arcCross;
  const b0y = y1 - sy * s1 - sy * arcMain;
  const b1x = x1;
  const b1y = y1 - sy * s1;
  const sweep1 = sx * sy < 0 ? 1 : 0;
  const sweep2 = sweep1 === 1 ? 0 : 1;
  const parts = [`M ${x0} ${y0}`];
  if (s0 > 0.5) parts.push(`L ${a0x} ${a0y}`);
  parts.push(`A ${r} ${r} 0 0 ${sweep1} ${a1x} ${a1y}`);
  parts.push(`L ${b0x} ${b0y}`);
  parts.push(`A ${r} ${r} 0 0 ${sweep2} ${b1x} ${b1y}`);
  if (s1 > 0.5 || Math.abs(b1x - x1) > 0.5 || Math.abs(b1y - y1) > 0.5) {
    parts.push(`L ${x1} ${y1}`);
  }
  return parts.join(" ");
};

/**
 * Largest centreline R that still fits a single-fillet 45° spur.
 * Returns 0 when the diagonal cannot land (cross > main).
 */
export const maxSpurRadius = (
  mainDelta: number,
  crossDelta: number,
): number => {
  if (mainDelta < 0.5 || crossDelta < 0.5) return 0;
  const extra = mainDelta - crossDelta;
  if (extra < 0) return 0;
  return extra / SPUR_MAIN_EXTRA;
};

/**
 * Horizontal in-carriage spur: corridor run, one 45° circular fillet, then a
 * straight 45° diagonal to the terminus. No second fillet.
 *
 * `fromIsJunction` is true when `x0,y0` is the corridor node.
 */
export const diagonalSpurPath = (
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  radius: number,
  fromIsJunction: boolean,
  mainAxis: "x" | "y" = "x",
): string => {
  const jx = fromIsJunction ? x0 : x1;
  const jy = fromIsJunction ? y0 : y1;
  const tx = fromIsJunction ? x1 : x0;
  const ty = fromIsJunction ? y1 : y0;
  const dx = tx - jx;
  const dy = ty - jy;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  if (absDx < 0.5 || absDy < 0.5) {
    return `M ${x0} ${y0} L ${x1} ${y1}`;
  }

  const mainDelta = mainAxis === "x" ? absDx : absDy;
  const crossDelta = mainAxis === "x" ? absDy : absDx;
  const maxR = maxSpurRadius(mainDelta, crossDelta);
  const r = Math.min(radius, maxR);
  if (r < 0.5) {
    return orthogonalRoundedPath(x0, y0, x1, y1, radius, mainAxis);
  }

  const sx = Math.sign(dx) || 1;
  const sy = Math.sign(dy) || 1;
  const leftover = mainDelta - crossDelta - r * SPUR_MAIN_EXTRA;
  const arcMain = r * SIN45;
  const arcCross = r * ONE_MINUS_COS45;

  let asx: number;
  let asy: number;
  let aex: number;
  let aey: number;
  let sweep: 0 | 1;

  if (mainAxis === "x") {
    asx = jx + sx * leftover;
    asy = jy;
    aex = asx + sx * arcMain;
    aey = asy + sy * arcCross;
    sweep = sx * sy > 0 ? 1 : 0;
  } else {
    asx = jx;
    asy = jy + sy * leftover;
    aex = asx + sx * arcCross;
    aey = asy + sy * arcMain;
    sweep = sx * sy < 0 ? 1 : 0;
  }

  if (fromIsJunction) {
    const parts = [`M ${jx} ${jy}`];
    if (leftover > 0.5) parts.push(`L ${asx} ${asy}`);
    parts.push(`A ${r} ${r} 0 0 ${sweep} ${aex} ${aey}`);
    parts.push(`L ${tx} ${ty}`);
    return parts.join(" ");
  }

  const revSweep = sweep === 1 ? 0 : 1;
  const parts = [`M ${tx} ${ty}`, `L ${aex} ${aey}`];
  parts.push(`A ${r} ${r} 0 0 ${revSweep} ${asx} ${asy}`);
  if (leftover > 0.5) parts.push(`L ${jx} ${jy}`);
  else if (Math.abs(asx - jx) > 0.5 || Math.abs(asy - jy) > 0.5) {
    parts.push(`L ${jx} ${jy}`);
  }
  return parts.join(" ");
};

/**
 * Local track tangent at a node — used so ticks stay ⊥ to the line.
 *
 * Line-diagram lane joins (45° S / 90° R) end tangent to the corridor main
 * axis, so a Mill Hill spur still leaves the terminus along the corridor.
 *
 * Rules:
 * - same-lane edge → main axis
 * - lane-change with main-axis span → main axis (end tangents)
 * - pure cross stub (same pos) → cross axis only
 */
const localTrackTangent = (
  id: string,
  xy: Map<string, { x: number; y: number }>,
  edges: readonly SchematicEdge[],
  orientation: SchematicOrientation,
  laneById: ReadonlyMap<string, number>,
): SchematicTrackAxis => {
  const mainAxis: SchematicTrackAxis =
    orientation === "horizontal" ? "x" : "y";
  const crossAxis: SchematicTrackAxis = mainAxis === "x" ? "y" : "x";

  let mainTangent = 0;
  let crossOnly = 0;

  for (const edge of edges) {
    if (edge.from !== id && edge.to !== id) continue;
    const a = xy.get(edge.from);
    const b = xy.get(edge.to);
    if (!a || !b) continue;
    const otherId = edge.from === id ? edge.to : edge.from;
    const sameLane = laneById.get(id) === laneById.get(otherId);
    const dx = Math.abs(b.x - a.x);
    const dy = Math.abs(b.y - a.y);
    const mainDelta = mainAxis === "x" ? dx : dy;
    const crossDelta = mainAxis === "x" ? dy : dx;

    if (sameLane || mainDelta >= 0.5) {
      mainTangent += 1;
    } else if (crossDelta >= 0.5) {
      crossOnly += 1;
    }
  }

  if (mainTangent > 0) return mainAxis;
  if (crossOnly > 0) return crossAxis;
  return mainAxis;
};

const nodeDegree = (
  id: string,
  edges: readonly SchematicEdge[],
): number => {
  let n = 0;
  for (const edge of edges) {
    if (edge.from === id || edge.to === id) n += 1;
  }
  return n;
};

const isDiagonalSpur = (
  from: SchematicNode,
  to: SchematicNode,
  edges: readonly SchematicEdge[],
): boolean => {
  const fromDeg = nodeDegree(from.id, edges);
  const toDeg = nodeDegree(to.id, edges);
  const fromTip = from.kind === "terminus" && fromDeg === 1;
  const toTip = to.kind === "terminus" && toDeg === 1;
  return (fromTip && toDeg >= 2) || (toTip && fromDeg >= 2);
};

const spurTrackAngle = (
  from: SchematicNode,
  to: SchematicNode,
  orientation: SchematicOrientation,
): number => {
  const tip = from.kind === "terminus" ? from : to;
  const junction = tip === from ? to : from;
  const dPos = tip.pos - junction.pos;
  const dLane = tip.lane - junction.lane;
  const sx = orientation === "horizontal" ? Math.sign(dPos) : Math.sign(dLane);
  const sy = orientation === "horizontal" ? Math.sign(dLane) : Math.sign(dPos);
  return (Math.atan2(sy, sx) * 180) / Math.PI;
};

const resolveCornerRadius = (
  options: SchematicLayoutOptions,
  orientation: SchematicOrientation,
  spur: boolean,
): number => {
  if (options.cornerRadius != null) return options.cornerRadius;
  const x = options.x ?? DEFAULT_X;
  if (orientation === "vertical") {
    const inner = spur
      ? LINE_DIAGRAM.vertical.curveRadiusBranch
      : LINE_DIAGRAM.vertical.curveRadiusMain;
    return scale(x, inner + LINE_DIAGRAM.lineThickness / 2);
  }
  return bendCenterlineRadius(x);
};

/**
 * Place schematic nodes on a grid and build edge paths.
 * Horizontal: pos → x, lane → y. Vertical swaps axes.
 *
 * Lane joins use Line Diagram Standard circular arcs:
 * - horizontal (in-carriage): 45° S when space allows, else 90° R
 * - vertical (platform): 90° branch curves (§11)
 */
export const layoutLineSchematic = (
  schematic: LineSchematic,
  options: SchematicLayoutOptions = {},
): SchematicLayout => {
  const orientation = options.orientation ?? schematic.orientation;
  const mainPitch = options.mainPitch ?? DEFAULT_MAIN_PITCH;
  const lanePitch = options.lanePitch ?? DEFAULT_LANE_PITCH;
  const padding = options.padding ?? DEFAULT_PADDING;

  const bounds = schematicBounds(schematic);
  const byId = schematicNodeMap(schematic);

  const toXY = (lane: number, pos: number): { x: number; y: number } => {
    const main = padding + (pos - bounds.minPos) * mainPitch;
    const cross = padding + (lane - bounds.minLane) * lanePitch;
    return orientation === "horizontal"
      ? { x: main, y: cross }
      : { x: cross, y: main };
  };

  const xyById = new Map<string, { x: number; y: number }>();
  const laneById = new Map<string, number>();
  for (const node of schematic.nodes) {
    xyById.set(node.id, toXY(node.lane, node.pos));
    laneById.set(node.id, node.lane);
  }

  const points: SchematicLayoutPoint[] = schematic.nodes.map((node) => {
    const { x, y } = xyById.get(node.id)!;
    const trackAxis = localTrackTangent(
      node.id,
      xyById,
      schematic.edges,
      orientation,
      laneById,
    );
    const spurEdge = schematic.edges.find(
      (edge) =>
        (edge.from === node.id || edge.to === node.id) &&
        isDiagonalSpur(
          byId.get(edge.from)!,
          byId.get(edge.to)!,
          schematic.edges,
        ),
    );
    const isSpurTip =
      orientation === "horizontal" &&
      node.kind === "terminus" &&
      nodeDegree(node.id, schematic.edges) === 1 &&
      spurEdge != null;
    const trackAngle =
      isSpurTip && spurEdge
        ? spurTrackAngle(
            byId.get(spurEdge.from)!,
            byId.get(spurEdge.to)!,
            orientation,
          )
        : orientation === "horizontal"
          ? 0
          : 90;
    return {
      id: node.id,
      stationKey: schematicStationKey(node),
      name: node.name,
      x,
      y,
      lane: node.lane,
      pos: node.pos,
      kind: node.kind ?? "stop",
      branchIds: node.branchIds,
      trackAxis,
      trackAngle,
    };
  });

  const mainAxis: "x" | "y" = orientation === "horizontal" ? "x" : "y";
  const edges: SchematicLayoutEdge[] = [];
  for (const edge of schematic.edges) {
    const from = byId.get(edge.from);
    const to = byId.get(edge.to);
    if (!from || !to) continue;

    const a = xyById.get(from.id)!;
    const b = xyById.get(to.id)!;
    const sameLane = from.lane === to.lane;

    let path: string;
    if (sameLane) {
      path = `M ${a.x} ${a.y} L ${b.x} ${b.y}`;
    } else {
      const spur = isDiagonalSpur(from, to, schematic.edges);
      const radius = resolveCornerRadius(options, orientation, spur);
      if (orientation === "horizontal" && spur) {
        const fromIsJunction = nodeDegree(from.id, schematic.edges) >= 2;
        path = diagonalSpurPath(
          a.x,
          a.y,
          b.x,
          b.y,
          radius,
          fromIsJunction,
          mainAxis,
        );
      } else if (orientation === "horizontal") {
        path = octilinearLanePath(a.x, a.y, b.x, b.y, radius, mainAxis);
      } else {
        path = orthogonalRoundedPath(a.x, a.y, b.x, b.y, radius, mainAxis);
      }
    }

    edges.push({
      from: edge.from,
      to: edge.to,
      branchId: edge.branchId,
      state: edge.state ?? "normal",
      path,
    });
  }

  const mainSpan = (bounds.maxPos - bounds.minPos) * mainPitch;
  const laneSpan = (bounds.maxLane - bounds.minLane) * lanePitch;
  const width =
    orientation === "horizontal"
      ? mainSpan + padding * 2
      : laneSpan + padding * 2;
  const height =
    orientation === "horizontal"
      ? laneSpan + padding * 2
      : mainSpan + padding * 2;

  return {
    width,
    height,
    orientation,
    points,
    edges,
    mainPitch,
    lanePitch,
    padding,
    minLane: bounds.minLane,
    maxLane: bounds.maxLane,
  };
};
