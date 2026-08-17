import { LINE_STATION_SEQUENCES } from "tfl-ts";
import { formatStationName } from "@/lib/tfl/diagram-station";
import type { OrderedRouteLike } from "@/lib/tfl/week-ahead-status";
import { selectLongestOrderedRoute } from "@/lib/tfl/week-ahead-status";

export type LineNode = {
  stationId: string;
};

export type LineEdge = {
  fromStationId: string;
  toStationId: string;
  branchId: string;
  state?: "normal" | "out-of-use";
};

export type LineBranchMeta = {
  id: string;
  name: string;
};

export type LineTopology = {
  lineId: string;
  nodes: LineNode[];
  edges: LineEdge[];
  /** Preferred spine for compact 1-row views (week-ahead). */
  primaryBranchId: string;
  branches: LineBranchMeta[];
  /** Display names keyed by Naptan id (static builder fills this). */
  stationNames?: Readonly<Record<string, string>>;
  /** Segment ids that participate in a cycle via `nextBranchIds`. */
  loopBranchIds?: readonly string[];
  /**
   * Longest inbound Regular ordered route (full end-to-end).
   * Layout uses this as the trunk when present.
   */
  trunkStationIds?: readonly string[];
};

export type StaticBranchSegment = {
  id: string;
  numericId: number;
  stationIds: readonly string[];
  nextIds: readonly string[];
  previousIds: readonly string[];
};

type StaticSequenceBranch = {
  id: number;
  direction: string;
  serviceType: string;
  nextBranchIds: readonly number[];
  previousBranchIds: readonly number[];
  stationIds: readonly string[];
};

type StaticSequenceRoute = {
  name: string;
  direction: string;
  serviceType: string;
  stationIds: readonly string[];
};

type StaticSequence = {
  lineId: string;
  lineName: string;
  stations: readonly { id: string; name: string }[];
  branches: readonly StaticSequenceBranch[];
  orderedRoutes: readonly StaticSequenceRoute[];
};

export const staticSegmentId = (numericId: number): string =>
  `segment-${numericId}`;

export const getStaticLineSequence = (
  lineId: string,
): StaticSequence | null => {
  const sequence = (
    LINE_STATION_SEQUENCES as Record<string, StaticSequence | undefined>
  )[lineId];
  return sequence ?? null;
};

const inboundRegularBranches = (
  sequence: StaticSequence,
): StaticSequenceBranch[] =>
  sequence.branches.filter(
    (branch) =>
      branch.direction === "inbound" &&
      branch.serviceType === "Regular" &&
      branch.stationIds.length >= 2,
  );

const inboundRegularRoutes = (
  sequence: StaticSequence,
): StaticSequenceRoute[] =>
  sequence.orderedRoutes.filter(
    (route) =>
      route.direction === "inbound" &&
      route.serviceType === "Regular" &&
      route.stationIds.length >= 2,
  );

const detectLoopSegmentIds = (
  segments: readonly StaticSequenceBranch[],
): string[] => {
  const byId = new Map(segments.map((segment) => [segment.id, segment]));
  const loops = new Set<string>();

  for (const start of segments) {
    const seen = new Set<number>();
    const stack = [...start.nextBranchIds];
    while (stack.length > 0) {
      const nextId = stack.pop()!;
      if (nextId === start.id) {
        loops.add(staticSegmentId(start.id));
        break;
      }
      if (seen.has(nextId)) continue;
      seen.add(nextId);
      const next = byId.get(nextId);
      if (!next) continue;
      stack.push(...next.nextBranchIds);
    }
  }

  return [...loops];
};

/**
 * Lines whose inbound Regular sequence has more than one branch segment.
 * Simple corridors (Victoria, Bakerloo, …) are excluded.
 */
export const listBranchedLineIds = (): string[] => {
  const ids: string[] = [];
  for (const sequence of Object.values(LINE_STATION_SEQUENCES) as StaticSequence[]) {
    if (inboundRegularBranches(sequence).length > 1) {
      ids.push(sequence.lineId);
    }
  }
  return ids.sort((a, b) => a.localeCompare(b));
};

export const staticBranchSegments = (
  lineId: string,
): StaticBranchSegment[] => {
  const sequence = getStaticLineSequence(lineId);
  if (!sequence) return [];
  return inboundRegularBranches(sequence).map((branch) => ({
    id: staticSegmentId(branch.id),
    numericId: branch.id,
    stationIds: branch.stationIds,
    nextIds: branch.nextBranchIds.map(staticSegmentId),
    previousIds: branch.previousBranchIds.map(staticSegmentId),
  }));
};

const slugifyBranch = (name: string, index: number): string => {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return base || `branch-${index + 1}`;
};

const stationNameMap = (
  sequence: StaticSequence,
): Record<string, string> => {
  const names: Record<string, string> = {};
  for (const stop of sequence.stations) {
    names[stop.id] = formatStationName(stop.name);
  }
  return names;
};

/**
 * Build a branched topology from tfl-ts `LINE_STATION_SEQUENCES` branch
 * segments (`nextBranchIds` / `previousBranchIds`). Inbound Regular only.
 */
export const buildLineTopologyFromStaticBranches = (
  lineId: string,
): LineTopology | null => {
  const sequence = getStaticLineSequence(lineId);
  if (!sequence) return null;

  const segments = inboundRegularBranches(sequence);
  if (segments.length === 0) return null;

  const names = stationNameMap(sequence);
  const nodeIds = new Set<string>();
  const edgeKeys = new Set<string>();
  const edges: LineEdge[] = [];
  const branches: LineBranchMeta[] = [];

  for (const segment of segments) {
    const branchId = staticSegmentId(segment.id);
    const first = names[segment.stationIds[0]!] ?? segment.stationIds[0]!;
    const last =
      names[segment.stationIds[segment.stationIds.length - 1]!] ??
      segment.stationIds[segment.stationIds.length - 1]!;
    branches.push({
      id: branchId,
      name: first === last ? first : `${first} → ${last}`,
    });

    for (const id of segment.stationIds) nodeIds.add(id);
    for (let i = 0; i < segment.stationIds.length - 1; i += 1) {
      const from = segment.stationIds[i]!;
      const to = segment.stationIds[i + 1]!;
      const key = `${branchId}:${from}→${to}`;
      if (edgeKeys.has(key)) continue;
      edgeKeys.add(key);
      edges.push({ fromStationId: from, toStationId: to, branchId });
    }
  }

  const routes = inboundRegularRoutes(sequence);
  const longest = selectLongestOrderedRoute(
    routes.map((route) => ({
      name: route.name,
      naptanIds: [...route.stationIds],
      serviceType: route.serviceType,
    })),
  );
  const trunkStationIds = longest?.naptanIds ?? segments[0]!.stationIds;
  const primary = [...segments].sort(
    (a, b) => b.stationIds.length - a.stationIds.length,
  )[0]!;

  return {
    lineId: sequence.lineId,
    nodes: [...nodeIds].map((stationId) => ({ stationId })),
    edges,
    primaryBranchId: staticSegmentId(primary.id),
    branches,
    stationNames: names,
    loopBranchIds: detectLoopSegmentIds(segments),
    trunkStationIds: [...trunkStationIds],
  };
};

/**
 * Build a branched topology from TfL orderedLineRoutes.
 * Each route becomes a branch; shared consecutive pairs share geometry.
 */
export const buildLineTopologyFromOrderedRoutes = (
  lineId: string,
  routes: OrderedRouteLike[] | null | undefined,
): LineTopology | null => {
  if (!routes?.length) return null;

  const usable = routes.filter((r) => (r.naptanIds?.length ?? 0) >= 2);
  if (usable.length === 0) return null;

  const primary = selectLongestOrderedRoute(usable);
  const nodeIds = new Set<string>();
  const edgeKeys = new Set<string>();
  const edges: LineEdge[] = [];
  const branches: LineBranchMeta[] = [];

  usable.forEach((route, index) => {
    const ids = route.naptanIds ?? [];
    const branchId = slugifyBranch(route.name ?? `route-${index + 1}`, index);
    branches.push({
      id: branchId,
      name: route.name?.trim() || `Branch ${index + 1}`,
    });

    for (const id of ids) nodeIds.add(id);
    for (let i = 0; i < ids.length - 1; i += 1) {
      const from = ids[i]!;
      const to = ids[i + 1]!;
      const key = `${branchId}:${from}→${to}`;
      if (edgeKeys.has(key)) continue;
      edgeKeys.add(key);
      edges.push({ fromStationId: from, toStationId: to, branchId });
    }
  });

  const primaryIndex = primary ? usable.indexOf(primary) : 0;
  const primaryBranchId =
    primaryIndex >= 0
      ? slugifyBranch(
          usable[primaryIndex]?.name ?? `route-${primaryIndex + 1}`,
          primaryIndex,
        )
      : branches[0]!.id;

  return {
    lineId,
    nodes: [...nodeIds].map((stationId) => ({ stationId })),
    edges,
    primaryBranchId,
    branches,
  };
};

/** Ordered station ids for one branch (walk edges of that branchId). */
export const branchStationIds = (
  topology: LineTopology,
  branchId: string,
): string[] => {
  const branchEdges = topology.edges.filter((e) => e.branchId === branchId);
  if (branchEdges.length === 0) return [];

  const outgoing = new Map<string, string>();
  const inbound = new Set<string>();
  for (const edge of branchEdges) {
    outgoing.set(edge.fromStationId, edge.toStationId);
    inbound.add(edge.toStationId);
  }

  let start =
    branchEdges.find((e) => !inbound.has(e.fromStationId))?.fromStationId ??
    branchEdges[0]!.fromStationId;

  const ordered: string[] = [start];
  const seen = new Set([start]);
  while (outgoing.has(start)) {
    const next = outgoing.get(start)!;
    if (seen.has(next)) break;
    ordered.push(next);
    seen.add(next);
    start = next;
  }
  return ordered;
};

/** All station ids present in the topology (all branches). */
export const topologyStationIds = (topology: LineTopology): string[] =>
  topology.nodes.map((n) => n.stationId);

/**
 * Compact week-ahead spine: primary branch order, falling back to longest.
 */
export const primarySpineIds = (topology: LineTopology): string[] => {
  const primary = branchStationIds(topology, topology.primaryBranchId);
  if (primary.length >= 2) return primary;

  let best: string[] = [];
  for (const branch of topology.branches) {
    const ids = branchStationIds(topology, branch.id);
    if (ids.length > best.length) best = ids;
  }
  return best;
};
