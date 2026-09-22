import { useEffect, useState, type RefObject } from "react"

const LABEL_SCREEN_MIN = 0.55
const LABEL_SCREEN_MAX = 1.25

export const MIN_ZOOM = 0.75
export const MAX_ZOOM = 8

export type ZoomState = {
  scale: number
  x: number
  y: number
}

export const DEFAULT_ZOOM: ZoomState = { scale: 1, x: 0, y: 0 }

export const labelScreenScale = (zoomScale: number): number => {
  if (!Number.isFinite(zoomScale) || zoomScale <= 0) return LABEL_SCREEN_MIN
  return Math.max(
    LABEL_SCREEN_MIN,
    Math.min(LABEL_SCREEN_MAX, 0.7 * zoomScale ** 0.38)
  )
}

export const viewBoxScreenScale = (
  viewBox: { w: number; h: number },
  viewport: { w: number; h: number }
): number => {
  if (viewport.w <= 0 || viewport.h <= 0 || viewBox.w <= 0 || viewBox.h <= 0) {
    return 1
  }
  return Math.min(viewport.w / viewBox.w, viewport.h / viewBox.h)
}

export const stationGraphScales = (
  zoomScale: number,
  viewBox: { w: number; h: number },
  viewport: { w: number; h: number }
) => {
  const viewScale = viewBoxScreenScale(viewBox, viewport)
  const world = zoomScale * viewScale || 1
  return {
    symbolScale: 1 / world,
    labelScale: labelScreenScale(zoomScale) / world,
  }
}

export const clampZoomScale = (scale: number): number => {
  if (!Number.isFinite(scale) || scale <= 0) return 1
  return Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale))
}

export const sanitizeZoom = (zoom: ZoomState): ZoomState => ({
  scale: clampZoomScale(zoom.scale),
  x: Number.isFinite(zoom.x) ? zoom.x : 0,
  y: Number.isFinite(zoom.y) ? zoom.y : 0,
})

export const zoomAround = (
  current: ZoomState,
  scale: number,
  anchor: { x: number; y: number }
): ZoomState => {
  const from = sanitizeZoom(current)
  const nextScale = clampZoomScale(scale)
  if (!Number.isFinite(anchor.x) || !Number.isFinite(anchor.y)) return from
  const ratio = nextScale / from.scale
  if (!Number.isFinite(ratio)) return from
  return sanitizeZoom({
    scale: nextScale,
    x: anchor.x - (anchor.x - from.x) * ratio,
    y: anchor.y - (anchor.y - from.y) * ratio,
  })
}

export const zoomAboutOrigin = (
  current: ZoomState,
  scale: number
): ZoomState => {
  const next = zoomAround(current, scale, { x: 0, y: 0 })
  if (next.scale <= 1) return { scale: next.scale, x: 0, y: 0 }
  return next
}

export const originAtBoundsCenter = <T extends { x: number; y: number }>(
  nodes: readonly T[]
): T[] => {
  if (nodes.length === 0) return []
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const node of nodes) {
    minX = Math.min(minX, node.x)
    minY = Math.min(minY, node.y)
    maxX = Math.max(maxX, node.x)
    maxY = Math.max(maxY, node.y)
  }
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  if (!Number.isFinite(cx) || !Number.isFinite(cy)) return [...nodes]
  return nodes.map((node) => ({ ...node, x: node.x - cx, y: node.y - cy }))
}

export const useSvgViewport = (
  ref: RefObject<SVGSVGElement | null>,
  fallback = { w: 1100, h: 576 }
) => {
  const [viewport, setViewport] = useState(fallback)
  useEffect(() => {
    const svg = ref.current
    if (!svg) return
    const update = () => {
      const rect = svg.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const w = rect.width
      const h = rect.height
      setViewport((current) =>
        Math.abs(current.w - w) < 0.5 && Math.abs(current.h - h) < 0.5
          ? current
          : { w, h }
      )
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(svg)
    return () => observer.disconnect()
  }, [ref])
  return viewport
}
