/**
 * Board layout resolution for square wall displays (e.g. Apple HomeView).
 * Pure: no DOM. Explicit URL params always win over auto-detect.
 */

export type BoardLayoutMode = "default" | "square"

export type BoardLayoutHints = {
  /** CSS viewport width in px. */
  width: number
  /** CSS viewport height in px. */
  height: number
  /** `matchMedia("(hover: none)").matches` */
  hoverNone: boolean
  /** `matchMedia("(pointer: coarse)").matches` */
  pointerCoarse: boolean
  /**
   * Explicit `layout=` from the hash. When set, auto-detect is skipped.
   * `null` / `undefined` means no explicit choice.
   */
  explicitLayout?: BoardLayoutMode | null
}

/**
 * Shorter/longer side ratio must be at least this to count as roughly square.
 * 0.88 ≈ 1:1.14 — phones and typical iPad split halves fall below this.
 */
export const BOARD_SQUARE_ASPECT_MIN = 0.88

/**
 * Shortest CSS viewport side must reach this. Phones stay below; HomeView-class
 * squares and large square windows clear it.
 */
export const BOARD_SQUARE_MIN_SIDE_PX = 520

/**
 * Resolve the board layout mode.
 *
 * - Explicit `layout=square` / `layout=default` always wins.
 * - Auto square only when the viewport is roughly square **and** the device
 *   reports `(hover: none)` and `(pointer: coarse)`.
 * - Phones fail the aspect check; iPad split views are rarely near 1:1 and
 *   also fail `BOARD_SQUARE_ASPECT_MIN`.
 */
export const resolveBoardLayout = (
  hints: BoardLayoutHints
): BoardLayoutMode => {
  if (hints.explicitLayout === "square" || hints.explicitLayout === "default") {
    return hints.explicitLayout
  }

  const { width, height } = hints
  if (!(width > 0 && height > 0)) return "default"
  if (!hints.hoverNone || !hints.pointerCoarse) return "default"

  const shorter = Math.min(width, height)
  const longer = Math.max(width, height)
  if (shorter < BOARD_SQUARE_MIN_SIDE_PX) return "default"

  const aspect = shorter / longer
  if (aspect < BOARD_SQUARE_ASPECT_MIN) return "default"

  return "square"
}

/** Safe-area + corner gutter padding for a square wall display. */
export const boardSquareGutterCss = (
  minGutterPx = 20
): Record<string, string> => {
  const min = `${minGutterPx}px`
  return {
    paddingTop: `max(${min}, env(safe-area-inset-top, 0px))`,
    paddingRight: `max(${min}, env(safe-area-inset-right, 0px))`,
    paddingBottom: `max(${min}, env(safe-area-inset-bottom, 0px))`,
    paddingLeft: `max(${min}, env(safe-area-inset-left, 0px))`,
  }
}
