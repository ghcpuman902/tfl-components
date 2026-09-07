/**
 * Geographic orientation for the "Drawing the line" diagnostic.
 *
 * The passenger graph and movement matrix say which edges and through-moves
 * exist. They do not say how those edges sit around the station. A circular
 * order that only minimises crossings among permitted pairs will put a
 * diamond's *forbidden* pairs on the diameters — N–S–N–S — which reads as
 * a plus-junction whose straight-throughs never run.
 *
 * The conversion constraint: circular order follows geographic bearing.
 * Same-side arms stay adjacent (N–N–S–S or W–W–E–E). Never interleave
 * opposite compass sides. When two neighbours share a bearing they are a
 * same-direction pair: the graph still has two edges; the schematic must
 * invent a lane split, and radial distance should follow geography.
 *
 * Coordinates are identity/orientation only. They never create edges.
 */

import type { CompassAxis, JunctionOrientation, NeighbourRef, SameDirectionPair } from "./types"

export const SAME_DIRECTION_GAP_DEG = 25
export const MIN_DISPLAY_GAP_DEG = 32

export type LatLon = { lat: number; lon: number }

/** Compass bearing, degrees clockwise from north, in [0, 360). */
export const compassBearingDeg = (from: LatLon, to: LatLon): number => {
  const dLon = ((to.lon - from.lon) * Math.PI) / 180
  const lat1 = (from.lat * Math.PI) / 180
  const lat2 = (to.lat * Math.PI) / 180
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
}

export const greatCircleDistanceM = (from: LatLon, to: LatLon): number => {
  const r = 6371000
  const p1 = (from.lat * Math.PI) / 180
  const p2 = (to.lat * Math.PI) / 180
  const dLat = p2 - p1
  const dLon = ((to.lon - from.lon) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dLon / 2) ** 2
  return 2 * r * Math.asin(Math.min(1, Math.sqrt(a)))
}

/** Clockwise gap from `fromDeg` to `toDeg`, in (0, 360]. */
export const clockwiseGapDeg = (fromDeg: number, toDeg: number): number => {
  const gap = (toDeg - fromDeg + 360) % 360
  return gap === 0 ? 360 : gap
}

export const smallestGapDeg = (a: number, b: number): number =>
  Math.min((a - b + 360) % 360, (b - a + 360) % 360)

export const compassOctant = (bearingDeg: number): string => {
  const labels = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
  const index = Math.round(bearingDeg / 45) % 8
  return labels[index]!
}

export const sideOf = (bearingDeg: number, axis: CompassAxis): "N" | "S" | "E" | "W" => {
  if (axis === "NS") return Math.cos((bearingDeg * Math.PI) / 180) >= 0 ? "N" : "S"
  return Math.sin((bearingDeg * Math.PI) / 180) >= 0 ? "E" : "W"
}

/**
 * Pick the axis that best bipartitions the rays: more north–south spread
 * uses N/S; more east–west spread uses E/W.
 */
export const principalAxis = (bearings: readonly number[]): CompassAxis => {
  let ns = 0
  let ew = 0
  for (const bearing of bearings) {
    const rad = (bearing * Math.PI) / 180
    ns += Math.abs(Math.cos(rad))
    ew += Math.abs(Math.sin(rad))
  }
  return ns >= ew ? "NS" : "EW"
}

/** True when every consecutive pair (including wrap) is a side change. */
export const sidesAlternate = (sides: readonly string[]): boolean => {
  if (sides.length < 4) return false
  const unique = new Set(sides)
  if (unique.size < 2) return false
  return sides.every((side, index) => side !== sides[(index + 1) % sides.length])
}

export const orderByBearing = <T extends { bearingDeg: number | null }>(
  items: readonly T[]
): T[] => {
  const known = items.filter((item): item is T & { bearingDeg: number } => item.bearingDeg != null)
  const unknown = items.filter((item) => item.bearingDeg == null)
  if (known.length === 0) return [...items]
  const sorted = [...known].sort((a, b) => a.bearingDeg - b.bearingDeg)
  let bestIndex = 0
  let bestDist = 180
  for (let i = 0; i < sorted.length; i++) {
    const dist = smallestGapDeg(sorted[i]!.bearingDeg, 0)
    if (dist < bestDist) {
      bestDist = dist
      bestIndex = i
    }
  }
  return [...sorted.slice(bestIndex), ...sorted.slice(0, bestIndex), ...unknown]
}

/**
 * Push consecutive bearings apart until each clockwise gap is at least
 * `minGap`, preserving order. If `n * minGap` does not fit, fall back to
 * equal spacing from the first bearing.
 */
export const spreadBearings = (sortedDeg: readonly number[], minGap: number): number[] => {
  const n = sortedDeg.length
  if (n === 0) return []
  if (n === 1) return [sortedDeg[0]!]
  if (n * minGap >= 360) {
    const start = sortedDeg[0]!
    return sortedDeg.map((_, index) => (start + (index * 360) / n) % 360)
  }

  const result = [...sortedDeg]
  for (let iter = 0; iter < 24; iter++) {
    let moved = false
    for (let i = 0; i < n; i++) {
      const a = result[i]!
      const next = (i + 1) % n
      const b = result[next]!
      const gap = (b - a + 360) % 360
      if (gap + 1e-6 >= minGap) continue
      const need = (minGap - gap) / 2
      result[i] = (a - need + 360) % 360
      result[next] = (b + need) % 360
      moved = true
    }
    if (!moved) break
  }
  return result
}

export const sameDirectionPairs = (
  neighbours: readonly NeighbourRef[],
  thresholdDeg = SAME_DIRECTION_GAP_DEG
): SameDirectionPair[] => {
  const known = neighbours.filter(
    (neighbour): neighbour is NeighbourRef & { bearingDeg: number } => neighbour.bearingDeg != null
  )
  const pairs: SameDirectionPair[] = []
  for (let i = 0; i < known.length; i++) {
    for (let j = i + 1; j < known.length; j++) {
      const a = known[i]!
      const b = known[j]!
      const gapDeg = smallestGapDeg(a.bearingDeg, b.bearingDeg)
      if (gapDeg >= thresholdDeg) continue
      pairs.push({
        a: { id: a.id, name: a.name },
        b: { id: b.id, name: b.name },
        gapDeg: Math.round(gapDeg * 10) / 10,
      })
    }
  }
  return pairs.sort((a, b) => a.gapDeg - b.gapDeg)
}

const countCrossings = (order: readonly string[], pairs: readonly [string, string][]): number => {
  const pos = new Map(order.map((id, index) => [id, index]))
  const inArc = (x: number, lo: number, hi: number) => (lo < hi ? x > lo && x < hi : x > lo || x < hi)
  let crossings = 0
  for (let i = 0; i < pairs.length; i++) {
    const [a1, b1] = pairs[i]!
    const pa1 = pos.get(a1)
    const pb1 = pos.get(b1)
    if (pa1 == null || pb1 == null) continue
    for (let j = i + 1; j < pairs.length; j++) {
      const [a2, b2] = pairs[j]!
      if (a1 === a2 || a1 === b2 || b1 === a2 || b1 === b2) continue
      const pa2 = pos.get(a2)
      const pb2 = pos.get(b2)
      if (pa2 == null || pb2 == null) continue
      if (inArc(pa2, pa1, pb1) !== inArc(pb2, pa1, pb1)) crossings++
    }
  }
  return crossings
}

function* permutationsFixedFirst<T>(items: readonly T[]): Generator<T[]> {
  const [first, ...rest] = items
  if (first === undefined) {
    yield []
    return
  }
  function* permute(arr: T[]): Generator<T[]> {
    if (arr.length <= 1) {
      yield arr
      return
    }
    for (let i = 0; i < arr.length; i++) {
      const remainder = [...arr.slice(0, i), ...arr.slice(i + 1)]
      for (const tail of permute(remainder)) yield [arr[i]!, ...tail]
    }
  }
  for (const tail of permute(rest)) yield [first, ...tail]
}

/** Chord-diagram order: minimise crossings among supported pairs. */
export const crossingMinOrderIds = (
  neighbourIds: readonly string[],
  supportedPairs: readonly [string, string][]
): string[] => {
  if (neighbourIds.length <= 3 || neighbourIds.length > 7 || supportedPairs.length === 0) {
    return [...neighbourIds]
  }
  let best = [...neighbourIds]
  let bestScore = countCrossings(best, supportedPairs)
  for (const perm of permutationsFixedFirst(neighbourIds)) {
    if (bestScore === 0) break
    const score = countCrossings(perm, supportedPairs)
    if (score < bestScore) {
      bestScore = score
      best = perm
    }
  }
  return best
}

export const diagnoseOrientation = (
  neighbours: readonly NeighbourRef[],
  supportedPairs: readonly [string, string][]
): JunctionOrientation | null => {
  const withBearing = neighbours.filter((neighbour) => neighbour.bearingDeg != null)
  if (withBearing.length < 2) return null

  const bearings = withBearing.map((neighbour) => neighbour.bearingDeg!)
  const axis = principalAxis(bearings)
  const crossingOrderIds = crossingMinOrderIds(
    withBearing.map((neighbour) => neighbour.id),
    supportedPairs
  )
  const byId = new Map(withBearing.map((neighbour) => [neighbour.id, neighbour]))
  const crossingSides = crossingOrderIds
    .map((id) => byId.get(id))
    .filter((neighbour): neighbour is NeighbourRef => neighbour != null)
    .map((neighbour) => sideOf(neighbour.bearingDeg!, axis))

  return {
    axis,
    orderBasis: "geographic-bearing",
    crossingMinAlternatesSides: sidesAlternate(crossingSides),
    sameDirectionPairs: sameDirectionPairs(neighbours),
  }
}

export const formatDistance = (metres: number): string =>
  metres >= 1000 ? `${(metres / 1000).toFixed(1)} km` : `${Math.round(metres)} m`

export const orientationNotes = (
  neighbours: readonly NeighbourRef[],
  orientation: JunctionOrientation
): string[] => {
  const notes: string[] = []
  const axisLabel = orientation.axis === "NS" ? "north–south" : "east–west"
  if (orientation.crossingMinAlternatesSides) {
    notes.push(
      `Compass order keeps same-side arms adjacent on the ${axisLabel} axis. A circular order that only minimises permitted-pair crossings would interleave opposite sides — that plus-junction is a lie for this vertex.`
    )
  }
  for (const pair of orientation.sameDirectionPairs) {
    const a = neighbours.find((neighbour) => neighbour.id === pair.a.id)
    const b = neighbours.find((neighbour) => neighbour.id === pair.b.id)
    const distA = a?.distanceM
    const distB = b?.distanceM
    const further =
      distA != null && distB != null
        ? distA >= distB
          ? `${pair.a.name} is further (${formatDistance(distA)} vs ${formatDistance(distB)})`
          : `${pair.b.name} is further (${formatDistance(distB)} vs ${formatDistance(distA)})`
        : null
    notes.push(
      `${pair.a.name} and ${pair.b.name} leave ${pair.gapDeg}° apart — a same-direction pair. The graph still has two edges; a schematic must invent a lane split.${further ? ` ${further}.` : ""}`
    )
  }
  return notes
}

/** Display angle (degrees clockwise from north) for each neighbour id. */
export const displayBearingsById = (
  neighbours: readonly NeighbourRef[]
): Map<string, number> | null => {
  const ordered = orderByBearing(neighbours.filter((neighbour) => neighbour.bearingDeg != null))
  if (ordered.length === 0 || ordered.some((neighbour) => neighbour.bearingDeg == null)) return null
  const spread = spreadBearings(
    ordered.map((neighbour) => neighbour.bearingDeg!),
    MIN_DISPLAY_GAP_DEG
  )
  return new Map(ordered.map((neighbour, index) => [neighbour.id, spread[index]!]))
}
