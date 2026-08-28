/**
 * Staggered virtual Y-join decomposition for the HORIZONTAL branch strip.
 *
 * `computeBranchSchematicLayout` places one render node per (lane, pos) and
 * lets every incident edge attach to that node directly. That is correct for
 * a true 2-in-1-out / 1-in-2-out junction, but wrong once a station collects
 * 4+ incident edges (District Earl's Court, Northern Camden Town /
 * Kennington, DLR Poplar / Canning Town): the strip should read as a
 * sequence of Ys, not a star into one ring.
 *
 * This module is a pure graph rewrite that runs AFTER lane/pos placement.
 * For every labelled node whose incident-edge count exceeds 3, it either:
 *
 * - leaves the node alone, when every incident edge is a genuine mutual
 *   through-move (a confirmed "diamond" — Camden Town: Edgware/High Barnet
 *   both reach Bank and Charing Cross), or
 * - splits the node into one unlabelled dot per station when the best
 *   matching covers every edge but the movements are NOT a full diamond
 *   (Poplar, Canning Town, Kennington: two independent through-pairs that
 *   happen to share a platform) — each blob stays on the lane its own pair
 *   already occupies, at the SAME `pos` as the original node, so two blobs
 *   never travel as a parallel pair of bends (no twin S-hump), or
 * - keeps the single strongest through-pair on the labelled node and peels
 *   every other edge onto a chain of unlabelled virtual joins spliced into
 *   the kept pair's own edges (the "gutter" between stations), so any one
 *   render point stays a Y.
 *
 * "Through-move" preference comes from a caller-supplied
 * `ThroughMovementWeight` (real TfL ordered-route triples via
 * `lib/tfl/geometry/tfl-sequences-topology.ts` when available) — the same
 * selection rule the geographic line-topology page uses
 * (`movementsFromPatterns` / `movementPairs`): a real ordered route visiting
 * `…a, via, b…` is a through-move; a 4-neighbour station whose best matching
 * covers every leg without being a full diamond splits into bonded halves,
 * exactly like `split-bonded-stations.ts` does for the geographic pipeline.
 * Only the *geometry* differs (a lane×pos grid has no stress-relaxed
 * continuous coordinates to lean on), not the join-order rule. Without a
 * `ThroughMovementWeight`, a pair is only a candidate when its two
 * neighbours sit on opposite sides of the station along `pos` — a
 * through-move must enter from one side and leave from the other.
 *
 * Every peeled arm gets enough `Δpos` from its own target for
 * `octilinearLanePath` to draw a real 45° S (see `requiredGutterPos`) —
 * otherwise a lane change falls back to a 90° stair, which is what this
 * pass exists to avoid. When the station's existing neighbours don't leave
 * room, the pass stretches the strip: everything beyond the kept anchor on
 * that side moves further out (see `planPeelSide` / `applyPosStretch`).
 *
 * HORIZONTAL ONLY: a peeled arm sits above/below the trunk (lane), the
 * trunk itself keeps running along `pos`. Vertical schematics are untouched.
 */

import { HORIZONTAL_LANE_TO_MAIN_POS_RATIO } from "@/lib/tfl/branch-strip-layout"
import type {
  LineSchematic,
  SchematicEdge,
  SchematicNode,
} from "@/lib/tfl/line-schematic"

/**
 * Weight of a through-move `a ↔ b` via `viaNodeId`.
 * - `undefined`: no data — caller falls back to the opposite-sides heuristic.
 * - `0`: confirmed NOT a valid movement (e.g. Kennington Bank ↔ Battersea).
 * - `> 0`: confirmed valid; higher wins when several pairs compete.
 */
export type ThroughMovementWeight = (
  viaNodeId: string,
  neighborAId: string,
  neighborBId: string
) => number | undefined

export type DecomposeBranchStripJunctionsOptions = {
  throughWeight?: ThroughMovementWeight
}

type Neighbour = {
  edgeIndex: number
  role: "from" | "to"
  neighborId: string
}

type WeightInfo = { value: number; confirmed: boolean }

type EndChain =
  | { mode: "keep" }
  | { mode: "replace"; ids: readonly string[] }
  | { mode: "extend"; ids: readonly string[] }

/**
 * Extra clearance beyond the bare `octilinearLanePath` 45° minimum
 * (`Δlane × HORIZONTAL_LANE_TO_MAIN_POS_RATIO`) so a peel gets a real fillet,
 * not one clamped to a sliver. Tune alongside `requiredGutterPos`'s tests if
 * `LINE_DIAGRAM` corner radii change materially.
 */
const GUTTER_SAFETY_MARGIN = 0.5
/** Extra spacing between two virtual joins chained on the same side. */
const CHAIN_MARGIN = 0.2

/**
 * Minimum `|Δpos|` a peeled arm needs from the node it actually connects to
 * (its real target, or the station it peels off) before `octilinearLanePath`
 * can draw a 45° S instead of falling back to a 90° R stair. Exported so
 * tests can assert every surviving lane-change edge clears it.
 */
export const requiredGutterPos = (laneDelta: number): number =>
  Math.abs(laneDelta) * HORIZONTAL_LANE_TO_MAIN_POS_RATIO + GUTTER_SAFETY_MARGIN

const sideOf = (
  nodeById: ReadonlyMap<string, SchematicNode>,
  via: SchematicNode,
  neighborId: string
): -1 | 0 | 1 => {
  const other = nodeById.get(neighborId)
  if (!other) return 0
  return Math.sign(other.pos - via.pos) as -1 | 0 | 1
}

const neighboursOf = (
  nodeId: string,
  edges: readonly SchematicEdge[]
): Neighbour[] => {
  const found: Neighbour[] = []
  edges.forEach((edge, edgeIndex) => {
    if (edge.from === nodeId && edge.to === nodeId) return
    if (edge.from === nodeId)
      found.push({ edgeIndex, role: "from", neighborId: edge.to })
    else if (edge.to === nodeId)
      found.push({ edgeIndex, role: "to", neighborId: edge.from })
  })
  return found.sort((a, b) => a.neighborId.localeCompare(b.neighborId))
}

/**
 * Weight of pairing neighbours `a` and `b` as a through-move at `via`.
 * Confirmed data (declared valid or declared invalid) always wins over the
 * geometric fallback.
 */
const pairWeight = (
  via: SchematicNode,
  nodeById: ReadonlyMap<string, SchematicNode>,
  a: Neighbour,
  b: Neighbour,
  throughWeight: ThroughMovementWeight | undefined,
  viaId: string
): WeightInfo => {
  const declared =
    throughWeight?.(viaId, a.neighborId, b.neighborId) ??
    throughWeight?.(viaId, b.neighborId, a.neighborId)
  const aNode = nodeById.get(a.neighborId)
  const bNode = nodeById.get(b.neighborId)
  if (declared != null) {
    // A tiny, deterministic tie-break — never enough to outrank a real
    // movement-count difference — so that when two confirmed pairs are
    // equally strong, the one that keeps both legs on `via`'s own lane
    // wins (a straight kept pair; the other candidate peels instead of
    // becoming an anchor whose OWN edge is already a lane change).
    const bothSpine = aNode?.lane === via.lane && bNode?.lane === via.lane
    const value = declared > 0 && bothSpine ? declared + 0.02 : declared
    return { value, confirmed: true }
  }

  const sideA = sideOf(nodeById, via, a.neighborId)
  const sideB = sideOf(nodeById, via, b.neighborId)
  if (sideA === 0 || sideB === 0 || sideA === sideB) {
    return { value: 0, confirmed: false }
  }
  let value = 1
  if (aNode?.lane === via.lane) value += 0.5
  if (bNode?.lane === via.lane) value += 0.5
  return { value, confirmed: false }
}

type Matching = { total: number; pairs: [number, number][] }

/** Maximum-weight matching over a small neighbour set (degree ≤ ~8 in practice). */
const bestMatching = (
  n: number,
  weightOf: (i: number, j: number) => number
): Matching => {
  let best: Matching = { total: 0, pairs: [] }
  const used = new Array<boolean>(n).fill(false)
  const current: [number, number][] = []

  const record = (total: number) => {
    if (
      total > best.total ||
      (total === best.total && current.length > best.pairs.length)
    ) {
      best = { total, pairs: [...current] }
    }
  }

  const search = (start: number, total: number) => {
    record(total)
    for (let i = start; i < n; i += 1) {
      if (used[i]) continue
      for (let j = i + 1; j < n; j += 1) {
        if (used[j]) continue
        const w = weightOf(i, j)
        if (w <= 0) continue
        used[i] = true
        used[j] = true
        current.push([i, j])
        search(i + 1, total + w)
        current.pop()
        used[i] = false
        used[j] = false
      }
    }
  }

  search(0, 0)
  return best
}

type NodePlan =
  | { kind: "unchanged" }
  | { kind: "blobs"; pairs: [Neighbour, Neighbour][] }
  | {
      kind: "peel"
      kept: Neighbour[] // 0, 1, or 2 neighbours that stay on the labelled node
      toPeel: Neighbour[]
    }

/**
 * Chooses which pair(s) of a high-degree station's legs are the real
 * through-moves. Mirrors `movementPairs` (undirected `via|a|b` grouping) +
 * `split-bonded-stations`'s perfect-matching test on the geographic
 * pipeline — same rule, just evaluated over this station's own legs instead
 * of a stress-relaxed neighbour set.
 */
const planNode = (
  via: SchematicNode,
  neighbours: readonly Neighbour[],
  nodeById: ReadonlyMap<string, SchematicNode>,
  throughWeight: ThroughMovementWeight | undefined
): NodePlan => {
  const weightOf = (i: number, j: number): WeightInfo =>
    pairWeight(
      via,
      nodeById,
      neighbours[i]!,
      neighbours[j]!,
      throughWeight,
      via.id
    )

  const west = neighbours.filter((n) => sideOf(nodeById, via, n.neighborId) < 0)
  const east = neighbours.filter((n) => sideOf(nodeById, via, n.neighborId) > 0)
  const same = neighbours.filter(
    (n) => sideOf(nodeById, via, n.neighborId) === 0
  )

  if (same.length === 0 && west.length > 0 && east.length > 0) {
    const complete = west.every((w) =>
      east.every((e) => {
        const info = pairWeight(via, nodeById, w, e, throughWeight, via.id)
        return info.confirmed && info.value > 0
      })
    )
    if (complete) return { kind: "unchanged" }
  }

  const matching = bestMatching(
    neighbours.length,
    (i, j) => weightOf(i, j).value
  )
  const matchedIndices = new Set(matching.pairs.flat())
  const unmatched = neighbours
    .map((_, index) => index)
    .filter((index) => !matchedIndices.has(index))

  if (unmatched.length === 0 && matching.pairs.length >= 2) {
    return {
      kind: "blobs",
      pairs: matching.pairs.map(
        ([i, j]) => [neighbours[i]!, neighbours[j]!] as [Neighbour, Neighbour]
      ),
    }
  }

  let keptPairIdx: [number, number] | null = null
  let keptWeight = -Infinity
  for (const pair of matching.pairs) {
    const w = weightOf(pair[0], pair[1]).value
    if (w > keptWeight) {
      keptWeight = w
      keptPairIdx = pair
    }
  }

  const kept: Neighbour[] = keptPairIdx
    ? [neighbours[keptPairIdx[0]]!, neighbours[keptPairIdx[1]]!]
    : neighbours.length > 0
      ? [neighbours[0]!]
      : []
  const keptIds = new Set(kept.map((n) => `${n.edgeIndex}:${n.role}`))
  const toPeel = neighbours.filter(
    (n) => !keptIds.has(`${n.edgeIndex}:${n.role}`)
  )

  return { kind: "peel", kept, toPeel }
}

const distanceFromVia = (
  via: SchematicNode,
  nodeById: ReadonlyMap<string, SchematicNode>,
  neighbour: Neighbour
): number =>
  Math.abs((nodeById.get(neighbour.neighborId)?.pos ?? via.pos) - via.pos)

/** One side (west or east) of one decomposed junction, in ORIGINAL coordinates. */
type PeelSidePlan = {
  via: SchematicNode
  anchor: Neighbour | undefined
  side: -1 | 1
  /** `peels`, ordered outward: index 0 gets the smallest `reach`. */
  ordered: Neighbour[]
  /** `via.pos + side * reach[i]` — how far out each virtual join sits. */
  reach: number[]
}

/** `{ pivotPos, direction, amount }` — see `applyPosStretch`. */
type PosStretch = { pivotPos: number; direction: -1 | 1; amount: number }

/**
 * Reach + required stretch for one side of one junction, computed entirely
 * from ORIGINAL (pre-stretch) coordinates so multiple junctions' stretches
 * compose independently of processing order.
 */
const planPeelSide = (
  via: SchematicNode,
  anchor: Neighbour | undefined,
  peels: readonly Neighbour[],
  side: -1 | 1,
  nodeById: ReadonlyMap<string, SchematicNode>
): { plan: PeelSidePlan; stretch: PosStretch | null } | null => {
  if (peels.length === 0) return null
  const ordered = [...peels].sort(
    (a, b) =>
      distanceFromVia(via, nodeById, b) - distanceFromVia(via, nodeById, a)
  )
  const gutters = ordered.map((peel) => {
    const target = nodeById.get(peel.neighborId)
    const laneDelta = target ? target.lane - via.lane : 1
    return requiredGutterPos(laneDelta)
  })
  // Small, purely-sequencing reach — index 0 sits nearest `via`. Actual
  // clearance from each peel's own target comes from the stretch below (or,
  // with no anchor to stretch, from extending this reach directly).
  const reach = ordered.map((_, index) => (index + 1) * CHAIN_MARGIN)

  if (!anchor) {
    // Nothing real on this side to protect from a stretch — extend past
    // whichever target would otherwise sit too close, keeping the chain
    // monotonically increasing outward from `via`.
    const adjusted = [...reach]
    ordered.forEach((peel, index) => {
      const target = nodeById.get(peel.neighborId)
      const targetPos = target?.pos ?? via.pos
      const minReach = Math.abs(via.pos - targetPos) + gutters[index]!
      adjusted[index] = Math.max(adjusted[index]!, minReach)
      if (index > 0) {
        adjusted[index] = Math.max(
          adjusted[index]!,
          adjusted[index - 1]! + CHAIN_MARGIN
        )
      }
    })
    return {
      plan: { via, anchor, side, ordered, reach: adjusted },
      stretch: null,
    }
  }

  let stretchNeeded = 0
  ordered.forEach((peel, index) => {
    const target = nodeById.get(peel.neighborId)
    const targetPos = target?.pos ?? via.pos
    const baseGap = Math.abs(via.pos - targetPos)
    const need = gutters[index]! - baseGap + reach[index]!
    if (need > stretchNeeded) stretchNeeded = need
  })
  // The kept pair isn't always a same-lane spine (a tie in real movement
  // data can leave `via`'s strongest through-move on a lane change). The
  // outermost virtual join still has to clear the ANCHOR itself before the
  // chain reaches it, not just each peel's own target.
  const anchorNode = nodeById.get(anchor.neighborId)
  if (anchorNode && anchorNode.lane !== via.lane) {
    const anchorGutter = requiredGutterPos(anchorNode.lane - via.lane)
    const anchorBaseGap = Math.abs(via.pos - anchorNode.pos)
    const outermostReach = reach[reach.length - 1] ?? 0
    const need = anchorGutter - anchorBaseGap + outermostReach
    if (need > stretchNeeded) stretchNeeded = need
  }
  stretchNeeded = Math.max(0, stretchNeeded)

  return {
    plan: { via, anchor, side, ordered, reach },
    stretch:
      stretchNeeded > 0
        ? { pivotPos: via.pos, direction: side, amount: stretchNeeded }
        : null,
  }
}

/**
 * Every node strictly on `direction`'s side of `pivotPos` (using its
 * ORIGINAL position) moves `amount` further away. Multiple stretches
 * compose by summing every one a position originally qualified for — see
 * the module doc for why this composes correctly across junctions.
 */
const applyPosStretch = (
  stretches: readonly PosStretch[],
  originalPos: number
): number => {
  let delta = 0
  for (const stretch of stretches) {
    if (stretch.direction === -1 && originalPos < stretch.pivotPos) {
      delta -= stretch.amount
    } else if (stretch.direction === 1 && originalPos > stretch.pivotPos) {
      delta += stretch.amount
    }
  }
  return originalPos + delta
}

export const decomposeBranchStripJunctions = (
  schematic: LineSchematic,
  options: DecomposeBranchStripJunctionsOptions = {}
): LineSchematic => {
  if (schematic.orientation !== "horizontal") return schematic
  if (schematic.nodes.length === 0) return schematic

  const nodeById = new Map(schematic.nodes.map((node) => [node.id, node]))
  const edges = schematic.edges
  let changed = false

  let virtualCounter = 0
  const nextVirtualId = (baseId: string): string =>
    `${baseId}--join-${(virtualCounter += 1)}`

  const blobNodesByOriginal = new Map<string, SchematicNode[]>()
  const edgeFromChain = new Map<number, EndChain>()
  const edgeToChain = new Map<number, EndChain>()
  const extraEdges: SchematicEdge[] = []
  const peelSidePlans: PeelSidePlan[] = []
  const posStretches: PosStretch[] = []

  const setChain = (neighbour: Neighbour, chain: EndChain) => {
    if (neighbour.role === "from") edgeFromChain.set(neighbour.edgeIndex, chain)
    else edgeToChain.set(neighbour.edgeIndex, chain)
  }

  for (const node of schematic.nodes) {
    if (node.kind === "virtual") continue
    const neighbours = neighboursOf(node.id, edges)
    if (neighbours.length <= 3) continue

    const plan = planNode(node, neighbours, nodeById, options.throughWeight)

    if (plan.kind === "unchanged") continue
    changed = true

    if (plan.kind === "blobs") {
      const letters = "abcdefghijklmnopqrstuvwxyz"
      const blobs: SchematicNode[] = plan.pairs.map((pair, index) => {
        const blobId = `${node.id}~${letters[index] ?? index}`
        const [a, b] = pair
        const aNode = nodeById.get(a.neighborId)
        const bNode = nodeById.get(b.neighborId)
        // Stay on the pair's own lane — same `pos` as the original station —
        // so two blobs never travel as a matching pair of bends. If the
        // pair's two legs don't already share a lane, keep the labelled
        // node's own lane when either leg used it; otherwise take the
        // lower of the two (deterministic, still a real single-sided bend).
        const lane =
          aNode && bNode && aNode.lane === bNode.lane
            ? aNode.lane
            : aNode?.lane === node.lane
              ? node.lane
              : bNode?.lane === node.lane
                ? node.lane
                : Math.min(aNode?.lane ?? node.lane, bNode?.lane ?? node.lane)
        const branchIds = [
          ...new Set(
            [edges[a.edgeIndex]?.branchId, edges[b.edgeIndex]?.branchId].filter(
              (id): id is string => Boolean(id)
            )
          ),
        ]
        const blobNode: SchematicNode = {
          id: blobId,
          name: node.name,
          lane,
          pos: node.pos,
          kind: node.kind,
          branchIds,
          stationKey: node.stationKey ?? node.id,
        }
        setChain(a, { mode: "replace", ids: [blobId] })
        setChain(b, { mode: "replace", ids: [blobId] })
        return blobNode
      })
      blobNodesByOriginal.set(node.id, blobs)
      continue
    }

    // plan.kind === "peel"
    const westAnchor = plan.kept.find(
      (n) => sideOf(nodeById, node, n.neighborId) < 0
    )
    const eastAnchor = plan.kept.find(
      (n) => sideOf(nodeById, node, n.neighborId) > 0
    )
    const fallbackSide: -1 | 1 = westAnchor && !eastAnchor ? -1 : 1

    const westPeels: Neighbour[] = []
    const eastPeels: Neighbour[] = []
    for (const peel of plan.toPeel) {
      const side = sideOf(nodeById, node, peel.neighborId)
      const effective: -1 | 1 = side !== 0 ? side : fallbackSide
      if (effective < 0) westPeels.push(peel)
      else eastPeels.push(peel)
    }

    const west = planPeelSide(node, westAnchor, westPeels, -1, nodeById)
    if (west) {
      peelSidePlans.push(west.plan)
      if (west.stretch) posStretches.push(west.stretch)
    }
    const east = planPeelSide(node, eastAnchor, eastPeels, 1, nodeById)
    if (east) {
      peelSidePlans.push(east.plan)
      if (east.stretch) posStretches.push(east.stretch)
    }
  }

  if (!changed) return schematic

  // Every real node's final `pos` — stretched positions feed both the
  // virtual-join placement below and the final node list.
  const finalPosOf = (originalPos: number): number =>
    applyPosStretch(posStretches, originalPos)

  const cellKey = (lane: number, pos: number): string => `${lane}:${pos}`
  const occupied = new Set(
    schematic.nodes
      .filter((node) => !blobNodesByOriginal.has(node.id))
      .map((node) => cellKey(node.lane, finalPosOf(node.pos)))
  )
  /** Nudge a candidate pos (fixed lane) off any occupied cell — real or virtual. */
  const freePos = (lane: number, pos: number, step: number): number => {
    let candidate = pos
    let guard = 0
    while (occupied.has(cellKey(lane, candidate)) && guard < 1000) {
      candidate += step
      guard += 1
    }
    occupied.add(cellKey(lane, candidate))
    return candidate
  }
  /** Nudge a candidate lane (fixed pos) off any occupied cell — real or virtual. */
  const freeLane = (pos: number, lane: number, step: number): number => {
    let candidate = lane
    let guard = 0
    while (occupied.has(cellKey(candidate, pos)) && guard < 1000) {
      candidate += step
      guard += 1
    }
    occupied.add(cellKey(candidate, pos))
    return candidate
  }

  const virtualNodes: SchematicNode[] = []

  for (const { via, anchor, side, ordered, reach } of peelSidePlans) {
    const viaFinalPos = finalPosOf(via.pos)
    const vjIds: string[] = []

    ordered.forEach((peel, index) => {
      const vjId = nextVirtualId(via.id)
      vjIds.push(vjId)
      const rawPos = viaFinalPos + side * reach[index]!
      const pos = freePos(via.lane, rawPos, side * 0.01)
      virtualNodes.push({
        id: vjId,
        name: "",
        lane: via.lane,
        pos,
        kind: "virtual",
      })
      setChain(peel, { mode: "replace", ids: [vjId] })
    })

    // `vjIds[0]` already sits nearest `via` (smallest `reach`) — the
    // `extend`/chain sequence just continues outward from `via.id`.
    if (anchor) {
      setChain(anchor, { mode: "extend", ids: [via.id, ...vjIds] })
      continue
    }
    const chainIds = [via.id, ...vjIds]
    const lastOrdered = ordered[ordered.length - 1]
    const branchId = lastOrdered
      ? edges[lastOrdered.edgeIndex]?.branchId
      : undefined
    for (let i = 0; i < chainIds.length - 1; i += 1) {
      extraEdges.push({ from: chainIds[i]!, to: chainIds[i + 1]!, branchId })
    }
  }

  const finalNodes: SchematicNode[] = []
  for (const node of schematic.nodes) {
    const blobs = blobNodesByOriginal.get(node.id)
    if (blobs) {
      finalNodes.push(
        ...blobs.map((blob) => ({
          ...blob,
          lane: freeLane(blob.pos, blob.lane, 0.001),
        }))
      )
      continue
    }
    finalNodes.push({ ...node, pos: finalPosOf(node.pos) })
  }
  finalNodes.push(...virtualNodes)

  const finalEdges: SchematicEdge[] = []
  edges.forEach((edge, edgeIndex) => {
    const fromChain = edgeFromChain.get(edgeIndex)
    const toChain = edgeToChain.get(edgeIndex)
    const fromSeq =
      fromChain && fromChain.mode !== "keep" ? fromChain.ids : [edge.from]
    const toSeq = toChain && toChain.mode !== "keep" ? toChain.ids : [edge.to]
    const path = [...fromSeq, ...[...toSeq].reverse()]
    for (let i = 0; i < path.length - 1; i += 1) {
      if (path[i] === path[i + 1]) continue
      finalEdges.push({
        from: path[i]!,
        to: path[i + 1]!,
        branchId: edge.branchId,
        state: edge.state,
      })
    }
  })
  finalEdges.push(...extraEdges)

  return {
    ...schematic,
    nodes: finalNodes,
    edges: finalEdges,
  }
}
