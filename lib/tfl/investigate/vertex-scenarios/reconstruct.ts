/**
 * Directed reconstruction: a path through track is permitted only when
 * every internal hop is an allowed directed turn.
 */

import type { DirectedMatrix, DirectedPath, PortId, VertexTree } from "./types"
import { hasMove, moveKey } from "./directed-matrix"

type Hop = { to: string; edgeId: string; kind: "track" | "bond" }

const adjacency = (tree: VertexTree): Map<string, Hop[]> => {
  const adj = new Map<string, Hop[]>()
  for (const node of tree.nodes) adj.set(node.id, [])
  for (const edge of tree.edges) {
    adj.get(edge.a)?.push({ to: edge.b, edgeId: edge.id, kind: edge.kind })
    adj.get(edge.b)?.push({ to: edge.a, edgeId: edge.id, kind: edge.kind })
  }
  return adj
}

const boundaryId = (tree: VertexTree, port: string): string | null =>
  tree.nodes.find((node) => node.kind === "boundary" && node.port === port)?.id ?? null

export const trackPath = (
  tree: VertexTree,
  fromPort: string,
  toPort: string
): { nodeIds: string[]; edgeIds: string[] } | null => {
  const start = boundaryId(tree, fromPort)
  const goal = boundaryId(tree, toPort)
  if (!start || !goal) return null
  const adj = adjacency(tree)
  const prev = new Map<string, { from: string; edgeId: string }>()
  const queue = [start]
  const seen = new Set([start])
  while (queue.length > 0) {
    const current = queue.shift()!
    if (current === goal) break
    for (const hop of adj.get(current) ?? []) {
      if (hop.kind !== "track") continue
      if (seen.has(hop.to)) continue
      seen.add(hop.to)
      prev.set(hop.to, { from: current, edgeId: hop.edgeId })
      queue.push(hop.to)
    }
  }
  if (!seen.has(goal)) return null
  const nodeIds = [goal]
  const edgeIds: string[] = []
  let cursor = goal
  while (cursor !== start) {
    const step = prev.get(cursor)
    if (!step) return null
    edgeIds.unshift(step.edgeId)
    nodeIds.unshift(step.from)
    cursor = step.from
  }
  return { nodeIds, edgeIds }
}

const turnForbidden = (tree: VertexTree, at: string, from: string, to: string): boolean =>
  tree.forbiddenTurns.some((turn) => turn.at === at && turn.from === from && turn.to === to)

export const reconstructDirected = (tree: VertexTree, ports: readonly PortId[]): DirectedPath[] => {
  const paths: DirectedPath[] = []
  for (const from of ports) {
    for (const to of ports) {
      if (from === to) continue
      const path = trackPath(tree, from, to)
      if (!path) {
        paths.push({ from, to, permitted: false, nodeIds: [], edgeIds: [] })
        continue
      }
      let permitted = true
      for (let index = 1; index < path.nodeIds.length - 1; index++) {
        const at = path.nodeIds[index]!
        const prev = path.nodeIds[index - 1]!
        const next = path.nodeIds[index + 1]!
        if (turnForbidden(tree, at, prev, next)) {
          permitted = false
          break
        }
      }
      paths.push({ from, to, permitted, nodeIds: path.nodeIds, edgeIds: path.edgeIds })
    }
  }
  return paths
}

export const directedExact = (
  matrix: DirectedMatrix,
  reconstructed: readonly DirectedPath[]
): { exact: boolean; missing: number; extra: number } => {
  let missing = 0
  let extra = 0
  for (const path of reconstructed) {
    const source = hasMove(matrix, path.from, path.to)
    if (source && !path.permitted) missing++
    if (!source && path.permitted) extra++
  }
  return { exact: missing === 0 && extra === 0, missing, extra }
}

const pathTurns = (path: { nodeIds: string[] }): { at: string; from: string; to: string }[] => {
  const turns: { at: string; from: string; to: string }[] = []
  for (let index = 1; index < path.nodeIds.length - 1; index++) {
    turns.push({
      at: path.nodeIds[index]!,
      from: path.nodeIds[index - 1]!,
      to: path.nodeIds[index + 1]!,
    })
  }
  return turns
}

const turnKey = (at: string, from: string, to: string) => `${at}:${from}>${to}`

/**
 * Forbid directed turns that appear only on extra movements. Required
 * reverse movements keep their own turns.
 */
export const inferDirectedForbiddenTurns = (
  tree: Omit<VertexTree, "forbiddenTurns">,
  matrix: DirectedMatrix
): VertexTree["forbiddenTurns"] => {
  const open: VertexTree = { ...tree, forbiddenTurns: [] }
  const reconstructed = reconstructDirected(open, matrix.ports)
  const extra = reconstructed.filter((path) => path.permitted && !hasMove(matrix, path.from, path.to))
  if (extra.length === 0) return []

  const requiredKeys = new Set<string>()
  for (const path of reconstructed) {
    if (!hasMove(matrix, path.from, path.to) || path.nodeIds.length === 0) continue
    for (const turn of pathTurns(path)) {
      requiredKeys.add(turnKey(turn.at, turn.from, turn.to))
    }
  }

  const forbidden: VertexTree["forbiddenTurns"] = []
  const seen = new Set<string>()
  for (const path of extra) {
    if (path.nodeIds.length === 0) continue
    for (const turn of pathTurns(path)) {
      const key = turnKey(turn.at, turn.from, turn.to)
      if (requiredKeys.has(key) || seen.has(key)) continue
      seen.add(key)
      forbidden.push(turn)
    }
  }
  return forbidden.sort((left, right) =>
    turnKey(left.at, left.from, left.to).localeCompare(turnKey(right.at, right.from, right.to))
  )
}

export const pathForMove = (
  reconstructed: readonly DirectedPath[],
  from: string,
  to: string
): DirectedPath | null => reconstructed.find((path) => path.from === from && path.to === to) ?? null

export { moveKey }
