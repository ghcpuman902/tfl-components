/**
 * Marker geometry for the explorer and search maps.
 *
 * Station marks follow the Tube interchange circle (`LINE_DIAGRAM.interchange`,
 * Line diagram standard §8): outer diameter 3x and ring 0.5x, where x is the
 * station name's x-height. The ring-to-circle ratio is therefore fixed at 1:6
 * and only the label size moves it.
 */
import {
  interchangeOuterRadius,
  interchangeStroke,
} from "@/lib/tfl/line-diagram"

/** Johnston-like faces: x-height ≈ half the em (see `line-diagram.ts`). */
const X_HEIGHT_PER_EM = 0.5

/** Station name size on the map, in px. The circle is derived from it. */
export const STATION_LABEL_PX = 12
export const STATION_LABEL_SELECTED_PX = 14

export type StationMarkerGeometry = {
  /** Diagram unit x = the label's x-height, px. */
  x: number
  /** Centre to outer edge of the ring, px. */
  outerRadius: number
  /** Ring width, px. */
  ring: number
  /** MapLibre `circle-radius`: its stroke is painted outside this radius. */
  circleRadius: number
}

export const stationMarkerGeometry = (labelPx: number): StationMarkerGeometry => {
  const x = labelPx * X_HEIGHT_PER_EM
  const outerRadius = interchangeOuterRadius(x)
  const ring = interchangeStroke(x)
  return { x, outerRadius, ring, circleRadius: outerRadius - ring }
}

export type Disc = { id: string; x: number; y: number; r: number }

export type Obstacle =
  | { kind: "circle"; x: number; y: number; r: number }
  | { kind: "rect"; left: number; top: number; right: number; bottom: number }

export type Offset = { dx: number; dy: number }

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5))

/**
 * Nudges overlapping marker discs apart (screen px) so every one stays readable:
 * discs end at least `gap` apart from each other and clear of fixed obstacles
 * (station circles and their labels). Discs that already sit clear do not move.
 * Deterministic: discs on the exact same spot fan out by input order.
 */
export const spreadDiscs = (
  discs: readonly Disc[],
  obstacles: readonly Obstacle[] = [],
  { gap = 2, iterations = 80 }: { gap?: number; iterations?: number } = {}
): Map<string, Offset> => {
  const at = discs.map((disc) => ({ x: disc.x, y: disc.y }))
  const push = (i: number, dx: number, dy: number) => {
    at[i]!.x += dx
    at[i]!.y += dy
  }
  for (let step = 0; step < iterations; step++) {
    let moved = false
    for (let i = 0; i < discs.length; i++) {
      for (let j = i + 1; j < discs.length; j++) {
        const a = at[i]!
        const b = at[j]!
        const need = discs[i]!.r + discs[j]!.r + gap
        let dx = b.x - a.x
        let dy = b.y - a.y
        let d = Math.hypot(dx, dy)
        if (d >= need - 1e-6) continue
        if (d < 1e-6) {
          const angle = j * GOLDEN_ANGLE
          dx = Math.cos(angle)
          dy = Math.sin(angle)
          d = 1
          const half = need / 2
          push(i, -dx * half, -dy * half)
          push(j, dx * half, dy * half)
        } else {
          const half = (need - d) / 2
          push(i, (-dx / d) * half, (-dy / d) * half)
          push(j, (dx / d) * half, (dy / d) * half)
        }
        moved = true
      }
      for (const obstacle of obstacles) {
        const p = at[i]!
        const r = discs[i]!.r + gap
        if (obstacle.kind === "circle") {
          let dx = p.x - obstacle.x
          let dy = p.y - obstacle.y
          let d = Math.hypot(dx, dy)
          const need = obstacle.r + r
          if (d >= need - 1e-6) continue
          if (d < 1e-6) {
            const angle = i * GOLDEN_ANGLE
            dx = Math.cos(angle)
            dy = Math.sin(angle)
            d = 1
            push(i, dx * need, dy * need)
          } else {
            push(i, (dx / d) * (need - d), (dy / d) * (need - d))
          }
          moved = true
        } else {
          const cx = Math.min(Math.max(p.x, obstacle.left), obstacle.right)
          const cy = Math.min(Math.max(p.y, obstacle.top), obstacle.bottom)
          const inside = cx === p.x && cy === p.y
          if (inside) {
            // Leave by the nearest edge.
            const exits = [
              { d: p.x - obstacle.left, dx: -1, dy: 0 },
              { d: obstacle.right - p.x, dx: 1, dy: 0 },
              { d: p.y - obstacle.top, dx: 0, dy: -1 },
              { d: obstacle.bottom - p.y, dx: 0, dy: 1 },
            ].sort((m, n) => m.d - n.d)[0]!
            push(i, exits.dx * (exits.d + r), exits.dy * (exits.d + r))
            moved = true
            continue
          }
          const dx = p.x - cx
          const dy = p.y - cy
          const d = Math.hypot(dx, dy)
          if (d >= r - 1e-6) continue
          push(i, (dx / d) * (r - d), (dy / d) * (r - d))
          moved = true
        }
      }
    }
    if (!moved) break
  }
  return new Map(
    discs.map((disc, i) => [disc.id, { dx: at[i]!.x - disc.x, dy: at[i]!.y - disc.y }])
  )
}
