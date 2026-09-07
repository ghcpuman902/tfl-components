import { enumerateBinarySkeletons } from "../candidates/trees"
import { hasMove, isDirectional, undirectedComponents } from "./directed-matrix"
import {
  directedExact,
  inferDirectedForbiddenTurns,
  reconstructDirected,
} from "./reconstruct"
import type { DirectedMatrix, PortId, VertexTree } from "./types"

export type ComposedYs = {
  tree: VertexTree
  /** The common stem at each Y. The other two arms cannot through-run. */
  stems: Record<string, string>
  /** Each set is a minimum edge cover of the required station passages. */
  markerVariants: string[][]
}

function markerCovers(tree: VertexTree, matrix: DirectedMatrix): string[][] {
  const paths = reconstructDirected(tree, matrix.ports).filter(
    (path) => path.permitted
  )
  const covers: string[][] = []
  let minimum = Infinity
  for (let mask = 1; mask < 1 << tree.edges.length; mask++) {
    const edges = tree.edges
      .filter((_, i) => mask & (1 << i))
      .map((edge) => edge.id)
    if (
      edges.length > minimum ||
      !paths.every((path) => edges.some((id) => path.edgeIds.includes(id)))
    )
      continue
    if (edges.length < minimum) {
      covers.length = 0
      minimum = edges.length
    }
    covers.push(edges)
  }
  // Prefer markers beside boundaries when several minimum covers exist.
  // Those can align on parallel exit tracks instead of bridging across Ys.
  const internal = new Set(
    tree.nodes.filter((node) => node.kind !== "boundary").map((node) => node.id)
  )
  const cost = (cover: string[]) =>
    cover.filter((id) => {
      const edge = tree.edges.find((e) => e.id === id)!
      return internal.has(edge.a) && internal.has(edge.b)
    }).length
  return covers.sort(
    (a, b) => cost(a) - cost(b) || a.join().localeCompare(b.join())
  )
}

/** Join binary Ys, then decode their turns. Unlike a rectangle cover, each
 * boundary arm occurs exactly once. Directional and disconnected cases stay
 * with the passage construction until their composition rules are added.
 */
export function composeYs(matrix: DirectedMatrix): ComposedYs[] {
  if (
    matrix.ports.length < 3 ||
    matrix.ports.length > 6 ||
    isDirectional(matrix) ||
    undirectedComponents(matrix).length !== 1
  )
    return []
  const results: ComposedYs[] = []
  for (const skeleton of enumerateBinarySkeletons(matrix.ports)) {
    const open: VertexTree = {
      nodes: skeleton.nodes.map((node) => ({
        id: node.id,
        kind: node.kind === "leaf" ? "boundary" : "anonymous",
        ...(node.leafId ? { port: node.leafId as PortId } : {}),
      })),
      edges: skeleton.edges.map(([a, b], i) => ({
        id: `track-${i}`,
        a,
        b,
        kind: "track",
      })),
      forbiddenTurns: [],
      stubSide: 0,
    }
    const tree = {
      ...open,
      forbiddenTurns: inferDirectedForbiddenTurns(open, matrix),
    }
    const stems: Record<string, string> = {}
    for (const node of tree.nodes.filter((node) => node.kind !== "boundary")) {
      const neighbours = tree.edges
        .filter((edge) => edge.a === node.id || edge.b === node.id)
        .map((edge) => (edge.a === node.id ? edge.b : edge.a))
      const pairs = neighbours.flatMap((from, i) =>
        neighbours
          .slice(i + 1)
          .filter(
            (to) =>
              !tree.forbiddenTurns.some(
                (turn) =>
                  turn.at === node.id && turn.from === from && turn.to === to
              )
          )
          .map((to) => [from, to])
      )
      if (pairs.length !== 2) break
      const stem = neighbours.find((id) =>
        pairs.every((pair) => pair.includes(id))
      )
      if (stem) stems[node.id] = stem
    }
    if (
      Object.keys(stems).length !==
      skeleton.nodes.filter((node) => node.kind === "internal").length
    )
      continue
    if (!directedExact(matrix, reconstructDirected(tree, matrix.ports)).exact)
      continue
    results.push({ tree, stems, markerVariants: markerCovers(tree, matrix) })
  }
  return results.sort(
    (a, b) => a.markerVariants[0]!.length - b.markerVariants[0]!.length
  )
}

export function checkComposed(matrix: DirectedMatrix, composition: ComposedYs) {
  const paths = reconstructDirected(composition.tree, matrix.ports)
  const decoded = paths
    .filter((path) => path.permitted)
    .map(({ from, to }) => ({ from, to }))
  return {
    decoded,
    missing: paths.filter(
      (path) => hasMove(matrix, path.from, path.to) && !path.permitted
    ),
    extra: paths.filter(
      (path) => !hasMove(matrix, path.from, path.to) && path.permitted
    ),
  }
}
