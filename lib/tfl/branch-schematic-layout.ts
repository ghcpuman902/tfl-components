/**
 * Deterministic lane/pos layout for a branched line.
 *
 * Trunk = longest inbound Regular ordered route (lane 0). Remaining unused
 * edges become offshoots; the longest through-corridor sits on lane +1, then
 * −1, +2, … so the longest branch stays in the middle.
 *
 * Parallel corridors that pass through the same station without joining
 * (Northern Euston) get duplicate render nodes. True junctions stay one node.
 *
 * Horizontal lanes follow station coordinates: north and west above the
 * trunk, south and east below (NWSE weights 4/3/2/1). The strip reads
 * north→south or west→east.
 *
 * Star junctions stay as separate adjacent corridors. A loop that is most
 * of the line (Circle) is a racetrack plus the Hammersmith spur.
 */

import { STATION_HUBS } from "tfl-ts"
import { buildThroughMovementWeight } from "@/lib/tfl/geometry/branch-strip-through-movements"
import { decomposeBranchStripJunctions } from "@/lib/tfl/geometry/branch-strip-joins"
import {
  buildLineTopologyFromStaticBranches,
  getStaticLineSequence,
  staticBranchSegments,
  type LineTopology,
  type StaticBranchSegment,
} from "@/lib/tfl/line-topology"
import {
  meanCoord,
  stationCoord,
  type StationLatLon,
} from "@/lib/tfl/station-coords"
import {
  assertValidSchematic,
  type LineSchematic,
  type SchematicEdge,
  type SchematicNode,
  type SchematicNodeKind,
  type SchematicOrientationHint,
} from "@/lib/tfl/line-schematic"

/**
 * HORIZONTAL ONLY — see `docs/branch-strip-horizontal`. Runs the staggered
 * virtual Y-join pass on a finished schematic, keyed by real station id so
 * `decomposeBranchStripJunctions` can weigh through-moves from actual
 * ordered-route data instead of guessing from lane/pos alone.
 */
const decomposeForHorizontal = (
  schematic: LineSchematic,
  lineId: string,
  stationIdByNodeId: ReadonlyMap<string, string>
): LineSchematic => {
  if (schematic.orientation !== "horizontal") return schematic
  const decomposed = decomposeBranchStripJunctions(schematic, {
    throughWeight: buildThroughMovementWeight(lineId, stationIdByNodeId),
  })
  assertValidSchematic(decomposed)
  return decomposed
}

export type BranchSchematicMeta = {
  lineId: string
  lineName: string
}

type DirectedEdge = {
  from: string
  to: string
  branchId: string
}

type Offshoot = {
  stationIds: string[]
  edgeBranchIds: string[]
}

type PlacedNode = {
  nodeId: string
  stationId: string
  lane: number
  pos: number
  branchIds: Set<string>
}

const slugifyStation = (name: string): string => {
  const slug = name
    .toLowerCase()
    .replace(/[\u2018\u2019\u02BC']/g, "")
    .replace(/&/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
  return slug || "station"
}

const edgeKey = (from: string, to: string): string => `${from}→${to}`

/**
 * Horizontal (in-carriage): first long corridor sits above the trunk (+1).
 * Vertical (platform): first long corridor sits to the left (−1).
 * These are different branch-to-lane maps — do not rotate one assignment.
 */
const signLane = (
  index: number,
  orientation: SchematicOrientationHint
): number => {
  const rank = index + 1
  const magnitude = Math.ceil(rank / 2)
  const odd = rank % 2 === 1
  if (orientation === "vertical") {
    return odd ? -magnitude : magnitude
  }
  return odd ? magnitude : -magnitude
}

/** Horizontal: north and west sit above (−lane), south and east below (+lane). */
const NWSE_WEIGHT = { n: 4, w: 3, s: 2, e: 1 } as const

type CompassPull = {
  sign: -1 | 0 | 1
  strength: number
}

const compassPull = (from: StationLatLon, to: StationLatLon): CompassPull => {
  const dLat = to.lat - from.lat
  const dLon = to.lon - from.lon
  const above =
    NWSE_WEIGHT.n * Math.max(0, dLat) + NWSE_WEIGHT.w * Math.max(0, -dLon)
  const below =
    NWSE_WEIGHT.s * Math.max(0, -dLat) + NWSE_WEIGHT.e * Math.max(0, dLon)
  const strength = Math.abs(above - below)
  if (strength < 1e-8) return { sign: 0, strength: 0 }
  return { sign: above >= below ? -1 : 1, strength }
}

const shouldFlipHorizontalPos = (trunk: readonly string[]): boolean => {
  const start = stationCoord(trunk[0] ?? "")
  const end = stationCoord(trunk[trunk.length - 1] ?? "")
  if (!start || !end) return false
  const dLat = end.lat - start.lat
  const dLon = end.lon - start.lon
  if (Math.abs(dLat) >= Math.abs(dLon)) return dLat > 0
  return dLon < 0
}

const uniqueSorted = (ids: readonly string[]): string[] =>
  [...new Set(ids)].sort((a, b) => a.localeCompare(b))

const outgoingFrom = (
  remaining: Map<string, DirectedEdge>,
  from: string
): DirectedEdge[] => {
  const found: DirectedEdge[] = []
  for (const edge of remaining.values()) {
    if (edge.from === from) found.push(edge)
  }
  return found.sort((a, b) => a.to.localeCompare(b.to))
}

const walkOffshoot = (
  start: DirectedEdge,
  remaining: Map<string, DirectedEdge>
): Offshoot => {
  remaining.delete(edgeKey(start.from, start.to))
  const stationIds = [start.from, start.to]
  const edgeBranchIds = [start.branchId]
  const seen = new Set(stationIds)
  let current = start.to

  while (true) {
    const nextEdges = outgoingFrom(remaining, current)
    if (nextEdges.length === 0) break
    // Fork: leave the unused edges so each continuation is its own offshoot.
    if (nextEdges.length > 1) break
    const next = nextEdges[0]!
    remaining.delete(edgeKey(next.from, next.to))
    edgeBranchIds.push(next.branchId)
    if (seen.has(next.to)) {
      stationIds.push(next.to)
      break
    }
    stationIds.push(next.to)
    seen.add(next.to)
    current = next.to
  }

  return { stationIds, edgeBranchIds }
}

const remainingSources = (
  remaining: Map<string, DirectedEdge>
): DirectedEdge[] => {
  const incoming = new Set<string>()
  for (const edge of remaining.values()) incoming.add(edge.to)
  const sources = [...remaining.values()].filter(
    (edge) => !incoming.has(edge.from)
  )
  return sources.sort((a, b) =>
    `${a.from}:${a.to}`.localeCompare(`${b.from}:${b.to}`)
  )
}

const extractOffshoots = (
  edges: readonly DirectedEdge[],
  trunkIds: readonly string[]
): Offshoot[] => {
  const remaining = new Map<string, DirectedEdge>()
  const trunkSet = new Set(trunkIds)
  const trunkEdgeKeys = new Set<string>()
  for (let i = 0; i < trunkIds.length - 1; i += 1) {
    trunkEdgeKeys.add(edgeKey(trunkIds[i]!, trunkIds[i + 1]!))
  }

  for (const edge of edges) {
    const key = edgeKey(edge.from, edge.to)
    if (trunkEdgeKeys.has(key)) continue
    remaining.set(key, edge)
  }

  const offshoots: Offshoot[] = []
  const takeSeed = (seeds: DirectedEdge[]): boolean => {
    if (seeds.length === 0) return false
    offshoots.push(walkOffshoot(seeds[0]!, remaining))
    return true
  }

  const trunkSeeds = () =>
    remainingSources(remaining)
      .filter((edge) => trunkSet.has(edge.from))
      .sort((a, b) => {
        const posA = trunkIds.indexOf(a.from)
        const posB = trunkIds.indexOf(b.from)
        if (posA !== posB) return posA - posB
        return a.to.localeCompare(b.to)
      })

  while (takeSeed(trunkSeeds())) {
    /* unused edges that leave the trunk */
  }
  while (takeSeed(remainingSources(remaining))) {
    /* unused source chains (e.g. Edgware → Camden) */
  }
  while (remaining.size > 0) {
    const leftover = [...remaining.values()].sort((a, b) =>
      `${a.from}:${a.to}`.localeCompare(`${b.from}:${b.to}`)
    )
    takeSeed(leftover)
  }

  return offshoots
}

const uniqueLength = (
  offshoot: Offshoot,
  trunkSet: ReadonlySet<string>
): number => offshoot.stationIds.filter((id) => !trunkSet.has(id)).length

const firstLast = (offshoot: Offshoot): { first: string; last: string } => ({
  first: offshoot.stationIds[0]!,
  last: offshoot.stationIds[offshoot.stationIds.length - 1]!,
})

/**
 * Merge offshoots that meet at a junction with opposite sides of the trunk
 * (incoming "before" + outgoing "after") into one through-corridor.
 */
const groupThroughCorridors = (
  offshoots: readonly Offshoot[],
  trunkIds: readonly string[]
): Offshoot[][] => {
  const trunkIndex = new Map(trunkIds.map((id, index) => [id, index]))
  const used = new Set<number>()
  const groups: Offshoot[][] = []

  const sideOf = (offshoot: Offshoot): "before" | "after" | "parallel" => {
    const { first, last } = firstLast(offshoot)
    const firstOn = trunkIndex.has(first)
    const lastOn = trunkIndex.has(last)
    if (firstOn && lastOn) return "parallel"
    if (lastOn && !firstOn) return "before"
    if (firstOn && !lastOn) return "after"
    return "before"
  }

  const junctionOf = (offshoot: Offshoot): string | null => {
    const { first, last } = firstLast(offshoot)
    if (trunkIndex.has(first)) return first
    if (trunkIndex.has(last)) return last
    return null
  }

  const remaining = offshoots.map((_, index) => index)
  const offshootsAt = new Map<string, number>()
  for (const offshoot of offshoots) {
    const junction = junctionOf(offshoot)
    if (!junction) continue
    offshootsAt.set(junction, (offshootsAt.get(junction) ?? 0) + 1)
  }

  while (used.size < offshoots.length) {
    const seed = remaining.find((index) => !used.has(index))
    if (seed == null) break
    used.add(seed)
    const group = [offshoots[seed]!]
    const junctions = new Set<string>()
    const seedJunction = junctionOf(offshoots[seed]!)
    if (seedJunction) junctions.add(seedJunction)
    const sides = new Set([sideOf(offshoots[seed]!)])

    let grew = true
    while (grew) {
      grew = false
      for (const index of remaining) {
        if (used.has(index)) continue
        const candidate = offshoots[index]!
        const junction = junctionOf(candidate)
        if (!junction || !junctions.has(junction)) continue
        const side = sideOf(candidate)
        const candidateLen = uniqueLength(candidate, new Set(trunkIds))
        const seedLen = uniqueLength(offshoots[seed]!, new Set(trunkIds))
        if (candidateLen <= 2 || seedLen <= 2) continue
        // Four-way junctions are crossings, not one through-pipe.
        if ((offshootsAt.get(junction) ?? 0) >= 3) continue
        const canJoin =
          (side === "before" &&
            (sides.has("after") || sides.has("parallel"))) ||
          (side === "after" &&
            (sides.has("before") || sides.has("parallel"))) ||
          (side === "parallel" &&
            (sides.has("before") || sides.has("after"))) ||
          (side === "before" &&
            sides.has("before") &&
            junction !== seedJunction) ||
          (side === "after" && sides.has("after") && junction !== seedJunction)
        if (!canJoin) continue
        used.add(index)
        group.push(candidate)
        sides.add(side)
        const { first, last } = firstLast(candidate)
        if (trunkIndex.has(first)) junctions.add(first)
        if (trunkIndex.has(last)) junctions.add(last)
        grew = true
      }
    }

    groups.push(group)
  }

  return groups
}

const corridorLength = (
  group: readonly Offshoot[],
  trunkSet: ReadonlySet<string>
): number =>
  group.reduce((sum, offshoot) => sum + uniqueLength(offshoot, trunkSet), 0)

const corridorName = (group: readonly Offshoot[]): string => {
  const ids = group.flatMap((offshoot) => offshoot.stationIds)
  return ids.slice().sort().join(",")
}

const segmentsById = (
  segments: readonly StaticBranchSegment[]
): Map<string, StaticBranchSegment> =>
  new Map(segments.map((segment) => [segment.id, segment]))

const segmentsTouchingStation = (
  stationId: string,
  segments: readonly StaticBranchSegment[]
): StaticBranchSegment[] =>
  segments.filter((segment) => {
    const first = segment.stationIds[0]
    const last = segment.stationIds[segment.stationIds.length - 1]
    return first === stationId || last === stationId
  })

const segmentComponent = (
  stationId: string,
  startId: string,
  segments: readonly StaticBranchSegment[]
): Set<string> => {
  const touching = segmentsTouchingStation(stationId, segments)
  const byId = segmentsById(touching)
  if (!byId.has(startId)) return new Set([startId])

  const connected = new Set<string>([startId])
  const stack = [startId]
  while (stack.length > 0) {
    const current = byId.get(stack.pop()!)!
    const neighbours = uniqueSorted([
      ...current.nextIds,
      ...current.previousIds,
    ])
    for (const neighbourId of neighbours) {
      if (!byId.has(neighbourId) || connected.has(neighbourId)) continue
      connected.add(neighbourId)
      stack.push(neighbourId)
    }
  }
  return connected
}

const shouldDuplicate = (
  stationId: string,
  incomingBranchId: string,
  placed: PlacedNode,
  segments: readonly StaticBranchSegment[]
): boolean => {
  if (placed.stationId !== stationId) return false
  const incomingComponent = segmentComponent(
    stationId,
    incomingBranchId,
    segments
  )
  for (const placedBranch of placed.branchIds) {
    if (incomingComponent.has(placedBranch)) return false
  }
  return incomingComponent.size > 0 && placed.branchIds.size > 0
}

const isInterchange = (
  stationId: string,
  lineId: string,
  degree: number
): boolean => {
  if (degree >= 3) return true
  const hub = STATION_HUBS[stationId]
  if (!hub) return false
  const lineIds = Object.keys(hub.lineMemberIds ?? {})
  return lineIds.some((id) => id !== lineId)
}

const nodeKind = (
  stationId: string,
  lineId: string,
  degree: number
): SchematicNodeKind => {
  if (degree <= 1) return "terminus"
  if (isInterchange(stationId, lineId, degree)) return "interchange"
  return "stop"
}

type Outgoing = { to: string; branchId: string }

const canContinue = (
  stationId: string,
  incomingBranchId: string | null,
  outgoingBranchId: string,
  segments: readonly StaticBranchSegment[]
): boolean => {
  if (!incomingBranchId || incomingBranchId === outgoingBranchId) return true
  return segmentComponent(stationId, incomingBranchId, segments).has(
    outgoingBranchId
  )
}

const longestSimplePath = (
  topology: LineTopology,
  segments: readonly StaticBranchSegment[]
): string[] => {
  const byFrom = new Map<string, Outgoing[]>()
  for (const edge of topology.edges) {
    const list = byFrom.get(edge.fromStationId) ?? []
    list.push({ to: edge.toStationId, branchId: edge.branchId })
    byFrom.set(edge.fromStationId, list)
  }
  for (const list of byFrom.values()) {
    list.sort((a, b) => a.to.localeCompare(b.to))
  }

  let best: string[] = []
  const dfs = (
    node: string,
    incomingBranchId: string | null,
    path: string[],
    seen: Set<string>
  ) => {
    if (path.length > best.length) best = [...path]
    else if (path.length === best.length && path.join("\0") < best.join("\0")) {
      best = [...path]
    }
    for (const next of byFrom.get(node) ?? []) {
      if (seen.has(next.to)) continue
      if (!canContinue(node, incomingBranchId, next.branchId, segments)) {
        continue
      }
      seen.add(next.to)
      path.push(next.to)
      dfs(next.to, next.branchId, path, seen)
      path.pop()
      seen.delete(next.to)
    }
  }
  for (const node of [...topology.nodes].sort((a, b) =>
    a.stationId.localeCompare(b.stationId)
  )) {
    dfs(node.stationId, null, [node.stationId], new Set([node.stationId]))
  }
  return best
}

const resolveTrunk = (
  topology: LineTopology,
  segments: readonly StaticBranchSegment[]
): string[] => {
  const ordered =
    topology.trunkStationIds && topology.trunkStationIds.length >= 2
      ? [...topology.trunkStationIds]
      : []
  const graph = longestSimplePath(topology, segments)
  if (ordered.length >= 2 && ordered.length >= graph.length) return ordered
  if (graph.length >= 2) return graph
  return ordered
}

const trunkEdgeBranchId = (
  topology: LineTopology,
  from: string,
  to: string
): string =>
  topology.edges.find(
    (edge) => edge.fromStationId === from && edge.toStationId === to
  )?.branchId ?? topology.primaryBranchId

const LOOP_COVERAGE = 0.55

const uniqueLoopCycle = (
  segments: readonly StaticBranchSegment[],
  loopBranchIds: readonly string[]
): string[] | null => {
  for (const segment of segments) {
    if (!loopBranchIds.includes(segment.id)) continue
    const ids = segment.stationIds
    if (ids.length < 4) continue
    if (ids[0] !== ids[ids.length - 1]) continue
    return [...ids.slice(0, -1)]
  }
  return null
}

const walkSpurFrom = (
  topology: LineTopology,
  junction: string,
  cycleSet: ReadonlySet<string>
): string[] => {
  const byFrom = new Map<string, string[]>()
  for (const edge of topology.edges) {
    if (cycleSet.has(edge.fromStationId) && cycleSet.has(edge.toStationId)) {
      continue
    }
    const list = byFrom.get(edge.fromStationId) ?? []
    list.push(edge.toStationId)
    byFrom.set(edge.fromStationId, list)
  }
  const spur = [junction]
  const seen = new Set([junction])
  let current = junction
  while (true) {
    const next = (byFrom.get(current) ?? []).find((id) => !seen.has(id))
    if (!next) break
    spur.push(next)
    seen.add(next)
    current = next
  }
  return spur
}

/**
 * Circle-style loop: two parallel arcs that meet at the spur junction and
 * the opposite station, plus the tail (Hammersmith) on the nearest side lane.
 */
const layoutLoopSchematic = (
  topology: LineTopology,
  meta: BranchSchematicMeta,
  orientation: SchematicOrientationHint,
  cycle: readonly string[]
): LineSchematic => {
  const names = topology.stationNames ?? {}
  const nameOf = (id: string): string => names[id] ?? id
  const cycleSet = new Set(cycle)
  const junction = cycle[0]!
  const oppositeIndex = Math.floor(cycle.length / 2)
  const opposite = cycle[oppositeIndex]!
  const arcA = cycle.slice(0, oppositeIndex + 1)
  const arcB = [
    junction,
    ...[...cycle.slice(oppositeIndex + 1)].reverse(),
    opposite,
  ]
  const spur = walkSpurFrom(topology, junction, cycleSet)
  const spurTail = [...spur.slice(1)].reverse()
  const junctionPos = spurTail.length
  const stepsA = arcA.length - 1
  const stepsB = arcB.length - 1
  const oppositePos = junctionPos + Math.max(stepsA, stepsB)
  const meanA = meanCoord(arcA)
  const meanB = meanCoord(arcB)
  const northIsA = (meanA?.lat ?? 0) >= (meanB?.lat ?? 0)
  const northArc = northIsA ? arcA : arcB
  const southArc = northIsA ? arcB : arcA
  const spurLane = 0
  const northLane = -1
  const southLane = 0

  const usedNodeIds = new Set<string>()
  const takeNodeId = (stationId: string): string => {
    const base = slugifyStation(nameOf(stationId))
    if (!usedNodeIds.has(base)) {
      usedNodeIds.add(base)
      return base
    }
    let n = 2
    while (usedNodeIds.has(`${base}-${n}`)) n += 1
    const id = `${base}-${n}`
    usedNodeIds.add(id)
    return id
  }

  const placed = new Map<
    string,
    { nodeId: string; lane: number; pos: number; branchIds: Set<string> }
  >()
  const place = (
    stationId: string,
    lane: number,
    pos: number,
    branchId: string
  ) => {
    const existing = placed.get(stationId)
    if (existing) {
      existing.branchIds.add(branchId)
      return existing
    }
    const node = {
      nodeId: takeNodeId(stationId),
      lane,
      pos,
      branchIds: new Set([branchId]),
    }
    placed.set(stationId, node)
    return node
  }

  const loopBranch = topology.loopBranchIds?.[0] ?? topology.primaryBranchId
  const spurBranch =
    topology.edges.find(
      (edge) =>
        edge.fromStationId === junction && !cycleSet.has(edge.toStationId)
    )?.branchId ?? loopBranch

  for (const [index, stationId] of spurTail.entries()) {
    place(stationId, spurLane, index, spurBranch)
  }
  place(junction, 0, junctionPos, loopBranch)
  if (spurTail.length > 0) {
    placed.get(junction)!.branchIds.add(spurBranch)
  }

  for (const [index, stationId] of southArc.entries()) {
    if (stationId === junction) continue
    const pos = stationId === opposite ? oppositePos : junctionPos + index
    place(stationId, southLane, pos, loopBranch)
  }
  for (const [index, stationId] of northArc.entries()) {
    if (stationId === junction || stationId === opposite) continue
    place(stationId, northLane, junctionPos + index, loopBranch)
  }

  const edges: SchematicEdge[] = []
  const pushChain = (ids: readonly string[], branchId: string) => {
    for (let i = 0; i < ids.length - 1; i += 1) {
      const from = placed.get(ids[i]!)?.nodeId
      const to = placed.get(ids[i + 1]!)?.nodeId
      if (!from || !to || from === to) continue
      if (edges.some((edge) => edge.from === from && edge.to === to)) continue
      edges.push({ from, to, branchId })
    }
  }

  if (spurTail.length > 0) {
    pushChain([...spurTail, junction], spurBranch)
  }
  pushChain(southArc, loopBranch)
  pushChain(northArc, loopBranch)

  const degree = new Map<string, number>()
  for (const edge of edges) {
    degree.set(edge.from, (degree.get(edge.from) ?? 0) + 1)
    degree.set(edge.to, (degree.get(edge.to) ?? 0) + 1)
  }

  const nodes: SchematicNode[] = [...placed.entries()].map(
    ([stationId, node]) => ({
      id: node.nodeId,
      name: nameOf(stationId),
      lane: node.lane,
      pos: node.pos,
      kind: nodeKind(stationId, meta.lineId, degree.get(node.nodeId) ?? 0),
      branchIds: [...node.branchIds],
      stationKey: slugifyStation(nameOf(stationId)),
    })
  )

  const branchMeta = new Map(
    topology.branches.map((branch) => [branch.id, branch])
  )
  const usedBranches = uniqueSorted(edges.map((edge) => edge.branchId ?? ""))
  const schematic: LineSchematic = {
    lineId: meta.lineId,
    lineName: meta.lineName,
    orientation,
    branches: usedBranches
      .filter(Boolean)
      .map((id) => branchMeta.get(id) ?? { id, name: id }),
    nodes,
    edges,
  }
  assertValidSchematic(schematic)
  const stationIdByNodeId = new Map(
    [...placed.entries()].map(([stationId, node]) => [node.nodeId, stationId])
  )
  return decomposeForHorizontal(schematic, meta.lineId, stationIdByNodeId)
}

export const computeBranchSchematicLayout = (
  topology: LineTopology,
  meta: BranchSchematicMeta,
  orientation: SchematicOrientationHint = "horizontal"
): LineSchematic => {
  const names = topology.stationNames ?? {}
  const nameOf = (id: string): string => names[id] ?? id
  const segments = staticBranchSegments(meta.lineId)
  const cycle = uniqueLoopCycle(segments, topology.loopBranchIds ?? [])
  if (
    cycle &&
    cycle.length / Math.max(1, topology.nodes.length) >= LOOP_COVERAGE
  ) {
    return layoutLoopSchematic(topology, meta, orientation, cycle)
  }
  const trunk = resolveTrunk(topology, segments)
  if (trunk.length < 2) {
    throw new Error(`No trunk path for "${meta.lineId}"`)
  }
  const trunkSet = new Set(trunk)

  const directed: DirectedEdge[] = topology.edges.map((edge) => ({
    from: edge.fromStationId,
    to: edge.toStationId,
    branchId: edge.branchId,
  }))

  const offshoots = extractOffshoots(directed, trunk)
  const corridors = groupThroughCorridors(offshoots, trunk)
  corridors.sort((a, b) => {
    const len = corridorLength(b, trunkSet) - corridorLength(a, trunkSet)
    if (len !== 0) return len
    return corridorName(a).localeCompare(corridorName(b))
  })

  const placedByStation = new Map<string, PlacedNode[]>()
  const nodes: SchematicNode[] = []
  const usedNodeIds = new Set<string>()

  const takeNodeId = (stationId: string): string => {
    const base = slugifyStation(nameOf(stationId))
    if (!usedNodeIds.has(base)) {
      usedNodeIds.add(base)
      return base
    }
    let n = 2
    while (usedNodeIds.has(`${base}-${n}`)) n += 1
    const id = `${base}-${n}`
    usedNodeIds.add(id)
    return id
  }

  const occupied = new Set<string>()
  const cellKey = (lane: number, pos: number): string => `${lane}:${pos}`

  const freePos = (lane: number, pos: number): number => {
    let next = pos
    while (occupied.has(cellKey(lane, next))) next += 1
    return next
  }

  const remember = (placed: PlacedNode) => {
    const list = placedByStation.get(placed.stationId) ?? []
    list.push(placed)
    placedByStation.set(placed.stationId, list)
    occupied.add(cellKey(placed.lane, placed.pos))
  }

  const placeNew = (
    stationId: string,
    lane: number,
    pos: number,
    branchId: string
  ): PlacedNode => {
    const placed: PlacedNode = {
      nodeId: takeNodeId(stationId),
      stationId,
      lane,
      pos: freePos(lane, pos),
      branchIds: new Set([branchId]),
    }
    remember(placed)
    return placed
  }

  const existingAt = (stationId: string): PlacedNode | undefined =>
    placedByStation.get(stationId)?.[0]

  const resolveNode = (
    stationId: string,
    lane: number,
    pos: number,
    branchId: string,
    preferReuse: boolean
  ): PlacedNode => {
    const existing = existingAt(stationId)
    if (!existing) return placeNew(stationId, lane, pos, branchId)
    const parallelPipes =
      existing.lane !== lane &&
      Math.abs(existing.lane - lane) === 1 &&
      shouldDuplicate(stationId, branchId, existing, segments)
    const trunkEnd =
      existing.lane === 0 &&
      (existing.pos === 0 || existing.pos === trunk.length - 1)
    if (parallelPipes && !trunkEnd && !preferReuse) {
      return placeNew(stationId, lane, pos, branchId)
    }
    existing.branchIds.add(branchId)
    return existing
  }

  const nodeByWalk = new Map<string, PlacedNode>()

  for (const [index, stationId] of trunk.entries()) {
    const branchId =
      index < trunk.length - 1
        ? trunkEdgeBranchId(topology, stationId, trunk[index + 1]!)
        : trunkEdgeBranchId(topology, trunk[index - 1]!, stationId)
    const placed = placeNew(stationId, 0, index, branchId)
    nodeByWalk.set(`trunk:${stationId}`, placed)
  }

  const isShortGroup = (group: readonly Offshoot[]): boolean =>
    corridorLength(group, trunkSet) <= 2

  const longCorridors = corridors.filter((group) => !isShortGroup(group))
  const shortCorridors = corridors.filter((group) => isShortGroup(group))

  const laneOf = new Map<Offshoot, number>()

  const nearestLaneTo = (fromLane: number, pos: number): number => {
    for (let delta = 1; delta < 16; delta += 1) {
      for (const lane of [fromLane + delta, fromLane - delta]) {
        if (!occupied.has(cellKey(lane, pos))) return lane
      }
    }
    return fromLane + 1
  }

  const nearestLaneWithSign = (
    fromLane: number,
    pos: number,
    sign: -1 | 1
  ): number => {
    for (let magnitude = 1; magnitude < 16; magnitude += 1) {
      const lane = fromLane + sign * magnitude
      if (!occupied.has(cellKey(lane, pos))) return lane
    }
    return fromLane + sign
  }

  const nearestFreeLane = (pos: number): number => {
    for (let index = 0; index < 16; index += 1) {
      const lane = signLane(index, orientation)
      if (!occupied.has(cellKey(lane, pos))) return lane
    }
    return signLane(16, orientation)
  }

  const pullOf = (group: readonly Offshoot[]): CompassPull => {
    const seed = group[0]!
    const junctionId =
      seed.stationIds.find(
        (id) => existingAt(id) != null || trunkSet.has(id)
      ) ?? seed.stationIds[0]!
    const unique = seed.stationIds.filter(
      (id) => id !== junctionId && !trunkSet.has(id)
    )
    const from = stationCoord(junctionId)
    const to = meanCoord(unique.length > 0 ? unique : seed.stationIds)
    if (!from || !to) return { sign: 0, strength: 0 }
    return compassPull(from, to)
  }

  const resolveCorridorLane = (
    group: readonly Offshoot[],
    fallbackIndex: number
  ): number => {
    const seed = group[0]!
    const start = existingAt(seed.stationIds[0]!)
    const end = existingAt(seed.stationIds[seed.stationIds.length - 1]!)
    const attachment = start ?? end
    const pull: CompassPull =
      orientation === "horizontal" ? pullOf(group) : { sign: 0, strength: 0 }
    if (
      start &&
      pull.sign === 0 &&
      !occupied.has(cellKey(start.lane, start.pos + 1))
    ) {
      return start.lane
    }
    if (attachment && pull.sign !== 0) {
      return nearestLaneWithSign(attachment.lane, attachment.pos, pull.sign)
    }
    if (attachment) return nearestLaneTo(attachment.lane, attachment.pos)
    if (orientation === "horizontal" && pull.sign !== 0) {
      return pull.sign
    }
    return signLane(fallbackIndex, orientation)
  }

  const attachesToTrunk = (group: readonly Offshoot[]): boolean => {
    const seed = group[0]!
    return (
      trunkSet.has(seed.stationIds[0]!) ||
      trunkSet.has(seed.stationIds[seed.stationIds.length - 1]!)
    )
  }

  const placeOffshoot = (offshoot: Offshoot, lane: number) => {
    const ids = offshoot.stationIds
    const first = ids[0]!
    const last = ids[ids.length - 1]!
    const firstPlaced = existingAt(first)
    const lastPlaced = existingAt(last)

    let cursorPos: number
    if (firstPlaced && lastPlaced) {
      cursorPos = firstPlaced.pos
    } else if (lastPlaced && !firstPlaced) {
      const uniqueCount = ids.length - 1
      cursorPos = lastPlaced.pos - uniqueCount
    } else if (firstPlaced) {
      cursorPos = firstPlaced.pos
    } else {
      cursorPos = 0
    }

    for (let i = 0; i < ids.length; i += 1) {
      const stationId = ids[i]!
      const branchId = offshoot.edgeBranchIds[Math.max(0, i - 1)]!
      const already = existingAt(stationId)
      const isEnd = i === 0 || i === ids.length - 1
      const preferReuse = Boolean(already && (isEnd || already.lane === lane))

      if (
        already &&
        preferReuse &&
        !shouldDuplicate(stationId, branchId, already, segments)
      ) {
        already.branchIds.add(branchId)
        nodeByWalk.set(`${lane}:${i}:${stationId}`, already)
        cursorPos = already.pos
        continue
      }

      if (already && !shouldDuplicate(stationId, branchId, already, segments)) {
        already.branchIds.add(branchId)
        nodeByWalk.set(`${lane}:${i}:${stationId}`, already)
        cursorPos = already.pos
        continue
      }

      if (i > 0) cursorPos += 1
      const placed = resolveNode(stationId, lane, cursorPos, branchId, false)
      if (placed.lane !== lane && placed === already) {
        /* reused junction */
      }
      nodeByWalk.set(`${lane}:${i}:${stationId}`, placed)
      cursorPos = placed.pos
    }
  }

  const placeGroup = (group: readonly Offshoot[], lane: number) => {
    const ordered = [...group].sort((a, b) => {
      const aFirst = existingAt(a.stationIds[0]!)
      const bFirst = existingAt(b.stationIds[0]!)
      const aPos = aFirst?.pos ?? Number.POSITIVE_INFINITY
      const bPos = bFirst?.pos ?? Number.POSITIVE_INFINITY
      if (aPos !== bPos) return aPos - bPos
      return uniqueLength(b, trunkSet) - uniqueLength(a, trunkSet)
    })
    for (const offshoot of ordered) placeOffshoot(offshoot, lane)
  }

  const trunkAttached = longCorridors.filter((group) => attachesToTrunk(group))
  const laterLong = longCorridors.filter((group) => !attachesToTrunk(group))
  let fanIndex = 0
  for (const group of [...trunkAttached, ...laterLong]) {
    const lane = resolveCorridorLane(group, fanIndex)
    if (
      !existingAt(group[0]!.stationIds[0]!) &&
      !existingAt(group[0]!.stationIds[group[0]!.stationIds.length - 1]!)
    ) {
      fanIndex += 1
    }
    for (const offshoot of group) laneOf.set(offshoot, lane)
    placeGroup(group, lane)
  }

  for (const group of shortCorridors) {
    const attachment =
      existingAt(group[0]!.stationIds[0]!) ??
      existingAt(group[0]!.stationIds[group[0]!.stationIds.length - 1]!)
    const pull =
      orientation === "horizontal"
        ? pullOf(group)
        : { sign: 0 as const, strength: 0 }
    const lane = attachment
      ? pull.sign !== 0
        ? nearestLaneWithSign(attachment.lane, attachment.pos, pull.sign)
        : nearestLaneTo(attachment.lane, attachment.pos)
      : nearestFreeLane(0)
    for (const offshoot of group) laneOf.set(offshoot, lane)
    placeGroup(group, lane)
  }

  if (orientation === "horizontal" && shouldFlipHorizontalPos(trunk)) {
    let maxPos = 0
    for (const list of placedByStation.values()) {
      for (const placed of list) maxPos = Math.max(maxPos, placed.pos)
    }
    for (const list of placedByStation.values()) {
      for (const placed of list) placed.pos = maxPos - placed.pos
    }
  }

  const schematicNodesById = new Map<string, PlacedNode>()
  for (const list of placedByStation.values()) {
    for (const placed of list) schematicNodesById.set(placed.nodeId, placed)
  }

  const degree = new Map<string, number>()
  const bump = (id: string) => degree.set(id, (degree.get(id) ?? 0) + 1)

  const edges: SchematicEdge[] = []
  const pushEdge = (from: string, to: string, branchId: string) => {
    if (from === to) return
    if (edges.some((edge) => edge.from === from && edge.to === to)) return
    edges.push({ from, to, branchId })
    bump(from)
    bump(to)
  }

  for (let i = 0; i < trunk.length - 1; i += 1) {
    const from = nodeByWalk.get(`trunk:${trunk[i]!}`)!
    const to = nodeByWalk.get(`trunk:${trunk[i + 1]!}`)!
    const branchId =
      topology.edges.find(
        (edge) =>
          edge.fromStationId === trunk[i] && edge.toStationId === trunk[i + 1]
      )?.branchId ?? topology.primaryBranchId
    pushEdge(from.nodeId, to.nodeId, branchId)
  }

  for (const group of [...longCorridors, ...shortCorridors]) {
    const lane = laneOf.get(group[0]!) ?? 1
    for (const offshoot of group) {
      for (let i = 0; i < offshoot.stationIds.length - 1; i += 1) {
        const from = nodeByWalk.get(`${lane}:${i}:${offshoot.stationIds[i]!}`)
        const to = nodeByWalk.get(
          `${lane}:${i + 1}:${offshoot.stationIds[i + 1]!}`
        )
        if (!from || !to) continue
        pushEdge(from.nodeId, to.nodeId, offshoot.edgeBranchIds[i]!)
      }
    }
  }

  for (const placed of schematicNodesById.values()) {
    nodes.push({
      id: placed.nodeId,
      name: nameOf(placed.stationId),
      lane: placed.lane,
      pos: placed.pos,
      kind: nodeKind(
        placed.stationId,
        meta.lineId,
        degree.get(placed.nodeId) ?? 0
      ),
      branchIds: [...placed.branchIds],
      stationKey: slugifyStation(nameOf(placed.stationId)),
    })
  }

  const branchMeta = new Map<string, { id: string; name: string }>()
  for (const branch of topology.branches) {
    branchMeta.set(branch.id, branch)
  }
  const usedBranches = uniqueSorted(edges.map((edge) => edge.branchId ?? ""))
  const branches = usedBranches
    .filter(Boolean)
    .map((id) => branchMeta.get(id) ?? { id, name: id })

  const schematic: LineSchematic = {
    lineId: meta.lineId,
    lineName: meta.lineName,
    orientation,
    branches,
    nodes,
    edges,
  }

  assertValidSchematic(schematic)
  const stationIdByNodeId = new Map(
    [...schematicNodesById.entries()].map(([nodeId, placed]) => [
      nodeId,
      placed.stationId,
    ])
  )
  return decomposeForHorizontal(schematic, meta.lineId, stationIdByNodeId)
}

export const buildBranchSchematic = (
  lineId: string,
  orientation: SchematicOrientationHint = "horizontal"
): LineSchematic | null => {
  const topology = buildLineTopologyFromStaticBranches(lineId)
  if (!topology) return null
  const sequence = getStaticLineSequence(lineId)
  return computeBranchSchematicLayout(
    topology,
    {
      lineId,
      lineName: sequence?.lineName ?? lineId,
    },
    orientation
  )
}
