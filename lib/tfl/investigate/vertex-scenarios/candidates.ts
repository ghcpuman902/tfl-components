/**
 * Degree-≤3 forms for a directed matrix.
 *
 * One passenger station keeps every incident arm. Isolated terminus
 * arms stay on that station; extra through-moves are forbidden turns.
 * Degree 4+ may add anonymous Ys. No passenger-bond decluster.
 */

import { enumerateBinarySkeletons, leafNodeIdFor, type Skeleton } from "../candidates/trees"
import type { DirectedMatrix } from "./types"
import { directedExact, inferDirectedForbiddenTurns, reconstructDirected } from "./reconstruct"
import type { PortId, VertexCandidate, VertexEdge, VertexNode, VertexTree } from "./types"

const SEARCH_LEAF_BOUND = 6

const edgeId = (a: string, b: string) => (a < b ? `e:${a}-${b}` : `e:${b}-${a}`)

const pathOfLeaves = (leafIds: readonly PortId[], stubSide: -1 | 1 | 0): Omit<VertexTree, "forbiddenTurns"> => {
  const stationId = "S"
  const nodes: VertexNode[] = [{ id: stationId, kind: "station" }]
  const edges: VertexEdge[] = []
  for (const port of leafIds) {
    const id = leafNodeIdFor(port)
    nodes.push({ id, kind: "boundary", port })
    edges.push({ id: edgeId(stationId, id), a: stationId, b: id, kind: "track" })
  }
  return { nodes, edges, stubSide }
}

const skeletonToOpen = (
  skeleton: Skeleton,
  stationIds: ReadonlySet<string>,
  stubSide: -1 | 1 | 0
): Omit<VertexTree, "forbiddenTurns"> => {
  const nodes: VertexNode[] = skeleton.nodes.map((node) => {
    if (node.kind === "leaf" && node.leafId) {
      return { id: node.id, kind: "boundary" as const, port: node.leafId as PortId }
    }
    if (stationIds.has(node.id)) return { id: node.id, kind: "station" as const }
    return { id: node.id, kind: "anonymous" as const }
  })
  const edges: VertexEdge[] = skeleton.edges.map(([a, b]) => ({
    id: edgeId(a, b),
    a,
    b,
    kind: "track",
  }))
  return { nodes, edges, stubSide }
}

const finish = (open: Omit<VertexTree, "forbiddenTurns">, matrix: DirectedMatrix): VertexTree => ({
  ...open,
  forbiddenTurns: inferDirectedForbiddenTurns(open, matrix),
})

export const starTree = (matrix: DirectedMatrix): VertexTree =>
  finish(pathOfLeaves(matrix.ports, 0), matrix)

const connectedPlacements = (leafIds: readonly PortId[], matrix: DirectedMatrix): VertexTree[] => {
  if (leafIds.length <= 3) return [finish(pathOfLeaves(leafIds, 0), matrix)]

  const trees: VertexTree[] = []
  for (const skeleton of enumerateBinarySkeletons(leafIds)) {
    const internals = skeleton.nodes.filter((node) => node.kind === "internal").map((node) => node.id)
    for (const stationAt of internals) {
      trees.push(finish(skeletonToOpen(skeleton, new Set([stationAt]), 0), matrix))
    }
  }
  return trees
}

const portIndex = (ports: readonly PortId[], port: PortId) => ports.indexOf(port)

/**
 * Clockwise cyclic order of neighbours around each internal, using fixed
 * port angles. Does not sort children — a flip changes the key.
 */
export const planarKey = (tree: VertexTree, ports: readonly PortId[]): string => {
  const angleOf = new Map<string, number>()
  const n = Math.max(1, ports.length)
  for (const node of tree.nodes) {
    if (node.kind === "boundary" && node.port) {
      const index = portIndex(ports, node.port)
      angleOf.set(node.id, (index / n) * Math.PI * 2 - Math.PI / 2)
    }
  }
  const adj = new Map<string, string[]>()
  for (const node of tree.nodes) adj.set(node.id, [])
  for (const edge of tree.edges) {
    adj.get(edge.a)?.push(edge.b)
    adj.get(edge.b)?.push(edge.a)
  }
  const internals = tree.nodes.filter((node) => node.kind !== "boundary")
  const pos = new Map<string, { x: number; y: number }>()
  for (const node of tree.nodes) {
    if (node.kind === "boundary") {
      const angle = angleOf.get(node.id) ?? 0
      pos.set(node.id, { x: Math.cos(angle), y: Math.sin(angle) })
    } else {
      pos.set(node.id, { x: 0, y: 0 })
    }
  }
  for (let step = 0; step < 24; step++) {
    for (const node of internals) {
      const neighbours = adj.get(node.id) ?? []
      if (neighbours.length === 0) continue
      let x = 0
      let y = 0
      for (const neighbour of neighbours) {
        const point = pos.get(neighbour) ?? { x: 0, y: 0 }
        x += point.x
        y += point.y
      }
      pos.set(node.id, { x: x / neighbours.length, y: y / neighbours.length })
    }
  }
  if (tree.stubSide !== 0) {
    const stub = internals.find((node) => {
      const neighbours = adj.get(node.id) ?? []
      return neighbours.filter((id) => tree.nodes.find((item) => item.id === id)?.kind === "boundary").length === 1
    })
    if (stub) {
      const point = pos.get(stub.id) ?? { x: 0, y: 0 }
      pos.set(stub.id, { x: point.x + tree.stubSide * 0.35, y: point.y + tree.stubSide * 0.2 })
    }
  }

  const around = internals
    .map((node) => {
      const origin = pos.get(node.id) ?? { x: 0, y: 0 }
      const neighbours = [...(adj.get(node.id) ?? [])].sort((left, right) => {
        const a = pos.get(left) ?? origin
        const b = pos.get(right) ?? origin
        const aa = Math.atan2(a.y - origin.y, a.x - origin.x)
        const bb = Math.atan2(b.y - origin.y, b.x - origin.x)
        return aa - bb
      })
      const labels = neighbours.map((id) => {
        const item = tree.nodes.find((candidate) => candidate.id === id)
        if (item?.kind === "boundary") return `P:${item.port}`
        if (item?.kind === "station") return "S"
        return "Y"
      })
      return `${node.kind}(${labels.join(",")})`
    })
    .sort()
    .join("|")
  const turns = tree.forbiddenTurns
    .map((turn) => `${turn.at}:${turn.from}>${turn.to}`)
    .sort()
    .join(";")
  return `${around}#${turns}`
}

export const planarNote = (tree: VertexTree, matrix?: DirectedMatrix): string => {
  const stations = tree.nodes.filter((node) => node.kind === "station").length
  const anonymous = tree.nodes.filter((node) => node.kind === "anonymous").length
  const arms = tree.nodes.filter((node) => node.kind === "boundary").length
  const isolated = matrix
    ? matrix.ports.filter((port) => !matrix.moves.some((move) => move.from === port || move.to === port))
    : []
  if (anonymous === 0 && stations === 1) {
    if (arms <= 2 && (matrix?.moves.length ?? 0) === 0) return "building block"
    if (isolated.length > 0) return "through + terminus"
    if (arms === 3) return "simple Y"
    return "building block"
  }
  if (anonymous === 0) return "station at the junction"
  return `${anonymous} anonymous Y junction${anonymous === 1 ? "" : "s"}`
}

export const enumerateVertexTrees = (matrix: DirectedMatrix): VertexTree[] => {
  if (matrix.ports.length > SEARCH_LEAF_BOUND) return []
  return connectedPlacements(matrix.ports, matrix)
}

export const buildVertexCandidates = (scenarioId: string, matrix: DirectedMatrix): VertexCandidate[] => {
  const unique = new Map<string, VertexTree>()
  for (const tree of enumerateVertexTrees(matrix)) {
    const reconstructed = reconstructDirected(tree, matrix.ports)
    if (!directedExact(matrix, reconstructed).exact) continue
    unique.set(planarKey(tree, matrix.ports), tree)
  }
  const records = [...unique.entries()]
    .map(([key, tree]) => {
      const reconstructed = reconstructDirected(tree, matrix.ports)
      return {
        key,
        tree,
        reconstructed,
        passengerVertices: tree.nodes.filter((node) => node.kind === "station").length,
        anonymousJunctions: tree.nodes.filter((node) => node.kind === "anonymous").length,
      }
    })
    .sort((left, right) => {
      if (left.anonymousJunctions !== right.anonymousJunctions) {
        return left.anonymousJunctions - right.anonymousJunctions
      }
      if (left.passengerVertices !== right.passengerVertices) {
        return left.passengerVertices - right.passengerVertices
      }
      return left.key.localeCompare(right.key)
    })

  return records.map((record, index) => ({
    id: `${scenarioId}-c${index + 1}`,
    scenarioId,
    index: index + 1,
    total: records.length,
    planarKey: record.key,
    planarNote: planarNote(record.tree, matrix),
    tree: record.tree,
    passengerVertices: record.passengerVertices,
    anonymousJunctions: record.anonymousJunctions,
    exact: true,
    reconstructed: record.reconstructed,
  }))
}
