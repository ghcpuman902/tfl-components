/**
 * Horizontal branch strip, built from the SAME topology + lowest-energy
 * layout `/docs/line-topology` uses — not from `LINE_STATION_SEQUENCES`
 * branch metadata and a "longest Regular route is the trunk" guess.
 *
 * Pipeline:
 *
 * 1. `tflSequencesPassengerTopology` — real TfL ordered-route triples become
 *    a passenger graph (nodes, hops, permitted movements). 4-neighbour
 *    "flying junction" stations (Euston, Kennington) are ALREADY split into
 *    bonded `~a`/`~b` halves here — that is where "two blobs, strokes level"
 *    comes from, not a post-hoc lane offset.
 * 2. `layoutTflSequences` — the same stress-majorization / MDS pass the
 *    line-topology page runs: hop-time edge lengths, permitted-movement
 *    straightening, overlap separation. This is "snapping them and finding
 *    the lowest-energy state" — every long edge / through-move is decided
 *    here, from real data, not from which route happens to be longest.
 * 3. `clipToHorizontalGrid` (this file) — the part that is genuinely new:
 *    project the relaxed (x, y) onto its principal axis (`pos`) and the
 *    perpendicular axis (`lane`), rank-and-space `pos` so every hop reads as
 *    "one more stop" (not the energy layout's uneven real distances), and
 *    assign `lane` per topological RUN (the path between two junctions/
 *    termini) rather than per node, so a branch that drifts gradually away
 *    from the trunk in real geography still reads as one lane, not several.
 *    This is a clip/stack step, not a second solve — no positions are
 *    re-optimised here.
 * 4. `decomposeBranchStripJunctions` — unchanged from the lane×pos world:
 *    still needed for junctions the bonded-pair split doesn't cover (a
 *    5-neighbour station like District Earl's Court), still the thing that
 *    turns "too many edges at one point" into staggered Ys with 45° room.
 *
 * HORIZONTAL ONLY. LOOP LINES (Circle) are not handled here — unrolling a
 * loop's cycle into this linear clip would draw exactly the "unrolled
 * sausage" earlier work already ruled out; `buildBranchSchematic` keeps
 * the existing racetrack layout for those. See `isLoopLikeTopology`.
 */

import { STATION_HUBS } from "tfl-ts"
import {
  decomposeBranchStripJunctions,
  requiredGutterPos,
} from "@/lib/tfl/geometry/branch-strip-joins"
import {
  layoutTflSequences,
  type LaidOutPassengerNode,
} from "@/lib/tfl/geometry/tfl-sequences-layout"
import { tflSequencesPassengerTopology } from "@/lib/tfl/geometry/tfl-sequences-topology"
import type { DirectedTopologyMovement } from "@/lib/tfl/geometry/topology-movements"
import {
  assertValidSchematic,
  type LineSchematic,
  type SchematicEdge,
  type SchematicNode,
  type SchematicNodeKind,
} from "@/lib/tfl/line-schematic"

type Point = { x: number; y: number }

const slugifyStation = (name: string): string => {
  const slug = name
    .toLowerCase()
    .replace(/[\u2018\u2019\u02BC']/g, "")
    .replace(/&/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  return slug || "station"
}

/** `~a` / `~b` — `splitBondedThroughStations`' own suffix convention. */
const bondedSuffix = (contractedId: string): string | null => {
  const match = /~([a-z])$/.exec(contractedId)
  return match ? match[1]! : null
}

/**
 * Largest eigenvector of the 2×2 covariance matrix of `points` — the axis
 * a line's stations are most spread along. Closed-form for a symmetric 2×2
 * matrix; no need for a general eigensolver.
 */
const principalAxis = (
  points: readonly Point[]
): { main: Point; cross: Point } => {
  const n = points.length || 1
  const mx = points.reduce((sum, p) => sum + p.x, 0) / n
  const my = points.reduce((sum, p) => sum + p.y, 0) / n
  let sxx = 0
  let syy = 0
  let sxy = 0
  for (const p of points) {
    const dx = p.x - mx
    const dy = p.y - my
    sxx += dx * dx
    syy += dy * dy
    sxy += dx * dy
  }
  sxx /= n
  syy /= n
  sxy /= n
  const trace = (sxx + syy) / 2
  const spread = Math.sqrt(((sxx - syy) / 2) ** 2 + sxy * sxy)
  const lambda1 = trace + spread
  let vx: number
  let vy: number
  if (Math.abs(sxy) > 1e-9) {
    vx = lambda1 - syy
    vy = sxy
  } else {
    vx = sxx >= syy ? 1 : 0
    vy = sxx >= syy ? 0 : 1
  }
  const len = Math.hypot(vx, vy) || 1
  return {
    main: { x: vx / len, y: vy / len },
    cross: { x: -vy / len, y: vx / len },
  }
}

const project = (
  point: Point,
  axis: { main: Point; cross: Point }
): { main: number; cross: number } => ({
  main: point.x * axis.main.x + point.y * axis.main.y,
  cross: point.x * axis.cross.x + point.y * axis.cross.y,
})

const undirectedKey = (a: string, b: string): string =>
  a < b ? `${a}|${b}` : `${b}|${a}`

const adjacencyOf = (
  nodeIds: readonly string[],
  edges: readonly { from: string; to: string }[]
): Map<string, string[]> => {
  const adjacency = new Map<string, string[]>()
  for (const id of nodeIds) adjacency.set(id, [])
  for (const edge of edges) {
    adjacency.get(edge.from)?.push(edge.to)
    adjacency.get(edge.to)?.push(edge.from)
  }
  return adjacency
}

/**
 * The largest cycle in the graph (by node count), found from one spanning
 * tree's non-tree edges. Real transit graphs are trees plus a handful of
 * extra edges, so this finds Circle's genuine loop without a general
 * (NP-hard) longest-cycle search.
 */
const largestCycle = (
  nodeIds: readonly string[],
  edges: readonly { from: string; to: string }[]
): Set<string> | null => {
  if (nodeIds.length === 0) return null
  const adjacency = adjacencyOf(nodeIds, edges)
  const parent = new Map<string, string | null>()
  const visited = new Set<string>()
  const treeEdges = new Set<string>()
  const queue: string[] = [nodeIds[0]!]
  visited.add(nodeIds[0]!)
  parent.set(nodeIds[0]!, null)
  while (queue.length > 0) {
    const current = queue.shift()!
    for (const neighbor of adjacency.get(current) ?? []) {
      if (visited.has(neighbor)) continue
      visited.add(neighbor)
      parent.set(neighbor, current)
      treeEdges.add(undirectedKey(current, neighbor))
      queue.push(neighbor)
    }
  }

  const pathToRoot = (id: string): string[] => {
    const path: string[] = []
    let current: string | null | undefined = id
    while (current != null) {
      path.push(current)
      current = parent.get(current) ?? null
    }
    return path
  }

  let best: Set<string> | null = null
  for (const edge of edges) {
    if (treeEdges.has(undirectedKey(edge.from, edge.to))) continue
    const pathA = pathToRoot(edge.from)
    const pathB = pathToRoot(edge.to)
    const setA = new Set(pathA)
    const lca = pathB.find((id) => setA.has(id))
    if (!lca) continue
    const branchA = pathA.slice(0, pathA.indexOf(lca))
    const branchB = pathB.slice(0, pathB.indexOf(lca))
    const cycle = new Set([...branchA, ...branchB, lca])
    if (!best || cycle.size > best.size) best = cycle
  }
  return best
}

/** Circle-shaped: a single cycle covers most of the line. */
export const isLoopLikeTopology = (
  nodeIds: readonly string[],
  edges: readonly { from: string; to: string }[]
): boolean => {
  if (nodeIds.length === 0) return false
  const cycle = largestCycle(nodeIds, edges)
  return (cycle?.size ?? 0) / nodeIds.length >= 0.5
}

/**
 * Maximal paths between junctions (degree ≠ 2) or termini (degree 1) — the
 * topology's own "branch segments", derived from real connectivity instead
 * of `LINE_STATION_SEQUENCES` segment ids. Every internal node of a run has
 * degree exactly 2; every run's own two endpoints are shared with other runs.
 */
type Run = { path: string[] }

const findRuns = (
  nodeIds: readonly string[],
  edges: readonly { from: string; to: string }[]
): Run[] => {
  const adjacency = adjacencyOf(nodeIds, edges)
  const isJunction = (id: string): boolean =>
    (adjacency.get(id)?.length ?? 0) !== 2
  const visitedEdge = new Set<string>()
  const runs: Run[] = []

  for (const start of nodeIds) {
    if (!isJunction(start)) continue
    for (const next of adjacency.get(start) ?? []) {
      const firstKey = undirectedKey(start, next)
      if (visitedEdge.has(firstKey)) continue
      visitedEdge.add(firstKey)
      const path = [start, next]
      let previous = start
      let current = next
      while (!isJunction(current)) {
        const neighbours = adjacency.get(current) ?? []
        const forward = neighbours.find((id) => id !== previous)
        if (!forward) break
        visitedEdge.add(undirectedKey(current, forward))
        path.push(forward)
        previous = current
        current = forward
      }
      runs.push({ path })
    }
  }

  // Isolated cycles with no junction at all (shouldn't occur for a real
  // line topology, but stay defensive) never get visited above.
  for (const edge of edges) {
    const key = undirectedKey(edge.from, edge.to)
    if (visitedEdge.has(key)) continue
    visitedEdge.add(key)
    runs.push({ path: [edge.from, edge.to] })
  }

  return runs
}

const median = (values: readonly number[]): number => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2
}

/**
 * One discrete lane per run, quantised from its mean cross-axis offset. The
 * scale (`laneUnit`) is the median non-trivial run offset — self-calibrating
 * to how far this particular line's branches actually drift, rather than a
 * fixed physical distance that would put a slowly-diverging branch on many
 * lanes as it travels.
 */
const laneByRun = (
  runs: readonly Run[],
  byId: ReadonlyMap<string, LaidOutPassengerNode>,
  axis: { main: Point; cross: Point }
): Map<Run, number> => {
  const meanCross = (run: Run): number => {
    const internal = run.path.slice(1, -1)
    const sample = internal.length > 0 ? internal : run.path
    const values = sample.map((id) => project(byId.get(id)!, axis).cross)
    return values.reduce((sum, v) => sum + v, 0) / values.length
  }
  const means = runs.map(meanCross)
  const magnitudes = means.map(Math.abs).filter((v) => v > 1e-6)
  const laneUnit = magnitudes.length > 0 ? median(magnitudes) : 1
  const lanes = new Map<Run, number>()
  runs.forEach((run, index) => {
    lanes.set(run, laneUnit > 1e-6 ? Math.round(means[index]! / laneUnit) : 0)
  })
  return lanes
}

const isKnownInterchange = (
  stationId: string | undefined,
  lineId: string
): boolean => {
  if (!stationId) return false
  const hub = STATION_HUBS[stationId]
  if (!hub) return false
  return Object.keys(hub.lineMemberIds ?? {}).some((id) => id !== lineId)
}

const nodeKind = (
  degree: number,
  stationId: string | undefined,
  lineId: string
): SchematicNodeKind => {
  if (degree <= 1) return "terminus"
  if (degree >= 3 || isKnownInterchange(stationId, lineId)) return "interchange"
  return "stop"
}

/**
 * Real TfL through-move data, keyed by the CONTRACTED topology's own node
 * ids (already correct for bonded `~a`/`~b` halves — no name matching).
 */
const throughWeightFromCompiled = (
  movements: readonly DirectedTopologyMovement[]
): ((viaId: string, aId: string, bId: string) => number | undefined) => {
  const counts = new Map<string, number>()
  const viasWithData = new Set<string>()
  for (const movement of movements) {
    viasWithData.add(movement.via)
    const key = `${movement.via}::${undirectedKey(movement.from, movement.to)}`
    counts.set(key, (counts.get(key) ?? 0) + movement.patternIds.length)
  }
  return (viaId, aId, bId) => {
    if (!viasWithData.has(viaId)) return undefined
    return counts.get(`${viaId}::${undirectedKey(aId, bId)}`) ?? 0
  }
}

/**
 * The clip's own lane assignment can still leave a real (non-virtual) lane
 * change without enough `Δpos` — most often the edge from a run's last
 * internal stop into a junction that keeps a DIFFERENT run's lane (a
 * confirmed diamond like Camden Town never gets peeled by
 * `decomposeBranchStripJunctions`, so its own incident edges need their own
 * clearance check). Iteratively push the side with the larger `pos` (and
 * everything beyond it) further out until every lane change clears
 * `requiredGutterPos` — the same stretch idea as the join-split pass,
 * generalised to any edge instead of only virtual-join chains.
 */
const enforceLaneChangeGutters = (schematic: LineSchematic): LineSchematic => {
  // `rank` is the STABLE partition key ("is this node beyond the pivot?") —
  // fixed at the clip's own integer pos, never re-derived from the
  // currently-shifting `pos`, so which rigid block of nodes moves together
  // never changes between iterations (that instability is what let an
  // earlier version of this function drift toward -140 without converging).
  const rankById = new Map(schematic.nodes.map((node) => [node.id, node.pos]))
  const posById = new Map(schematic.nodes.map((node) => [node.id, node.pos]))
  const laneById = new Map(schematic.nodes.map((node) => [node.id, node.lane]))

  for (
    let iteration = 0;
    iteration < schematic.edges.length + 5;
    iteration += 1
  ) {
    let changed = false
    for (const edge of schematic.edges) {
      const laneA = laneById.get(edge.from)
      const laneB = laneById.get(edge.to)
      if (laneA == null || laneB == null || laneA === laneB) continue
      const posA = posById.get(edge.from)!
      const posB = posById.get(edge.to)!
      const required = requiredGutterPos(Math.abs(laneA - laneB))
      const current = Math.abs(posA - posB)
      if (current + 1e-6 >= required) continue

      const shortfall = required - current
      // Push the side with the LARGER rank (and everything at-or-beyond its
      // rank) further out; the smaller-rank side is the fixed pivot. Using
      // the higher side's own rank as the pivot (with `>=`) is what keeps
      // it from also matching on the fixed side — using the fixed side's
      // rank there instead pushes both ends together and the gap never
      // grows (silently non-convergent).
      const fromRank = rankById.get(edge.from)!
      const toRank = rankById.get(edge.to)!
      const higherRank = Math.max(fromRank, toRank)
      for (const [id, rank] of rankById) {
        if (rank >= higherRank) posById.set(id, posById.get(id)! + shortfall)
      }
      changed = true
    }
    if (!changed) break
  }

  return {
    ...schematic,
    nodes: schematic.nodes.map((node) => ({
      ...node,
      pos: posById.get(node.id)!,
    })),
  }
}

/**
 * Horizontal `LineSchematic` for a linear (non-loop) line, straight from
 * the passenger topology's own lowest-energy layout — see module doc.
 */
export const buildBranchStripFromTopology = (
  lineId: string
): LineSchematic | null => {
  const compiled = tflSequencesPassengerTopology(lineId, [])
  if (!compiled) return null
  // A bonded pair (Euston, Kennington) already shares its `stationKey` and
  // `pos` below — the bond itself is not a running track, so it never
  // becomes a drawn edge.
  const trackEdges = compiled.topology.edges.filter(
    (edge) => edge.kind !== "bond"
  )
  const nodeIds = compiled.topology.nodes.map((node) => node.id)
  if (nodeIds.length === 0) return null
  if (isLoopLikeTopology(nodeIds, trackEdges)) return null

  const laid = layoutTflSequences(compiled.topology, compiled.movements)
  const byId = new Map(laid.nodes.map((node) => [node.id, node]))
  const axis = principalAxis(laid.nodes)

  // `pos` — rank along the main axis, bonded halves sharing one rank so
  // "roughly equal hop spacing" holds and a blob split stays at one `pos`.
  const groupKey = (node: LaidOutPassengerNode): string =>
    node.splitFrom ?? node.id
  const groupMembers = new Map<string, LaidOutPassengerNode[]>()
  for (const node of laid.nodes) {
    const key = groupKey(node)
    const list = groupMembers.get(key) ?? []
    list.push(node)
    groupMembers.set(key, list)
  }
  const groupMain = new Map<string, number>()
  for (const [key, members] of groupMembers) {
    const mean =
      members.reduce((sum, node) => sum + project(node, axis).main, 0) /
      members.length
    groupMain.set(key, mean)
  }
  const orderedGroupKeys = [...groupMembers.keys()].sort(
    (a, b) => groupMain.get(a)! - groupMain.get(b)!
  )
  const posByGroup = new Map(orderedGroupKeys.map((key, index) => [key, index]))

  // `lane` — one discrete value per topological run (see `laneByRun`), then
  // each junction node takes whichever LONGEST incident run's lane (ties
  // broken by whichever sits closest to 0). A short "fork" connector run
  // between two already-adjacent halves of a bonded pair (Kennington's
  // leftover Charing Cross ↔ Morden movement) sits geographically close to
  // both ends, so its own mean cross-axis offset is small almost by
  // construction — without the length preference, that near-zero offset
  // would win "closest to 0" and give the junction a lane that doesn't
  // match its own real trunk run (the actual bug this preference fixes).
  const runs = findRuns(nodeIds, trackEdges)
  const runLane = laneByRun(runs, byId, axis)
  const nodeLaneCandidates = new Map<
    string,
    { lane: number; length: number }[]
  >()
  const addCandidate = (id: string, lane: number, length: number) => {
    const list = nodeLaneCandidates.get(id) ?? []
    list.push({ lane, length })
    nodeLaneCandidates.set(id, list)
  }
  for (const run of runs) {
    const lane = runLane.get(run)!
    const length = run.path.length
    for (const id of run.path.slice(1, -1)) addCandidate(id, lane, length)
    addCandidate(run.path[0]!, lane, length)
    addCandidate(run.path[run.path.length - 1]!, lane, length)
  }
  const laneOf = (id: string): number => {
    const candidates = nodeLaneCandidates.get(id) ?? [{ lane: 0, length: 0 }]
    return candidates.reduce((best, candidate) => {
      if (candidate.length !== best.length) {
        return candidate.length > best.length ? candidate : best
      }
      return Math.abs(candidate.lane) < Math.abs(best.lane) ? candidate : best
    }).lane
  }

  // Collision-avoid (lane, pos) — a nudge net, same idea as the join-split
  // pass; two distinct stations landing on the same cell is a clip
  // resolution issue, not a real ambiguity.
  const occupied = new Set<string>()
  const cellKey = (lane: number, pos: number) => `${lane}:${pos}`
  const freeLane = (pos: number, lane: number): number => {
    let candidate = lane
    let step = 1
    while (occupied.has(cellKey(candidate, pos))) {
      candidate =
        lane + (step % 2 === 1 ? Math.ceil(step / 2) : -Math.ceil(step / 2))
      step += 1
      if (step > 20) break
    }
    occupied.add(cellKey(candidate, pos))
    return candidate
  }

  const degree = new Map<string, number>()
  for (const edge of trackEdges) {
    degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1)
    degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1)
  }

  const usedIds = new Set<string>()
  const takeId = (base: string): string => {
    if (!usedIds.has(base)) {
      usedIds.add(base)
      return base
    }
    let n = 2
    while (usedIds.has(`${base}-${n}`)) n += 1
    const id = `${base}-${n}`
    usedIds.add(id)
    return id
  }

  const schematicIdByContractedId = new Map<string, string>()
  const nodes: SchematicNode[] = []
  for (const contracted of compiled.topology.nodes) {
    const pos = posByGroup.get(contracted.splitFrom ?? contracted.id) ?? 0
    const lane = freeLane(pos, laneOf(contracted.id))
    const suffix = bondedSuffix(contracted.id)
    const base = slugifyStation(contracted.stationName ?? contracted.id)
    const schematicId = takeId(suffix ? `${base}~${suffix}` : base)
    schematicIdByContractedId.set(contracted.id, schematicId)
    nodes.push({
      id: schematicId,
      name: contracted.stationName ?? contracted.id,
      lane,
      pos,
      kind: nodeKind(
        degree.get(contracted.id) ?? 0,
        contracted.stationId,
        lineId
      ),
      stationKey: suffix ? base : undefined,
    })
  }

  const edges: SchematicEdge[] = []
  const pushedKeys = new Set<string>()
  for (const edge of trackEdges) {
    const from = schematicIdByContractedId.get(edge.from)
    const to = schematicIdByContractedId.get(edge.to)
    if (!from || !to || from === to) continue
    const key = `${from}→${to}`
    if (pushedKeys.has(key)) continue
    pushedKeys.add(key)
    edges.push({ from, to, branchId: lineId })
  }

  const rawSchematic: LineSchematic = {
    lineId: compiled.lineId,
    lineName: compiled.lineName,
    orientation: "horizontal",
    branches: [{ id: lineId, name: compiled.lineName }],
    nodes,
    edges,
  }
  assertValidSchematic(rawSchematic)

  const throughWeight = throughWeightFromCompiled(compiled.movements)
  const contractedIdBySchematicId = new Map(
    [...schematicIdByContractedId.entries()].map(
      ([contractedId, schematicId]) => [schematicId, contractedId]
    )
  )
  const decomposed = decomposeBranchStripJunctions(rawSchematic, {
    throughWeight: (viaId, aId, bId) => {
      const via = contractedIdBySchematicId.get(viaId)
      const a = contractedIdBySchematicId.get(aId)
      const b = contractedIdBySchematicId.get(bId)
      if (!via || !a || !b) return undefined
      return throughWeight(via, a, b)
    },
  })
  assertValidSchematic(decomposed)
  const gutterFixed = enforceLaneChangeGutters(decomposed)
  assertValidSchematic(gutterFixed)
  return gutterFixed
}
