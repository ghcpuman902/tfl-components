export { catalogVertexScenarios, scenarioById, candidateById } from "./catalog"
export {
  canonicalizePattern,
  classifyPattern,
  drawingVariants,
  patternMatrix,
  patternTitle,
  undirectedPairs,
  type DrawingVariant,
  type PatternKind,
} from "./pattern"
export {
  canonicalizeDirectedMatrix,
  directedSignature,
  hasMove,
  matrixFromJunction,
  pairState,
  scenarioTitle,
  undirectedComponents,
} from "./directed-matrix"
export {
  buildVertexCandidates,
  enumerateVertexTrees,
  planarKey,
  planarNote,
  starTree,
} from "./candidates"
export {
  directedExact,
  inferDirectedForbiddenTurns,
  reconstructDirected,
  trackPath,
} from "./reconstruct"
export type {
  DirectedMatrix,
  DirectedPath,
  ObservedExample,
  VertexCandidate,
  VertexScenario,
  VertexTree,
} from "./types"
export { PORT_LABELS } from "./types"
export { buildDrawingScene } from "./drawing-graph"
export type { DrawingScene } from "./drawing-graph"
export {
  DEFAULT_LAYOUT_POLICY,
  collapseDrawing,
  layoutDrawing,
  scorePlacement,
} from "./drawing-layout"
export type {
  LaidDrawing,
  LayoutPolicy,
  PrimaryDirection,
} from "./drawing-layout"
export { composeYs, checkComposed } from "./compose"
