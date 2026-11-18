/**
 * Track for hops the unique-track build could not connect.
 *
 * The unique-track data keeps a station only if a track vertex lies within
 * 250 m of it. Where OSM's centreline is sparse (the Northern Bank branch under
 * King's Cross) the station has no node and its hops fell back to straight
 * segments. The raw OSM relations still hold that track in detail, so a hop is
 * cut from them: project both stations onto one relation's line and keep the
 * stretch between. A cut is accepted only when both stations are close to the
 * line and the stretch is not a detour.
 */
export type LngLat = [number, number]

const METERS_PER_DEG_LAT = 111_320
const REF_LAT = 51.5
const METERS_PER_DEG_LNG = METERS_PER_DEG_LAT * Math.cos((REF_LAT * Math.PI) / 180)

const xy = (p: LngLat): [number, number] => [p[0] * METERS_PER_DEG_LNG, p[1] * METERS_PER_DEG_LAT]

export const metresBetween = (a: LngLat, b: LngLat): number => {
  const [ax, ay] = xy(a)
  const [bx, by] = xy(b)
  return Math.hypot(ax - bx, ay - by)
}

export const lineLengthM = (line: readonly LngLat[]): number => {
  let total = 0
  for (let i = 1; i < line.length; i++) total += metresBetween(line[i - 1]!, line[i]!)
  return total
}

export type Projection = {
  /** Distance from the point to the line, metres. */
  offsetM: number
  /** Index of the segment the projection falls on. */
  segment: number
  point: LngLat
  /** Metres along the line from its first vertex. */
  alongM: number
}

export const projectOnLine = (line: readonly LngLat[], p: LngLat): Projection | null => {
  if (line.length < 2) return null
  const [px, py] = xy(p)
  let best: Projection | null = null
  let walked = 0
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!
    const b = line[i]!
    const [ax, ay] = xy(a)
    const [bx, by] = xy(b)
    const dx = bx - ax
    const dy = by - ay
    const length = Math.hypot(dx, dy)
    const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (length * length)))
    const cx = ax + dx * t
    const cy = ay + dy * t
    const offsetM = Math.hypot(px - cx, py - cy)
    if (!best || offsetM < best.offsetM)
      best = {
        offsetM,
        segment: i - 1,
        point: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t],
        alongM: walked + length * t,
      }
    walked += length
  }
  return best
}

/** The stretch of `line` from projection `a` to projection `b`, in that direction. */
export const sliceBetween = (line: readonly LngLat[], a: Projection, b: Projection): LngLat[] => {
  const forward = a.alongM <= b.alongM
  const [first, last] = forward ? [a, b] : [b, a]
  const inner = line.slice(first.segment + 1, last.segment + 1)
  const stretch: LngLat[] = [first.point, ...inner, last.point]
  return forward ? stretch : stretch.reverse()
}

export type HopPatch = { line: LngLat[]; offsetsM: [number, number]; lengthM: number }

export const MAX_STATION_OFFSET_M = 300
export const MAX_DETOUR = 1.6

/** The best cut of a hop from candidate centrelines, or null when none is trustworthy. */
export const cutHop = (
  from: LngLat,
  to: LngLat,
  candidates: readonly (readonly LngLat[])[]
): HopPatch | null => {
  const chord = metresBetween(from, to)
  let best: HopPatch | null = null
  for (const line of candidates) {
    const a = projectOnLine(line, from)
    const b = projectOnLine(line, to)
    if (!a || !b) continue
    if (a.offsetM > MAX_STATION_OFFSET_M || b.offsetM > MAX_STATION_OFFSET_M) continue
    const stretch = sliceBetween(line, a, b)
    const lengthM = lineLengthM(stretch)
    if (stretch.length < 2 || lengthM < 50) continue
    if (lengthM > MAX_DETOUR * chord + 150) continue
    const score = a.offsetM + b.offsetM
    if (!best || score < best.offsetsM[0] + best.offsetsM[1])
      best = { line: stretch, offsetsM: [a.offsetM, b.offsetM], lengthM }
  }
  return best
}
