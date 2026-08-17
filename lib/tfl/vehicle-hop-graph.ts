import { STATION_HUBS } from "tfl-ts";
import {
  buildLineTopologyFromStaticBranches,
  type LineTopology,
} from "@/lib/tfl/line-topology";

export type HopNeighbor = {
  stationId: string;
  branchId: string;
};

export type HopGraph = {
  /** Canonical station id → adjacent canonical ids. Undirected. */
  adjacent: ReadonlyMap<string, ReadonlySet<string>>;
  incoming: ReadonlyMap<string, readonly HopNeighbor[]>;
  canonical: (id: string) => string;
  branched: boolean;
};

const EMPTY_GRAPH: HopGraph = {
  adjacent: new Map(),
  incoming: new Map(),
  canonical: (id) => id,
  branched: false,
};

const buildAliasCanonical = (
  groups: readonly (readonly string[])[],
): Map<string, string> => {
  const map = new Map<string, string>();
  for (const group of groups) {
    const ids = [...new Set(group.map((id) => id.trim()).filter(Boolean))];
    if (ids.length === 0) continue;
    const root = ids[0]!;
    for (const id of ids) map.set(id, root);
  }
  return map;
};

/** Naptan / hub / line-member ids that refer to the same station. */
export const stationHubAliasGroups = (): string[][] => {
  const groups: string[][] = [];
  for (const [id, hub] of Object.entries(STATION_HUBS)) {
    const ids = [
      id,
      hub.hubId,
      ...hub.members.map((member) => member.id),
      ...Object.values(hub.lineMemberIds),
    ].filter((value): value is string => Boolean(value));
    if (ids.length > 1) groups.push(ids);
  }
  return groups;
};

const graphFromEdges = (
  edges: readonly { fromStationId: string; toStationId: string; branchId: string }[],
  aliasGroups: readonly (readonly string[])[] = [],
): HopGraph => {
  const aliases = buildAliasCanonical(aliasGroups);
  const canonical = (id: string): string => aliases.get(id) ?? id;

  const adjacent = new Map<string, Set<string>>();
  const incoming = new Map<string, HopNeighbor[]>();
  const addAdj = (a: string, b: string) => {
    const set = adjacent.get(a) ?? new Set<string>();
    set.add(b);
    adjacent.set(a, set);
  };

  for (const edge of edges) {
    const from = canonical(edge.fromStationId);
    const to = canonical(edge.toStationId);
    if (!from || !to || from === to) continue;
    addAdj(from, to);
    addAdj(to, from);
    const list = incoming.get(to) ?? [];
    list.push({ stationId: from, branchId: edge.branchId });
    incoming.set(to, list);
  }

  let branched = false;
  for (const neighbors of adjacent.values()) {
    if (neighbors.size > 2) {
      branched = true;
      break;
    }
  }

  return {
    adjacent,
    incoming,
    canonical,
    branched,
  };
};

export const hopGraphFromTopology = (
  topology: LineTopology | null,
  aliasGroups: readonly (readonly string[])[] = [],
): HopGraph => {
  if (!topology || topology.edges.length === 0) return EMPTY_GRAPH;
  return graphFromEdges(topology.edges, aliasGroups);
};

export const hopGraphFromOrderedStops = (
  stationIds: readonly string[],
  aliasGroups: readonly (readonly string[])[] = [],
): HopGraph => {
  const edges = [];
  for (let i = 0; i < stationIds.length - 1; i++) {
    const from = stationIds[i];
    const to = stationIds[i + 1];
    if (!from || !to) continue;
    edges.push({ fromStationId: from, toStationId: to, branchId: "spine" });
  }
  return graphFromEdges(edges, aliasGroups);
};

/** Rail hop graph from static `LINE_STATION_SEQUENCES`, with hub aliases. */
export const hopGraphForRailLine = (lineId: string): HopGraph =>
  hopGraphFromTopology(
    buildLineTopologyFromStaticBranches(lineId),
    stationHubAliasGroups(),
  );

export const areAdjacent = (
  graph: HopGraph,
  fromId: string,
  toId: string,
): boolean => {
  const from = graph.canonical(fromId);
  const to = graph.canonical(toId);
  if (from === to) return true;
  return graph.adjacent.get(from)?.has(to) ?? false;
};

export const uniqueIncoming = (
  graph: HopGraph,
  toId: string,
): HopNeighbor | undefined => {
  const incoming = graph.incoming.get(graph.canonical(toId)) ?? [];
  if (incoming.length === 1) return incoming[0];
  return undefined;
};

export const hopGraphHasEdges = (graph: HopGraph): boolean =>
  graph.adjacent.size > 0;
