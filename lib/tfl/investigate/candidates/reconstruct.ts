/**
 * Trace permitted boundary-to-boundary movements through a candidate tree
 * and compare them with the source movement matrix.
 */

import type { MovementPair } from "../types"
import type {
  CandidateEdge,
  CandidateTree,
  CellVerdict,
  ComparedCell,
  ForbiddenTurn,
  MatrixComparison,
  ReconstructedPair,
} from "./types"

const pairKey = (a: string, b: string) => (a < b ? `${a}|${b}` : `${b}|${a}`)

const turnKey = (at: string, neighborA: string, neighborB: string) =>
  `${at}:${pairKey(neighborA, neighborB)}`

export const sameTurn = (left: ForbiddenTurn, right: ForbiddenTurn): boolean =>
  left.at === right.at && pairKey(left.neighborA, left.neighborB) === pairKey(right.neighborA, right.neighborB)

type Hop = { to: string; edgeId: string; kind: CandidateEdge["kind"] }

const buildAdjacency = (tree: CandidateTree): Map<string, Hop[]> => {
  const adj = new Map<string, Hop[]>()
  for (const node of tree.nodes) adj.set(node.id, [])
  for (const edge of tree.edges) {
    adj.get(edge.a)?.push({ to: edge.b, edgeId: edge.id, kind: edge.kind })
    adj.get(edge.b)?.push({ to: edge.a, edgeId: edge.id, kind: edge.kind })
  }
  return adj
}

const leafNodeId = (tree: CandidateTree, leafId: string): string | null =>
  tree.nodes.find((node) => node.kind === "boundary" && node.leafId === leafId)?.id ?? null

export const trackPath = (
  tree: CandidateTree,
  fromLeafId: string,
  toLeafId: string
): { nodeIds: string[]; edgeIds: string[] } | null => {
  const start = leafNodeId(tree, fromLeafId)
  const goal = leafNodeId(tree, toLeafId)
  if (!start || !goal) return null
  const adj = buildAdjacency(tree)
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

const turnAllowed = (tree: CandidateTree, at: string, neighborA: string, neighborB: string): boolean => {
  const key = turnKey(at, neighborA, neighborB)
  return !tree.forbiddenTurns.some(
    (turn) => turnKey(turn.at, turn.neighborA, turn.neighborB) === key
  )
}

export const pairPermittedThroughTree = (
  tree: CandidateTree,
  fromLeafId: string,
  toLeafId: string
): ReconstructedPair => {
  if (fromLeafId === toLeafId) {
    return { a: fromLeafId, b: toLeafId, permitted: false, pathNodeIds: [], pathEdgeIds: [] }
  }
  const path = trackPath(tree, fromLeafId, toLeafId)
  if (!path) {
    return { a: fromLeafId, b: toLeafId, permitted: false, pathNodeIds: [], pathEdgeIds: [] }
  }
  for (let index = 1; index < path.nodeIds.length - 1; index++) {
    const at = path.nodeIds[index]!
    const prev = path.nodeIds[index - 1]!
    const next = path.nodeIds[index + 1]!
    if (!turnAllowed(tree, at, prev, next)) {
      return { a: fromLeafId, b: toLeafId, permitted: false, pathNodeIds: path.nodeIds, pathEdgeIds: path.edgeIds }
    }
  }
  return { a: fromLeafId, b: toLeafId, permitted: true, pathNodeIds: path.nodeIds, pathEdgeIds: path.edgeIds }
}

export const reconstructPairs = (
  tree: CandidateTree,
  order: readonly string[]
): ReconstructedPair[] => {
  const pairs: ReconstructedPair[] = []
  for (let i = 0; i < order.length; i++) {
    for (let j = i + 1; j < order.length; j++) {
      pairs.push(pairPermittedThroughTree(tree, order[i]!, order[j]!))
    }
  }
  return pairs
}

export const compareMatrices = (
  order: readonly string[],
  source: readonly MovementPair[],
  reconstructed: readonly ReconstructedPair[]
): MatrixComparison => {
  const sourceSupported = new Set(
    source.filter((pair) => pair.supported).map((pair) => pairKey(pair.a.id, pair.b.id))
  )
  const reconstructedByKey = new Map(
    reconstructed.map((pair) => [pairKey(pair.a, pair.b), pair])
  )
  const cells: ComparedCell[] = []
  let missing = 0
  let extra = 0
  for (let i = 0; i < order.length; i++) {
    for (let j = i + 1; j < order.length; j++) {
      const a = order[i]!
      const b = order[j]!
      const sourceYes = sourceSupported.has(pairKey(a, b))
      const reconstructedYes = reconstructedByKey.get(pairKey(a, b))?.permitted ?? false
      let verdict: CellVerdict = "neither"
      if (sourceYes && reconstructedYes) verdict = "both"
      else if (sourceYes && !reconstructedYes) {
        verdict = "missing"
        missing++
      } else if (!sourceYes && reconstructedYes) {
        verdict = "extra"
        extra++
      }
      cells.push({ a, b, source: sourceYes, reconstructed: reconstructedYes, verdict })
    }
  }
  return { order: [...order], cells, missing, extra, exact: missing === 0 && extra === 0 }
}

const pathTurns = (path: { nodeIds: string[] }): ForbiddenTurn[] => {
  const turns: ForbiddenTurn[] = []
  for (let index = 1; index < path.nodeIds.length - 1; index++) {
    turns.push({
      at: path.nodeIds[index]!,
      neighborA: path.nodeIds[index - 1]!,
      neighborB: path.nodeIds[index + 1]!,
    })
  }
  return turns
}

/**
 * Forbid turns that appear only on extra (unsupported) paths. Required
 * movements are left intact. Leftover extras mean the topology itself
 * over-permits and cannot be repaired by turns alone.
 */
export const inferForbiddenTurns = (
  tree: Omit<CandidateTree, "forbiddenTurns">,
  order: readonly string[],
  source: readonly MovementPair[]
): ForbiddenTurn[] => {
  const open: CandidateTree = { ...tree, forbiddenTurns: [] }
  const reconstructed = reconstructPairs(open, order)
  const comparison = compareMatrices(order, source, reconstructed)
  const extraCells = comparison.cells.filter((cell) => cell.verdict === "extra")
  const requiredCells = comparison.cells.filter((cell) => cell.verdict === "both" || cell.verdict === "missing")
  if (extraCells.length === 0) return []

  const requiredTurnKeys = new Set<string>()
  for (const cell of requiredCells) {
    const path = trackPath(open, cell.a, cell.b)
    if (!path) continue
    for (const turn of pathTurns(path)) {
      requiredTurnKeys.add(turnKey(turn.at, turn.neighborA, turn.neighborB))
    }
  }

  const forbidden: ForbiddenTurn[] = []
  const seen = new Set<string>()
  for (const cell of extraCells) {
    const path = trackPath(open, cell.a, cell.b)
    if (!path) continue
    for (const turn of pathTurns(path)) {
      const key = turnKey(turn.at, turn.neighborA, turn.neighborB)
      if (requiredTurnKeys.has(key) || seen.has(key)) continue
      seen.add(key)
      forbidden.push(turn)
    }
  }
  return forbidden.sort((left, right) =>
    turnKey(left.at, left.neighborA, left.neighborB).localeCompare(
      turnKey(right.at, right.neighborA, right.neighborB)
    )
  )
}
