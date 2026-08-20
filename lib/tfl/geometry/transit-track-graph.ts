/**
 * Collapse OSM route variants into unique track + a welded junction graph.
 *
 * OSM stores separate route relations for mapped directions and variants.
 * A snap-grid merge treats twin tracks as the same
 * corridor where they are tight and as a leftover branch where they splay,
 * which cuts the second track mid-corridor. This module uses metre distance
 * and a parallel-tangent test instead, then welds each leftover branch onto
 * the spine at the point whose local bearing matches the branch approach —
 * not the nearest vertex, which produced meaningless right-angle joins.
 *
 * The painted "centreline" is unique-track of the longer mapped direction
 * only. Merging both directions invented leftover strokes (Kennington loop
 * drawn twice, White City depot splay) that are wider than any single OSM
 * relation. Dual track still keeps both directions.
 */
import type { Feature, LineString } from "geojson"
import type {
  LineSegmentProperties,
  TransitGeometryBundle,
  TransitGraph,
  TransitGraphEdge,
  TransitGraphNode,
} from "@/lib/tfl/geography-types"

export const TRACK_GRAPH = {
  SAMPLE_SPACING_M: 10,
  SAME_DIR_TOL_M: 15,
  MERGE_TOL_M: 90,
  PARALLEL_COS: 0.7,
  MIN_RUN_M: 200,
  BRANCH_DEVIATION_M: 150,
  WELD_DECIMALS: 6,
  FULL_SIMPLIFY_M: 4.5,
  PREVIEW_SIMPLIFY_M: 39,
  WARN_SHAPES_PER_LINE: 16,
  STATION_SNAP_M: 250,
  DIRECTION_OVERLAP_M: 200,
  CONNECT_WELD_M: 400,
  /** Pin vertices this close to a weld so DP cannot flatten the real approach. */
  WELD_PIN_M: 80,
  /** Revisit of the start/end within this distance is a dead-end spur to strip. */
  SPUR_REVISIT_M: 8,
} as const

export type LngLat = [number, number]

export type TrackStation = {
  id: string
  name: string
  label?: string
  coordinates: LngLat
}

export type LineTrackReport = {
  lineId: string
  variantCount: number
  centrelineCount: number
  dualCount: number
  directionCounts: [number, number]
  centrelineEnds: { start: string; end: string }[]
  warnings: string[]
}

export type DualTrackShape = {
  coords: LngLat[]
  trackGroup: 0 | 1
  towards?: string
}

export type LineTrackResult = {
  centreline: LngLat[][]
  dual: DualTrackShape[]
  graph: TransitGraph
  report: LineTrackReport
}

export type TrackBuildInput = {
  lineId: string
  lineName: string
  color: string
  variants: LngLat[][]
  stations?: readonly TrackStation[]
}

export type ModeTrackResult = {
  centrelineFull: TransitGeometryBundle
  centrelinePreview: TransitGeometryBundle
  dualFull: TransitGeometryBundle
  dualPreview: TransitGeometryBundle
  graph: TransitGraph
  reports: LineTrackReport[]
}

type LineTemplate = {
  lineId: string
  lineName: string
  color: string
}

type Projected = { x: number; y: number }

type SegHit = {
  dist: number
  point: LngLat
  shapeIndex: number
  segIndex: number
  t: number
  tangent: Projected
}

type Segment = {
  shapeIndex: number
  segIndex: number
  a: LngLat
  b: LngLat
  ax: number
  ay: number
  bx: number
  by: number
  tdx: number
  tdy: number
}

type AcceptedShape = {
  coords: LngLat[]
}

const METERS_PER_DEG_LAT = 111_320
const REF_LAT = 51.5
const REF_LNG = -0.12
const METERS_PER_DEG_LNG =
  METERS_PER_DEG_LAT * Math.cos((REF_LAT * Math.PI) / 180)

const toXY = (point: LngLat): Projected => ({
  x: (point[0] - REF_LNG) * METERS_PER_DEG_LNG,
  y: (point[1] - REF_LAT) * METERS_PER_DEG_LAT,
})

const fromXY = (xy: Projected): LngLat => [
  REF_LNG + xy.x / METERS_PER_DEG_LNG,
  REF_LAT + xy.y / METERS_PER_DEG_LAT,
]

export const lineLengthMetres = (coords: readonly LngLat[]): number => {
  let length = 0
  for (let index = 1; index < coords.length; index += 1) {
    const prev = toXY(coords[index - 1]!)
    const next = toXY(coords[index]!)
    length += Math.hypot(next.x - prev.x, next.y - prev.y)
  }
  return length
}

export const pointKey = (
  point: LngLat,
  decimals: number = TRACK_GRAPH.WELD_DECIMALS
): string => `${point[0].toFixed(decimals)},${point[1].toFixed(decimals)}`

const roundCoord = (value: number, decimals: number): number => {
  const factor = 10 ** decimals
  return Math.round(value * factor) / factor
}

const createIntern = () => {
  const registry = new Map<string, LngLat>()
  const intern = (point: LngLat): LngLat => {
    const rounded: LngLat = [
      roundCoord(point[0], TRACK_GRAPH.WELD_DECIMALS),
      roundCoord(point[1], TRACK_GRAPH.WELD_DECIMALS),
    ]
    const key = pointKey(rounded)
    const existing = registry.get(key)
    if (existing) return existing
    registry.set(key, rounded)
    return rounded
  }
  return intern
}

/**
 * OSM route relations sometimes prepend a terminus stub then jump back
 * to the junction (Waterloo & City at Bank). That paints as a second
 * track / eye. Drop a prefix or suffix that returns to the start/end
 * when a longer continuation remains.
 */
export const stripDeadEndSpurs = (coordinates: readonly LngLat[]): LngLat[] => {
  if (coordinates.length < 4) return [...coordinates]
  const stripPrefix = (coords: LngLat[]): LngLat[] => {
    const start = coords[0]!
    for (let index = 2; index < coords.length - 2; index += 1) {
      if (metresBetween(start, coords[index]!) > TRACK_GRAPH.SPUR_REVISIT_M) {
        continue
      }
      const prefix = lineLengthMetres(coords.slice(0, index + 1))
      const rest = lineLengthMetres(coords.slice(index))
      if (rest >= TRACK_GRAPH.MIN_RUN_M && prefix < rest) {
        return coords.slice(index)
      }
    }
    return coords
  }
  const stripSuffix = (coords: LngLat[]): LngLat[] => {
    const reversed = stripPrefix([...coords].reverse())
    return reversed.reverse()
  }
  const stripped = stripSuffix(stripPrefix([...coordinates]))
  return stripped.length >= 2 ? stripped : [...coordinates]
}

const densifyLine = (
  coordinates: readonly LngLat[],
  spacingM: number = TRACK_GRAPH.SAMPLE_SPACING_M
): LngLat[] => {
  if (coordinates.length < 2) return [...coordinates]
  const densified: LngLat[] = [coordinates[0]!]
  for (let index = 0; index < coordinates.length - 1; index += 1) {
    const start = coordinates[index]!
    const end = coordinates[index + 1]!
    const a = toXY(start)
    const b = toXY(end)
    const distance = Math.hypot(b.x - a.x, b.y - a.y)
    const steps = Math.max(1, Math.round(distance / spacingM))
    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps
      densified.push(
        fromXY({
          x: a.x + (b.x - a.x) * t,
          y: a.y + (b.y - a.y) * t,
        })
      )
    }
  }
  return densified
}

const tangentAt = (coords: readonly LngLat[], index: number): Projected => {
  const prev = coords[Math.max(0, index - 1)]!
  const next = coords[Math.min(coords.length - 1, index + 1)]!
  const a = toXY(prev)
  const b = toXY(next)
  const length = Math.hypot(b.x - a.x, b.y - a.y)
  if (length === 0) return { x: 1, y: 0 }
  return { x: (b.x - a.x) / length, y: (b.y - a.y) / length }
}

const projectOnSegment = (
  point: LngLat,
  start: LngLat,
  end: LngLat
): { dist: number; t: number; point: LngLat; tangent: Projected } => {
  const p = toXY(point)
  const a = toXY(start)
  const b = toXY(end)
  const dx = b.x - a.x
  const dy = b.y - a.y
  const lengthSq = dx * dx + dy * dy
  if (lengthSq === 0) {
    return {
      dist: Math.hypot(p.x - a.x, p.y - a.y),
      t: 0,
      point: start,
      tangent: { x: 1, y: 0 },
    }
  }
  const t = Math.max(
    0,
    Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lengthSq)
  )
  const qx = a.x + t * dx
  const qy = a.y + t * dy
  const length = Math.sqrt(lengthSq)
  return {
    dist: Math.hypot(p.x - qx, p.y - qy),
    t,
    point: fromXY({ x: qx, y: qy }),
    tangent: { x: dx / length, y: dy / length },
  }
}

const perpDistanceMetres = (
  point: LngLat,
  start: LngLat,
  end: LngLat
): number => projectOnSegment(point, start, end).dist

class SegmentIndex {
  private readonly cellSize: number
  private readonly cells = new Map<string, Segment[]>()
  private readonly segments: Segment[] = []

  constructor(cellSize: number) {
    this.cellSize = Math.max(20, cellSize)
  }

  clear() {
    this.cells.clear()
    this.segments.length = 0
  }

  addShape(shapeIndex: number, coords: readonly LngLat[]) {
    for (let segIndex = 0; segIndex < coords.length - 1; segIndex += 1) {
      const a = coords[segIndex]!
      const b = coords[segIndex + 1]!
      const pa = toXY(a)
      const pb = toXY(b)
      const length = Math.hypot(pb.x - pa.x, pb.y - pa.y)
      const segment: Segment = {
        shapeIndex,
        segIndex,
        a,
        b,
        ax: pa.x,
        ay: pa.y,
        bx: pb.x,
        by: pb.y,
        tdx: length === 0 ? 1 : (pb.x - pa.x) / length,
        tdy: length === 0 ? 0 : (pb.y - pa.y) / length,
      }
      this.segments.push(segment)
      const minX = Math.min(pa.x, pb.x)
      const maxX = Math.max(pa.x, pb.x)
      const minY = Math.min(pa.y, pb.y)
      const maxY = Math.max(pa.y, pb.y)
      const x0 = Math.floor(minX / this.cellSize)
      const x1 = Math.floor(maxX / this.cellSize)
      const y0 = Math.floor(minY / this.cellSize)
      const y1 = Math.floor(maxY / this.cellSize)
      for (let x = x0; x <= x1; x += 1) {
        for (let y = y0; y <= y1; y += 1) {
          const key = `${x},${y}`
          const list = this.cells.get(key)
          if (list) list.push(segment)
          else this.cells.set(key, [segment])
        }
      }
    }
  }

  nearest(point: LngLat, radiusM: number): SegHit | null {
    const p = toXY(point)
    const reach = Math.ceil(radiusM / this.cellSize)
    const cx = Math.floor(p.x / this.cellSize)
    const cy = Math.floor(p.y / this.cellSize)
    let best: SegHit | null = null
    const seen = new Set<Segment>()
    for (let x = cx - reach; x <= cx + reach; x += 1) {
      for (let y = cy - reach; y <= cy + reach; y += 1) {
        const list = this.cells.get(`${x},${y}`)
        if (!list) continue
        for (const segment of list) {
          if (seen.has(segment)) continue
          seen.add(segment)
          const hit = projectOnSegment(point, segment.a, segment.b)
          if (hit.dist > radiusM) continue
          if (!best || hit.dist < best.dist) {
            best = {
              dist: hit.dist,
              point: hit.point,
              shapeIndex: segment.shapeIndex,
              segIndex: segment.segIndex,
              t: hit.t,
              tangent: hit.tangent,
            }
          }
        }
      }
    }
    return best
  }

  hitsWithin(point: LngLat, radiusM: number): SegHit[] {
    const p = toXY(point)
    const reach = Math.ceil(radiusM / this.cellSize)
    const cx = Math.floor(p.x / this.cellSize)
    const cy = Math.floor(p.y / this.cellSize)
    const hits: SegHit[] = []
    const seen = new Set<Segment>()
    for (let x = cx - reach; x <= cx + reach; x += 1) {
      for (let y = cy - reach; y <= cy + reach; y += 1) {
        const list = this.cells.get(`${x},${y}`)
        if (!list) continue
        for (const segment of list) {
          if (seen.has(segment)) continue
          seen.add(segment)
          const hit = projectOnSegment(point, segment.a, segment.b)
          if (hit.dist > radiusM) continue
          hits.push({
            dist: hit.dist,
            point: hit.point,
            shapeIndex: segment.shapeIndex,
            segIndex: segment.segIndex,
            t: hit.t,
            tangent: hit.tangent,
          })
        }
      }
    }
    return hits
  }
}

const rebuildIndex = (
  shapes: readonly AcceptedShape[],
  cellSize: number
): SegmentIndex => {
  const index = new SegmentIndex(cellSize)
  shapes.forEach((shape, shapeIndex) => {
    index.addShape(shapeIndex, shape.coords)
  })
  return index
}

const isCovered = (
  point: LngLat,
  tangent: Projected,
  index: SegmentIndex,
  tolM: number
): SegHit | null => {
  const hit = index.nearest(point, tolM)
  if (!hit) return null
  const cos = Math.abs(tangent.x * hit.tangent.x + tangent.y * hit.tangent.y)
  if (cos < TRACK_GRAPH.PARALLEL_COS) return null
  return hit
}

const extractUncoveredRuns = (
  coordinates: readonly LngLat[],
  index: SegmentIndex,
  tolM: number
): LngLat[][] => {
  const densified = densifyLine(coordinates)
  const runs: LngLat[][] = []
  let current: LngLat[] = []
  let lastCovered: LngLat | null = null

  const flush = (junction: LngLat | null) => {
    if (junction) current.push(junction)
    if (
      current.length >= 2 &&
      lineLengthMetres(current) >= TRACK_GRAPH.MIN_RUN_M
    ) {
      runs.push(current)
    }
    current = []
  }

  for (let indexPt = 0; indexPt < densified.length; indexPt += 1) {
    const point = densified[indexPt]!
    const tangent = tangentAt(densified, indexPt)
    if (isCovered(point, tangent, index, tolM)) {
      if (current.length > 0) flush(point)
      lastCovered = point
      continue
    }
    if (current.length === 0 && lastCovered) current.push(lastCovered)
    current.push(point)
  }
  flush(null)
  return runs
}

const maxDeviationMetres = (
  run: readonly LngLat[],
  index: SegmentIndex,
  radiusM: number
): number => {
  let max = 0
  const samples = densifyLine(run, 25)
  for (const point of samples) {
    const hit = index.nearest(point, radiusM)
    const dist = hit ? hit.dist : radiusM
    if (dist > max) max = dist
  }
  return max
}

const isRealBranch = (
  run: readonly LngLat[],
  index: SegmentIndex,
  coverTolM: number
): boolean => {
  if (lineLengthMetres(run) < TRACK_GRAPH.MIN_RUN_M) return false
  const search = Math.max(
    TRACK_GRAPH.BRANCH_DEVIATION_M * 4,
    coverTolM * 4,
    600
  )
  const maxDev = maxDeviationMetres(run, index, search)
  if (maxDev > TRACK_GRAPH.BRANCH_DEVIATION_M) return true

  const startHit = index.nearest(run[0]!, coverTolM * 2)
  const endHit = index.nearest(run[run.length - 1]!, coverTolM * 2)
  const startNear = Boolean(startHit)
  const endNear = Boolean(endHit)
  if (startNear && endNear) return false

  const free = startNear ? run[run.length - 1]! : run[0]!
  const freeHit = index.nearest(free, search)
  return !freeHit || freeHit.dist > TRACK_GRAPH.BRANCH_DEVIATION_M
}

/** Direction of a branch as it arrives at `endIndex` (interior → end). */
const branchEndTangent = (
  coords: readonly LngLat[],
  endIndex: number
): Projected => {
  const towardInterior = tangentAt(coords, endIndex)
  if (endIndex === 0) {
    return { x: -towardInterior.x, y: -towardInterior.y }
  }
  return towardInterior
}

const tangentAgreement = (left: Projected, right: Projected): number =>
  Math.abs(left.x * right.x + left.y * right.y)

/**
 * Among spine hits within `radiusM`, pick the one whose local bearing
 * agrees with the branch approach. Distance is only a tie-break.
 */
const bestWeldHit = (
  point: LngLat,
  tangent: Projected,
  index: SegmentIndex,
  radiusM: number
): SegHit | null => {
  const hits = index.hitsWithin(point, radiusM)
  if (hits.length === 0) return null
  let best = hits[0]!
  let bestAgree = tangentAgreement(tangent, best.tangent)
  for (const hit of hits.slice(1)) {
    const agree = tangentAgreement(tangent, hit.tangent)
    if (agree > bestAgree + 1e-6) {
      best = hit
      bestAgree = agree
      continue
    }
    if (Math.abs(agree - bestAgree) <= 1e-6 && hit.dist < best.dist) {
      best = hit
    }
  }
  return best
}

const insertVertex = (
  coords: LngLat[],
  hit: SegHit,
  intern: (point: LngLat) => LngLat
): LngLat => {
  const start = coords[hit.segIndex]!
  const end = coords[hit.segIndex + 1]!
  const startDist = Math.hypot(
    toXY(hit.point).x - toXY(start).x,
    toXY(hit.point).y - toXY(start).y
  )
  const endDist = Math.hypot(
    toXY(hit.point).x - toXY(end).x,
    toXY(hit.point).y - toXY(end).y
  )
  if (hit.t < 0.02 || startDist < 1) {
    const shared = intern(start)
    coords[hit.segIndex] = shared
    return shared
  }
  if (hit.t > 0.98 || endDist < 1) {
    const shared = intern(end)
    coords[hit.segIndex + 1] = shared
    return shared
  }
  const shared = intern(hit.point)
  coords.splice(hit.segIndex + 1, 0, shared)
  return shared
}

const weldRun = (
  run: LngLat[],
  accepted: AcceptedShape[],
  index: SegmentIndex,
  intern: (point: LngLat) => LngLat,
  coverTolM: number
): LngLat[] => {
  const welded = run.map((point) => intern(point))
  const ends: Array<{ index: number; point: LngLat }> = [
    { index: 0, point: welded[0]! },
    { index: welded.length - 1, point: welded[welded.length - 1]! },
  ]
  const weldRadius = Math.max(coverTolM * 2, 180)

  for (const end of ends) {
    const hit = bestWeldHit(
      end.point,
      branchEndTangent(welded, end.index),
      index,
      weldRadius
    )
    if (!hit) continue
    const shape = accepted[hit.shapeIndex]
    if (!shape) continue
    const shared = insertVertex(shape.coords, hit, intern)
    welded[end.index] = shared
  }

  const startHit = bestWeldHit(
    welded[0]!,
    branchEndTangent(welded, 0),
    index,
    TRACK_GRAPH.CONNECT_WELD_M
  )
  const endHit = bestWeldHit(
    welded[welded.length - 1]!,
    branchEndTangent(welded, welded.length - 1),
    index,
    TRACK_GRAPH.CONNECT_WELD_M
  )
  const startWelded = startHit && startHit.dist <= weldRadius
  const endWelded = endHit && endHit.dist <= weldRadius
  if (!startWelded && !endWelded) {
    const nearer =
      startHit && endHit
        ? startHit.dist <= endHit.dist
          ? { endIndex: 0, hit: startHit }
          : { endIndex: welded.length - 1, hit: endHit }
        : startHit
          ? { endIndex: 0, hit: startHit }
          : endHit
            ? { endIndex: welded.length - 1, hit: endHit }
            : null
    if (nearer) {
      const shape = accepted[nearer.hit.shapeIndex]
      if (shape) {
        const shared = insertVertex(shape.coords, nearer.hit, intern)
        welded[nearer.endIndex] = shared
      }
    }
  }

  return welded
}

const collapseToUnique = (
  polylines: readonly LngLat[][],
  tolM: number,
  intern: (point: LngLat) => LngLat
): AcceptedShape[] => {
  const ranked = [...polylines]
    .filter((coords) => coords.length >= 2)
    .sort((left, right) => lineLengthMetres(right) - lineLengthMetres(left))
  if (ranked.length === 0) return []

  const accepted: AcceptedShape[] = [
    { coords: ranked[0]!.map((point) => intern(point)) },
  ]
  let index = rebuildIndex(accepted, tolM)

  const candidateRuns: LngLat[][] = []
  for (const polyline of ranked.slice(1)) {
    for (const run of extractUncoveredRuns(polyline, index, tolM)) {
      candidateRuns.push(run)
    }
  }
  candidateRuns.sort(
    (left, right) => lineLengthMetres(right) - lineLengthMetres(left)
  )

  for (const run of candidateRuns) {
    index = rebuildIndex(accepted, tolM)
    const leftover = extractUncoveredRuns(run, index, tolM)
    for (const piece of leftover) {
      if (!isRealBranch(piece, index, tolM)) continue
      const welded = weldRun(piece, accepted, index, intern, tolM)
      if (welded.length < 2) continue
      accepted.push({ coords: welded })
      index = rebuildIndex(accepted, tolM)
    }
  }

  return accepted
}

const voteAgainst = (
  variant: readonly LngLat[],
  reference: readonly LngLat[]
): { same: number; opposite: number } => {
  const index = new SegmentIndex(TRACK_GRAPH.DIRECTION_OVERLAP_M)
  index.addShape(0, reference)
  const samples = densifyLine(variant, 50)
  let same = 0
  let opposite = 0
  for (let i = 0; i < samples.length; i += 1) {
    const hit = index.nearest(samples[i]!, TRACK_GRAPH.DIRECTION_OVERLAP_M)
    if (!hit) continue
    const tangent = tangentAt(samples, i)
    const dot = tangent.x * hit.tangent.x + tangent.y * hit.tangent.y
    if (Math.abs(dot) < 0.3) continue
    if (dot > 0) same += 1
    else opposite += 1
  }
  return { same, opposite }
}

const groupByDirection = (
  polylines: readonly LngLat[][]
): [LngLat[][], LngLat[][]] => {
  const ranked = [...polylines]
    .filter((coords) => coords.length >= 2)
    .sort((left, right) => lineLengthMetres(right) - lineLengthMetres(left))
  const groups: [LngLat[][], LngLat[][]] = [[], []]
  if (ranked.length === 0) return groups
  groups[0].push(ranked[0]!)

  for (const variant of ranked.slice(1)) {
    let best: { group: 0 | 1; score: number } | null = null
    for (const group of [0, 1] as const) {
      for (const member of groups[group]) {
        const { same, opposite } = voteAgainst(variant, member)
        const n = same + opposite
        if (n < 3) continue
        const aligned = same >= opposite
        const score = Math.max(same, opposite)
        const assigned: 0 | 1 = aligned ? group : group === 0 ? 1 : 0
        if (!best || score > best.score) best = { group: assigned, score }
      }
    }
    groups[best?.group ?? 0].push(variant)
  }
  return groups
}

const simplifyDouglasPeucker = (
  coordinates: readonly LngLat[],
  epsilonM: number
): LngLat[] => {
  if (coordinates.length <= 2) return [...coordinates]
  const first = coordinates[0]!
  const last = coordinates[coordinates.length - 1]!
  let maxDistance = 0
  let maxIndex = 0
  for (let index = 1; index < coordinates.length - 1; index += 1) {
    const distance = perpDistanceMetres(coordinates[index]!, first, last)
    if (distance > maxDistance) {
      maxDistance = distance
      maxIndex = index
    }
  }
  if (maxDistance <= epsilonM) return [first, last]
  const left = simplifyDouglasPeucker(
    coordinates.slice(0, maxIndex + 1),
    epsilonM
  )
  const right = simplifyDouglasPeucker(coordinates.slice(maxIndex), epsilonM)
  return [...left.slice(0, -1), ...right]
}

const simplifyPinned = (
  coordinates: readonly LngLat[],
  epsilonM: number,
  pinnedKeys: ReadonlySet<string>,
  intern: (point: LngLat) => LngLat
): LngLat[] => {
  if (coordinates.length <= 2) {
    return coordinates.map((point) => intern(point))
  }
  const pinned: number[] = [0]
  for (let index = 1; index < coordinates.length - 1; index += 1) {
    if (pinnedKeys.has(pointKey(coordinates[index]!))) pinned.push(index)
  }
  pinned.push(coordinates.length - 1)

  const out: LngLat[] = []
  for (let i = 0; i < pinned.length - 1; i += 1) {
    const from = pinned[i]!
    const to = pinned[i + 1]!
    const slice = coordinates.slice(from, to + 1)
    const simplified = simplifyDouglasPeucker(slice, epsilonM)
    const piece = simplified.map((point, pieceIndex) => {
      if (pieceIndex === 0 || pieceIndex === simplified.length - 1) {
        return intern(coordinates[pieceIndex === 0 ? from : to]!)
      }
      return intern(point)
    })
    if (out.length === 0) out.push(...piece)
    else out.push(...piece.slice(1))
  }
  return out
}

const endpointKeysOf = (shapes: readonly AcceptedShape[]): Set<string> => {
  const keys = new Set<string>()
  for (const shape of shapes) {
    if (shape.coords.length === 0) continue
    keys.add(pointKey(shape.coords[0]!))
    keys.add(pointKey(shape.coords[shape.coords.length - 1]!))
  }
  return keys
}

const metresBetween = (left: LngLat, right: LngLat): number => {
  const a = toXY(left)
  const b = toXY(right)
  return Math.hypot(b.x - a.x, b.y - a.y)
}

/** Vertices that appear on two or more accepted shapes — the weld points. */
const sharedVertexPoints = (shapes: readonly AcceptedShape[]): LngLat[] => {
  const first = new Map<string, LngLat>()
  const shared: LngLat[] = []
  const seenShared = new Set<string>()
  for (const shape of shapes) {
    const onShape = new Set<string>()
    for (const point of shape.coords) {
      const key = pointKey(point)
      if (onShape.has(key)) continue
      onShape.add(key)
      const existing = first.get(key)
      if (!existing) {
        first.set(key, point)
        continue
      }
      if (!seenShared.has(key)) {
        seenShared.add(key)
        shared.push(existing)
      }
    }
  }
  return shared
}

/**
 * Endpoints plus a short run of vertices approaching each weld, so
 * Douglas-Peucker cannot flatten the real approach curve.
 */
const pinKeysForSimplify = (shapes: readonly AcceptedShape[]): Set<string> => {
  const pinned = endpointKeysOf(shapes)
  const welds = sharedVertexPoints(shapes)
  if (welds.length === 0) return pinned
  for (const shape of shapes) {
    for (const point of shape.coords) {
      if (
        welds.some(
          (weld) => metresBetween(point, weld) <= TRACK_GRAPH.WELD_PIN_M
        )
      ) {
        pinned.add(pointKey(point))
      }
    }
  }
  return pinned
}

const splitAtPinned = (
  coords: readonly LngLat[],
  pinnedKeys: ReadonlySet<string>
): LngLat[][] => {
  if (coords.length < 2) return []
  const pieces: LngLat[][] = []
  let current: LngLat[] = [coords[0]!]
  for (let index = 1; index < coords.length; index += 1) {
    const point = coords[index]!
    current.push(point)
    const isInterior = index < coords.length - 1
    if (isInterior && pinnedKeys.has(pointKey(point))) {
      pieces.push(current)
      current = [point]
    }
  }
  pieces.push(current)
  return pieces.filter((piece) => piece.length >= 2)
}

const nearestStation = (
  point: LngLat,
  stations: readonly TrackStation[] | undefined,
  radiusM: number = TRACK_GRAPH.STATION_SNAP_M
): TrackStation | null => {
  if (!stations?.length) return null
  let best: TrackStation | null = null
  let bestDist = radiusM
  for (const station of stations) {
    const a = toXY(point)
    const b = toXY(station.coordinates)
    const dist = Math.hypot(a.x - b.x, a.y - b.y)
    if (dist <= bestDist) {
      best = station
      bestDist = dist
    }
  }
  return best
}

const stationLabel = (station: TrackStation | null, fallback: LngLat): string =>
  station?.label ?? station?.name ?? pointKey(fallback, 4)

const buildGraphForLine = (
  lineId: string,
  shapes: readonly { coords: LngLat[]; featureId: string }[],
  pinnedKeys: ReadonlySet<string>,
  stations: readonly TrackStation[] | undefined
): TransitGraph => {
  const nodeByKey = new Map<string, TransitGraphNode>()
  const edges: TransitGraphEdge[] = []
  let edgeIndex = 0

  const nodeId = (point: LngLat): string => `${lineId}:${pointKey(point)}`

  const touch = (point: LngLat): TransitGraphNode => {
    const key = pointKey(point)
    const existing = nodeByKey.get(key)
    if (existing) return existing
    const station = nearestStation(point, stations)
    const node: TransitGraphNode = {
      id: nodeId(point),
      kind: "terminus",
      coordinates: point,
      degree: 0,
      lineId,
      ...(station
        ? { stationId: station.id, stationName: station.label ?? station.name }
        : {}),
    }
    nodeByKey.set(key, node)
    return node
  }

  for (const shape of shapes) {
    for (const piece of splitAtPinned(shape.coords, pinnedKeys)) {
      const from = touch(piece[0]!)
      const to = touch(piece[piece.length - 1]!)
      from.degree += 1
      to.degree += 1
      edges.push({
        id: `${lineId}-e${edgeIndex}`,
        from: from.id,
        to: to.id,
        lineId,
        featureId: shape.featureId,
        coordinates: piece,
        lengthMetres: Math.round(lineLengthMetres(piece) * 10) / 10,
      })
      edgeIndex += 1
    }
  }

  const nodes = [...nodeByKey.values()].map((node) => ({
    ...node,
    kind: node.degree >= 3 ? ("junction" as const) : ("terminus" as const),
  }))

  return { nodes, edges }
}

const internedShapes = (
  shapes: readonly AcceptedShape[],
  intern: (point: LngLat) => LngLat,
  epsilonM: number
): AcceptedShape[] => {
  const pinned = pinKeysForSimplify(shapes)
  return shapes.map((shape) => ({
    coords: simplifyPinned(shape.coords, epsilonM, pinned, intern),
  }))
}

const towardsForGroup = (
  shapes: readonly AcceptedShape[],
  stations: readonly TrackStation[] | undefined
): string | undefined => {
  if (shapes.length === 0) return undefined
  const spine = shapes[0]!
  const end = spine.coords[spine.coords.length - 1]!
  return (
    nearestStation(end, stations)?.label ?? nearestStation(end, stations)?.name
  )
}

type CollapsedLine = {
  intern: (point: LngLat) => LngLat
  variants: LngLat[][]
  groups: [LngLat[][], LngLat[][]]
  dualAccepted: [AcceptedShape[], AcceptedShape[]]
  centreAccepted: AcceptedShape[]
}

const groupLengthMetres = (polylines: readonly LngLat[][]): number =>
  polylines.reduce((sum, coords) => sum + lineLengthMetres(coords), 0)

/** Longer mapped direction — the centreline source. Empty group loses. */
const longerDirectionGroup = (
  groups: readonly [LngLat[][], LngLat[][]]
): 0 | 1 => {
  if (groups[0].length === 0) return 1
  if (groups[1].length === 0) return 0
  return groupLengthMetres(groups[0]) >= groupLengthMetres(groups[1]) ? 0 : 1
}

const collapseLine = (input: TrackBuildInput): CollapsedLine => {
  const intern = createIntern()
  const variants = input.variants
    .map((coords) => stripDeadEndSpurs(coords))
    .filter((coords) => coords.length >= 2)
  const groups = groupByDirection(variants)
  return {
    intern,
    variants,
    groups,
    dualAccepted: [
      collapseToUnique(groups[0], TRACK_GRAPH.SAME_DIR_TOL_M, intern),
      collapseToUnique(groups[1], TRACK_GRAPH.SAME_DIR_TOL_M, intern),
    ],
    centreAccepted: collapseToUnique(
      groups[longerDirectionGroup(groups)],
      TRACK_GRAPH.MERGE_TOL_M,
      intern
    ),
  }
}

const finishLineTracks = (
  input: TrackBuildInput,
  collapsed: CollapsedLine,
  simplifyM: number
): LineTrackResult => {
  const { intern, variants, groups, dualAccepted, centreAccepted } = collapsed
  const centreline = internedShapes(centreAccepted, intern, simplifyM).map(
    (shape) => shape.coords
  )
  const dualSimplified: DualTrackShape[] = []
  for (const group of [0, 1] as const) {
    const towards = towardsForGroup(dualAccepted[group], input.stations)
    for (const shape of internedShapes(
      dualAccepted[group],
      intern,
      simplifyM
    )) {
      dualSimplified.push({
        coords: shape.coords,
        trackGroup: group,
        towards,
      })
    }
  }

  const centreForGraph = internedShapes(
    centreAccepted,
    intern,
    TRACK_GRAPH.FULL_SIMPLIFY_M
  )
  const pinned = endpointKeysOf(centreForGraph)
  const graph = buildGraphForLine(
    input.lineId,
    centreForGraph.map((shape, index) => ({
      coords: shape.coords,
      featureId: `${input.lineId}-track-${index}`,
    })),
    pinned,
    input.stations
  )

  const warnings: string[] = []
  if (centreline.length > TRACK_GRAPH.WARN_SHAPES_PER_LINE) {
    warnings.push(
      `${input.lineId}: ${centreline.length} centreline shapes (cap was only for artefacts)`
    )
  }

  return {
    centreline,
    dual: dualSimplified,
    graph,
    report: {
      lineId: input.lineId,
      variantCount: variants.length,
      centrelineCount: centreline.length,
      dualCount: dualSimplified.length,
      directionCounts: [groups[0].length, groups[1].length],
      centrelineEnds: centreline.map((coords) => ({
        start: stationLabel(
          nearestStation(coords[0]!, input.stations),
          coords[0]!
        ),
        end: stationLabel(
          nearestStation(coords[coords.length - 1]!, input.stations),
          coords[coords.length - 1]!
        ),
      })),
      warnings,
    },
  }
}

export const buildLineTracks = (
  input: TrackBuildInput,
  options?: { simplifyM?: number }
): LineTrackResult =>
  finishLineTracks(
    input,
    collapseLine(input),
    options?.simplifyM ?? TRACK_GRAPH.FULL_SIMPLIFY_M
  )

const samePointLoose = (left: LngLat, right: LngLat): boolean =>
  Math.abs(left[0] - right[0]) < 1e-6 && Math.abs(left[1] - right[1]) < 1e-6

const rejoinOffsetSplits = (
  features: readonly Feature<LineString, LineSegmentProperties>[]
): Feature<LineString, LineSegmentProperties>[] => {
  const groups = new Map<
    string,
    { run: number; feature: Feature<LineString, LineSegmentProperties> }[]
  >()

  for (const feature of features) {
    const raw = String(feature.id ?? feature.properties.featureId)
    const match = raw.match(/^(.*)-(\d+)$/)
    const base = match ? match[1]! : raw
    const run = match ? Number(match[2]) : 0
    const list = groups.get(base) ?? []
    list.push({ run, feature })
    groups.set(base, list)
  }

  const rejoined: Feature<LineString, LineSegmentProperties>[] = []
  for (const [base, pieces] of groups) {
    pieces.sort((left, right) => left.run - right.run)
    const coordinates: LngLat[] = []
    for (const piece of pieces) {
      const next = piece.feature.geometry.coordinates as LngLat[]
      if (
        coordinates.length > 0 &&
        next.length > 0 &&
        samePointLoose(coordinates[coordinates.length - 1]!, next[0]!)
      ) {
        coordinates.push(...next.slice(1))
      } else {
        coordinates.push(...next)
      }
    }
    if (coordinates.length < 2) continue
    const template = pieces[0]!.feature
    rejoined.push({
      ...template,
      id: base,
      properties: { ...template.properties, featureId: base },
      geometry: { type: "LineString", coordinates },
    })
  }
  return rejoined
}

const asStations = (bundle: TransitGeometryBundle): TrackStation[] =>
  (bundle.stations.features ?? []).flatMap((feature) => {
    if (feature.geometry?.type !== "Point") return []
    const coords = feature.geometry.coordinates
    if (coords.length < 2) return []
    return [
      {
        id: String(feature.id ?? feature.properties.featureId),
        name: feature.properties.name,
        label: feature.properties.label,
        coordinates: [coords[0]!, coords[1]!],
      },
    ]
  })

const toLineFeature = (
  coords: LngLat[],
  template: LineTemplate,
  featureId: string,
  extra?: Pick<LineSegmentProperties, "trackGroup" | "towards">
): Feature<LineString, LineSegmentProperties> => ({
  type: "Feature",
  id: featureId,
  properties: {
    featureId,
    lineId: template.lineId,
    lineName: template.lineName,
    color: template.color,
    ...extra,
  },
  geometry: { type: "LineString", coordinates: coords },
})

const bundleFromFeatures = (
  stations: TransitGeometryBundle["stations"],
  features: Feature<LineString, LineSegmentProperties>[],
  source: string,
  filter: string
): TransitGeometryBundle => ({
  stations,
  lines: {
    type: "FeatureCollection",
    features,
    meta: {
      source,
      filter,
      featureCount: features.length,
    },
  } as TransitGeometryBundle["lines"],
})

const groupFeaturesByLine = (
  features: readonly Feature<LineString, LineSegmentProperties>[]
): Map<string, Feature<LineString, LineSegmentProperties>[]> => {
  const grouped = new Map<
    string,
    Feature<LineString, LineSegmentProperties>[]
  >()
  for (const feature of features) {
    const lineId = feature.properties.lineId
    const list = grouped.get(lineId) ?? []
    list.push(feature)
    grouped.set(lineId, list)
  }
  return grouped
}

export const buildModeTracks = (
  bundle: TransitGeometryBundle
): ModeTrackResult => {
  const stations = asStations(bundle)
  const grouped = groupFeaturesByLine(
    rejoinOffsetSplits(bundle.lines.features ?? [])
  )
  const centreFull: Feature<LineString, LineSegmentProperties>[] = []
  const centrePreview: Feature<LineString, LineSegmentProperties>[] = []
  const dualFull: Feature<LineString, LineSegmentProperties>[] = []
  const dualPreview: Feature<LineString, LineSegmentProperties>[] = []
  const graph: TransitGraph = { nodes: [], edges: [] }
  const reports: LineTrackReport[] = []

  for (const [lineId, lineFeatures] of grouped) {
    const template: LineTemplate = {
      lineId,
      lineName: lineFeatures[0]!.properties.lineName,
      color: lineFeatures[0]!.properties.color,
    }
    const variants = lineFeatures
      .filter((feature) => feature.geometry?.type === "LineString")
      .map((feature) => feature.geometry.coordinates as LngLat[])

    const input = { ...template, variants, stations }
    const collapsed = collapseLine(input)
    const full = finishLineTracks(input, collapsed, TRACK_GRAPH.FULL_SIMPLIFY_M)
    const preview = finishLineTracks(
      input,
      collapsed,
      TRACK_GRAPH.PREVIEW_SIMPLIFY_M
    )

    full.centreline.forEach((coords, index) => {
      centreFull.push(
        toLineFeature(coords, template, `${lineId}-track-${index}`)
      )
    })
    preview.centreline.forEach((coords, index) => {
      centrePreview.push(
        toLineFeature(coords, template, `${lineId}-track-${index}`)
      )
    })
    full.dual.forEach((shape, index) => {
      dualFull.push(
        toLineFeature(
          shape.coords,
          template,
          `${lineId}-dir${shape.trackGroup}-track-${index}`,
          { trackGroup: shape.trackGroup, towards: shape.towards }
        )
      )
    })
    preview.dual.forEach((shape, index) => {
      dualPreview.push(
        toLineFeature(
          shape.coords,
          template,
          `${lineId}-dir${shape.trackGroup}-track-${index}`,
          { trackGroup: shape.trackGroup, towards: shape.towards }
        )
      )
    })
    graph.nodes.push(...full.graph.nodes)
    graph.edges.push(...full.graph.edges)
    reports.push(full.report)
    for (const warning of full.report.warnings) console.warn(warning)
  }

  const centreFilter =
    "Merged centreline: directional twins collapsed, leftover branches welded at shared vertices"
  const dualFilter =
    "Both directional tracks kept continuous; leftover branches welded at shared vertices"

  return {
    centrelineFull: bundleFromFeatures(
      bundle.stations,
      centreFull,
      "osm-route-network",
      centreFilter
    ),
    centrelinePreview: bundleFromFeatures(
      bundle.stations,
      centrePreview,
      "osm-simplified",
      centreFilter
    ),
    dualFull: bundleFromFeatures(
      bundle.stations,
      dualFull,
      "osm-route-network-dual",
      dualFilter
    ),
    dualPreview: bundleFromFeatures(
      bundle.stations,
      dualPreview,
      "osm-simplified-dual",
      dualFilter
    ),
    graph,
    reports,
  }
}

export const connectedComponentCount = (graph: TransitGraph): number => {
  if (graph.nodes.length === 0) return 0
  const adj = new Map<string, string[]>()
  for (const node of graph.nodes) adj.set(node.id, [])
  for (const edge of graph.edges) {
    adj.get(edge.from)?.push(edge.to)
    adj.get(edge.to)?.push(edge.from)
  }
  const seen = new Set<string>()
  let components = 0
  for (const node of graph.nodes) {
    if (seen.has(node.id)) continue
    components += 1
    const stack = [node.id]
    while (stack.length > 0) {
      const id = stack.pop()!
      if (seen.has(id)) continue
      seen.add(id)
      for (const next of adj.get(id) ?? []) stack.push(next)
    }
  }
  return components
}
