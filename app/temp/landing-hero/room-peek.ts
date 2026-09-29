/** Pure helpers for mobile room peek (pinch zoom + drag pan). */

export const PEEK_MIN_SCALE = 1
export const PEEK_MAX_SCALE = 1.85
export const PEEK_PAN_LIMIT = 0.42

export type PeekState = {
  scale: number
  /** Normalised pan in the scaled room, −1…1. */
  panX: number
  panY: number
}

export const DEFAULT_PEEK: PeekState = {
  scale: 1,
  panX: 0,
  panY: 0,
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

export const clampPeekScale = (scale: number): number =>
  clamp(scale, PEEK_MIN_SCALE, PEEK_MAX_SCALE)

/** Pan range shrinks toward zero as scale approaches 1. */
export const peekPanLimit = (scale: number): number => {
  const excess = clampPeekScale(scale) - 1
  if (excess <= 0) return 0
  return PEEK_PAN_LIMIT * (excess / (PEEK_MAX_SCALE - 1))
}

export const clampPeekPan = (pan: number, scale: number): number => {
  const limit = peekPanLimit(scale)
  return clamp(pan, -limit, limit)
}

export const sanitizePeek = (peek: PeekState): PeekState => {
  const scale = clampPeekScale(peek.scale)
  return {
    scale,
    panX: clampPeekPan(peek.panX, scale),
    panY: clampPeekPan(peek.panY, scale),
  }
}

export const touchDistance = (
  a: { clientX: number; clientY: number },
  b: { clientX: number; clientY: number }
): number => {
  const dx = a.clientX - b.clientX
  const dy = a.clientY - b.clientY
  return Math.hypot(dx, dy)
}

export const touchMidpoint = (
  a: { clientX: number; clientY: number },
  b: { clientX: number; clientY: number }
): { x: number; y: number } => ({
  x: (a.clientX + b.clientX) / 2,
  y: (a.clientY + b.clientY) / 2,
})

/**
 * Scale about a viewport point relative to a stage rect, preserving the
 * world point under the pinch midpoint.
 */
export const peekScaleAboutPoint = ({
  peek,
  nextScale,
  pointX,
  pointY,
  rectLeft,
  rectTop,
  rectWidth,
  rectHeight,
}: {
  peek: PeekState
  nextScale: number
  pointX: number
  pointY: number
  rectLeft: number
  rectTop: number
  rectWidth: number
  rectHeight: number
}): PeekState => {
  if (rectWidth <= 0 || rectHeight <= 0) {
    return sanitizePeek({ ...peek, scale: nextScale })
  }
  const scale = clampPeekScale(nextScale)
  const prev = clampPeekScale(peek.scale)
  const nx = ((pointX - rectLeft) / rectWidth) * 2 - 1
  const ny = ((pointY - rectTop) / rectHeight) * 2 - 1
  // Content offset under the midpoint: pan + nx * (1 − 1/scale) style.
  const worldX = peek.panX + nx / prev
  const worldY = peek.panY + ny / prev
  return sanitizePeek({
    scale,
    panX: worldX - nx / scale,
    panY: worldY - ny / scale,
  })
}

/**
 * Phone pinch, one continuous value.
 * `PHONE_ZOOM_OUT` (1) is the room camera. `0` is the framed iPad.
 * `PHONE_ZOOM_IN` (-1) is the deepest pinch into the board.
 * The stored value is what the next pinch reads, so the clamp does not
 * get scaled a second time and bounce.
 */
export const PHONE_ZOOM_OUT = 1
export const PHONE_ZOOM_IN = -1
export const PHONE_DOLLY_GAIN = 1.6
/** Scale of the framed iPad at `PHONE_ZOOM_IN`, anchored on the tablet. */
export const PHONE_DEEP_SCALE = 2.5

export const phoneZoomFromPinch = (
  startZoom: number,
  startDistance: number,
  distance: number
): number => {
  if (!(startDistance > 0) || !(distance > 0)) {
    return clamp(startZoom, PHONE_ZOOM_IN, PHONE_ZOOM_OUT)
  }
  const ratio = distance / startDistance
  return clamp(
    startZoom + (1 - ratio) * PHONE_DOLLY_GAIN,
    PHONE_ZOOM_IN,
    PHONE_ZOOM_OUT
  )
}

/** Map the pinch value onto the room camera, then extra scale past the framed iPad. */
export const phoneZoomToCamera = (
  zoom: number
): { zoom: number; progress: number; scale: number } => {
  const clamped = clamp(zoom, PHONE_ZOOM_IN, PHONE_ZOOM_OUT)
  if (clamped >= 0) {
    return { zoom: clamped, progress: clamped, scale: 1 }
  }
  const depth = -clamped
  return {
    zoom: clamped,
    progress: 0,
    scale: 1 + depth * (PHONE_DEEP_SCALE - 1),
  }
}

export const peekPanByPixels = ({
  peek,
  dx,
  dy,
  rectWidth,
  rectHeight,
}: {
  peek: PeekState
  dx: number
  dy: number
  rectWidth: number
  rectHeight: number
}): PeekState => {
  if (rectWidth <= 0 || rectHeight <= 0 || peek.scale <= 1) {
    return sanitizePeek(peek)
  }
  return sanitizePeek({
    ...peek,
    panX: peek.panX + (dx / rectWidth) * 2,
    panY: peek.panY + (dy / rectHeight) * 2,
  })
}
