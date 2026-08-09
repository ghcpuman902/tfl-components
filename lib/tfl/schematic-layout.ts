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
   * Bezier ends use the diagram main axis — not the chord’s dominant axis.
   */
  trackAxis: SchematicTrackAxis;
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
  cornerRadius?: number;
};

const DEFAULT_MAIN_PITCH = 72;
const DEFAULT_LANE_PITCH = 64;
const DEFAULT_PADDING = 48;

/**
 * Smooth lane-change connector: cubic Bezier with end tangents along the
 * diagram main axis (corridor flow).
 *
 * Handle length targets ~¾ of `mainPitch`, capped by both the main-axis run
 * and the cross-axis jump so multi-lane joins (e.g. Edgware → Camden) stay
 * round without overshooting.
 *
 * Spurs need ≈ ≥ 1 station of main-axis span or they collapse to a straight
 * stub; fixtures should offset spur `pos` accordingly.
 */
export const bezierLanePath = (
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  mainAxis: "x" | "y" = "x",
  /** Station gap along the main axis — preferred handle length scales from this. */
  mainPitch = DEFAULT_MAIN_PITCH,
): string => {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);
  if (absDx < 0.5 && absDy < 0.5) {
    return `M ${x0} ${y0}`;
  }
  // Pure main-axis (same lane) — straight.
  const mainDelta = mainAxis === "x" ? absDx : absDy;
  const crossDelta = mainAxis === "x" ? absDy : absDx;
  if (crossDelta < 0.5) {
    return `M ${x0} ${y0} L ${x1} ${y1}`;
  }
  // Pure cross-axis (same pos) — no room for a Bezier; keep a straight stub.
  // Prefer offsetting spur `pos` in fixtures instead of inventing a bulge.
  if (mainDelta < 0.5) {
    return `M ${x0} ${y0} L ${x1} ${y1}`;
  }

  const handleTarget = mainPitch * 0.75;
  // Keep handles under half the main run so control points never cross
  // (crossed handles make Camden/Mornington joins look kinked).
  const handle = Math.min(
    handleTarget,
    mainDelta * 0.4,
    crossDelta * 0.85,
  );

  if (mainAxis === "x") {
    const sx = Math.sign(dx);
    return `M ${x0} ${y0} C ${x0 + sx * handle} ${y0}, ${x1 - sx * handle} ${y1}, ${x1} ${y1}`;
  }
  const sy = Math.sign(dy);
  return `M ${x0} ${y0} C ${x0} ${y0 + sy * handle}, ${x1} ${y1 - sy * handle}, ${x1} ${y1}`;
};

/**
 * Orthogonal connector with a quarter-circle corner when lanes differ.
 * Travels main-axis first, then cross-axis. Prefer `bezierLanePath` for
 * flowing corridor diagrams.
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
  // Keep a true quarter turn — leave a straight run into the bend.
  const r = Math.min(radius, absDx * 0.5, absDy * 0.5);
  if (r < 0.5) {
    return mainAxis === "x"
      ? `M ${x0} ${y0} L ${x1} ${y0} L ${x1} ${y1}`
      : `M ${x0} ${y0} L ${x0} ${y1} L ${x1} ${y1}`;
  }

  const sx = Math.sign(dx);
  const sy = Math.sign(dy);

  if (mainAxis === "x") {
    // Run along x to the bend, arc onto the target x, finish along y.
    const bendX = x1 - sx * r;
    const bendY = y0 + sy * r;
    // SVG sweep: 1 = clockwise. Right-then-down / left-then-up → clockwise.
    const sweep = sx * sy > 0 ? 1 : 0;
    return [
      `M ${x0} ${y0}`,
      `L ${bendX} ${y0}`,
      `A ${r} ${r} 0 0 ${sweep} ${x1} ${bendY}`,
      `L ${x1} ${y1}`,
    ].join(" ");
  }

  // Run along y to the bend, arc onto the target y, finish along x.
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
 * Local track tangent at a node — used so ticks stay ⊥ to the line.
 *
 * `bezierLanePath` ends are always tangent to the diagram main axis, so a
 * Mill Hill Bezier spur still leaves the terminus along the corridor, not
 * along the cross-axis chord. Scoring by total |dx|/|dy| wrongly flipped
 * that spur to a parallel dash.
 *
 * Rules:
 * - same-lane edge → main axis
 * - lane-change with main-axis span (Bezier) → main axis (end tangents)
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
      // Corridor run or Bezier lane-change — tangent at the node is main-axis.
      mainTangent += 1;
    } else if (crossDelta >= 0.5) {
      crossOnly += 1;
    }
  }

  if (mainTangent > 0) return mainAxis;
  if (crossOnly > 0) return crossAxis;
  return mainAxis;
};

/**
 * Place schematic nodes on a grid and build edge paths.
 * Horizontal: pos → x, lane → y. Vertical swaps axes.
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
      trackAxis: localTrackTangent(
        node.id,
        xyById,
        schematic.edges,
        orientation,
        laneById,
      ),
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
    // Always Bezier for lane changes — orthogonal "staircase" corners read as
    // broken joins at Camden / Mornington / Kennington.
    const path = sameLane
      ? `M ${a.x} ${a.y} L ${b.x} ${b.y}`
      : bezierLanePath(a.x, a.y, b.x, b.y, mainAxis, mainPitch);

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
