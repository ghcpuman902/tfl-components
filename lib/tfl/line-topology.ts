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
};

const slugifyBranch = (name: string, index: number): string => {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return base || `branch-${index + 1}`;
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
