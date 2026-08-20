/**
 * Split a passenger-graph station that owns two independent through-corridors
 * into a bonded pair of dots (Kennington, Euston, Poplar). Each half keeps
 * the hops it actually through-runs; a synthetic bond marks that they are
 * still one station. A leftover crossing (Oval ↔ Waterloo at Kennington)
 * forks the busier neighbour onto both halves instead of collapsing back
 * to one vertex.
 */
import type {
  ContractedEdge,
  ContractedNode,
  ContractedTopology,
} from "@/lib/tfl/geometry/contract-track-topology"
import type { DirectedTopologyMovement } from "@/lib/tfl/geometry/topology-movements"
import type { LngLat } from "@/lib/tfl/geometry/transit-track-graph"

const METERS_PER_DEG_LAT = 111_320
const REF_LAT = 51.5
const METERS_PER_DEG_LNG =
  METERS_PER_DEG_LAT * Math.cos((REF_LAT * Math.PI) / 180)
const SPLIT_OFFSET_M = 6

const pairKey = (a: string, b: string): string => [a, b].sort().join("|")

const neighborsOf = (
  nodeId: string,
  edges: readonly ContractedEdge[]
): string[] => {
  const ids = new Set<string>()
  for (const edge of edges) {
    if (edge.kind === "bond") continue
    if (edge.from === nodeId) ids.add(edge.to)
    else if (edge.to === nodeId) ids.add(edge.from)
  }
  return [...ids]
}

const throughPairsAt = (
  via: string,
  movements: readonly DirectedTopologyMovement[]
): string[] => {
  const pairs = new Set<string>()
  for (const movement of movements) {
    if (movement.via !== via) continue
    if (movement.from === movement.to) continue
    pairs.add(pairKey(movement.from, movement.to))
  }
  return [...pairs]
}

const perfectMatchings = (
  neighbors: readonly string[],
  through: readonly string[]
) => {
  const matchings: [string, string][] = []
  for (let i = 0; i < through.length; i += 1) {
    const first = through[i]!.split("|")
    for (let j = i + 1; j < through.length; j += 1) {
      const second = through[j]!.split("|")
      const ends = new Set([...first, ...second])
      if (ends.size !== 4) continue
      if (neighbors.some((id) => !ends.has(id))) continue
      matchings.push([through[i]!, through[j]!])
    }
  }
  return matchings
}

const offsetCoordinates = (point: LngLat, dxM: number, dyM: number): LngLat => [
  point[0] + dxM / METERS_PER_DEG_LNG,
  point[1] + dyM / METERS_PER_DEG_LAT,
]

const neighbourCentroid = (
  ids: readonly string[],
  nodeById: ReadonlyMap<string, ContractedNode>
): LngLat | null => {
  let lng = 0
  let lat = 0
  let count = 0
  for (const id of ids) {
    const node = nodeById.get(id)
    if (!node) continue
    lng += node.coordinates[0]
    lat += node.coordinates[1]
    count += 1
  }
  return count === 0 ? null : [lng / count, lat / count]
}

/** Unit vector from B's exclusive neighbours toward A's, so each half sits on its own corridor's side. */
const exclusiveOffset = (
  origin: ContractedNode,
  exclusiveA: readonly string[],
  exclusiveB: readonly string[],
  nodeById: ReadonlyMap<string, ContractedNode>
): { x: number; y: number } => {
  const centA = neighbourCentroid(exclusiveA, nodeById)
  const centB = neighbourCentroid(exclusiveB, nodeById)
  const from = centB ?? origin.coordinates
  const to = centA ?? origin.coordinates
  const dx = (to[0] - from[0]) * METERS_PER_DEG_LNG
  const dy = (to[1] - from[1]) * METERS_PER_DEG_LAT
  const length = Math.hypot(dx, dy)
  if (length > 1) return { x: dx / length, y: dy / length }
  const fallback = nodeById.get(exclusiveA[0] ?? exclusiveB[0] ?? "")
  if (!fallback) return { x: 1, y: 0 }
  const fx =
    (fallback.coordinates[0] - origin.coordinates[0]) * METERS_PER_DEG_LNG
  const fy =
    (fallback.coordinates[1] - origin.coordinates[1]) * METERS_PER_DEG_LAT
  const fl = Math.hypot(fx, fy) || 1
  return { x: -fy / fl, y: fx / fl }
}

const patternWeight = (
  via: string,
  neighbor: string,
  movements: readonly DirectedTopologyMovement[]
): number =>
  movements.reduce((sum, movement) => {
    if (movement.via !== via) return sum
    if (movement.from !== neighbor && movement.to !== neighbor) return sum
    return sum + movement.patternIds.length
  }, 0)

const adjacent = (
  a: string,
  b: string,
  edges: readonly ContractedEdge[]
): boolean =>
  edges.some(
    (edge) =>
      edge.kind !== "bond" &&
      ((edge.from === a && edge.to === b) || (edge.from === b && edge.to === a))
  )

export const splitBondedThroughStations = (
  topology: ContractedTopology,
  movements: readonly DirectedTopologyMovement[]
): { topology: ContractedTopology; movements: DirectedTopologyMovement[] } => {
  const nodeById = new Map(topology.nodes.map((node) => [node.id, node]))
  const halvesByOriginal = new Map<string, [string, string]>()
  const ownerByNeighbor = new Map<string, Map<string, string>>()
  const nodes: ContractedNode[] = []
  const rewritten: ContractedEdge[] = []
  const extras: ContractedEdge[] = []
  const bonds: ContractedEdge[] = []
  let extraIndex = 0

  for (const node of topology.nodes) {
    const neighbors = neighborsOf(node.id, topology.edges)
    const through = throughPairsAt(node.id, movements)
    const matchings =
      neighbors.length === 4 ? perfectMatchings(neighbors, through) : []
    const leftover =
      matchings.length === 1
        ? through.filter(
            (pair) => pair !== matchings[0]![0] && pair !== matchings[0]![1]
          )
        : []
    if (matchings.length !== 1 || leftover.length > 1) {
      nodes.push(node)
      continue
    }

    const [pairA, pairB] = matchings[0]!
    const groupA = pairA.split("|") as [string, string]
    const groupB = pairB.split("|") as [string, string]
    const leftoverEnds = leftover[0]?.split("|") ?? []
    const forkNeighbor =
      leftoverEnds.length === 2
        ? patternWeight(node.id, leftoverEnds[0]!, movements) >=
          patternWeight(node.id, leftoverEnds[1]!, movements)
          ? leftoverEnds[0]!
          : leftoverEnds[1]!
        : null
    const exclusiveA = groupA.filter((id) => id !== forkNeighbor)
    const exclusiveB = groupB.filter((id) => id !== forkNeighbor)
    const idA = `${node.id}~a`
    const idB = `${node.id}~b`
    const toward = exclusiveOffset(node, exclusiveA, exclusiveB, nodeById)

    nodes.push({
      ...node,
      id: idA,
      coordinates: offsetCoordinates(
        node.coordinates,
        toward.x * SPLIT_OFFSET_M,
        toward.y * SPLIT_OFFSET_M
      ),
      splitFrom: node.id,
    })
    nodes.push({
      ...node,
      id: idB,
      coordinates: offsetCoordinates(
        node.coordinates,
        -toward.x * SPLIT_OFFSET_M,
        -toward.y * SPLIT_OFFSET_M
      ),
      splitFrom: node.id,
    })
    halvesByOriginal.set(node.id, [idA, idB])
    const owners = new Map<string, string>()
    for (const neighbor of groupA) owners.set(neighbor, idA)
    for (const neighbor of groupB) owners.set(neighbor, idB)
    ownerByNeighbor.set(node.id, owners)

    bonds.push({
      id: `${node.id}-bond`,
      from: idA,
      to: idB,
      featureId: `${node.id}-bond`,
      kind: "bond",
    })

    const leftoverPair = leftover[0]
    if (leftoverPair) {
      const [left, right] = leftoverPair.split("|") as [string, string]
      const leftHalf = owners.get(left)
      const rightHalf = owners.get(right)
      if (leftHalf && rightHalf && leftHalf !== rightHalf) {
        const fork =
          patternWeight(node.id, left, movements) >=
          patternWeight(node.id, right, movements)
            ? { neighbor: left, otherHalf: rightHalf }
            : { neighbor: right, otherHalf: leftHalf }
        const template = topology.edges.find(
          (edge) =>
            (edge.from === node.id && edge.to === fork.neighbor) ||
            (edge.to === node.id && edge.from === fork.neighbor)
        )
        extras.push({
          id: `${node.id}-fork${extraIndex}`,
          from: fork.otherHalf,
          to: fork.neighbor,
          featureId: template?.featureId ?? `${node.id}-fork`,
          trackGroup: template?.trackGroup,
          service: template?.service,
          serviceNote: template?.serviceNote,
        })
        extraIndex += 1
      }
    }
  }

  if (halvesByOriginal.size === 0) {
    return { topology, movements: [...movements] }
  }

  for (const edge of topology.edges) {
    if (edge.kind === "bond") {
      rewritten.push(edge)
      continue
    }
    rewritten.push({
      ...edge,
      from: ownerByNeighbor.get(edge.from)?.get(edge.to) ?? edge.from,
      to: ownerByNeighbor.get(edge.to)?.get(edge.from) ?? edge.to,
    })
  }

  const edges = [...rewritten, ...extras, ...bonds]
  const halvesOf = (id: string): string[] => halvesByOriginal.get(id) ?? [id]
  const remapped: DirectedTopologyMovement[] = []
  for (const movement of movements) {
    for (const from of halvesOf(movement.from)) {
      for (const via of halvesOf(movement.via)) {
        for (const to of halvesOf(movement.to)) {
          if (from === to) continue
          if (!adjacent(via, from, edges) || !adjacent(via, to, edges)) continue
          remapped.push({
            ...movement,
            id: `${from}|${via}|${to}`,
            from,
            via,
            to,
          })
        }
      }
    }
  }

  return { topology: { nodes, edges }, movements: remapped }
}
