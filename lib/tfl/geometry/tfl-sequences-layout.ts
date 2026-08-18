/**
 * Geography-seeded passenger layout. Adjacent hops stretch toward travel
 * time; permitted triples stay smooth; bonds stay close. A long route may
 * bend — it is never forced into a global trunk.
 */
import type {
  ContractedNode,
  ContractedTopology,
} from "@/lib/tfl/geometry/contract-track-topology"
import {
  edgeLengthsFromHopTimes,
  type LineHopTimes,
} from "@/lib/tfl/geometry/line-hop-times"
import {
  geoToPlane,
  segmentsCross,
  STRESS_BOND_GAP,
  STRESS_HOP,
  STRESS_MIN_SEP,
} from "@/lib/tfl/geometry/stress-layout"

export type LaidOutPassengerNode = ContractedNode & {
  x: number
  y: number
}

export type TflSequencesLayoutResult = {
  nodes: LaidOutPassengerNode[]
  iterations: number
  crossings: number
  seedCrossings: number
}

type LayoutMovement = {
  from: string
  via: string
  to: string
  strength?: number
  patternIds?: readonly string[]
}

type LayoutState = {
  x: number[]
  y: number[]
}

const DEFAULT_STEPS = 48
const LENGTH_BLEND = 0.28
const STRAIGHTEN_BLEND = 0.22
const GEO_BLEND = 0.04
const ANGLE_EPS = 8 * (Math.PI / 180)

const median = (values: number[]): number => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2
}

const copyState = (state: LayoutState): LayoutState => ({
  x: [...state.x],
  y: [...state.y],
})

const applyState = (target: LayoutState, source: LayoutState) => {
  for (let index = 0; index < target.x.length; index += 1) {
    target.x[index] = source.x[index]!
    target.y[index] = source.y[index]!
  }
}

const recenter = (state: LayoutState) => {
  if (state.x.length === 0) return
  const mx = state.x.reduce((sum, value) => sum + value, 0) / state.x.length
  const my = state.y.reduce((sum, value) => sum + value, 0) / state.y.length
  for (let index = 0; index < state.x.length; index += 1) {
    state.x[index]! -= mx
    state.y[index]! -= my
  }
}

const scaleAboutOrigin = (state: LayoutState, scale: number) => {
  for (let index = 0; index < state.x.length; index += 1) {
    state.x[index]! *= scale
    state.y[index]! *= scale
  }
}

export const countTrackCrossings = (
  state: LayoutState,
  edges: readonly { from: number; to: number }[]
): number => {
  let count = 0
  for (let i = 0; i < edges.length; i += 1) {
    const left = edges[i]!
    for (let j = i + 1; j < edges.length; j += 1) {
      const right = edges[j]!
      if (
        left.from === right.from ||
        left.from === right.to ||
        left.to === right.from ||
        left.to === right.to
      ) {
        continue
      }
      if (
        segmentsCross(
          state.x[left.from]!,
          state.y[left.from]!,
          state.x[left.to]!,
          state.y[left.to]!,
          state.x[right.from]!,
          state.y[right.from]!,
          state.x[right.to]!,
          state.y[right.to]!
        )
      ) {
        count += 1
      }
    }
  }
  return count
}

const neighborAngles = (
  state: LayoutState,
  hub: number,
  neighbors: readonly number[]
): { neighbor: number; angle: number }[] =>
  neighbors
    .map((neighbor) => ({
      neighbor,
      angle: Math.atan2(
        state.y[neighbor]! - state.y[hub]!,
        state.x[neighbor]! - state.x[hub]!
      ),
    }))
    .sort((a, b) => a.angle - b.angle)

const cyclicKey = (
  state: LayoutState,
  hub: number,
  neighbors: readonly number[]
): string | null => {
  if (neighbors.length < 3) return null
  const ranked = neighborAngles(state, hub, neighbors)
  const gaps: number[] = []
  for (let index = 0; index < ranked.length; index += 1) {
    const current = ranked[index]!.angle
    const next = ranked[(index + 1) % ranked.length]!.angle
    const gap = index === ranked.length - 1 ? next + Math.PI * 2 - current : next - current
    gaps.push(gap)
  }
  if (gaps.every((gap) => gap < ANGLE_EPS)) return null
  const start = ranked.reduce(
    (best, item, index) => (item.neighbor < ranked[best]!.neighbor ? index : best),
    0
  )
  const ordered = [
    ...ranked.slice(start).map((item) => item.neighbor),
    ...ranked.slice(0, start).map((item) => item.neighbor),
  ]
  return ordered.join(",")
}

const cyclicOrders = (
  state: LayoutState,
  hubs: readonly { hub: number; neighbors: number[] }[]
): string[] =>
  hubs.map((item) => cyclicKey(state, item.hub, item.neighbors) ?? "")

const sameCyclicOrders = (left: readonly string[], right: readonly string[]) =>
  left.length === right.length && left.every((value, index) => value === right[index])

const projectEdgeLengths = (
  state: LayoutState,
  edges: readonly { from: number; to: number; length: number }[],
  blend: number
) => {
  for (const edge of edges) {
    const dx = state.x[edge.to]! - state.x[edge.from]!
    const dy = state.y[edge.to]! - state.y[edge.from]!
    const dist = Math.hypot(dx, dy)
    if (dist < 1e-6) continue
    const midX = (state.x[edge.from]! + state.x[edge.to]!) / 2
    const midY = (state.y[edge.from]! + state.y[edge.to]!) / 2
    const ux = dx / dist
    const uy = dy / dist
    const half = edge.length / 2
    const fromX = midX - ux * half
    const fromY = midY - uy * half
    const toX = midX + ux * half
    const toY = midY + uy * half
    state.x[edge.from] = state.x[edge.from]! + (fromX - state.x[edge.from]!) * blend
    state.y[edge.from] = state.y[edge.from]! + (fromY - state.y[edge.from]!) * blend
    state.x[edge.to] = state.x[edge.to]! + (toX - state.x[edge.to]!) * blend
    state.y[edge.to] = state.y[edge.to]! + (toY - state.y[edge.to]!) * blend
  }
}

const straightenMovements = (
  state: LayoutState,
  movements: readonly { from: number; via: number; to: number; strength: number }[]
) => {
  for (const movement of movements) {
    const midX = (state.x[movement.from]! + state.x[movement.to]!) / 2
    const midY = (state.y[movement.from]! + state.y[movement.to]!) / 2
    const errorX = state.x[movement.via]! - midX
    const errorY = state.y[movement.via]! - midY
    const viaShiftX = -errorX * movement.strength
    const viaShiftY = -errorY * movement.strength
    state.x[movement.via]! += viaShiftX
    state.y[movement.via]! += viaShiftY
    state.x[movement.from]! += -viaShiftX / 2
    state.y[movement.from]! += -viaShiftY / 2
    state.x[movement.to]! += -viaShiftX / 2
    state.y[movement.to]! += -viaShiftY / 2
  }
}

const applyBonds = (
  state: LayoutState,
  bonds: readonly { a: number; b: number; gap: number }[]
) => {
  for (const bond of bonds) {
    const dx = state.x[bond.b]! - state.x[bond.a]!
    const dy = state.y[bond.b]! - state.y[bond.a]!
    const dist = Math.hypot(dx, dy) || 1e-6
    const shift = (dist - bond.gap) / 2
    const ux = dx / dist
    const uy = dy / dist
    state.x[bond.a]! += ux * shift
    state.y[bond.a]! += uy * shift
    state.x[bond.b]! -= ux * shift
    state.y[bond.b]! -= uy * shift
  }
}

const pullToGeo = (
  state: LayoutState,
  geo: LayoutState,
  blend: number
) => {
  for (let index = 0; index < state.x.length; index += 1) {
    state.x[index]! += (geo.x[index]! - state.x[index]!) * blend
    state.y[index]! += (geo.y[index]! - state.y[index]!) * blend
  }
}

const separateOverlaps = (
  state: LayoutState,
  bonded: ReadonlySet<string>,
  minSep: number
) => {
  const count = state.x.length
  for (let i = 0; i < count; i += 1) {
    for (let j = i + 1; j < count; j += 1) {
      if (bonded.has(`${i}|${j}`)) continue
      const dx = state.x[j]! - state.x[i]!
      const dy = state.y[j]! - state.y[i]!
      const dist = Math.hypot(dx, dy)
      if (dist >= minSep) continue
      const push = (minSep - (dist || 0.1)) / 2
      const ux = dist < 1e-6 ? 1 : dx / dist
      const uy = dist < 1e-6 ? 0 : dy / dist
      state.x[i]! -= ux * push
      state.y[i]! -= uy * push
      state.x[j]! += ux * push
      state.y[j]! += uy * push
    }
  }
}

const pairKey = (a: number, b: number): string =>
  a < b ? `${a}|${b}` : `${b}|${a}`

const movementStrength = (
  viaDegree: number,
  patternCount: number
): number => {
  const hubPenalty = viaDegree >= 4 ? 0.35 : viaDegree >= 3 ? 0.7 : 1
  const support = Math.min(1, 0.45 + patternCount * 0.12)
  return STRAIGHTEN_BLEND * hubPenalty * support
}

export const layoutTflSequences = (
  topology: ContractedTopology,
  movements: readonly LayoutMovement[],
  hopTimes?: LineHopTimes,
  options?: {
    steps?: number
    canonical?: (id: string) => string
    hop?: number
    minSep?: number
    bondGap?: number
  }
): TflSequencesLayoutResult => {
  const hop = options?.hop ?? STRESS_HOP
  const minSep = options?.minSep ?? STRESS_MIN_SEP
  const bondGap = options?.bondGap ?? STRESS_BOND_GAP
  const steps = options?.steps ?? DEFAULT_STEPS
  const canonical = options?.canonical ?? ((id: string) => id)

  const ids = topology.nodes.map((node) => node.id)
  const index = new Map(ids.map((id, i) => [id, i]))
  const count = ids.length
  const geo: LayoutState = {
    x: Array.from({ length: count }, () => 0),
    y: Array.from({ length: count }, () => 0),
  }
  for (let i = 0; i < count; i += 1) {
    const plane = geoToPlane(
      topology.nodes[i]!.coordinates[0],
      topology.nodes[i]!.coordinates[1]
    )
    geo.x[i] = plane.x
    geo.y[i] = plane.y
  }
  recenter(geo)

  const nodeStationId = new Map(
    topology.nodes.map((node) => [node.id, node.stationId ?? node.id])
  )
  const trackEdges = topology.edges.filter((edge) => edge.kind !== "bond")
  const timed = edgeLengthsFromHopTimes(
    trackEdges,
    nodeStationId,
    hopTimes?.hops,
    canonical
  )
  const targetByPair = new Map<string, number>()
  for (const edge of timed) {
    targetByPair.set(hopKey(edge.from, edge.to), edge.length ?? 1)
  }

  const layoutEdges: { from: number; to: number; length: number }[] = []
  const crossingEdges: { from: number; to: number }[] = []
  const geoLengths: number[] = []
  for (const edge of trackEdges) {
    const from = index.get(edge.from)
    const to = index.get(edge.to)
    if (from == null || to == null || from === to) continue
    const minutes = targetByPair.get(hopKey(edge.from, edge.to)) ?? 1
    layoutEdges.push({ from, to, length: minutes })
    crossingEdges.push({ from, to })
    geoLengths.push(
      Math.hypot(geo.x[to]! - geo.x[from]!, geo.y[to]! - geo.y[from]!)
    )
  }

  const typicalGeo = median(geoLengths) || 1
  scaleAboutOrigin(geo, hop / typicalGeo)
  const typicalMinutes =
    median(layoutEdges.map((edge) => edge.length)) || 1
  const minuteScale = hop / typicalMinutes
  for (const edge of layoutEdges) edge.length *= minuteScale

  const bonds = topology.edges.flatMap((edge) => {
    if (edge.kind !== "bond") return []
    const a = index.get(edge.from)
    const b = index.get(edge.to)
    if (a == null || b == null || a === b) return []
    return [{ a, b, gap: bondGap }]
  })
  const bonded = new Set(bonds.map((bond) => pairKey(bond.a, bond.b)))

  const neighbors: number[][] = Array.from({ length: count }, () => [])
  for (const edge of crossingEdges) {
    neighbors[edge.from]!.push(edge.to)
    neighbors[edge.to]!.push(edge.from)
  }
  const hubs = neighbors.flatMap((list, hub) =>
    list.length >= 3 ? [{ hub, neighbors: list }] : []
  )

  const viaPairCount = new Map<string, number>()
  for (const movement of movements) {
    viaPairCount.set(movement.via, (viaPairCount.get(movement.via) ?? 0) + 1)
  }
  const layoutMovements = movements.flatMap((movement) => {
    const from = index.get(movement.from)
    const via = index.get(movement.via)
    const to = index.get(movement.to)
    if (from == null || via == null || to == null) return []
    const pairs = viaPairCount.get(movement.via) ?? 1
    const degree = neighbors[via]?.length ?? 0
    const strength =
      movement.strength ??
      movementStrength(degree, movement.patternIds?.length ?? 1) /
        Math.max(1, pairs > 2 ? pairs * 0.65 : 1)
    return [{ from, via, to, strength }]
  })

  const state = copyState(geo)
  applyBonds(state, bonds)
  const seedCrossings = countTrackCrossings(state, crossingEdges)
  const seedOrders = cyclicOrders(state, hubs)

  let accepted = 0
  for (let step = 0; step < steps; step += 1) {
    const before = copyState(state)
    projectEdgeLengths(state, layoutEdges, LENGTH_BLEND)
    straightenMovements(state, layoutMovements)
    applyBonds(state, bonds)
    pullToGeo(state, geo, GEO_BLEND)
    separateOverlaps(state, bonded, minSep)
    applyBonds(state, bonds)
    const crossings = countTrackCrossings(state, crossingEdges)
    const orders = cyclicOrders(state, hubs)
    if (crossings > seedCrossings || !sameCyclicOrders(seedOrders, orders)) {
      applyState(state, before)
      continue
    }
    accepted += 1
  }

  recenter(state)
  return {
    nodes: topology.nodes.map((node, i) => ({
      ...node,
      x: state.x[i]!,
      y: state.y[i]!,
    })),
    iterations: accepted,
    crossings: countTrackCrossings(state, crossingEdges),
    seedCrossings,
  }
}

const hopKey = (a: string, b: string): string =>
  a < b ? `${a}|${b}` : `${b}|${a}`
