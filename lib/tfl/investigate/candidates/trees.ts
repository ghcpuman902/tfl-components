/**
 * Unrooted degree-≤3 skeletons on labelled leaves, plus a canonical form
 * that collapses construction-order and drawing-flip duplicates.
 */

export type SkeletonNode = {
  id: string
  kind: "leaf" | "internal"
  leafId?: string
}

export type Skeleton = {
  nodes: SkeletonNode[]
  edges: [string, string][]
}

const leafNodeId = (leafId: string) => `L:${leafId}`

const adjacency = (skeleton: Skeleton): Map<string, string[]> => {
  const adj = new Map<string, string[]>()
  for (const node of skeleton.nodes) adj.set(node.id, [])
  for (const [a, b] of skeleton.edges) {
    adj.get(a)?.push(b)
    adj.get(b)?.push(a)
  }
  return adj
}

const rootedCanon = (
  id: string,
  parent: string | null,
  adj: Map<string, string[]>,
  byId: Map<string, SkeletonNode>,
  role: (id: string) => string
): string => {
  const node = byId.get(id)
  if (node?.kind === "leaf") return `(${node.leafId ?? id})`
  const children = (adj.get(id) ?? []).filter((neighbour) => neighbour !== parent)
  const parts = children
    .map((child) => rootedCanon(child, id, adj, byId, role))
    .sort((left, right) => left.localeCompare(right))
  return `[${role(id)}${parts.join("")}]`
}

const treeCenters = (adj: Map<string, string[]>): string[] => {
  const remaining = new Map<string, Set<string>>()
  for (const [id, neighbours] of adj) remaining.set(id, new Set(neighbours))
  let leaves = [...remaining.entries()]
    .filter(([, neighbours]) => neighbours.size <= 1)
    .map(([id]) => id)
  while (remaining.size > 2) {
    for (const leaf of leaves) {
      const neighbours = remaining.get(leaf)
      remaining.delete(leaf)
      if (!neighbours) continue
      for (const neighbour of neighbours) remaining.get(neighbour)?.delete(leaf)
    }
    leaves = [...remaining.entries()]
      .filter(([, neighbours]) => neighbours.size <= 1)
      .map(([id]) => id)
  }
  return [...remaining.keys()].sort((left, right) => left.localeCompare(right))
}

/**
 * Canonical string for a labelled unrooted tree. Leaf identities are fixed;
 * internals are distinguished only by an optional role (`anonymous` / `station`).
 * Construction order and drawing flips of the same labelled tree collide.
 */
export const canonicalSkeletonKey = (
  skeleton: Skeleton,
  role: (id: string) => string = () => "A"
): string => {
  if (skeleton.nodes.length === 0) return "∅"
  const adj = adjacency(skeleton)
  const byId = new Map(skeleton.nodes.map((node) => [node.id, node]))
  if (skeleton.nodes.length === 1) {
    const only = skeleton.nodes[0]!
    return only.kind === "leaf" ? `(${only.leafId})` : `[${role(only.id)}]`
  }
  const centers = treeCenters(adj)
  const keys = centers.map((center) => rootedCanon(center, null, adj, byId, role))
  return keys.sort((left, right) => left.localeCompare(right))[0] ?? ""
}

const uniqueSkeletons = (skeletons: Skeleton[]): Skeleton[] => {
  const seen = new Set<string>()
  const unique: Skeleton[] = []
  for (const skeleton of skeletons) {
    const key = canonicalSkeletonKey(skeleton)
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(skeleton)
  }
  return unique.sort((left, right) =>
    canonicalSkeletonKey(left).localeCompare(canonicalSkeletonKey(right))
  )
}

const star3 = (leafIds: readonly string[]): Skeleton => {
  const internal = "I:0"
  return {
    nodes: [
      { id: internal, kind: "internal" },
      ...leafIds.map((leafId) => ({ id: leafNodeId(leafId), kind: "leaf" as const, leafId })),
    ],
    edges: leafIds.map((leafId) => [internal, leafNodeId(leafId)] as [string, string]),
  }
}

const insertLeafOnEdge = (
  skeleton: Skeleton,
  edge: [string, string],
  leafId: string,
  nextInternalIndex: number
): Skeleton => {
  const internal = `I:${nextInternalIndex}`
  const leaf = leafNodeId(leafId)
  const [u, v] = edge
  return {
    nodes: [
      ...skeleton.nodes,
      { id: internal, kind: "internal" },
      { id: leaf, kind: "leaf", leafId },
    ],
    edges: [
      ...skeleton.edges.filter(([a, b]) => !(a === u && b === v) && !(a === v && b === u)),
      [internal, u],
      [internal, v],
      [internal, leaf],
    ],
  }
}

const nextInternalIndex = (skeleton: Skeleton): number =>
  skeleton.nodes.filter((node) => node.kind === "internal").length

/**
 * Every distinct unrooted binary tree (internal nodes degree 3) on the
 * labelled leaves. `n <= 2` is a bare path of leaves — the caller inserts
 * the passenger station. `n === 3` is the unique Y.
 */
export const enumerateBinarySkeletons = (leafIds: readonly string[]): Skeleton[] => {
  const leaves = [...leafIds]
  if (leaves.length <= 1) {
    return [
      {
        nodes: leaves.map((leafId) => ({
          id: leafNodeId(leafId),
          kind: "leaf" as const,
          leafId,
        })),
        edges: [],
      },
    ]
  }
  if (leaves.length === 2) {
    const a = leafNodeId(leaves[0]!)
    const b = leafNodeId(leaves[1]!)
    return [
      {
        nodes: [
          { id: a, kind: "leaf", leafId: leaves[0] },
          { id: b, kind: "leaf", leafId: leaves[1] },
        ],
        edges: [[a, b]],
      },
    ]
  }

  let current = [star3(leaves.slice(0, 3))]
  for (const leafId of leaves.slice(3)) {
    const next: Skeleton[] = []
    for (const skeleton of current) {
      const index = nextInternalIndex(skeleton)
      for (const edge of skeleton.edges) {
        next.push(insertLeafOnEdge(skeleton, edge, leafId, index))
      }
    }
    current = uniqueSkeletons(next)
  }
  return uniqueSkeletons(current)
}

export const leafNodeIdFor = leafNodeId
