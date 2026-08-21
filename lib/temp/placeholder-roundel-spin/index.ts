export {
  accelCruiseDecelProgress,
  frameIndexForTime,
  invertSpinProgress,
  poseAt,
  sampleTimes,
  spinProgress,
  smootherstep,
  tiltEnvelope,
  unusedAxis,
  type AnimationInputs,
  type Axis,
  type Pose,
  type SpinAxis,
  type SpinProfile,
  type TiltAxis,
} from "./animation"
export {
  CLIP_IDS,
  clipPlan,
  deriveHoverWindows,
  poseAtClip,
  sampleClipTimes,
  totalClipFrames,
  type ClipId,
  type ClipPlanItem,
  type ClipPoseInputs,
  type ClipSampleMode,
  type ClipTiming,
  type HoverWindows,
} from "./clips"
export {
  atlasCell,
  atlasLayout,
  spriteMeta,
  type AtlasLayout,
  type PlaceholderRoundelSpriteMeta,
} from "./atlas"
export {
  animationInputsFromConfig,
  DEFAULT_PLACEHOLDER_ROUNDEL_SPIN_CONFIG,
  type FrameFit,
  type GraphicMaterial,
  type PlaceholderRoundelSpinConfig,
} from "./config"
export {
  derivePlaceholderRoundel3d,
  PLACEHOLDER_ROUNDEL_COMPOSITED,
  PLACEHOLDER_ROUNDEL_SVG,
  crescentPoints,
  remainingRingProfile,
  ringTubePhiCutoff,
  sphereSvgRadius,
  svgWorldScale,
} from "./geometry"
export {
  composeSvgAtlas,
  describeAtlas,
  frameFileName,
  padFrameIndex,
  parseSvgDocument,
} from "./svg-sprite"
export {
  renderSvgClips,
  renderSvgFrames,
  renderVectorFrame,
  type SvgClipExportResult,
  type SvgExportResult,
} from "./svg-vector"
export { buildZipArchive, encodeUtf8 } from "./zip"
