/**
 * Enumerate distinct minimal degree-≤3 candidate trees for a junction.
 *
 * Disconnected movement components are split first and bonded as passenger
 * vertices. Each connected component is then expanded into labelled trees.
 * Construction-order duplicates and drawing flips collapse via the
 * canonical key. Equally minimal exact candidates are all kept.
 */

import { getHubMembership } from "../raw-data"
import { buildPassengerGraph, type PassengerGraph } from "../passenger-graph"
import type { JunctionReport, MovementPair, NeighbourRef, StationRef } from "../types"
import { sourceEvidenceForJunction } from "./evidence"
import { describeBranches } from "./metadata"
import {
  compareMatrices,
  inferForbiddenTurns,
  reconstructPairs,
} from "./reconstruct"
import {
  canonicalSkeletonKey,
  enumerateBinarySkeletons,
  leafNodeIdFor,
  type Skeleton,
} from "./trees"
import type {
  CandidateEdge,
  CandidateNode,
  CandidateRecord,
  CandidateStats,
  CandidateTree,
  JunctionExplorerModel,
} from "./types"

const SEARCH_LEAF_BOUND = 6

const neighbourName = (neighbours: readonly NeighbourRef[], id: string) =>
  neighbours.find((neighbour) => neighbour.id === id)?.name ?? id

const edgeId = (a: string, b: string) => (a < b ? `e:${a}-${b}` : `e:${b}-${a}`)

const treeDegrees = (tree: CandidateTree): Map<string, number> => {
  const degrees = new Map<string, number>()
  for (const node of tree.nodes) degrees.set(node.id, 0)
  for (const edge of tree.edges) {
    degrees.set(edge.a, (degrees.get(edge.a) ?? 0) + 1)
    degrees.set(edge.b, (degrees.get(edge.b) ?? 0) + 1)
  }
  return degrees
}

const statsOf = (
  tree: CandidateTree,
  comparisonExact: boolean,
  nearbyHub: boolean
): CandidateStats => {
  const degrees = treeDegrees(tree)
  return {
    stationVertices: tree.nodes.filter((node) => node.kind === "station").length,
    anonymousJunctions: tree.nodes.filter((node) => node.kind === "anonymous").length,
    maxDegree: Math.max(0, ...degrees.values()),
    trackEdges: tree.edges.filter((edge) => edge.kind === "track").length,
    bonds: tree.edges.filter((edge) => edge.kind === "bond").length,
    exact: comparisonExact,
    nearbyHubAffectsLayout: nearbyHub,
    tflDataSupports: comparisonExact,
  }
}

const complexity = (tree: CandidateTree, componentCount: number): number => {
  const stations = tree.nodes.filter((node) => node.kind === "station").length
  const anonymous = tree.nodes.filter((node) => node.kind === "anonymous").length
  const extraStations = Math.max(0, stations - componentCount)
  return anonymous + extraStations
}

const prefixTree = (tree: CandidateTree, prefix: string): CandidateTree => {
  const rename = (id: string) => `${prefix}${id}`
  return {
    nodes: tree.nodes.map((node) => ({ ...node, id: rename(node.id) })),
    edges: tree.edges.map((edge) => ({
      ...edge,
      id: `${prefix}${edge.id}`,
      a: rename(edge.a),
      b: rename(edge.b),
    })),
    forbiddenTurns: tree.forbiddenTurns.map((turn) => ({
      at: rename(turn.at),
      neighborA: rename(turn.neighborA),
      neighborB: rename(turn.neighborB),
    })),
  }
}

const mergeTrees = (parts: CandidateTree[], original: StationRef): CandidateTree => {
  const nodes: CandidateNode[] = []
  const edges: CandidateEdge[] = []
  const forbiddenTurns = parts.flatMap((part) => part.forbiddenTurns)
  const stationIds: string[] = []
  for (const part of parts) {
    nodes.push(...part.nodes)
    edges.push(...part.edges)
    for (const node of part.nodes) {
      if (node.kind === "station") stationIds.push(node.id)
    }
  }
  for (let index = 0; index < stationIds.length - 1; index++) {
    const a = stationIds[index]!
    const b = stationIds[index + 1]!
    edges.push({ id: `bond:${a}-${b}`, a, b, kind: "bond" })
  }
  if (stationIds.length > 0 && original.id) {
    for (const node of nodes) {
      if (node.kind === "station" && !node.stationId) {
        node.stationId = original.id
        node.stationName = original.name
      }
    }
  }
  return { nodes, edges, forbiddenTurns }
}

const skeletonToOpenTree = (
  skeleton: Skeleton,
  stationInternalIds: ReadonlySet<string>,
  original: StationRef,
  neighbours: readonly NeighbourRef[],
  constituentLabel?: string
): Omit<CandidateTree, "forbiddenTurns"> => {
  const nodes: CandidateNode[] = skeleton.nodes.map((node) => {
    if (node.kind === "leaf" && node.leafId) {
      return {
        id: node.id,
        kind: "boundary",
        leafId: node.leafId,
        leafName: neighbourName(neighbours, node.leafId),
      }
    }
    if (stationInternalIds.has(node.id)) {
      return {
        id: node.id,
        kind: "station",
        stationId: original.id,
        stationName: original.name,
        constituentLabel,
      }
    }
    return { id: node.id, kind: "anonymous" }
  })
  const edges: CandidateEdge[] = skeleton.edges.map(([a, b]) => ({
    id: edgeId(a, b),
    a,
    b,
    kind: "track",
  }))
  return { nodes, edges }
}

const insertStationOnEdge = (
  skeleton: Skeleton,
  edge: [string, string]
): { skeleton: Skeleton; stationId: string } => {
  const stationId = "I:station"
  const [u, v] = edge
  return {
    stationId,
    skeleton: {
      nodes: [...skeleton.nodes, { id: stationId, kind: "internal" }],
      edges: [
        ...skeleton.edges.filter(([a, b]) => !(a === u && b === v) && !(a === v && b === u)),
        [stationId, u],
        [stationId, v],
      ],
    },
  }
}

const finishCandidate = (
  open: Omit<CandidateTree, "forbiddenTurns">,
  order: readonly string[],
  source: readonly MovementPair[]
): CandidateTree => {
  const forbiddenTurns = inferForbiddenTurns(open, order, source)
  return { ...open, forbiddenTurns }
}

const pathOfTwoLeaves = (
  leafIds: readonly string[],
  original: StationRef,
  neighbours: readonly NeighbourRef[],
  constituentLabel?: string
): Omit<CandidateTree, "forbiddenTurns"> => {
  const stationId = "S"
  const nodes: CandidateNode[] = [
    {
      id: stationId,
      kind: "station",
      stationId: original.id,
      stationName: original.name,
      constituentLabel,
    },
  ]
  const edges: CandidateEdge[] = []
  for (const leafId of leafIds) {
    const id = leafNodeIdFor(leafId)
    nodes.push({
      id,
      kind: "boundary",
      leafId,
      leafName: neighbourName(neighbours, leafId),
    })
    edges.push({ id: edgeId(stationId, id), a: stationId, b: id, kind: "track" })
  }
  return { nodes, edges }
}

const connectedPlacements = (
  leafIds: readonly string[],
  original: StationRef,
  neighbours: readonly NeighbourRef[],
  source: readonly MovementPair[],
  constituentLabel?: string
): CandidateTree[] => {
  if (leafIds.length <= 2) {
    return [finishCandidate(pathOfTwoLeaves(leafIds, original, neighbours, constituentLabel), leafIds, source)]
  }

  const trees: CandidateTree[] = []
  for (const skeleton of enumerateBinarySkeletons(leafIds)) {
    const internals = skeleton.nodes.filter((node) => node.kind === "internal").map((node) => node.id)
    for (const stationAt of internals) {
      trees.push(
        finishCandidate(
          skeletonToOpenTree(skeleton, new Set([stationAt]), original, neighbours, constituentLabel),
          leafIds,
          source
        )
      )
    }
    if (internals.length >= 2) {
      for (const [a, b] of skeleton.edges) {
        const aInternal = internals.includes(a)
        const bInternal = internals.includes(b)
        if (!aInternal || !bInternal) continue
        const inserted = insertStationOnEdge(skeleton, [a, b])
        trees.push(
          finishCandidate(
            skeletonToOpenTree(inserted.skeleton, new Set([inserted.stationId]), original, neighbours, constituentLabel),
            leafIds,
            source
          )
        )
      }
    }
  }
  return trees
}

const cartesian = <T,>(lists: T[][]): T[][] => {
  if (lists.length === 0) return [[]]
  return lists.reduce<T[][]>((acc, list) => acc.flatMap((prefix) => list.map((item) => [...prefix, item])), [[]])
}

const constituentLabelFor = (leafIds: readonly string[], allComponents: readonly string[][]): string | undefined => {
  if (allComponents.length <= 1) return undefined
  if (leafIds.length === 1) return "terminus"
  if (leafIds.length === 2) return "through"
  return `component-${leafIds.length}`
}

const nearbyHubAffects = (junction: JunctionReport): boolean => {
  if (junction.hub) return true
  const hubs = junction.neighbours.map((neighbour) => getHubMembership(neighbour.id)?.hubId).filter(Boolean)
  return new Set(hubs).size < hubs.length && hubs.length >= 2
}

const coupledLayoutNote = (junction: JunctionReport): string | null => {
  const paddingtons = junction.neighbours.filter((neighbour) => /paddington/i.test(neighbour.name))
  if (/edgware road/i.test(junction.station.name) && paddingtons.length >= 2) {
    return "Edgware Road and the two Paddington constituent stations are a coupled future layout decision. This page does not choose their combined arrangement."
  }
  return null
}

const canonicalTreeKey = (tree: CandidateTree): string => {
  const skeleton: Skeleton = {
    nodes: tree.nodes.map((node) =>
      node.kind === "boundary"
        ? { id: node.id, kind: "leaf" as const, leafId: node.leafId }
        : { id: node.id, kind: "internal" as const }
    ),
    edges: tree.edges
      .filter((edge) => edge.kind === "track")
      .map((edge) => [edge.a, edge.b] as [string, string]),
  }
  const role = (id: string) => {
    const node = tree.nodes.find((candidate) => candidate.id === id)
    if (node?.kind === "station") return `S:${node.constituentLabel ?? "station"}`
    if (node?.kind === "anonymous") return "A"
    return "X"
  }
  const turns = tree.forbiddenTurns
    .map((turn) => `${turn.at}:${[turn.neighborA, turn.neighborB].sort().join("-")}`)
    .sort()
    .join(";")
  const bonds = tree.edges
    .filter((edge) => edge.kind === "bond")
    .map((edge) => [edge.a, edge.b].sort().join("-"))
    .sort()
    .join(";")
  return `${canonicalSkeletonKey(skeleton, role)}#${turns}#${bonds}`
}

const sourcePairsForLeaves = (
  source: readonly MovementPair[],
  leafIds: readonly string[]
): MovementPair[] => {
  const set = new Set(leafIds)
  return source.filter((pair) => set.has(pair.a.id) && set.has(pair.b.id))
}

export const enumerateCandidateTrees = (
  junction: JunctionReport,
  source: readonly MovementPair[],
  neighbours: readonly NeighbourRef[]
): CandidateTree[] => {
  const components = junction.movementComponents.map((component) => component.map((ref) => ref.id))
  const bounded = components.every((component) => component.length <= SEARCH_LEAF_BOUND)
  if (!bounded) return []

  if (components.length <= 1) {
    const leaves = components[0] ?? neighbours.map((neighbour) => neighbour.id)
    return connectedPlacements(leaves, junction.station, neighbours, source)
  }

  const partLists = components.map((leafIds, index) => {
    const label = constituentLabelFor(leafIds, components)
    const partSource = sourcePairsForLeaves(source, leafIds)
    return connectedPlacements(leafIds, junction.station, neighbours, partSource, label).map((tree) =>
      prefixTree(tree, `p${index}:`)
    )
  })
  const combined = cartesian(partLists).map((parts) => mergeTrees(parts, junction.station))
  return combined
}

const sortCandidates = (records: CandidateRecord[], componentCount: number): CandidateRecord[] =>
  [...records].sort((left, right) => {
    const leftMismatch = left.comparison.missing + left.comparison.extra
    const rightMismatch = right.comparison.missing + right.comparison.extra
    if (leftMismatch !== rightMismatch) return leftMismatch - rightMismatch
    const leftC = complexity(left.tree, componentCount)
    const rightC = complexity(right.tree, componentCount)
    if (leftC !== rightC) return leftC - rightC
    return left.canonicalKey.localeCompare(right.canonicalKey)
  })

const keepMinimal = (records: CandidateRecord[], componentCount: number): CandidateRecord[] => {
  if (records.length === 0) return []
  const sorted = sortCandidates(records, componentCount)
  const exact = sorted.filter((record) => record.comparison.exact)
  const pool = exact.length > 0 ? exact : sorted
  const bestMismatch = pool[0]!.comparison.missing + pool[0]!.comparison.extra
  const sameMismatch = pool.filter(
    (record) => record.comparison.missing + record.comparison.extra === bestMismatch
  )
  const bestComplexity = Math.min(...sameMismatch.map((record) => complexity(record.tree, componentCount)))
  return sameMismatch.filter((record) => complexity(record.tree, componentCount) === bestComplexity)
}

export const buildCandidatesForJunction = (
  graph: PassengerGraph,
  junction: JunctionReport
): CandidateRecord[] => {
  const order = junction.neighbours.map((neighbour) => neighbour.id)
  const trees = enumerateCandidateTrees(junction, junction.matrix, junction.neighbours)
  const componentCount = Math.max(1, junction.movementComponents.length)
  const nearbyHub = nearbyHubAffects(junction)
  const coupled = coupledLayoutNote(junction)
  const branches = describeBranches(graph, junction.station.id, junction.neighbours)

  const unique = new Map<string, CandidateTree>()
  for (const tree of trees) {
    unique.set(canonicalTreeKey(tree), tree)
  }

  const records: CandidateRecord[] = [...unique.entries()].map(([canonicalKey, tree]) => {
    const reconstructed = reconstructPairs(tree, order)
    const comparison = compareMatrices(order, junction.matrix, reconstructed)
    return {
      id: "pending",
      canonicalKey,
      tree,
      comparison,
      reconstructed,
      stats: statsOf(tree, comparison.exact, nearbyHub),
      branches,
      coupledLayoutNote: coupled,
    }
  })

  const kept = keepMinimal(records, componentCount)
  return kept.map((record, index) => ({ ...record, id: `c${index + 1}` }))
}

export { explorerKey } from "./ids"

export const buildExplorerModel = (
  lineId: string,
  junction: JunctionReport
): JunctionExplorerModel | null => {
  const graph = buildPassengerGraph(lineId)
  if (!graph) return null
  const candidates = buildCandidatesForJunction(graph, junction)
  const order = junction.neighbours.map((neighbour) => neighbour.id)
  return {
    lineId,
    lineName: graph.lineName,
    station: junction.station,
    neighbours: junction.neighbours,
    sourceMatrix: junction.matrix,
    hub: junction.hub,
    candidates,
    evidence: sourceEvidenceForJunction(lineId, junction.station.id, order),
    boundaryOrder: order,
  }
}
