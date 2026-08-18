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
}

const METERS_PER_DEG_LAT = 111_320
const REF_LAT = 51.5
const METERS_PER_DEG_LNG =
  METERS_PER_DEG_LAT * Math.cos((REF_LAT * Math.PI) / 180)

export const STRESS_HOP = 80
export const STRESS_MIN_SEP = 28

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
  return count === 0 ? 0 : move / count
}

/**
 * Rotate and translate `x,y` to best match geography (orthogonal Procrustes,
 * no reflection, no scale). Scale is omitted so hop-length straightening
 * is not pulled back toward geographic kinks.
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

  const a = sxx + syy
  const b = syx - sxy
  const length = Math.hypot(a, b) || 1
  const cos = a / length
  const sin = b / length

  for (let i = 0; i < count; i += 1) {
    const lx = x[i]! - mx
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
  orientToGeo(state.x, state.y, state.geoX, state.geoY)
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
  straightThrough: readonly { from: string; via: string; to: string }[] = []
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
})
