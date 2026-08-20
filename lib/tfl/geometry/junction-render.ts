/**
 * Turn a `Junction` (junction-grammar.ts) into a small renderable graph.
 *
 * This is the one place that decides *how* the grammar becomes a diagram —
 * every type gets a hub-and-legs star except `crossing`, which by
 * definition shares no node at all (two independent lines that happen to
 * cross in plan). Renderers (force-field, schematic) consume this instead
 * of re-deriving connectivity from `legs`/`movements` themselves.
 */
import type { StressGraph } from "./stress-layout"
import type { Junction, Leg, LegId } from "./junction-grammar"

export type JunctionRenderNode = {
  id: string
  legId?: LegId
  label: string
  x: number
  y: number
  isHub: boolean
}

export type JunctionRenderEdge = {
  from: string
  to: string
  gradeSeparated?: boolean
}

export type JunctionRenderGraph = {
  nodes: JunctionRenderNode[]
  edges: JunctionRenderEdge[]
  hasHub: boolean
}

const SEED_RADIUS = 90

const bearingToXY = (
  bearingDeg: number,
  radius: number
): { x: number; y: number } => {
  const rad = (bearingDeg * Math.PI) / 180
  return { x: Math.sin(rad) * radius, y: -Math.cos(rad) * radius }
}

const angleDiff = (a: number, b: number): number => {
  const diff = Math.abs(a - b) % 360
  return diff > 180 ? 360 - diff : diff
}

/** Greedily pairs each leg with the leg closest to its geometric opposite. Used only for `crossing`, where legs don't share a hub. */
const pairOppositeLegs = (legs: readonly Leg[]): [LegId, LegId][] => {
  const remaining = [...legs]
  const pairs: [LegId, LegId][] = []
  while (remaining.length >= 2) {
    const first = remaining.shift()!
    let bestIndex = 0
    let bestScore = -Infinity
    remaining.forEach((candidate, index) => {
      const score = angleDiff(first.bearingDeg, candidate.bearingDeg)
      if (score > bestScore) {
        bestScore = score
        bestIndex = index
      }
    })
    const [best] = remaining.splice(bestIndex, 1)
    if (best) pairs.push([first.id, best.id])
  }
  return pairs
}

export const junctionRenderGraph = (
  junction: Junction
): JunctionRenderGraph => {
  const legNodes: JunctionRenderNode[] = junction.legs.map((leg) => ({
    id: `${junction.id}:${leg.id}`,
    legId: leg.id,
    label: leg.label,
    isHub: false,
    ...bearingToXY(leg.bearingDeg, SEED_RADIUS),
  }))

  if (junction.type === "crossing") {
    const edges = pairOppositeLegs(junction.legs).map(([a, b]) => ({
      from: `${junction.id}:${a}`,
      to: `${junction.id}:${b}`,
    }))
    return { nodes: legNodes, edges, hasHub: false }
  }

  const hub: JunctionRenderNode = {
    id: `${junction.id}:hub`,
    label: junction.label,
    isHub: true,
    x: 0,
    y: 0,
  }
  const usedLegIds = new Set(junction.movements.flatMap((m) => [m.from, m.to]))
  const edges: JunctionRenderEdge[] = junction.legs
    .filter((leg) => usedLegIds.size === 0 || usedLegIds.has(leg.id))
    .map((leg) => {
      const gradeSeparated = junction.movements.some(
        (m) => m.gradeSeparated && (m.from === leg.id || m.to === leg.id)
      )
      return { from: hub.id, to: `${junction.id}:${leg.id}`, gradeSeparated }
    })

  return { nodes: [hub, ...legNodes], edges, hasHub: true }
}

export const junctionStressGraph = (junction: Junction): StressGraph => {
  const render = junctionRenderGraph(junction)
  return {
    ids: render.nodes.map((node) => node.id),
    edges: render.edges.map(({ from, to }) => ({ from, to })),
    geo: render.nodes.map((node) => ({ x: node.x, y: node.y })),
  }
}
