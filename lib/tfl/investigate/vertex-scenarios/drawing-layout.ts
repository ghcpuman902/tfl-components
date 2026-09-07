/**
 * Collapse a drawing graph onto an octilinear grid.
 *
 * The cheap snap for travel is horizontal, then 45°, then vertical.
 * A walking bond must not run along an incident track — that reads as
 * a through-run. The primary direction is along increasing `pos`
 * (rightward on this page unless the policy says otherwise).
 *
 * This is the same placement a whole-line renderer can use: the scene
 * already contains every vertex the stroke should meet. Upstream work
 * chooses the graph and the policy; this pass only assigns coordinates.
 */

import { octilinearLanePath } from "@/lib/tfl/schematic-layout"
import {
  bondEdges,
  trackEdges,
  type DrawingNode,
  type DrawingScene,
  type TerminusAlong,
} from "./drawing-graph"
import type { PortId } from "./types"

export type SnapAxis = "horizontal" | "diagonal" | "vertical"

export type PrimaryDirection = "right" | "left" | "up" | "down"

/** Tick at the end of the arm, or a through-tick with a short continuation. */
export type EndMark = "terminus" | "through"

export type LayoutPolicy = {
  primary: PrimaryDirection
  /** Cheapest-to-dearest snap for track. Bonds ignore this ranking. */
  axes: readonly SnapAxis[]
  end: EndMark
}

export const DEFAULT_LAYOUT_POLICY: LayoutPolicy = {
  primary: "right",
  axes: ["horizontal", "diagonal", "vertical"],
  end: "terminus",
}

export type GridPoint = { pos: number; lane: number }

export type LaidNode = {
  id: string
  kind: DrawingNode["kind"]
  port?: PortId
  pos: number
  lane: number
  x: number
  y: number
}

export type LaidDrawing = {
  nodes: LaidNode[]
  tracks: { id: string; a: string; b: string; d: string }[]
  bonds: { id: string; a: string; b: string }[]
  width: number
  height: number
  energy: number
  policy: LayoutPolicy
}

const MAIN_PITCH = 72
const LANE_PITCH = 48
const PAD = 40
const CORNER = 18
const INFINITY = Number.POSITIVE_INFINITY

const byId = (scene: DrawingScene): Map<string, DrawingNode> =>
  new Map(scene.nodes.map((node) => [node.id, node]))

const trackAdj = (scene: DrawingScene): Map<string, string[]> => {
  const adj = new Map<string, string[]>()
  for (const node of scene.nodes) adj.set(node.id, [])
  for (const edge of trackEdges(scene)) {
    adj.get(edge.a)?.push(edge.b)
    adj.get(edge.b)?.push(edge.a)
  }
  return adj
}

const sequenceIndex = (scene: DrawingScene, id: string): number => {
  const index = scene.hints.sequence.indexOf(id)
  return index < 0 ? Number.MAX_SAFE_INTEGER : index
}

const alongOf = (
  scene: DrawingScene,
  node: DrawingNode
): TerminusAlong | undefined =>
  node.port ? scene.hints.terminusAlong[node.port] : undefined

/** Signed pos step from `from` to `to` along one track. */
const trackDelta = (
  scene: DrawingScene,
  nodes: Map<string, DrawingNode>,
  from: string,
  to: string
): number => {
  const a = nodes.get(from)!
  const b = nodes.get(to)!
  const hop =
    a.kind === "fork" || b.kind === "fork" ? 2 : 1
  if (a.kind === "boundary") return alongOf(scene, a) === "end" ? -hop : hop
  if (b.kind === "boundary") return alongOf(scene, b) === "end" ? hop : -hop
  return sequenceIndex(scene, from) <= sequenceIndex(scene, to) ? hop : -hop
}

const solvePos = (scene: DrawingScene): Map<string, number> => {
  const nodes = byId(scene)
  const adj = new Map<string, { to: string; d: number }[]>()
  for (const node of scene.nodes) adj.set(node.id, [])
  const link = (from: string, to: string, d: number) => {
    adj.get(from)!.push({ to, d })
    adj.get(to)!.push({ to: from, d: -d })
  }
  for (const edge of trackEdges(scene)) {
    link(edge.a, edge.b, trackDelta(scene, nodes, edge.a, edge.b))
  }
  for (const edge of bondEdges(scene)) link(edge.a, edge.b, 0)

  const pos = new Map<string, number>()
  const seed =
    scene.nodes.find((node) => node.kind !== "boundary")?.id ??
    scene.nodes[0]?.id
  if (!seed) return pos

  const visit = (origin: string, originPos: number) => {
    if (pos.has(origin)) return
    pos.set(origin, originPos)
    const queue = [origin]
    while (queue.length) {
      const current = queue.shift()!
      for (const hop of adj.get(current) ?? []) {
        const next = pos.get(current)! + hop.d
        const seen = pos.get(hop.to)
        if (seen == null) {
          pos.set(hop.to, next)
          queue.push(hop.to)
          continue
        }
        if (seen !== next) {
          throw new Error(`Inconsistent pos for ${hop.to}: ${seen} vs ${next}`)
        }
      }
    }
  }

  visit(seed, 1)
  for (const node of scene.nodes) {
    if (!pos.has(node.id)) visit(node.id, 1)
  }
  return pos
}

const trackComponents = (scene: DrawingScene): string[][] => {
  const adj = trackAdj(scene)
  const seen = new Set<string>()
  const groups: string[][] = []
  for (const node of scene.nodes) {
    if (seen.has(node.id)) continue
    const group: string[] = []
    const queue = [node.id]
    seen.add(node.id)
    while (queue.length) {
      const current = queue.shift()!
      group.push(current)
      for (const hop of adj.get(current) ?? []) {
        if (seen.has(hop)) continue
        seen.add(hop)
        queue.push(hop)
      }
    }
    groups.push(
      group.sort((a, b) => sequenceIndex(scene, a) - sequenceIndex(scene, b))
    )
  }
  groups.sort(
    (left, right) =>
      sequenceIndex(scene, left[0]!) - sequenceIndex(scene, right[0]!)
  )
  return groups
}

const fanOffsets = (count: number): number[] => {
  if (count <= 1) return [0]
  if (count === 2) return [-1, 1]
  const mid = (count - 1) / 2
  return Array.from({ length: count }, (_, i) => i - mid)
}

const layoutTreeLanes = (
  scene: DrawingScene,
  group: readonly string[],
  pos: Map<string, number>
): Map<string, number> => {
  const adj = trackAdj(scene)
  const members = new Set(group)
  const lane = new Map<string, number>()
  const minPos = Math.min(...group.map((id) => pos.get(id)!))
  const roots = group
    .filter((id) => pos.get(id) === minPos)
    .sort((a, b) => sequenceIndex(scene, a) - sequenceIndex(scene, b))

  const visit = (id: string) => {
    const kids = (adj.get(id) ?? [])
      .filter((hop) => members.has(hop) && pos.get(hop)! > pos.get(id)!)
      .sort((a, b) => sequenceIndex(scene, a) - sequenceIndex(scene, b))
    if (kids.length === 0) return
    const parentLane = lane.get(id) ?? 0
    const offsets = fanOffsets(kids.length)
    kids.forEach((kid, i) => {
      if (!lane.has(kid)) lane.set(kid, parentLane + offsets[i]!)
      visit(kid)
    })
  }

  roots.forEach((root, i) => {
    if (!lane.has(root)) lane.set(root, i === 0 ? 0 : i)
    visit(root)
  })
  for (const id of group) {
    if (!lane.has(id)) lane.set(id, 0)
  }
  return lane
}

const collides = (
  group: readonly string[],
  local: Map<string, number>,
  offset: number,
  pos: Map<string, number>,
  global: Map<string, number>
): boolean => {
  for (const id of group) {
    const at = pos.get(id)!
    const lane = local.get(id)! + offset
    for (const [other, otherLane] of global) {
      if (pos.get(other) === at && otherLane === lane) return true
    }
  }
  return false
}

const packLanes = (
  scene: DrawingScene,
  groups: string[][],
  local: Map<string, Map<string, number>>,
  pos: Map<string, number>
): Map<string, number> => {
  const global = new Map<string, number>()
  const done = new Set<number>()
  const groupOf = new Map<string, number>()
  groups.forEach((group, index) => {
    for (const id of group) groupOf.set(id, index)
  })

  const apply = (index: number, offset: number) => {
    for (const id of groups[index]!) {
      global.set(id, local.get(String(index))!.get(id)! + offset)
    }
    done.add(index)
  }

  if (groups.length === 0) return global
  apply(0, 0)

  const tryPlace = (index: number, bonded: string, placed: string): boolean => {
    const placedLane = global.get(placed)!
    const localLane = local.get(String(index))!.get(bonded)!
    const candidates = [
      placedLane + 1,
      placedLane - 1,
      placedLane + 2,
      placedLane - 2,
    ]
    for (const want of candidates) {
      const offset = want - localLane
      if (
        collides(groups[index]!, local.get(String(index))!, offset, pos, global)
      ) {
        continue
      }
      apply(index, offset)
      return true
    }
    return false
  }

  let guard = 0
  while (done.size < groups.length && guard < 32) {
    guard += 1
    let progressed = false
    for (const edge of bondEdges(scene)) {
      const aIndex = groupOf.get(edge.a)
      const bIndex = groupOf.get(edge.b)
      if (aIndex == null || bIndex == null) continue
      if (done.has(aIndex) && !done.has(bIndex)) {
        if (tryPlace(bIndex, edge.b, edge.a)) progressed = true
      } else if (done.has(bIndex) && !done.has(aIndex)) {
        if (tryPlace(aIndex, edge.a, edge.b)) progressed = true
      }
    }
    if (progressed) continue
    const next = groups.findIndex((_, index) => !done.has(index))
    if (next < 0) break
    const maxLane = Math.max(0, ...global.values())
    const minLocal = Math.min(...[...local.get(String(next))!.values()])
    apply(next, maxLane + 1 - minLocal)
  }
  return global
}

const snapOf = (dpos: number, dlane: number): SnapAxis | "other" => {
  if (dpos !== 0 && dlane === 0) return "horizontal"
  if (dpos === 0 && dlane !== 0) return "vertical"
  if (Math.abs(dpos) === Math.abs(dlane)) return "diagonal"
  return "other"
}

const parallel = (
  a: GridPoint,
  b: GridPoint,
  c: GridPoint,
  d: GridPoint
): boolean => {
  const dx1 = b.pos - a.pos
  const dy1 = b.lane - a.lane
  const dx2 = d.pos - c.pos
  const dy2 = d.lane - c.lane
  return dx1 * dy2 === dy1 * dx2
}

export const scorePlacement = (
  scene: DrawingScene,
  placement: Map<string, GridPoint>,
  policy: LayoutPolicy = DEFAULT_LAYOUT_POLICY
): number => {
  const adj = trackAdj(scene)
  const axisCost = (axis: SnapAxis | "other"): number => {
    if (axis === "other") return 8
    const index = policy.axes.indexOf(axis)
    return index < 0 ? 8 : index
  }
  let energy = 0
  for (const edge of trackEdges(scene)) {
    const a = placement.get(edge.a)
    const b = placement.get(edge.b)
    if (!a || !b) return INFINITY
    energy += axisCost(snapOf(b.pos - a.pos, b.lane - a.lane))
  }
  for (const edge of bondEdges(scene)) {
    const a = placement.get(edge.a)
    const b = placement.get(edge.b)
    if (!a || !b) return INFINITY
    if (a.pos === b.pos && a.lane === b.lane) return INFINITY
    const incident = [
      ...(adj.get(edge.a) ?? []).map((id) => [edge.a, id] as const),
      ...(adj.get(edge.b) ?? []).map((id) => [edge.b, id] as const),
    ]
    for (const [from, to] of incident) {
      const start = placement.get(from)
      const end = placement.get(to)
      if (!start || !end) continue
      if (parallel(a, b, start, end)) return INFINITY
    }
  }
  return energy
}

export const collapseDrawing = (
  scene: DrawingScene
): Map<string, GridPoint> => {
  const pos = solvePos(scene)
  const groups = trackComponents(scene)
  const local = new Map<string, Map<string, number>>()
  groups.forEach((group, index) => {
    local.set(String(index), layoutTreeLanes(scene, group, pos))
  })
  const lanes = packLanes(scene, groups, local, pos)
  const placement = new Map<string, GridPoint>()
  for (const node of scene.nodes) {
    placement.set(node.id, {
      pos: pos.get(node.id) ?? 0,
      lane: lanes.get(node.id) ?? 0,
    })
  }
  return placement
}

const toXY = (
  point: GridPoint,
  minPos: number,
  minLane: number,
  policy: LayoutPolicy
): { x: number; y: number } => {
  const main = PAD + (point.pos - minPos) * MAIN_PITCH
  const cross = PAD + (point.lane - minLane) * LANE_PITCH
  if (policy.primary === "left") {
    return { x: -main, y: cross }
  }
  if (policy.primary === "up") {
    return { x: cross, y: -main }
  }
  if (policy.primary === "down") {
    return { x: cross, y: main }
  }
  return { x: main, y: cross }
}

const mainAxis = (policy: LayoutPolicy): "x" | "y" =>
  policy.primary === "up" || policy.primary === "down" ? "y" : "x"

const trackPath = (
  a: { x: number; y: number },
  b: { x: number; y: number },
  gridA: GridPoint,
  gridB: GridPoint,
  policy: LayoutPolicy,
  fromKind: DrawingNode["kind"],
  toKind: DrawingNode["kind"]
): string => {
  const dpos = gridB.pos - gridA.pos
  const dlane = gridB.lane - gridA.lane
  if (dlane === 0 || dpos === 0) {
    return `M ${a.x} ${a.y} L ${b.x} ${b.y}`
  }
  if (Math.abs(dpos) === Math.abs(dlane)) {
    return `M ${a.x} ${a.y} L ${b.x} ${b.y}`
  }
  const leftoverAt =
    fromKind === "fork" ? "end" : toKind === "fork" ? "start" : "split"
  return octilinearLanePath(
    a.x,
    a.y,
    b.x,
    b.y,
    CORNER,
    mainAxis(policy),
    leftoverAt
  )
}

const boundsOf = (
  points: Iterable<{ x: number; y: number }>
): { minX: number; maxX: number; minY: number; maxY: number } => {
  let minX = INFINITY
  let maxX = -INFINITY
  let minY = INFINITY
  let maxY = -INFINITY
  for (const point of points) {
    minX = Math.min(minX, point.x)
    maxX = Math.max(maxX, point.x)
    minY = Math.min(minY, point.y)
    maxY = Math.max(maxY, point.y)
  }
  if (!Number.isFinite(minX)) return { minX: 0, maxX: 0, minY: 0, maxY: 0 }
  return { minX, maxX, minY, maxY }
}

export const layoutDrawing = (
  scene: DrawingScene,
  policy: LayoutPolicy = DEFAULT_LAYOUT_POLICY
): LaidDrawing => {
  const placement = collapseDrawing(scene)
  const energy = scorePlacement(scene, placement, policy)
  const positions = [...placement.values()]
  const minPos = Math.min(...positions.map((point) => point.pos))
  const minLane = Math.min(...positions.map((point) => point.lane))
  const raw = new Map<string, { x: number; y: number }>()
  for (const [id, point] of placement) {
    raw.set(id, toXY(point, minPos, minLane, policy))
  }
  const box = boundsOf(raw.values())
  const shiftX = PAD - box.minX
  const shiftY = PAD - box.minY
  const xy = (id: string) => {
    const point = raw.get(id)!
    return { x: point.x + shiftX, y: point.y + shiftY }
  }

  const nodes: LaidNode[] = scene.nodes.map((node) => {
    const grid = placement.get(node.id)!
    const point = xy(node.id)
    return {
      id: node.id,
      kind: node.kind,
      port: node.port,
      pos: grid.pos,
      lane: grid.lane,
      x: point.x,
      y: point.y,
    }
  })

  return {
    nodes,
    tracks: trackEdges(scene).map((edge) => {
      const a = xy(edge.a)
      const b = xy(edge.b)
      return {
        id: edge.id,
        a: edge.a,
        b: edge.b,
        d: trackPath(
          a,
          b,
          placement.get(edge.a)!,
          placement.get(edge.b)!,
          policy,
          scene.nodes.find((node) => node.id === edge.a)!.kind,
          scene.nodes.find((node) => node.id === edge.b)!.kind
        ),
      }
    }),
    bonds: bondEdges(scene).map((edge) => ({
      id: edge.id,
      a: edge.a,
      b: edge.b,
    })),
    width: Math.max(220, box.maxX - box.minX + PAD * 2),
    height: Math.max(140, box.maxY - box.minY + PAD * 2),
    energy,
    policy,
  }
}

/** Track edges on the unique path between two ports. Bonds are not travel. */
export const trackPathBetween = (
  scene: DrawingScene,
  from: PortId,
  to: PortId
): Set<string> => {
  const start = scene.nodes.find((node) => node.port === from)?.id
  const goal = scene.nodes.find((node) => node.port === to)?.id
  if (!start || !goal) return new Set()
  const adj = new Map<string, { to: string; edgeId: string }[]>()
  for (const node of scene.nodes) adj.set(node.id, [])
  for (const edge of trackEdges(scene)) {
    adj.get(edge.a)!.push({ to: edge.b, edgeId: edge.id })
    adj.get(edge.b)!.push({ to: edge.a, edgeId: edge.id })
  }
  const prev = new Map<string, { from: string; edgeId: string }>()
  const queue = [start]
  prev.set(start, { from: start, edgeId: "" })
  while (queue.length) {
    const current = queue.shift()!
    if (current === goal) break
    for (const hop of adj.get(current) ?? []) {
      if (prev.has(hop.to)) continue
      const arrived = prev.get(current)
      const blocked =
        arrived != null &&
        arrived.from !== current &&
        scene.forbiddenTurns.some(
          (turn) =>
            turn.at === current &&
            ((turn.from === arrived.from && turn.to === hop.to) ||
              (turn.from === hop.to && turn.to === arrived.from))
        )
      if (blocked) continue
      prev.set(hop.to, { from: current, edgeId: hop.edgeId })
      queue.push(hop.to)
    }
  }
  if (!prev.has(goal)) return new Set()
  const ids = new Set<string>()
  let at = goal
  while (at !== start) {
    const step = prev.get(at)!
    ids.add(step.edgeId)
    at = step.from
  }
  return ids
}
