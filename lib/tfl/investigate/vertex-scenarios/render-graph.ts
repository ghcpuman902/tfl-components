/**
 * Adapter: turn a `composeYs` candidate (an abstract tree of Ys) into the
 * same `DrawingScene` shape the degree ≤3 building blocks already render
 * with, so both logic sources share one layout + paint pipeline instead of
 * `composition.tsx`'s own (buggy) tree layout.
 *
 * The tree itself never needs a "stem vs branch" distinction here — that
 * distinction only matters to `compose.ts` when it checks a candidate
 * against the target matrix. Once a candidate is accepted, every internal
 * fork has exactly one neighbour closer to the chosen root (its parent in
 * a root-first BFS) and exactly two neighbours further away (its
 * children) — `drawing-layout.ts`'s existing `solvePos`/`layoutTreeLanes`
 * already fan any node with two forward children into a normal Y, with no
 * direction reversal, as long as `hints.sequence` reflects that BFS order.
 */

import type { ComposedYs } from "./compose"
import type {
  DrawingEdge,
  DrawingHints,
  DrawingNode,
  DrawingScene,
} from "./drawing-graph"
import type { PortId, VertexTree } from "./types"

const boundaryNodeId = (tree: VertexTree, port: PortId): string | null =>
  tree.nodes.find((node) => node.kind === "boundary" && node.port === port)?.id ??
  null

/**
 * Split a marked track edge into `<a> - station - <b>`, inserting one new
 * `station` node. Mirrors how `drawing-graph.ts`'s hand-written scenes
 * (`ySplitScene`, `throughTerminusScene`, `dualTerminusScene`, …) insert
 * `S1`/`S2` by hand.
 */
const splitEdge = (
  edge: DrawingEdge,
  stationId: string
): { node: DrawingNode; edges: DrawingEdge[] } => ({
  node: { id: stationId, kind: "station" },
  edges: [
    { id: `${edge.id}:a`, a: edge.a, b: stationId, kind: "track" },
    { id: `${edge.id}:b`, a: stationId, b: edge.b, kind: "track" },
  ],
})

/**
 * BFS order from `rootId`, so ancestors always precede descendants — the
 * piece `trackDelta`/`solvePos` need to place every node from a simple
 * signed-hop relaxation, with no direction reversal.
 */
const sequenceFrom = (
  nodes: readonly DrawingNode[],
  edges: readonly DrawingEdge[],
  rootId: string
): string[] => {
  const adj = new Map<string, string[]>()
  for (const node of nodes) adj.set(node.id, [])
  for (const edge of edges) {
    adj.get(edge.a)?.push(edge.b)
    adj.get(edge.b)?.push(edge.a)
  }
  const order: string[] = []
  const seen = new Set([rootId])
  const queue = [rootId]
  while (queue.length > 0) {
    const current = queue.shift()!
    order.push(current)
    for (const next of adj.get(current) ?? []) {
      if (seen.has(next)) continue
      seen.add(next)
      queue.push(next)
    }
  }
  // Any node the BFS didn't reach (shouldn't happen for a connected tree)
  // still needs a stable position at the back of the order.
  for (const node of nodes) {
    if (!seen.has(node.id)) order.push(node.id)
  }
  return order
}

export const composedTreeToScene = (
  composition: ComposedYs,
  root: PortId,
  markerIndex: number
): DrawingScene => {
  const { tree } = composition
  const markers = new Set(
    composition.markerVariants[markerIndex] ?? composition.markerVariants[0] ?? []
  )

  const nodes: DrawingNode[] = tree.nodes.map((node) =>
    node.kind === "boundary"
      ? { id: node.id, kind: "boundary", port: node.port }
      : { id: node.id, kind: "fork" }
  )
  let edges: DrawingEdge[] = tree.edges.map((edge) => ({
    id: edge.id,
    a: edge.a,
    b: edge.b,
    kind: "track",
  }))

  // Split every marked edge into `<a> - station - <b>`.
  const stationOf = new Map<string, string>() // marker edge id -> new station node id
  for (const edge of edges) {
    if (markers.has(edge.id)) stationOf.set(edge.id, `station:${edge.id}`)
  }
  if (stationOf.size > 0) {
    const next: DrawingEdge[] = []
    for (const edge of edges) {
      const stationId = stationOf.get(edge.id)
      if (!stationId) {
        next.push(edge)
        continue
      }
      const split = splitEdge(edge, stationId)
      nodes.push(split.node)
      next.push(...split.edges)
    }
    edges = next
  }

  // Bond stations that sit on sibling edges of the same fork — the "split
  // S" shape `ySplitScene`/`dualTerminusScene` already encode by hand.
  // Chain-bond in marker-edge-id order, per shared fork.
  const stationsAtFork = new Map<string, string[]>()
  const forkIds = new Set(
    nodes.filter((node) => node.kind === "fork").map((node) => node.id)
  )
  for (const [markerEdgeId, stationId] of [...stationOf.entries()].sort(
    (a, b) => a[0].localeCompare(b[0])
  )) {
    const original = tree.edges.find((edge) => edge.id === markerEdgeId)!
    for (const forkId of [original.a, original.b]) {
      if (!forkIds.has(forkId)) continue
      const list = stationsAtFork.get(forkId) ?? []
      list.push(stationId)
      stationsAtFork.set(forkId, list)
    }
  }
  for (const stations of stationsAtFork.values()) {
    for (let i = 1; i < stations.length; i++) {
      edges.push({
        id: `bond:${stations[i - 1]}-${stations[i]}`,
        a: stations[i - 1]!,
        b: stations[i]!,
        kind: "bond",
      })
    }
  }

  const rootId =
    boundaryNodeId(tree, root) ?? nodes.find((node) => node.kind === "boundary")!.id
  const sequence = sequenceFrom(nodes, edges, rootId)
  const terminusAlong: DrawingHints["terminusAlong"] = {}
  for (const node of nodes) {
    if (node.kind !== "boundary" || !node.port) continue
    terminusAlong[node.port] = node.port === root ? "start" : "end"
  }

  return {
    title: `Joined Ys, from ${root}`,
    nodes,
    edges,
    hints: { sequence, terminusAlong },
    forbiddenTurns: tree.forbiddenTurns,
  }
}
