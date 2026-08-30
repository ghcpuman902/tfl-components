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
 *    perpendicular axis (`lane`). `pos` is packed ALONG each topological
 *    run (one hop = one unit on that corridor), not ranked across every
 *    station on the line — otherwise parallel branches (High Barnet /
 *    Edgware) interleave, consecutive stops on one branch skip ranks, and
 *    `freeLane` invents S-bends to dodge the collision. `lane` is still
 *    one discrete value per run; sequential through-runs at a Y share a
 *    lane so the trunk stays straight and only the spur peels. This is a
 *    clip/stack step, not a second solve — no positions are re-optimised
 *    here.
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
const meanCrossOfRun = (
  run: Run,
  byId: ReadonlyMap<string, LaidOutPassengerNode>,
  axis: { main: Point; cross: Point }
): number => {
  const internal = run.path.slice(1, -1)
  const sample = internal.length > 0 ? internal : run.path
  const values = sample.map((id) => project(byId.get(id)!, axis).cross)
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

const laneByRun = (
  runs: readonly Run[],
  byId: ReadonlyMap<string, LaidOutPassengerNode>,
  axis: { main: Point; cross: Point }
): Map<Run, number> => {
  const means = runs.map((run) => meanCrossOfRun(run, byId, axis))
  const magnitudes = means.map(Math.abs).filter((v) => v > 1e-6)
  const laneUnit = magnitudes.length > 0 ? median(magnitudes) : 1
  const lanes = new Map<Run, number>()
  runs.forEach((run, index) => {
    lanes.set(run, laneUnit > 1e-6 ? Math.round(means[index]! / laneUnit) : 0)
  })
  return lanes
}

const groupKeyOf = (
  id: string,
  byId: ReadonlyMap<string, LaidOutPassengerNode>
): string => byId.get(id)?.splitFrom ?? id

/**
 * Pack `pos` along topological runs, not across the whole station cloud.
 *
 * Junctions become a graph whose edge weight is hop-count (max, when two
 * runs share the same endpoint pair — Bank vs a shorter CX leftover). A
 * spanning tree from the westmost junction places every run's internals at
 * `westPos + i`, so High Barnet and Edgware both originate at Camden's pos
 * and pack Δpos=1 along their own corridor. Bonded halves (`splitFrom`)
 * share one pos so Kennington stays two blobs at one column.
 */
const assignPosAlongRuns = (
  runs: readonly Run[],
  byId: ReadonlyMap<string, LaidOutPassengerNode>,
  axis: { main: Point; cross: Point }
): Map<string, number> => {
  const mainOf = (id: string): number => {
    const node = byId.get(id)
    if (!node) return 0
    return project(node, axis).main
  }

  const membersByGroup = new Map<string, string[]>()
  for (const id of byId.keys()) {
    const key = groupKeyOf(id, byId)
    const list = membersByGroup.get(key) ?? []
    list.push(id)
    membersByGroup.set(key, list)
  }
  const mainOfGroup = (key: string): number => {
    const members = membersByGroup.get(key) ?? [key]
    return members.reduce((sum, id) => sum + mainOf(id), 0) / members.length
  }

  const oriented = runs.map((run) => {
    const start = run.path[0]!
    const end = run.path[run.path.length - 1]!
    return mainOf(start) <= mainOf(end) ? run.path : [...run.path].reverse()
  })

  type JunctionLink = { west: string; east: string; hops: number }
  const linkByPair = new Map<string, JunctionLink>()
  for (const path of oriented) {
    const west = groupKeyOf(path[0]!, byId)
    const east = groupKeyOf(path[path.length - 1]!, byId)
    if (west === east) continue
    const key = undirectedKey(west, east)
    const hops = path.length - 1
    const existing = linkByPair.get(key)
    if (!existing || hops > existing.hops) {
      linkByPair.set(key, { west, east, hops })
    }
  }
  const links = [...linkByPair.values()]
  const adjacency = new Map<string, JunctionLink[]>()
  const addLink = (key: string, link: JunctionLink) => {
    const list = adjacency.get(key) ?? []
    list.push(link)
    adjacency.set(key, list)
  }
  const junctions = new Set<string>()
  for (const link of links) {
    junctions.add(link.west)
    junctions.add(link.east)
    addLink(link.west, link)
    addLink(link.east, link)
  }

  const posByJunction = new Map<string, number>()
  const unvisited = new Set(junctions)
  while (unvisited.size > 0) {
    const start = [...unvisited].sort(
      (a, b) => mainOfGroup(a) - mainOfGroup(b)
    )[0]!
    posByJunction.set(start, 0)
    unvisited.delete(start)
    const queue = [start]
    while (queue.length > 0) {
      const current = queue.shift()!
      for (const link of adjacency.get(current) ?? []) {
        const other = link.west === current ? link.east : link.west
        if (!unvisited.has(other)) continue
        const delta = current === link.west ? link.hops : -link.hops
        posByJunction.set(other, posByJunction.get(current)! + delta)
        unvisited.delete(other)
        queue.push(other)
      }
    }
  }

  const posById = new Map<string, number>()
  for (const path of oriented) {
    const westId = path[0]!
    const eastId = path[path.length - 1]!
    const westPos = posByJunction.get(groupKeyOf(westId, byId)) ?? 0
    const eastPos =
      posByJunction.get(groupKeyOf(eastId, byId)) ?? westPos + path.length - 1
    posById.set(westId, westPos)
    posById.set(eastId, eastPos)
    for (let i = 1; i < path.length - 1; i += 1) {
      posById.set(path[i]!, westPos + i)
    }
  }

  for (const id of byId.keys()) {
    if (posById.has(id)) continue
    posById.set(id, posByJunction.get(groupKeyOf(id, byId)) ?? 0)
  }

  shareBondedColumns(oriented, posById, membersByGroup, byId)

  const values = [...posById.values()]
  const min = values.length > 0 ? Math.min(...values) : 0
  if (min !== 0) {
    for (const [id, pos] of posById) posById.set(id, pos - min)
  }
  return posById
}

/**
 * At a Y (or a diamond), the longest west-side run and the longest
 * east-side run are ONE corridor — they keep the incoming (west) lane so
 * the trunk stays straight. The leftover spur peels. Without this, High
 * Barnet / Finchley–Camden / Bank / Morden each quantise independently and
 * the clip draws S-bends along a single branch.
 */
const unifyAlignedRunLanes = (
  runs: readonly Run[],
  runLane: ReadonlyMap<Run, number>,
  posById: ReadonlyMap<string, number>
): Map<Run, number> => {
  const result = new Map(runLane)

  const endpointIds = new Set<string>()
  for (const run of runs) {
    endpointIds.add(run.path[0]!)
    endpointIds.add(run.path[run.path.length - 1]!)
  }
  const junctions = [...endpointIds].sort(
    (a, b) => (posById.get(a) ?? 0) - (posById.get(b) ?? 0)
  )

  const neighbourToward = (jid: string, run: Run): string | null => {
    const start = run.path[0]!
    const end = run.path[run.path.length - 1]!
    if (start === jid) return run.path[1] ?? null
    if (end === jid) return run.path[run.path.length - 2] ?? null
    return null
  }

  const runsAt = (jid: string): Run[] =>
    runs.filter(
      (run) => run.path[0] === jid || run.path[run.path.length - 1] === jid
    )

  for (const jid of junctions) {
    const incident = runsAt(jid)
    if (incident.length < 3) continue
    const jpos = posById.get(jid) ?? 0
    const west: Run[] = []
    const east: Run[] = []
    for (const run of incident) {
      const neighbor = neighbourToward(jid, run)
      if (!neighbor) continue
      const neighborPos = posById.get(neighbor) ?? jpos
      if (neighborPos < jpos - 1e-9) west.push(run)
      else if (neighborPos > jpos + 1e-9) east.push(run)
      else {
        const other =
          run.path[0] === jid ? run.path[run.path.length - 1]! : run.path[0]!
        const otherPos = posById.get(other) ?? jpos
        if (otherPos <= jpos) west.push(run)
        else east.push(run)
      }
    }

    const unusedWest = [...west].sort((a, b) => b.path.length - a.path.length)
    const unusedEast = [...east].sort((a, b) => b.path.length - a.path.length)
    while (unusedWest.length > 0 && unusedEast.length > 0) {
      const westRun = unusedWest.shift()!
      const eastRun = unusedEast.shift()!
      const incoming = result.get(westRun) ?? 0
      result.set(eastRun, incoming)
    }
  }
  return result
}

const separateOverlappingRunLanes = (
  runs: readonly Run[],
  lanes: ReadonlyMap<Run, number>,
  posById: ReadonlyMap<string, number>
): Map<Run, number> => {
  const result = new Map(lanes)
  const rangeOf = (run: Run): [number, number] | null => {
    const internals = run.path.slice(1, -1)
    if (internals.length === 0) return null
    const positions = internals.map((id) => posById.get(id) ?? 0)
    return [Math.min(...positions), Math.max(...positions)]
  }
  const overlaps = (a: [number, number], b: [number, number]): boolean =>
    !(a[1] < b[0] || b[1] < a[0])

  for (let guard = 0; guard < 20; guard += 1) {
    let changed = false
    for (let i = 0; i < runs.length; i += 1) {
      for (let j = i + 1; j < runs.length; j += 1) {
        const left = runs[i]!
        const right = runs[j]!
        if (result.get(left) !== result.get(right)) continue
        const rangeLeft = rangeOf(left)
        const rangeRight = rangeOf(right)
        if (!rangeLeft || !rangeRight || !overlaps(rangeLeft, rangeRight)) {
          continue
        }
        const current = result.get(right) ?? 0
        const dir = current >= 0 ? 1 : -1
        const next = current + dir
        result.set(right, next === 0 ? dir * 2 : next)
        changed = true
      }
    }
    if (!changed) break
  }
  return result
}

/**
 * Flying-junction halves (Euston, Kennington) share one column — the later
 * blob's pos, so Bank Euston slides right under CX Euston. Then every later
 * stop on the same run is pushed so hops stay ≥ 1. Repeats until Kennington
 * (and any other bonded pair) re-aligns after those pushes.
 */
const shareBondedColumns = (
  oriented: readonly string[][],
  posById: Map<string, number>,
  membersByGroup: ReadonlyMap<string, string[]>,
  byId: ReadonlyMap<string, LaidOutPassengerNode>
): void => {
  for (let guard = 0; guard < 40; guard += 1) {
    let changed = false
    for (const members of membersByGroup.values()) {
      if (members.length < 2) continue
      const target = Math.max(...members.map((id) => posById.get(id) ?? 0))
      for (const id of members) {
        if ((posById.get(id) ?? 0) + 1e-9 < target) {
          posById.set(id, target)
          changed = true
        }
      }
    }
    for (const path of oriented) {
      for (let i = 1; i < path.length; i += 1) {
        const prevId = path[i - 1]!
        const currentId = path[i]!
        if (groupKeyOf(currentId, byId) === groupKeyOf(prevId, byId)) continue
        const prev = posById.get(prevId) ?? 0
        const current = posById.get(currentId) ?? 0
        if (current + 1e-9 < prev + 1) {
          posById.set(currentId, prev + 1)
          changed = true
        }
      }
    }
    if (!changed) break
  }
}

const runPosRange = (
  run: Run,
  posById: ReadonlyMap<string, number>
): [number, number] => {
  const positions = run.path.map((id) => posById.get(id) ?? 0)
  return [Math.min(...positions), Math.max(...positions)]
}

const rangesOverlap = (
  a: readonly [number, number],
  b: readonly [number, number]
): boolean => !(a[1] < b[0] || b[1] < a[0])

/**
 * A short terminus spur that landed in the gap between two parallel
 * corridors (Mill Hill East between High Barnet and Edgware) flips to the
 * outside of its parent trunk — above High Barnet, not down the middle.
 */
const flipSpursOutward = (
  runs: readonly Run[],
  lanes: ReadonlyMap<Run, number>,
  posById: ReadonlyMap<string, number>
): Map<Run, number> => {
  const result = new Map(lanes)
  for (const run of runs) {
    if (run.path.length !== 2) continue
    const range = runPosRange(run, posById)
    const lane = result.get(run)
    if (lane == null) continue
    const overlapping = runs.filter((other) => {
      if (other === run) return false
      return rangesOverlap(range, runPosRange(other, posById))
    })
    if (overlapping.length === 0) continue
    const otherLanes = overlapping.map((other) => result.get(other) ?? 0)
    const minLane = Math.min(...otherLanes)
    const maxLane = Math.max(...otherLanes)
    if (!(lane > minLane && lane < maxLane)) continue
    const parent = overlapping.find(
      (other) =>
        other.path[0] === run.path[0] ||
        other.path[0] === run.path[run.path.length - 1] ||
        other.path[other.path.length - 1] === run.path[0] ||
        other.path[other.path.length - 1] === run.path[run.path.length - 1]
    )
    const parentLane = parent ? (result.get(parent) ?? lane) : minLane
    const away = otherLanes.some((other) => other > parentLane) ? -1 : 1
    result.set(run, parentLane + away)
  }
  return result
}

/** Remap used lanes onto consecutive integers so parallel corridors sit one apart. */
const compressRunLanes = (
  lanes: ReadonlyMap<Run, number>
): Map<Run, number> => {
  const used = [...new Set(lanes.values())].sort((a, b) => a - b)
  const result = new Map<Run, number>()
  const origin = used[0] ?? 0
  for (const [run, lane] of lanes) {
    result.set(run, origin + used.indexOf(lane))
  }
  return result
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
  lineId: string,
  bonded: boolean
): SchematicNodeKind => {
  if (degree <= 1) return "terminus"
  // Bonded halves are one physical interchange (Kennington is Northern-only,
  // so `isKnownInterchange` misses it; after the split the Bank half is
  // degree 2 and would otherwise paint as a tick with a dangling bar).
  if (bonded || degree >= 3 || isKnownInterchange(stationId, lineId)) {
    return "interchange"
  }
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

  const runs = findRuns(nodeIds, trackEdges)
  const posById = assignPosAlongRuns(runs, byId, axis)
  const runLane = compressRunLanes(
    flipSpursOutward(
      runs,
      separateOverlappingRunLanes(
        runs,
        unifyAlignedRunLanes(runs, laneByRun(runs, byId, axis), posById),
        posById
      ),
      posById
    )
  )

  // `lane` — internals stay on their run. Junctions take the longest
  // incident run (ties: closest to 0). A short "fork" connector between
  // bonded halves (Kennington's leftover Charing Cross ↔ Morden movement)
  // must not win that tie — without the length preference it would, and
  // the junction would leave its own trunk.
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

  // Collision-avoid (lane, pos) is a last-resort nudge for labelled
  // junctions that still land on the same cell. Internals must NOT be
  // nudged — that was inventing S-bends along a straight branch.
  const occupied = new Set<string>()
  const cellKey = (lane: number, pos: number) => `${lane}:${pos}`
  const occupyLane = (
    pos: number,
    lane: number,
    allowNudge: boolean
  ): number => {
    if (!allowNudge || !occupied.has(cellKey(lane, pos))) {
      occupied.add(cellKey(lane, pos))
      return lane
    }
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
  const orderedContracted = [...compiled.topology.nodes].sort((a, b) => {
    const degreeA = degree.get(a.id) ?? 0
    const degreeB = degree.get(b.id) ?? 0
    if (degreeA === 2 && degreeB !== 2) return -1
    if (degreeA !== 2 && degreeB === 2) return 1
    return 0
  })
  for (const contracted of orderedContracted) {
    const pos = posById.get(contracted.id) ?? 0
    const isInternal = (degree.get(contracted.id) ?? 0) === 2
    const lane = occupyLane(pos, laneOf(contracted.id), !isInternal)
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
        lineId,
        Boolean(suffix)
      ),
      stationKey: base,
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
