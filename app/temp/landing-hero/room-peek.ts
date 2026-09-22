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

export const clampPeekPan = (
  pan: number,
  scale: number
): number => {
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
