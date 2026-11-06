import { TAP_SLOP_PX } from "@/lib/touch-tap"

/**
 * One press on a reorderable row. A mouse grip starts `armed`. A finger
 * starts `pending`: held still for `LONG_PRESS_MS` it arms (and only then
 * locks page scroll); moved first, it was a scroll and is `released`.
 * Armed, a vertical move past `DRAG_THRESHOLD_PX` starts `dragging`.
 */
export type Press = "pending" | "armed" | "dragging" | "released"

export const LONG_PRESS_MS = 350
export const DRAG_THRESHOLD_PX = 6

export type PressEvent =
  | { kind: "timer" }
  | { kind: "move"; dx: number; dy: number }

export const nextPress = (press: Press, event: PressEvent): Press => {
  if (event.kind === "timer") return press === "pending" ? "armed" : press
  if (press === "pending") {
    return Math.hypot(event.dx, event.dy) > TAP_SLOP_PX ? "released" : press
  }
  if (press === "armed" && Math.abs(event.dy) >= DRAG_THRESHOLD_PX) {
    return "dragging"
  }
  return press
}

/** The page must not scroll under an armed or moving row. */
export const pressHoldsPage = (press: Press): boolean =>
  press === "armed" || press === "dragging"
