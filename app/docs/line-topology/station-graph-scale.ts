import { useEffect, useState, type RefObject } from "react"

const LABEL_SCREEN_MIN = 1.08
const LABEL_SCREEN_MAX = 2.15

export const labelScreenScale = (zoomScale: number): number =>
  Math.max(LABEL_SCREEN_MIN, Math.min(LABEL_SCREEN_MAX, zoomScale ** 0.52))

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
      setViewport({ w: rect.width, h: rect.height })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(svg)
    return () => observer.disconnect()
  }, [ref])
  return viewport
}
