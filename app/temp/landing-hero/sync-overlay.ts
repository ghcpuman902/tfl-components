/** Pin an HTML overlay to an SVG element's on-screen box, scaled from a native pixel size. */
export const syncOverlayToSvg = (
  overlay: HTMLElement | null,
  svgEl: SVGGraphicsElement | null,
  host: HTMLElement,
  nativeWidth: number,
  nativeHeight: number
) => {
  if (!overlay || !svgEl || nativeWidth <= 0) return
  const hostRect = host.getBoundingClientRect()
  const rect = svgEl.getBoundingClientRect()
  if (rect.width < 0.5 || rect.height < 0.5) {
    overlay.style.visibility = "hidden"
    return
  }
  overlay.style.visibility = "visible"
  overlay.style.left = "0px"
  overlay.style.top = "0px"
  overlay.style.width = `${nativeWidth}px`
  overlay.style.height = `${nativeHeight}px`
  overlay.style.aspectRatio = "auto"
  overlay.style.transformOrigin = "0 0"
  overlay.style.translate = `${rect.left - hostRect.left}px ${rect.top - hostRect.top}px`
  overlay.style.scale = String(rect.width / nativeWidth)
}
