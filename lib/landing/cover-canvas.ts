/** Cover-scale a viewBox into a viewport so the canvas never letterboxes. */

export const computeCoverCanvas = ({
  viewportWidth,
  viewportHeight,
  viewBoxWidth,
  viewBoxHeight,
  cropScale,
}: {
  viewportWidth: number
  viewportHeight: number
  viewBoxWidth: number
  viewBoxHeight: number
  cropScale: number
}) => {
  const viewBoxW = viewBoxWidth > 0 ? viewBoxWidth : 1
  const viewBoxH = viewBoxHeight > 0 ? viewBoxHeight : 1
  const coverScale =
    Math.max(viewportWidth / viewBoxW, viewportHeight / viewBoxH) * cropScale
  const width = Math.ceil(viewBoxW * coverScale)
  const height = Math.ceil(viewBoxH * coverScale)
  return {
    coverScale,
    width,
    height,
    panX: (viewportWidth - width) / 2,
    panY: (viewportHeight - height) / 2,
  }
}
