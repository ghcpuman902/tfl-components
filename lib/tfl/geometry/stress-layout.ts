/**
 * Graphviz-style layout for line topology: classical MDS on hop distances
 * (Torgerson / Brandes–Pich PivotMDS family), a few stress-majorization
 * refinements (Gansner, Koren, North 2004 — neato), then rotation-only
 * Procrustes to geography.
 *
 * MDS supplies global spacing. Stress controls path lengths, movement
 * constraints straighten supported continuations, and overlap separation
 * keeps distinct nodes apart. Orientation matching keeps Reading west and
 * Shenfield east without locking in every geographic kink.
 */
export type StressPoint = { x: number; y: number }

export type StressGraph = {
  ids: string[]
  edges: { from: string; to: string; length?: number }[]
  geo: StressPoint[]
  straightThrough?: {
    from: string
    via: string
    to: string
    strength?: number
  }[]
  /**
   * Split flying-junction pairs (see `splitFlyingJunctions`) that should stay
   * pinned close together regardless of what hop-distance majorization wants —
   * a soft spring toward `gap`, re-applied every step and after overlap
   * separation so the pair reads as "one place, two dots" rather than
   * drifting apart like an ordinary edge.
   */
  bondLinks?: { a: string; b: string; gap?: number }[]
}

const METERS_PER_DEG_LAT = 111_320
const REF_LAT = 51.5
const METERS_PER_DEG_LNG =
  METERS_PER_DEG_LAT * Math.cos((REF_LAT * Math.PI) / 180)

export const STRESS_HOP = 80
export const STRESS_MIN_SEP = 28
/** Target separation for a bonded pair (see `bondLinks`) — closer than any ordinary hop. */
export const STRESS_BOND_GAP = 14

export const geoToPlane = (lng: number, lat: number): StressPoint => ({
  x: lng * METERS_PER_DEG_LNG,
  y: -lat * METERS_PER_DEG_LAT,
})

const hopDistances = (
  count: number,
  adj: { to: number; length: number }[][]
): number[][] => {
  const dist: number[][] = Array.from({ length: count }, () =>
    Array.from({ length: count }, () => Number.POSITIVE_INFINITY)
  )
  for (let source = 0; source < count; source += 1) {
    dist[source]![source] = 0
    const used = new Set<number>()
    for (let step = 0; step < count; step += 1) {
      let best = -1
      let bestDist = Number.POSITIVE_INFINITY
      for (let node = 0; node < count; node += 1) {
        if (used.has(node)) continue
        const value = dist[source]![node]!
        if (value < bestDist) {
          best = node
          bestDist = value
        }
      }
      if (best < 0 || !Number.isFinite(bestDist)) break
      used.add(best)
      for (const next of adj[best] ?? []) {
        const candidate = bestDist + next.length
        if (candidate < dist[source]![next.to]!) {
          dist[source]![next.to] = candidate
        }
      }
    }
  }
  return dist
}

const adjacency = (
  count: number,
  edges: StressGraph["edges"],
  index: Map<string, number>
) => {
  const adj: { to: number; length: number }[][] = Array.from(
    { length: count },
    () => []
  )
  for (const edge of edges) {
    const from = index.get(edge.from)
    const to = index.get(edge.to)
    if (from == null || to == null || from === to) continue
    const length = edge.length && edge.length > 0 ? edge.length : 1
    adj[from]!.push({ to, length })
    adj[to]!.push({ to: from, length })
  }
  return adj
}

const median = (values: number[]): number => {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 1
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2
}

const mean = (values: number[]) =>
  values.reduce((sum, value) => sum + value, 0) / values.length

const hypotVec = (values: number[]) =>
  Math.sqrt(values.reduce((sum, value) => sum + value * value, 0))

const normalize = (values: number[]) => {
  const length = hypotVec(values) || 1
  return values.map((value) => value / length)
}

const matVec = (matrix: number[][], vector: number[]) =>
  matrix.map((row) =>
    row.reduce((sum, value, index) => sum + value * vector[index]!, 0)
  )

const projectOut = (vector: number[], axis: number[]) => {
  const dot = vector.reduce(
    (sum, value, index) => sum + value * axis[index]!,
    0
  )
  return vector.map((value, index) => value - dot * axis[index]!)
}

const eigenPair = (
  matrix: number[][],
  start: number[],
  previous?: number[]
) => {
  let vector = normalize(start)
  for (let step = 0; step < 120; step += 1) {
    let next = matVec(matrix, vector)
    if (previous) next = projectOut(next, previous)
    const length = hypotVec(next)
    if (length < 1e-12) return { vector, lambda: 0 }
    vector = next.map((value) => value / length)
  }
  const image = matVec(matrix, vector)
  const lambda = vector.reduce(
    (sum, value, index) => sum + value * image[index]!,
    0
  )
  return { vector, lambda }
}

/** Classical MDS (Torgerson scaling) of a hop-distance matrix. */
const classicalMds = (delta: number[][]): { x: number[]; y: number[] } => {
  const count = delta.length
  const x = Array.from({ length: count }, () => 0)
  const y = Array.from({ length: count }, () => 0)
  if (count === 0) return { x, y }

  const squared = delta.map((row) => row.map((value) => value * value))
  const rowMean = squared.map((row) => mean(row))
  const grand = mean(rowMean)
  const gram = squared.map((row, i) =>
    row.map((value, j) => -0.5 * (value - rowMean[i]! - rowMean[j]! + grand))
  )

  const first = eigenPair(
    gram,
    Array.from({ length: count }, (_, i) => i - (count - 1) / 2)
  )
  const second = eigenPair(
    gram,
    Array.from({ length: count }, (_, i) => (i % 2 === 0 ? 1 : -1)),
    first.vector
  )

  const sx = Math.sqrt(Math.max(first.lambda, 0))
  const sy = Math.sqrt(Math.max(second.lambda, 0))
  for (let i = 0; i < count; i += 1) {
    x[i] = sx * first.vector[i]!
    y[i] = sy * second.vector[i]!
  }
  return { x, y }
}

export type StressState = {
  x: number[]
  y: number[]
  geoX: number[]
  geoY: number[]
  delta: number[][]
  weight: number[][]
  hop: number
  straightThrough: {
    from: number
    via: number
    to: number
    strength: number
  }[]
  bondLinks: { a: number; b: number; gap: number }[]
  /** Track edges (bonds omitted) used to penalise crossings. */
  layoutEdges: { from: number; to: number }[]
}

export const createStressState = (
  graph: StressGraph,
  hop = STRESS_HOP
): StressState => {
  const { ids, edges, geo } = graph
  const index = new Map(ids.map((id, i) => [id, i]))
  const count = ids.length
  const adj = adjacency(count, edges, index)
  const hops = hopDistances(count, adj)
  const typicalLength =
    median(
      edges.flatMap((edge) =>
        edge.length && edge.length > 0 ? [edge.length] : []
      )
    ) || 1
  const scale = hop / typicalLength
  const delta = hops.map((row) =>
    row.map((value) => (Number.isFinite(value) ? value * scale : 0))
  )
  const weight = hops.map((row) =>
    row.map((value) =>
      value === 0 || !Number.isFinite(value) ? 0 : 1 / (value * value)
    )
  )

  const geoX = geo.map((point) => point.x)
  const geoY = geo.map((point) => point.y)

  const adjacent: number[] = []
  for (let i = 0; i < count; i += 1) {
    for (let j = i + 1; j < count; j += 1) {
      if (hops[i]![j] !== 1) continue
      adjacent.push(Math.hypot(geoX[i]! - geoX[j]!, geoY[i]! - geoY[j]!))
    }
  }
  const typical = median(adjacent)
  if (typical > 1e-6) {
    const scale = hop / typical
    for (let i = 0; i < count; i += 1) {
      geoX[i]! *= scale
      geoY[i]! *= scale
    }
  }

  const mds =
    count >= 2 ? classicalMds(delta) : { x: geoX.slice(), y: geoY.slice() }
  const x = mds.x
  const y = mds.y
  orientToGeo(x, y, geoX, geoY)

  return {
    x,
    y,
    geoX,
    geoY,
    delta,
    weight,
    hop,
    straightThrough: (graph.straightThrough ?? []).flatMap((constraint) => {
      const from = index.get(constraint.from)
      const via = index.get(constraint.via)
      const to = index.get(constraint.to)
      if (
        from == null ||
        via == null ||
        to == null ||
        from === via ||
        via === to ||
        from === to
      ) {
        return []
      }
      return [
        {
          from,
          via,
          to,
          strength: constraint.strength ?? 0.34,
        },
      ]
    }),
    bondLinks: (graph.bondLinks ?? []).flatMap((link) => {
      const a = index.get(link.a)
      const b = index.get(link.b)
      if (a == null || b == null || a === b) return []
      return [{ a, b, gap: link.gap ?? STRESS_BOND_GAP }]
    }),
    layoutEdges: edges.flatMap((edge) => {
      const from = index.get(edge.from)
      const to = index.get(edge.to)
      if (from == null || to == null || from === to) return []
      const bonded = (graph.bondLinks ?? []).some(
        (link) =>
          (link.a === edge.from && link.b === edge.to) ||
          (link.a === edge.to && link.b === edge.from)
      )
      return bonded ? [] : [{ from, to }]
    }),
  }
}

const straightenPermittedMovements = (state: StressState): number => {
  let move = 0
  for (let pass = 0; pass < 4; pass += 1) {
    for (const constraint of state.straightThrough) {
      const midpointX =
        (state.x[constraint.from]! + state.x[constraint.to]!) / 2
      const midpointY =
        (state.y[constraint.from]! + state.y[constraint.to]!) / 2
      const errorX = state.x[constraint.via]! - midpointX
      const errorY = state.y[constraint.via]! - midpointY
      const viaShiftX = -errorX * constraint.strength
      const viaShiftY = -errorY * constraint.strength
      const legShiftX = -viaShiftX / 2
      const legShiftY = -viaShiftY / 2

      state.x[constraint.via]! += viaShiftX
      state.y[constraint.via]! += viaShiftY
      state.x[constraint.from]! += legShiftX
      state.y[constraint.from]! += legShiftY
      state.x[constraint.to]! += legShiftX
      state.y[constraint.to]! += legShiftY
      move +=
        viaShiftX * viaShiftX +
        viaShiftY * viaShiftY +
        2 * (legShiftX * legShiftX + legShiftY * legShiftY)
    }
  }
  return move
}

const orientation = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number
) => (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)

const onSegment = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number
) =>
  Math.min(ax, bx) <= cx + 1e-9 &&
  cx <= Math.max(ax, bx) + 1e-9 &&
  Math.min(ay, by) <= cy + 1e-9 &&
  cy <= Math.max(ay, by) + 1e-9

/** Proper intersection of AB and CD, excluding shared endpoints. */
export const segmentsCross = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number
): boolean => {
  if (
    (ax === cx && ay === cy) ||
    (ax === dx && ay === dy) ||
    (bx === cx && by === cy) ||
    (bx === dx && by === dy)
  ) {
    return false
  }
  const o1 = orientation(ax, ay, bx, by, cx, cy)
  const o2 = orientation(ax, ay, bx, by, dx, dy)
  const o3 = orientation(cx, cy, dx, dy, ax, ay)
  const o4 = orientation(cx, cy, dx, dy, bx, by)
  if (o1 === 0 && onSegment(ax, ay, bx, by, cx, cy)) return false
  if (o2 === 0 && onSegment(ax, ay, bx, by, dx, dy)) return false
  if (o3 === 0 && onSegment(cx, cy, dx, dy, ax, ay)) return false
  if (o4 === 0 && onSegment(cx, cy, dx, dy, bx, by)) return false
  return o1 * o2 < 0 && o3 * o4 < 0
}

const edgeCrosses = (
  state: StressState,
  left: { from: number; to: number },
  right: { from: number; to: number }
): boolean => {
  if (
    left.from === right.from ||
    left.from === right.to ||
    left.to === right.from ||
    left.to === right.to
  ) {
    return false
  }
  return segmentsCross(
    state.x[left.from]!,
    state.y[left.from]!,
    state.x[left.to]!,
    state.y[left.to]!,
    state.x[right.from]!,
    state.y[right.from]!,
    state.x[right.to]!,
    state.y[right.to]!
  )
}

const crossingCount = (state: StressState): number => {
  let count = 0
  const edges = state.layoutEdges
  for (let i = 0; i < edges.length; i += 1) {
    for (let j = i + 1; j < edges.length; j += 1) {
      if (edgeCrosses(state, edges[i]!, edges[j]!)) count += 1
    }
  }
  return count
}

const swapNodes = (state: StressState, a: number, b: number) => {
  const x = state.x[a]!
  const y = state.y[a]!
  state.x[a] = state.x[b]!
  state.y[a] = state.y[b]!
  state.x[b] = x
  state.y[b] = y
}

const translateBranch = (
  state: StressState,
  branch: readonly number[],
  dx: number,
  dy: number
) => {
  for (const node of branch) {
    state.x[node]! += dx
    state.y[node]! += dy
  }
}

/**
 * Positive when a bonded pair's two branches already sit on their
 * geographically correct sides (measured from the bond's own midpoint, so
 * the score survives the swap it is used to judge — swapping `a`/`b`
 * leaves their average position unchanged). Negative when the pair is a
 * mirror image of geography: hop-distance stress has no opinion on which
 * side is which, so nothing but geography can break that tie.
 */
const branchCentroid = (
  state: StressState,
  branch: readonly number[]
): { x: number; y: number } => {
  if (branch.length === 0) return { x: 0, y: 0 }
  let x = 0
  let y = 0
  for (const node of branch) {
    x += state.geoX[node]!
    y += state.geoY[node]!
  }
  return { x: x / branch.length, y: y / branch.length }
}

const bondSplitAxis = (
  state: StressState,
  branchA: readonly number[],
  branchB: readonly number[]
): "x" | "y" => {
  const a = branchCentroid(state, branchA)
  const b = branchCentroid(state, branchB)
  return Math.abs(a.x - b.x) >= Math.abs(a.y - b.y) ? "x" : "y"
}

const bondSideAgreement = (
  state: StressState,
  link: { a: number; b: number },
  branchA: readonly number[],
  branchB: readonly number[]
): number => {
  const axis = bondSplitAxis(state, branchA, branchB)
  const mid =
    axis === "x"
      ? (state.x[link.a]! + state.x[link.b]!) / 2
      : (state.y[link.a]! + state.y[link.b]!) / 2
  const midGeo =
    axis === "x"
      ? (state.geoX[link.a]! + state.geoX[link.b]!) / 2
      : (state.geoY[link.a]! + state.geoY[link.b]!) / 2
  const layout = axis === "x" ? state.x : state.y
  const geo = axis === "x" ? state.geoX : state.geoY
  let score = 0
  for (const node of [link.a, ...branchA, link.b, ...branchB]) {
    score += (layout[node]! - mid) * (geo[node]! - midGeo)
  }
  return score
}

/** Accept a candidate flip if it reduces crossings, or if it turns a
 * geographically backwards fork the right way around. A clean but mirrored
 * fork (Bank vs Charing Cross at Euston) never crosses, so crossing count
 * alone cannot decide handedness. A leftover-crossing neighbour can add an
 * X when the pair swaps — still take the geo fix; later passes can uncross. */
const shouldFlip = (
  beforeCrossings: number,
  afterCrossings: number,
  beforeAgreement: number,
  afterAgreement: number
): boolean =>
  afterCrossings < beforeCrossings ||
  (beforeAgreement < 0 && afterAgreement > beforeAgreement)

/**
 * Reflect both exclusive corridors across the bond's midpoint. Used when
 * the two dots already sit on top of each other (Euston) so a slot-swap
 * only nudges them by the bond gap and leaves Bank/CX where they were.
 * Pick the axis with the larger geographic split so west/east and
 * north/south forks both get a real flip.
 */
const mirrorBondBranches = (
  state: StressState,
  link: { a: number; b: number },
  branchA: readonly number[],
  branchB: readonly number[]
) => {
  const nodes = [link.a, ...branchA, link.b, ...branchB]
  const axis = bondSplitAxis(state, branchA, branchB)
  const mid =
    axis === "x"
      ? (state.x[link.a]! + state.x[link.b]!) / 2
      : (state.y[link.a]! + state.y[link.b]!) / 2
  const layout = axis === "x" ? state.x : state.y
  for (const node of nodes) layout[node] = 2 * mid - layout[node]!
}

/**
 * If a bonded pair sits on the wrong side of its corridors, exclusive legs
 * cross — swap which slot each half occupies. Each half's own corridor
 * (everything beyond it, not just the bonded dot) has to move with it: a
 * bare swap of the two dots left their real branches — the ones with
 * actual stations on them, not the toy leaf in the unit test — stranded at
 * the old spot, so majorization spent the next several hundred steps
 * dragging each branch back across the station, undoing the swap in
 * everything but name.
 *
 * Bank vs Charing Cross at Euston never crosses — the two branches just
 * fork cleanly, in either handedness, and the two Euston dots sit on top
 * of each other. Swapping those dots does nothing to the corridors; the
 * fork has to be mirrored across the station instead.
 */
const uncrossBondSides = (state: StressState): number => {
  let move = 0
  const adj = buildTrackAdjacency(state)
  for (const link of state.bondLinks) {
    const before = crossingCount(state)
    const branchA = branchUntilNextHub(adj, link.b, link.a).filter(
      (node) => node !== link.a
    )
    const branchB = branchUntilNextHub(adj, link.a, link.b).filter(
      (node) => node !== link.b
    )
    const beforeAgreement = bondSideAgreement(state, link, branchA, branchB)

    mirrorBondBranches(state, link, branchA, branchB)
    const afterMirror = crossingCount(state)
    const afterMirrorAgreement = bondSideAgreement(
      state,
      link,
      branchA,
      branchB
    )
    if (
      shouldFlip(before, afterMirror, beforeAgreement, afterMirrorAgreement)
    ) {
      move += 1
      continue
    }
    mirrorBondBranches(state, link, branchA, branchB)

    const ax = state.x[link.a]!
    const ay = state.y[link.a]!
    const bx = state.x[link.b]!
    const by = state.y[link.b]!
    swapNodes(state, link.a, link.b)
    const dax = state.x[link.a]! - ax
    const day = state.y[link.a]! - ay
    const dbx = state.x[link.b]! - bx
    const dby = state.y[link.b]! - by
    translateBranch(state, branchA, dax, day)
    translateBranch(state, branchB, dbx, dby)
    const after = crossingCount(state)
    const afterAgreement = bondSideAgreement(state, link, branchA, branchB)
    if (!shouldFlip(before, after, beforeAgreement, afterAgreement)) {
      translateBranch(state, branchA, -dax, -day)
      translateBranch(state, branchB, -dbx, -dby)
      swapNodes(state, link.a, link.b)
      continue
    }
    move += dax * dax + day * day
  }
  return move
}

/** Push crossing track edges apart so an X is an energy cost, not a stable state. */
const penalizeCrossings = (state: StressState): number => {
  let move = 0
  const edges = state.layoutEdges
  const strength = 0.22
  for (let i = 0; i < edges.length; i += 1) {
    for (let j = i + 1; j < edges.length; j += 1) {
      const left = edges[i]!
      const right = edges[j]!
      if (!edgeCrosses(state, left, right)) continue
      const midAx = (state.x[left.from]! + state.x[left.to]!) / 2
      const midAy = (state.y[left.from]! + state.y[left.to]!) / 2
      const midBx = (state.x[right.from]! + state.x[right.to]!) / 2
      const midBy = (state.y[right.from]! + state.y[right.to]!) / 2
      const dx = midAx - midBx
      const dy = midAy - midBy
      const dist = Math.hypot(dx, dy) || 1e-6
      const push = (strength * state.hop) / dist
      const px = (dx / dist) * push
      const py = (dy / dist) * push
      state.x[left.from]! += px
      state.y[left.from]! += py
      state.x[left.to]! += px
      state.y[left.to]! += py
      state.x[right.from]! -= px
      state.y[right.from]! -= py
      state.x[right.to]! -= px
      state.y[right.to]! -= py
      move += 4 * (px * px + py * py)
    }
  }
  return move
}

const hubNeighbors = (state: StressState): number[][] => {
  const lists: number[][] = state.x.map(() => [])
  for (const edge of state.layoutEdges) {
    lists[edge.from]!.push(edge.to)
    lists[edge.to]!.push(edge.from)
  }
  return lists
}

/**
 * Adjacency over track/passenger edges only (never bonds). A bonded pair
 * marks "same station, two dots" — crossing into the other half's own
 * branches would let one hub's leg-flip sweep up an unrelated leg of a
 * different hub, so branch traversal always stops at a bond boundary.
 */
const buildTrackAdjacency = (state: StressState): number[][] => {
  const adj: number[][] = state.x.map(() => [])
  for (const edge of state.layoutEdges) {
    adj[edge.from]!.push(edge.to)
    adj[edge.to]!.push(edge.from)
  }
  return adj
}

/** Every node reachable from `start` without passing back through `exclude`. */
const branchBeyond = (
  adj: number[][],
  exclude: number,
  start: number
): number[] => {
  const seen = new Set<number>([exclude])
  const stack = [start]
  const nodes: number[] = []
  while (stack.length > 0) {
    const node = stack.pop()!
    if (seen.has(node)) continue
    seen.add(node)
    nodes.push(node)
    for (const next of adj[node] ?? []) {
      if (!seen.has(next)) stack.push(next)
    }
  }
  return nodes
}

/**
 * Like `branchBeyond`, but stops expanding past the next junction instead
 * of following every corridor all the way to its terminus. A bonded pair's
 * own corridor can rejoin the rest of the network through a shared
 * upstream fork (Camden's leftover-crossing neighbour sits on both of its
 * halves), so the full `branchBeyond` sweep pulls almost the entire rest of
 * the network into "this half's branch" — both halves end up claiming
 * nearly the same nodes, and swapping sides only shifts everything
 * together rather than actually trading which side is which.
 */
const branchUntilNextHub = (
  adj: readonly number[][],
  exclude: number,
  start: number
): number[] => {
  const seen = new Set<number>([exclude, start])
  const nodes: number[] = [start]
  const queue: number[] = [start]
  while (queue.length > 0) {
    const node = queue.shift()!
    if (node !== start && (adj[node]?.length ?? 0) >= 3) continue
    for (const next of adj[node] ?? []) {
      if (seen.has(next)) continue
      seen.add(next)
      nodes.push(next)
      queue.push(next)
    }
  }
  return nodes
}

const mirrorBranchAcrossHubX = (
  state: StressState,
  hub: number,
  branch: readonly number[]
) => {
  const axis = state.x[hub]!
  for (const node of branch) {
    state.x[node] = 2 * axis - state.x[node]!
  }
}

/**
 * Positive when a branch's layout side already agrees with its geographic
 * side (relative to the hub); negative when it is backwards. Used to pick
 * which of several crossing-free flips to take — the one already wrong,
 * not the one already right.
 */
const branchGeoAgreement = (
  state: StressState,
  hub: number,
  branch: readonly number[]
): number => {
  let score = 0
  for (const node of branch) {
    score +=
      (state.x[node]! - state.x[hub]!) *
        (state.geoX[node]! - state.geoX[hub]!) +
      (state.y[node]! - state.y[hub]!) * (state.geoY[node]! - state.geoY[hub]!)
  }
  return score
}

/**
 * Camden Town-style hub: keep one vertex, mirror a whole leg — every node
 * beyond the immediate neighbour, not just the neighbour itself — across
 * the station when that removes a crossing. Mirroring only the neighbour
 * left its own branch behind: ordinary stress majorization then pulled the
 * neighbour straight back toward its (unmoved) subtree on the very next
 * step, so the "fix" never survived settling. Moving the whole branch as
 * one rigid unit means there is nothing left pulling it back.
 *
 * Two different legs can each independently un-cross the same pair of
 * edges (mirroring either one separates them). When that happens, flip the
 * leg that is currently on the geographically wrong side, not whichever
 * leg the loop happens to reach first — otherwise a hub can "fix" a
 * crossing by moving an already-correct branch (Edgware, west) onto the
 * wrong side while leaving the actually-backwards branch alone.
 */
export const untangleHubLegs = (state: StressState): number => {
  let move = 0
  const adj = buildTrackAdjacency(state)
  const neighborsOf = hubNeighbors(state)
  for (let hub = 0; hub < state.x.length; hub += 1) {
    const neighbors = neighborsOf[hub]!
    if (neighbors.length < 3) continue
    const before = crossingCount(state)
    if (before === 0) continue

    let bestNeighbor = -1
    let bestBranch: number[] = []
    let bestAfter = before
    let bestAgreement = Number.POSITIVE_INFINITY
    for (const neighbor of neighbors) {
      const branch = branchBeyond(adj, hub, neighbor)
      const agreement = branchGeoAgreement(state, hub, branch)
      mirrorBranchAcrossHubX(state, hub, branch)
      const after = crossingCount(state)
      mirrorBranchAcrossHubX(state, hub, branch)
      if (after > bestAfter) continue
      if (after < bestAfter || agreement < bestAgreement) {
        bestAfter = after
        bestAgreement = agreement
        bestNeighbor = neighbor
        bestBranch = branch
      }
    }
    if (bestNeighbor >= 0 && bestAfter < before) {
      mirrorBranchAcrossHubX(state, hub, bestBranch)
      move += bestBranch.length
    }
  }
  return move
}

/** Pulls each bonded pair toward its target gap — a soft spring, not a hard clamp. */
const applyBondLinks = (state: StressState): number => {
  let move = 0
  for (const link of state.bondLinks) {
    const dx = state.x[link.b]! - state.x[link.a]!
    const dy = state.y[link.b]! - state.y[link.a]!
    const dist = Math.hypot(dx, dy) || 1e-6
    const ux = dx / dist
    const uy = dy / dist
    const shift = (dist - link.gap) / 2
    const shiftX = ux * shift
    const shiftY = uy * shift
    state.x[link.a]! += shiftX
    state.y[link.a]! += shiftY
    state.x[link.b]! -= shiftX
    state.y[link.b]! -= shiftY
    move += 2 * (shiftX * shiftX + shiftY * shiftY)
  }
  return move
}

/** One Gauss–Seidel stress-majorization sweep. */
export const stepStress = (state: StressState): number => {
  const { x, y, delta, weight } = state
  const count = x.length
  let move = 0
  for (let i = 0; i < count; i += 1) {
    let wx = 0
    let wy = 0
    let wsum = 0
    for (let j = 0; j < count; j += 1) {
      if (i === j) continue
      const w = weight[i]![j]!
      if (w === 0) continue
      const dx = x[i]! - x[j]!
      const dy = y[i]! - y[j]!
      const dist = Math.hypot(dx, dy) || 1e-6
      const inv = delta[i]![j]! / dist
      wx += w * (x[j]! + inv * dx)
      wy += w * (y[j]! + inv * dy)
      wsum += w
    }
    if (wsum === 0) continue
    const nx = wx / wsum
    const ny = wy / wsum
    move += (nx - x[i]!) ** 2 + (ny - y[i]!) ** 2
    x[i] = nx
    y[i] = ny
  }
  move += straightenPermittedMovements(state)
  move += applyBondLinks(state)
  move += untangleHubLegs(state)
  move += uncrossBondSides(state)
  move += penalizeCrossings(state)
  return count === 0 ? 0 : move / count
}

const rotationOf = (a: number, b: number) => {
  const length = Math.hypot(a, b) || 1
  return { cos: a / length, sin: b / length }
}

const residualToGeo = (
  x: number[],
  y: number[],
  geoX: number[],
  geoY: number[],
  mx: number,
  my: number,
  gx: number,
  gy: number,
  cos: number,
  sin: number,
  reflectX: boolean
) => {
  let error = 0
  for (let i = 0; i < x.length; i += 1) {
    const lx = reflectX ? mx - x[i]! : x[i]! - mx
    const ly = y[i]! - my
    const rx = cos * lx - sin * ly
    const ry = sin * lx + cos * ly
    error += (rx - (geoX[i]! - gx)) ** 2 + (ry - (geoY[i]! - gy)) ** 2
  }
  return error
}

/**
 * Rotate and translate `x,y` to best match geography (orthogonal Procrustes,
 * no scale). Reflection is allowed when it fits geography better — MDS can
 * emit a mirror image of two similar loops (Northern Bank vs Charing Cross),
 * and rotation alone cannot un-swap them. Scale is omitted so hop-length
 * straightening is not pulled back toward geographic kinks.
 */
export const orientToGeo = (
  x: number[],
  y: number[],
  geoX: number[],
  geoY: number[]
) => {
  const count = x.length
  if (count === 0) return
  const mx = mean(x)
  const my = mean(y)
  const gx = mean(geoX)
  const gy = mean(geoY)

  let sxx = 0
  let sxy = 0
  let syx = 0
  let syy = 0
  let layoutNorm = 0
  for (let i = 0; i < count; i += 1) {
    const lx = x[i]! - mx
    const ly = y[i]! - my
    const tx = geoX[i]! - gx
    const ty = geoY[i]! - gy
    sxx += lx * tx
    sxy += ly * tx
    syx += lx * ty
    syy += ly * ty
    layoutNorm += lx * lx + ly * ly
  }
  if (layoutNorm < 1e-9) {
    for (let i = 0; i < count; i += 1) {
      x[i] = geoX[i]!
      y[i] = geoY[i]!
    }
    return
  }

  const rotate = rotationOf(sxx + syy, syx - sxy)
  const reflect = rotationOf(-sxx + syy, -syx - sxy)
  const rotateError = residualToGeo(
    x,
    y,
    geoX,
    geoY,
    mx,
    my,
    gx,
    gy,
    rotate.cos,
    rotate.sin,
    false
  )
  const reflectError = residualToGeo(
    x,
    y,
    geoX,
    geoY,
    mx,
    my,
    gx,
    gy,
    reflect.cos,
    reflect.sin,
    true
  )
  const useReflect = reflectError < rotateError
  const { cos, sin } = useReflect ? reflect : rotate

  for (let i = 0; i < count; i += 1) {
    const lx = useReflect ? mx - x[i]! : x[i]! - mx
    const ly = y[i]! - my
    x[i] = gx + cos * lx - sin * ly
    y[i] = gy + sin * lx + cos * ly
  }
}

export const separateOverlaps = (x: number[], y: number[], minSep: number) => {
  const count = x.length
  for (let i = 0; i < count; i += 1) {
    for (let j = i + 1; j < count; j += 1) {
      const dx = x[j]! - x[i]!
      const dy = y[j]! - y[i]!
      const dist = Math.hypot(dx, dy)
      if (dist >= minSep) continue
      const push = (minSep - (dist || 0.1)) / 2
      const ux = dist < 1e-6 ? 1 : dx / dist
      const uy = dist < 1e-6 ? 0 : dy / dist
      x[i]! -= ux * push
      y[i]! -= uy * push
      x[j]! += ux * push
      y[j]! += uy * push
    }
  }
}

export const finishStressLayout = (
  state: StressState,
  minSep = STRESS_MIN_SEP
) => {
  separateOverlaps(state.x, state.y, minSep)
  applyBondLinks(state)
  untangleHubLegs(state)
  uncrossBondSides(state)
  penalizeCrossings(state)
  applyBondLinks(state)
  orientToGeo(state.x, state.y, state.geoX, state.geoY)
  untangleHubLegs(state)
  uncrossBondSides(state)
}

export const settleStressLayout = (
  state: StressState,
  options?: { steps?: number; epsilon?: number; minSep?: number }
): number => {
  const steps = options?.steps ?? 80
  const epsilon = options?.epsilon ?? 1e-4
  const minSep = options?.minSep ?? STRESS_MIN_SEP
  let move = 0
  for (let step = 0; step < steps; step += 1) {
    move = stepStress(state)
    if (move < epsilon) break
  }
  finishStressLayout(state, minSep)
  return move
}

export const stressGraphFromLngLats = (
  nodes: readonly { id: string; coordinates: readonly [number, number] }[],
  edges: readonly { from: string; to: string; length?: number }[],
  straightThrough: readonly { from: string; via: string; to: string }[] = [],
  bondLinks: readonly { a: string; b: string; gap?: number }[] = []
): StressGraph => ({
  ids: nodes.map((node) => node.id),
  edges: edges.map((edge) => ({
    from: edge.from,
    to: edge.to,
    ...(edge.length != null ? { length: edge.length } : {}),
  })),
  geo: nodes.map((node) =>
    geoToPlane(node.coordinates[0], node.coordinates[1])
  ),
  straightThrough: straightThrough.map((movement) => ({ ...movement })),
  bondLinks: bondLinks.map((link) => ({ ...link })),
})
