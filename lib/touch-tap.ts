/**
 * Base UI's combobox item cancels `pointerdown` so the input keeps focus.
 * WebKit (iPadOS and iOS Safari) then drops the click a touch tap would make,
 * so tapping an option selects nothing. Chromium still clicks. The combobox
 * item clicks itself after a real tap when no click arrived.
 */
export const TAP_SLOP_PX = 10
export const TAP_MAX_MS = 700
/** How long to wait for the browser's own click before making one. */
export const TAP_CLICK_GRACE_MS = 250

export type TapPoint = { pointerId: number; x: number; y: number; t: number }

export const isTouchPointer = (pointerType: string): boolean =>
  pointerType === "touch" || pointerType === "pen"

export const isTap = (start: TapPoint | null, end: TapPoint): boolean =>
  start !== null &&
  start.pointerId === end.pointerId &&
  Math.hypot(end.x - start.x, end.y - start.y) <= TAP_SLOP_PX &&
  end.t - start.t <= TAP_MAX_MS

/** True when the browser did not click for this tap, so we should. */
export const needsSyntheticClick = (
  tapEndedAt: number,
  lastClickAt: number
): boolean => lastClickAt < tapEndedAt
