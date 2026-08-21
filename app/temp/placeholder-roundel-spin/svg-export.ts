export {
  renderSvgClips,
  renderSvgFrames,
  renderVectorFrame,
  type SvgClipExportResult,
  type SvgExportResult,
} from "@/lib/temp/placeholder-roundel-spin"

export const SVG_RENDERER_LIMITS =
  "Export is torus minus sphere, sliced on the view plane, flattened, then a 2D circle. Three.js is only the live preview — it does not triangulate the SVG atlas."
