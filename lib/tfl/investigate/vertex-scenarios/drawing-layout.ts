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

import {
  diagramAtomMetrics,
  diagramLabelBoxAlong,
  grownSegmentLength,
  laneEdgeGap,
  minimumBranchGap,
  nameCrossHalf,
  stemArmFromTo,
  triangleApexFromBase,
  uBendBetween,
  uBendPitch,
  type Pt,
  type UBendArc,
} from "@/lib/tfl/diagram-atoms"
import {
  octilinearLanePath,
  octilinearLaneWaypoints,
} from "@/lib/tfl/schematic-layout"
import { approximateStationMeasure } from "@/lib/tfl/station-typography"
import {
  bondEdges,
  trackEdges,
  type DrawingNode,
  type DrawingScene,
  type TerminusAlong,
} from "./drawing-graph"
import { PORT_DEMO_NAMES, STATION_GROUP_NAME, type PortId } from "./types"

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
  /** Continuation past a through-tick, in the same space as x/y. */
  stub?: { x: number; y: number }
}

export type LaidDrawing = {
  nodes: LaidNode[]
  tracks: {
    id: string
    a: string
    b: string
    d: string
    /**
     * Straight sub-runs this track's own `d` actually travels through —
     * the real octilinear S/R geometry, not a chord between the two
     * endpoints. Feed `strokeClearanceBand` with this, never a
     * reconstructed `{a,b}` pair: a bent edge's stroke swings out through
     * a bend and a chord cuts across whatever space that bend goes
     * around instead of through (a neighbour's label, another lane).
     */
    spine: { a: Pt; b: Pt }[]
    /**
     * `d` broken into the same core/excess runs `/drafts/diagram-atoms`'
     * demo cards paint (`SegmentAtom`, `layoutStem`'s `segs`) — paint
     * `"excess"` with `EXCESS`, same green, same meaning: this run is
     * conservative slack `layoutDrawing` reserved for a neighbour's
     * label, not a hard minimum. A fork arm's `"excess"` is its
     * `buildStemArmPath` diagonal/flat runs; a plain edge's is whatever
     * a widened `BOUNDARY_PITCH`/`BOND_LABEL_PITCH` step added past the
     * tight default. Bends are always `"core"` — fixed curvature never
     * flexes.
     */
    segs: { d: string; paint: "core" | "excess" }[]
  }[]
  bonds: { id: string; a: string; b: string }[]
  width: number
  height: number
  energy: number
  policy: LayoutPolicy
}

const METRICS = diagramAtomMetrics()
const MAIN_PITCH = 72
/**
 * Cross-axis spacing between two lanes that have diverged at a fork. Never
 * tighter than `minimumBranchGap` — if a future metrics change shrinks
 * that margin below what 48px already clears, this grows instead of
 * silently violating it.
 */
const LANE_PITCH = ((base: number) =>
  laneEdgeGap(base, METRICS) >= minimumBranchGap(METRICS)
    ? base
    : minimumBranchGap(METRICS) + METRICS.x)(48)
const BOND_PITCH = METRICS.gappedBond
const U_BEND_PITCH = uBendPitch(METRICS)
/**
 * Cross-axis spacing for a bonded lane pair where at least one lane is
 * "pinched" (bonded on both sides, e.g. the middle lane of a walking-bond
 * chain) *and* carries its own terminus/boundary arm — its name box
 * reaches toward the next lane over, past what a bare interchange ring's
 * `BOND_PITCH` (`gappedBond`) ever had to clear. `nameCrossHalf` on both
 * side of the seam is the same room `stationLabelLayout` actually
 * reserves for a two-line name box reaching in from either mark.
 */
const BOND_LABEL_PITCH = Math.ceil(nameCrossHalf(2, METRICS))
/**
 * Canvas pad past the outermost mark. Must clear a wrapped terminus name
 * (half of `diagramLabelBoxAlong` along travel, or two name-lines past
 * `lineClearance` across travel) — single-letter ports cropped because
 * this used to be a flat 40px that ignored the name box.
 */
const PAD = Math.ceil(
  Math.max(
    diagramLabelBoxAlong(METRICS) / 2,
    METRICS.lineClearance + METRICS.nameSize * 1.35 * 2 + METRICS.boxPadFar
  )
)
/**
 * Cap so a multi-word port never grows past today's 10-character box.
 * Measure the longest whitespace token (`Cannon Street` → `Cannon`)
 * so wrap is assumed, then `min` with this half.
 */
const BOUNDARY_LABEL_HALF_CAP = Math.ceil(
  approximateStationMeasure("X".repeat(10), METRICS.nameSize) / 2
)

const nameHalf = (name: string): number => {
  const token =
    name.split(/\s+/).reduce((best, part) =>
      part.length > best.length ? part : best
    ) || name
  return Math.min(
    BOUNDARY_LABEL_HALF_CAP,
    Math.ceil(approximateStationMeasure(token, METRICS.nameSize) / 2)
  )
}

/**
 * Centre-to-centre pitch for a station↔boundary edge whose port
 * paints `PORT_DEMO_NAMES[port]` against the group label `"Station"`.
 * Never below `MAIN_PITCH`, never above the old 10-character box.
 */
const boundaryPitchFor = (port: PortId): number =>
  Math.max(
    MAIN_PITCH,
    Math.ceil(
      grownSegmentLength(
        nameHalf(STATION_GROUP_NAME),
        nameHalf(PORT_DEMO_NAMES[port]),
        METRICS
      )
    )
  )
/** Corner rounding for an ordinary jog — a cosmetic value, not the official curve. */
const CORNER = 18
/**
 * Small straight run from a fork's own mark out to where its arms start
 * diverging — `layoutStem`'s `stemCoreAt` (`pad + excess`), so a fork's
 * bend never starts curving right at the mark's own rim.
 */
/** Continuation past a through-tick, in pos units (`stub` / main pitch). */
const THROUGH_POS = METRICS.stub / MAIN_PITCH
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
const reachesAlong = (
  scene: DrawingScene,
  adj: Map<string, string[]>,
  from: string,
  first: string,
  want: TerminusAlong
): boolean => {
  const seen = new Set([from])
  const queue = [first]
  while (queue.length) {
    const id = queue.shift()!
    if (seen.has(id)) continue
    seen.add(id)
    const node = scene.nodes.find((item) => item.id === id)
    if (node?.kind === "boundary" && alongOf(scene, node) === want) return true
    for (const next of adj.get(id) ?? []) {
      if (!seen.has(next)) queue.push(next)
    }
  }
  return false
}

/**
 * A fork's own stem (the unique side that reaches `start` while the
 * other arms reach `end`) is one pos step — a straight trunk does not
 * need the extra along a 45° return arm does. Diverging arms stay at
 * two steps so `stemArmFromTo` still has room to leave, diagonal, and
 * return.
 *
 * Two forks on one edge are an arm of one and the stem of the other.
 * That join still takes the arm's two steps: a one-step stem on a
 * neighbouring lane is `|dpos| === |dlane| === 1`, which used to paint
 * as a raw slash with no peel.
 */
const forkHop = (
  scene: DrawingScene,
  adj: Map<string, string[]>,
  forkId: string,
  otherId: string
): number => {
  const neighbors = adj.get(forkId) ?? []
  const toStart = neighbors.filter((id) =>
    reachesAlong(scene, adj, forkId, id, "start")
  )
  const toEnd = neighbors.filter((id) =>
    reachesAlong(scene, adj, forkId, id, "end")
  )
  const isStem =
    (toStart.length === 1 && toEnd.length >= 2 && toStart[0] === otherId) ||
    (toEnd.length === 1 && toStart.length >= 2 && toEnd[0] === otherId)
  return isStem ? 1 : 2
}

const trackHop = (
  scene: DrawingScene,
  adj: Map<string, string[]>,
  from: DrawingNode,
  to: DrawingNode
): number => {
  if (from.kind === "fork" && to.kind === "fork") {
    return Math.max(
      forkHop(scene, adj, from.id, to.id),
      forkHop(scene, adj, to.id, from.id)
    )
  }
  if (from.kind === "fork") return forkHop(scene, adj, from.id, to.id)
  if (to.kind === "fork") return forkHop(scene, adj, to.id, from.id)
  return 1
}

/**
 * The end that owns the Y/peel recipe. A fork-to-mark arm peels at the
 * fork. A fork-to-fork join peels at the parent (the end that treats
 * the other as an arm), so the child still receives a through-stem.
 */
const peelOrigin = (
  scene: DrawingScene,
  adj: Map<string, string[]>,
  aId: string,
  bId: string,
  kindA: DrawingNode["kind"],
  kindB: DrawingNode["kind"]
): "a" | "b" | null => {
  if (kindA !== "fork" && kindB !== "fork") return null
  if (kindA === "fork" && kindB !== "fork") return "a"
  if (kindB === "fork" && kindA !== "fork") return "b"
  const aArm = forkHop(scene, adj, aId, bId) > 1
  const bArm = forkHop(scene, adj, bId, aId) > 1
  if (aArm !== bArm) return aArm ? "a" : "b"
  return sequenceIndex(scene, aId) <= sequenceIndex(scene, bId) ? "a" : "b"
}

const trackDelta = (
  scene: DrawingScene,
  nodes: Map<string, DrawingNode>,
  from: string,
  to: string
): number => {
  const a = nodes.get(from)!
  const b = nodes.get(to)!
  const adj = trackAdj(scene)
  const hop = trackHop(scene, adj, a, b)
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
  const apex = scene.hints.apex
  for (const edge of bondEdges(scene)) {
    if (apex && (edge.a === apex || edge.b === apex)) continue
    link(edge.a, edge.b, 0)
  }

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

const floatingBond = (scene: DrawingScene, a: string, b: string): boolean => {
  const apex = scene.hints.apex
  return Boolean(apex && (a === apex || b === apex))
}

const bondedLanes = (
  scene: DrawingScene,
  placement: Map<string, GridPoint>
): Set<string> => {
  const pairs = new Set<string>()
  for (const edge of bondEdges(scene)) {
    if (floatingBond(scene, edge.a, edge.b)) continue
    const a = placement.get(edge.a)
    const b = placement.get(edge.b)
    if (!a || !b || a.pos !== b.pos || a.lane === b.lane) continue
    const lo = Math.min(a.lane, b.lane)
    const hi = Math.max(a.lane, b.lane)
    pairs.add(`${lo}:${hi}`)
  }
  return pairs
}

/**
 * The base pair of a U-hosting triangle — those parallels must sit at
 * `uBendPitch`, not the tight ring `gappedBond`, so the 180° reads.
 */
const uBendBondedLanes = (
  scene: DrawingScene,
  placement: Map<string, GridPoint>
): Set<string> => {
  const apex = scene.hints.apex
  if (!apex) return new Set()
  const keys = new Set<string>()
  for (const edge of bondEdges(scene)) {
    if (edge.a === apex || edge.b === apex) continue
    const a = placement.get(edge.a)
    const b = placement.get(edge.b)
    if (!a || !b || a.pos !== b.pos || a.lane === b.lane) continue
    keys.add(`${Math.min(a.lane, b.lane)}:${Math.max(a.lane, b.lane)}`)
  }
  return keys
}

/**
 * Bonded lane pairs where the pitch must grow past `BOND_PITCH`: at
 * least one side is "pinched" (bonded to *another* lane on its far side
 * too — the middle lane of a walking-bond chain, e.g. Bank between S1
 * and Cannon Street in "Three termini") and that lane also carries its
 * own terminus/boundary arm, so its name box competes for the same
 * cross-axis room the bond itself needs. A bare two-ring interchange —
 * bonded on one side only, no arm of its own — keeps the tight default.
 */
const labeledBondedLanes = (
  scene: DrawingScene,
  placement: Map<string, GridPoint>
): Set<string> => {
  const bonded = bondedLanes(scene, placement)
  const bondCount = new Map<number, number>()
  for (const key of bonded) {
    const [lo, hi] = key.split(":").map(Number) as [number, number]
    bondCount.set(lo, (bondCount.get(lo) ?? 0) + 1)
    bondCount.set(hi, (bondCount.get(hi) ?? 0) + 1)
  }
  const pinched = new Set(
    [...bondCount].filter(([, count]) => count >= 2).map(([lane]) => lane)
  )
  const kindOf = (id: string) => scene.nodes.find((node) => node.id === id)!.kind
  const lanesWithOwnArm = new Set<number>()
  for (const edge of trackEdges(scene)) {
    const a = placement.get(edge.a)
    const b = placement.get(edge.b)
    if (!a || !b || a.pos === b.pos) continue
    if (kindOf(edge.a) === "boundary") lanesWithOwnArm.add(b.lane)
    if (kindOf(edge.b) === "boundary") lanesWithOwnArm.add(a.lane)
  }
  const labeled = new Set<string>()
  for (const key of bonded) {
    const [lo, hi] = key.split(":").map(Number) as [number, number]
    const pinchedSide = pinched.has(lo) || pinched.has(hi)
    const ownArm = lanesWithOwnArm.has(lo) || lanesWithOwnArm.has(hi)
    if (pinchedSide && ownArm) labeled.add(key)
  }
  return labeled
}

const laneCross = (
  scene: DrawingScene,
  placement: Map<string, GridPoint>
): Map<number, number> => {
  const bonded = bondedLanes(scene, placement)
  const labeled = labeledBondedLanes(scene, placement)
  const uBend = uBendBondedLanes(scene, placement)
  const spans = [...bonded].map((key) => {
    const [lo, hi] = key.split(":").map(Number) as [number, number]
    return { lo, hi }
  })
  const lanes = [
    ...new Set([...placement.values()].map((point) => point.lane)),
  ].sort((a, b) => a - b)
  const cross = new Map<number, number>()
  let acc = 0
  for (let i = 0; i < lanes.length; i++) {
    const lane = lanes[i]!
    if (i > 0) {
      const prev = lanes[i - 1]!
      const steps = lane - prev
      const key = `${prev}:${lane}`
      const direct = bonded.has(key)
      const cover = spans.find((span) => prev >= span.lo && lane <= span.hi)
      if (direct) {
        const bond = labeled.has(key) ? BOND_LABEL_PITCH : BOND_PITCH
        acc += (uBend.has(key) ? Math.max(bond, U_BEND_PITCH) : bond) * steps
      } else if (cover) {
        const coverKey = `${cover.lo}:${cover.hi}`
        const bond = labeled.has(coverKey) ? BOND_LABEL_PITCH : BOND_PITCH
        const pitch = uBend.has(coverKey) ? Math.max(bond, U_BEND_PITCH) : bond
        acc += (pitch * steps) / (cover.hi - cover.lo)
      } else {
        acc += LANE_PITCH * steps
      }
    }
    cross.set(lane, acc)
  }
  return cross
}

/**
 * `pos` pairs (lower:upper) directly joined by a station↔boundary
 * track edge, mapped to that edge's own name-driven pitch. Several
 * edges on the same step take the max.
 */
const boundaryPitchSteps = (
  scene: DrawingScene,
  placement: Map<string, GridPoint>
): Map<string, number> => {
  const nodeOf = (id: string) => scene.nodes.find((node) => node.id === id)!
  const pitches = new Map<string, number>()
  for (const edge of trackEdges(scene)) {
    const a = placement.get(edge.a)
    const b = placement.get(edge.b)
    if (!a || !b || a.pos === b.pos) continue
    const nodeA = nodeOf(edge.a)
    const nodeB = nodeOf(edge.b)
    const kinds = new Set([nodeA.kind, nodeB.kind])
    if (!kinds.has("station") || !kinds.has("boundary")) continue
    const port = (nodeA.kind === "boundary" ? nodeA.port : nodeB.port) as
      | PortId
      | undefined
    if (!port) continue
    const key = `${Math.min(a.pos, b.pos)}:${Math.max(a.pos, b.pos)}`
    pitches.set(key, Math.max(pitches.get(key) ?? 0, boundaryPitchFor(port)))
  }
  return pitches
}

/**
 * Cumulative main-axis offset per distinct `pos`, mirroring `laneCross`
 * but along travel: the step between two consecutive `pos` values is
 * the per-name `boundaryPitchFor` when a station↔boundary edge spans
 * it and the ordinary `MAIN_PITCH` otherwise. Extends the line, never
 * moves a label off its mark.
 */
const mainAxisOffsets = (
  scene: DrawingScene,
  placement: Map<string, GridPoint>
): Map<number, number> => {
  const wide = boundaryPitchSteps(scene, placement)
  const positions = [
    ...new Set([...placement.values()].map((point) => point.pos)),
  ].sort((a, b) => a - b)
  const offsets = new Map<number, number>()
  let acc = 0
  for (let i = 0; i < positions.length; i++) {
    const pos = positions[i]!
    if (i > 0) {
      const prev = positions[i - 1]!
      const steps = pos - prev
      const pitch = wide.get(`${prev}:${pos}`) ?? MAIN_PITCH
      acc += pitch * steps
    }
    offsets.set(pos, acc)
  }
  return offsets
}

const toXY = (
  main: number,
  lane: number,
  crossAt: Map<number, number>,
  policy: LayoutPolicy
): { x: number; y: number } => {
  const mainCoord = PAD + main
  const cross = PAD + (crossAt.get(lane) ?? 0)
  if (policy.primary === "left") {
    return { x: -mainCoord, y: cross }
  }
  if (policy.primary === "up") {
    return { x: cross, y: -mainCoord }
  }
  if (policy.primary === "down") {
    return { x: cross, y: mainCoord }
  }
  return { x: mainCoord, y: cross }
}

const mainAxis = (policy: LayoutPolicy): "x" | "y" =>
  policy.primary === "up" || policy.primary === "down" ? "y" : "x"

/**
 * A fork arm's bend, built from the same `buildStemArmPath` recipe
 * `/drafts/diagram-atoms`'s `layoutStem` uses — not a look-alike arc —
 * so a Y/peel fork reads identically on both pages. `forkPt`/`tipPt` are
 * real SVG coordinates; `mapPt` carries the arm's local along/cross
 * frame (fork at the origin, along increasing toward the tip) into that
 * same space, mirroring `layoutStem`'s own local-to-SVG mapping.
 */
const forkArmGeometry = (
  forkPt: { x: number; y: number },
  tipPt: { x: number; y: number },
  axis: "x" | "y"
): {
  d: string
  spine: { a: Pt; b: Pt }[]
  segs: { d: string; paint: "core" | "excess" }[]
} => stemArmFromTo(forkPt, tipPt, axis, METRICS)

/**
 * Splits a plain chord into a core run and a trailing/leading excess
 * run of length `excess`, the same "reserved past the tight default"
 * slack `BOUNDARY_PITCH`/`BOND_LABEL_PITCH` already added at layout
 * time — paint it `EXCESS`, same as `layoutStem`'s own core/excess
 * split, instead of leaving it invisibly baked into one black chord.
 */
const splitChordExcess = (
  a: Pt,
  b: Pt,
  excess: number,
  nearB: boolean
): { d: string; paint: "core" | "excess" }[] => {
  const line = (p: Pt, q: Pt) => `M ${p.x} ${p.y} L ${q.x} ${q.y}`
  const total = Math.hypot(b.x - a.x, b.y - a.y)
  const amt = Math.min(Math.max(0, excess), total)
  if (amt < 0.5) return [{ d: line(a, b), paint: "core" }]
  const t = amt / total
  const cut = nearB
    ? { x: b.x - (b.x - a.x) * t, y: b.y - (b.y - a.y) * t }
    : { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
  return nearB
    ? [
        { d: line(a, cut), paint: "core" },
        { d: line(cut, b), paint: "excess" },
      ]
    : [
        { d: line(a, cut), paint: "excess" },
        { d: line(cut, b), paint: "core" },
      ]
}

const chordGeometry = (
  a: Pt,
  b: Pt,
  fromKind: DrawingNode["kind"],
  toKind: DrawingNode["kind"],
  boundaryExcess: number
): {
  d: string
  spine: { a: Pt; b: Pt }[]
  segs: { d: string; paint: "core" | "excess" }[]
} => {
  const d = `M ${a.x} ${a.y} L ${b.x} ${b.y}`
  const excess =
    fromKind === "boundary" || toKind === "boundary" ? boundaryExcess : 0
  const segs =
    excess > 0
      ? splitChordExcess(a, b, excess, toKind === "boundary")
      : [{ d, paint: "core" as const }]
  return { d, spine: [{ a, b }], segs }
}

const trackGeometry = (
  a: { x: number; y: number },
  b: { x: number; y: number },
  gridA: GridPoint,
  gridB: GridPoint,
  policy: LayoutPolicy,
  fromKind: DrawingNode["kind"],
  toKind: DrawingNode["kind"],
  /** Per-name `boundaryPitchFor` minus `MAIN_PITCH` when this edge's
   * own step was widened for a competing boundary/station label. */
  boundaryExcess: number,
  /** Which endpoint owns the Y/peel recipe, if either is a fork. */
  peelFrom: "a" | "b" | null
): {
  d: string
  spine: { a: Pt; b: Pt }[]
  segs: { d: string; paint: "core" | "excess" }[]
} => {
  const axis = mainAxis(policy)
  const dpos = gridB.pos - gridA.pos
  const dlane = gridB.lane - gridA.lane
  const aligned = dpos === 0 || dlane === 0
  if (aligned) return chordGeometry(a, b, fromKind, toKind, boundaryExcess)
  if (peelFrom) {
    const forkPt = peelFrom === "a" ? a : b
    const tipPt = peelFrom === "a" ? b : a
    return forkArmGeometry(forkPt, tipPt, axis)
  }
  if (Math.abs(dpos) === Math.abs(dlane)) {
    return chordGeometry(a, b, fromKind, toKind, boundaryExcess)
  }
  const leftoverAt = "split"
  const d = octilinearLanePath(a.x, a.y, b.x, b.y, CORNER, axis, leftoverAt)
  return {
    d,
    spine: octilinearLaneWaypoints(a.x, a.y, b.x, b.y, CORNER, axis, leftoverAt),
    segs: [{ d, paint: "core" }],
  }
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

const stubGrid = (
  scene: DrawingScene,
  node: DrawingNode,
  grid: GridPoint
): GridPoint | null => {
  if (node.kind !== "boundary") return null
  const along = alongOf(scene, node) === "end" ? 1 : -1
  return { pos: grid.pos + along * THROUGH_POS, lane: grid.lane }
}

/**
 * One 180° through-run joining the two parallels that an every-pair
 * apex cannot connect with a straight stroke. Graph edges S3–B / S3–C
 * stay for pathfinding; only the first is painted, as this arc.
 */
const apexUBend = (
  scene: DrawingScene,
  at: (id: string) => { x: number; y: number } | undefined,
  policy: LayoutPolicy
): { paintedOn: string; arc: UBendArc } | null => {
  const apexId = scene.hints.apex
  if (!apexId) return null
  const apexTracks = trackEdges(scene).filter(
    (edge) => edge.a === apexId || edge.b === apexId
  )
  if (apexTracks.length < 2) return null
  const termini = apexTracks.map((edge) =>
    edge.a === apexId ? edge.b : edge.a
  )
  const t0 = at(termini[0]!)
  const t1 = at(termini[1]!)
  const apexPt = at(apexId)
  if (!t0 || !t1 || !apexPt) return null
  const axis = mainAxis(policy)
  const toward = { x: (t0.x + t1.x) / 2, y: (t0.y + t1.y) / 2 }
  const alongSign =
    (axis === "x" ? Math.sign(toward.x - apexPt.x) : Math.sign(toward.y - apexPt.y)) ||
    1
  const joinAlong =
    (axis === "x" ? apexPt.x : apexPt.y) +
    alongSign * (METRICS.ringRadius + METRICS.x)
  const joinA =
    axis === "x" ? { x: joinAlong, y: t0.y } : { x: t0.x, y: joinAlong }
  const joinB =
    axis === "x" ? { x: joinAlong, y: t1.y } : { x: t1.x, y: joinAlong }
  return {
    paintedOn: apexTracks[0]!.id,
    arc: uBendBetween(joinA, joinB, toward),
  }
}

export const layoutDrawing = (
  scene: DrawingScene,
  policy: LayoutPolicy = DEFAULT_LAYOUT_POLICY
): LaidDrawing => {
  const placement = collapseDrawing(scene)
  const energy = scorePlacement(scene, placement, policy)
  const crossAt = laneCross(scene, placement)
  const mainAt = mainAxisOffsets(scene, placement)
  const wideSteps = boundaryPitchSteps(scene, placement)
  const kindOf = (id: string) =>
    scene.nodes.find((node) => node.id === id)!.kind
  const adj = trackAdj(scene)
  const raw = new Map<string, { x: number; y: number }>()
  const rawStubs = new Map<string, { x: number; y: number }>()
  for (const node of scene.nodes) {
    const grid = placement.get(node.id)!
    const main = mainAt.get(grid.pos) ?? 0
    raw.set(node.id, toXY(main, grid.lane, crossAt, policy))
    if (policy.end !== "through") continue
    const stub = stubGrid(scene, node, grid)
    // A through-tick's own continuation is a small fixed extra, not a
    // label-driven gap — the ordinary pitch, added past this node's own
    // (possibly grown) main offset, not looked up by its own `pos`.
    if (stub) {
      const stubMain = main + (stub.pos - grid.pos) * MAIN_PITCH
      rawStubs.set(node.id, toXY(stubMain, stub.lane, crossAt, policy))
    }
  }
  const apexId = scene.hints.apex
  if (apexId) {
    const baseIds = bondEdges(scene)
      .filter((edge) => edge.a === apexId || edge.b === apexId)
      .map((edge) => (edge.a === apexId ? edge.b : edge.a))
    const baseA = baseIds[0] ? raw.get(baseIds[0]) : undefined
    const baseB = baseIds[1] ? raw.get(baseIds[1]) : undefined
    const apexPt = raw.get(apexId)
    if (baseA && baseB && apexPt) {
      const toward = toXY(
        (mainAt.get(placement.get(apexId)!.pos) ?? 0) + MAIN_PITCH,
        placement.get(apexId)!.lane,
        crossAt,
        policy
      )
      raw.set(apexId, triangleApexFromBase(baseA, baseB, toward))
    }
  }
  const uPreview = apexUBend(scene, (id) => raw.get(id), policy)
  if (uPreview) {
    const axis = mainAxis(policy)
    const alongOfPt = (point: { x: number; y: number }) =>
      axis === "x" ? point.x : point.y
    const joinMid = {
      x: (uPreview.arc.tipA.x + uPreview.arc.tipB.x) / 2,
      y: (uPreview.arc.tipA.y + uPreview.arc.tipB.y) / 2,
    }
    const alongSign =
      Math.sign(alongOfPt(uPreview.arc.nose) - alongOfPt(joinMid)) || 1
    const pastNose =
      alongOfPt(uPreview.arc.nose) + alongSign * (METRICS.tickAlong + METRICS.x)
    for (const edge of trackEdges(scene)) {
      if (edge.a !== apexId && edge.b !== apexId) continue
      const tipId = edge.a === apexId ? edge.b : edge.a
      const tip = raw.get(tipId)
      if (!tip) continue
      const delta = pastNose - alongOfPt(tip)
      if (alongSign * delta <= 0) continue
      raw.set(
        tipId,
        axis === "x" ? { ...tip, x: tip.x + delta } : { ...tip, y: tip.y + delta }
      )
      const stub = rawStubs.get(tipId)
      if (stub) {
        rawStubs.set(
          tipId,
          axis === "x"
            ? { ...stub, x: stub.x + delta }
            : { ...stub, y: stub.y + delta }
        )
      }
    }
  }
  const box = boundsOf([
    ...raw.values(),
    ...rawStubs.values(),
    ...(uPreview ? [uPreview.arc.nose] : []),
  ])
  const shiftX = PAD - box.minX
  const shiftY = PAD - box.minY
  const shift = (point: { x: number; y: number }) => ({
    x: point.x + shiftX,
    y: point.y + shiftY,
  })
  const xy = (id: string) => shift(raw.get(id)!)
  const uPaint = apexUBend(scene, xy, policy)

  const nodes: LaidNode[] = scene.nodes.map((node) => {
    const grid = placement.get(node.id)!
    const point = xy(node.id)
    const stub = rawStubs.get(node.id)
    return {
      id: node.id,
      kind: node.kind,
      port: node.port,
      pos: grid.pos,
      lane: grid.lane,
      x: point.x,
      y: point.y,
      ...(stub ? { stub: shift(stub) } : {}),
    }
  })

  return {
    nodes,
    tracks: trackEdges(scene).map((edge) => {
      if (uPaint && (edge.a === apexId || edge.b === apexId)) {
        if (edge.id !== uPaint.paintedOn) {
          return {
            id: edge.id,
            a: edge.a,
            b: edge.b,
            d: "",
            spine: [],
            segs: [],
          }
        }
        const { arc } = uPaint
        return {
          id: edge.id,
          a: edge.a,
          b: edge.b,
          d: arc.d,
          spine: [
            { a: arc.tipA, b: arc.nose },
            { a: arc.nose, b: arc.tipB },
          ],
          segs: [{ d: arc.d, paint: "core" as const }],
        }
      }
      const a = xy(edge.a)
      const b = xy(edge.b)
      const stubA = rawStubs.get(edge.a)
      const stubB = rawStubs.get(edge.b)
      const gridA = placement.get(edge.a)!
      const gridB = placement.get(edge.b)!
      const stepPitch =
        wideSteps.get(
          `${Math.min(gridA.pos, gridB.pos)}:${Math.max(gridA.pos, gridB.pos)}`
        ) ?? MAIN_PITCH
      const boundaryExcess = Math.max(0, stepPitch - MAIN_PITCH)
      const mid = trackGeometry(
        a,
        b,
        gridA,
        gridB,
        policy,
        kindOf(edge.a),
        kindOf(edge.b),
        boundaryExcess,
        peelOrigin(
          scene,
          adj,
          edge.a,
          edge.b,
          kindOf(edge.a),
          kindOf(edge.b)
        )
      )
      const d = [
        stubA ? `M ${shift(stubA).x} ${shift(stubA).y} L ${a.x} ${a.y}` : "",
        mid.d,
        stubB ? `L ${shift(stubB).x} ${shift(stubB).y}` : "",
      ]
        .filter(Boolean)
        .join(" ")
      const spine: { a: Pt; b: Pt }[] = [
        ...(stubA ? [{ a: shift(stubA), b: a }] : []),
        ...mid.spine,
        ...(stubB ? [{ a: b, b: shift(stubB) }] : []),
      ]
      const line = (p: Pt, q: Pt) => `M ${p.x} ${p.y} L ${q.x} ${q.y}`
      const segs: { d: string; paint: "core" | "excess" }[] = [
        ...(stubA ? [{ d: line(shift(stubA), a), paint: "core" as const }] : []),
        ...mid.segs,
        ...(stubB ? [{ d: line(b, shift(stubB)), paint: "core" as const }] : []),
      ]
      return {
        id: edge.id,
        a: edge.a,
        b: edge.b,
        d,
        spine,
        segs,
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
