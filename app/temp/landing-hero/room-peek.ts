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
 * Values below 0 zoom into the board. There is no zoom-in cap: each unit
 * past 0 adds `PHONE_DEEP_SCALE_GAIN` of scale (zoom −1 is 2.5×).
 * The stored value is what the next pinch reads, so the zoom-out stop
 * does not get scaled a second time and bounce.
 */
export const PHONE_ZOOM_OUT = 1
export const PHONE_DOLLY_GAIN = 1.6
/** Extra scale per unit of zoom below the framed iPad. Zoom −1 is 2.5×. */
export const PHONE_DEEP_SCALE_GAIN = 1.5

export const phoneZoomFromPinch = (
  startZoom: number,
  startDistance: number,
  distance: number
): number => {
  if (!(startDistance > 0) || !(distance > 0)) {
    return Math.min(startZoom, PHONE_ZOOM_OUT)
  }
  const ratio = distance / startDistance
  return Math.min(startZoom + (1 - ratio) * PHONE_DOLLY_GAIN, PHONE_ZOOM_OUT)
}

/** Map the pinch value onto the room camera, then extra scale past the framed iPad. */
export const phoneZoomToCamera = (
  zoom: number
): { zoom: number; progress: number; scale: number } => {
  const clamped = Math.min(zoom, PHONE_ZOOM_OUT)
  if (clamped >= 0) {
    return { zoom: clamped, progress: clamped, scale: 1 }
  }
  const depth = -clamped
  return {
    zoom: clamped,
    progress: 0,
    scale: 1 + depth * PHONE_DEEP_SCALE_GAIN,
  }
}

export type PhonePan = { x: number; y: number }

/**
 * Two-finger move in camera-local pixels. Keeps the point under the
 * starting midpoint stuck to the fingers while scale changes, and follows
 * the midpoint when it moves. Scale ≤ 1 clears the pan (framed iPad / room).
 */
export const phonePanForGesture = ({
  panX,
  panY,
  startScale,
  nextScale,
  originX,
  originY,
  startX,
  startY,
  nextX,
  nextY,
}: {
  panX: number
  panY: number
  startScale: number
  nextScale: number
  originX: number
  originY: number
  startX: number
  startY: number
  nextX: number
  nextY: number
}): PhonePan => {
  if (!(startScale > 0) || !(nextScale > 1)) return { x: 0, y: 0 }
  const ratio = nextScale / startScale
  return {
    x: nextX - originX - ratio * (startX - panX - originX),
    y: nextY - originY - ratio * (startY - panY - originY),
  }
}

/**
 * Keep the magnified artwork covering the visible camera window so a pan
 * can reach the edges of the scene without sliding into empty space.
 */
export const clampPhonePanToArtwork = ({
  panX,
  panY,
  scale,
  originX,
  originY,
  viewLeft,
  viewTop,
  viewRight,
  viewBottom,
  artLeft,
  artTop,
  artRight,
  artBottom,
}: {
  panX: number
  panY: number
  scale: number
  originX: number
  originY: number
  viewLeft: number
  viewTop: number
  viewRight: number
  viewBottom: number
  artLeft: number
  artTop: number
  artRight: number
  artBottom: number
}): PhonePan => {
  if (!(scale > 1)) return { x: 0, y: 0 }
  const clampAxis = (
    value: number,
    origin: number,
    view0: number,
    view1: number,
    art0: number,
    art1: number
  ) => {
    const base = origin * (1 - scale)
    const maxPan = view0 - base - scale * art0
    const minPan = view1 - base - scale * art1
    if (minPan > maxPan) return (minPan + maxPan) / 2
    return clamp(value, minPan, maxPan)
  }
  return {
    x: clampAxis(panX, originX, viewLeft, viewRight, artLeft, artRight),
    y: clampAxis(panY, originY, viewTop, viewBottom, artTop, artBottom),
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
