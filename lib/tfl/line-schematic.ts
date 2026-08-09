/**
 * Lane/position schematic model for branched tube diagrams.
 * Inspired by Wikipedia BS-route maps: every stop sits on a grid of
 * main-axis ordinal (`pos`) × cross-axis track (`lane`).
 *
 * Layout is orientation-specific: do not assume rotating a horizontal
 * schematic yields a correct vertical TfL diagram. `lane` is a visual
 * branch instruction, not inferred topology.
 */

export type SchematicNodeKind = "stop" | "interchange" | "terminus";

export type SchematicOrientationHint = "horizontal" | "vertical";

export type SchematicNode = {
  /**
   * Unique render id within one schematic (e.g. `euston-bank`, `euston-cx`).
   * Edges reference these ids.
   */
  id: string;
  /**
   * Shared station identity across duplicate render nodes (e.g. both Eustons
   * use `stationKey: "euston"`). Defaults to `id` when omitted.
   */
  stationKey?: string;
  /** Raw name — StationName canonicalises copy / find. */
  name: string;
  /** Cross-axis visual lane / branch instruction. */
  lane: number;
  /** Main-axis grid column (horizontal) / row (vertical). */
  pos: number;
  kind?: SchematicNodeKind;
  branchIds?: readonly string[];
};

export type SchematicEdge = {
  from: string;
  to: string;
  branchId?: string;
  state?: "normal" | "out-of-use";
};

export type SchematicBranchMeta = {
  id: string;
  name: string;
};

export type LineSchematic = {
  lineId: string;
  lineName: string;
  /** Which presentation this lane/pos map is authored for. */
  orientation: SchematicOrientationHint;
  branches: readonly SchematicBranchMeta[];
  nodes: readonly SchematicNode[];
  edges: readonly SchematicEdge[];
};

export type SchematicBounds = {
  minLane: number;
  maxLane: number;
  minPos: number;
  maxPos: number;
};

export const schematicStationKey = (node: SchematicNode): string =>
  node.stationKey ?? node.id;

export const schematicNodeMap = (
  schematic: LineSchematic,
): ReadonlyMap<string, SchematicNode> =>
  new Map(schematic.nodes.map((node) => [node.id, node]));

export const schematicBounds = (schematic: LineSchematic): SchematicBounds => {
  if (schematic.nodes.length === 0) {
    return { minLane: 0, maxLane: 0, minPos: 0, maxPos: 0 };
  }
  let minLane = Infinity;
  let maxLane = -Infinity;
  let minPos = Infinity;
  let maxPos = -Infinity;
  for (const node of schematic.nodes) {
    if (node.lane < minLane) minLane = node.lane;
    if (node.lane > maxLane) maxLane = node.lane;
    if (node.pos < minPos) minPos = node.pos;
    if (node.pos > maxPos) maxPos = node.pos;
  }
  return { minLane, maxLane, minPos, maxPos };
};

export type SchematicValidationIssue = {
  code:
    | "duplicate-id"
    | "duplicate-lane-pos"
    | "missing-edge-endpoint"
    | "self-edge";
  message: string;
};

/**
 * Structural checks for hand-authored schematics.
 * Throws in development when issues are found (call from fixtures).
 * Multiple nodes may share `stationKey`; `id` and `lane+pos` must be unique.
 */
export const validateSchematic = (
  schematic: LineSchematic,
): SchematicValidationIssue[] => {
  const issues: SchematicValidationIssue[] = [];
  const byId = new Map<string, SchematicNode>();
  const lanePos = new Map<string, string>();

  for (const node of schematic.nodes) {
    if (byId.has(node.id)) {
      issues.push({
        code: "duplicate-id",
        message: `Duplicate node id "${node.id}"`,
      });
      continue;
    }
    byId.set(node.id, node);

    const key = `${node.lane}:${node.pos}`;
    const existing = lanePos.get(key);
    if (existing) {
      issues.push({
        code: "duplicate-lane-pos",
        message: `Nodes "${existing}" and "${node.id}" share lane ${node.lane} pos ${node.pos}`,
      });
    } else {
      lanePos.set(key, node.id);
    }
  }

  for (const edge of schematic.edges) {
    if (edge.from === edge.to) {
      issues.push({
        code: "self-edge",
        message: `Self-edge on "${edge.from}"`,
      });
    }
    if (!byId.has(edge.from)) {
      issues.push({
        code: "missing-edge-endpoint",
        message: `Edge from unknown node "${edge.from}"`,
      });
    }
    if (!byId.has(edge.to)) {
      issues.push({
        code: "missing-edge-endpoint",
        message: `Edge to unknown node "${edge.to}"`,
      });
    }
  }

  return issues;
};

export const assertValidSchematic = (schematic: LineSchematic): void => {
  const issues = validateSchematic(schematic);
  if (issues.length === 0) return;
  const detail = issues.map((i) => `- ${i.message}`).join("\n");
  throw new Error(
    `Invalid LineSchematic "${schematic.lineId}" (${schematic.orientation}):\n${detail}`,
  );
};
