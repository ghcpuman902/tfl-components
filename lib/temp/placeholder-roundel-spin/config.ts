import type { SpinAxis, SpinProfile, TiltAxis } from "./animation"
import {
  derivePlaceholderRoundel3d,
  PLACEHOLDER_ROUNDEL_COMPOSITED,
} from "./geometry"

export type FrameFit = "square" | "svg"
export type GraphicMaterial = "basic" | "lambert"

export type PlaceholderRoundelSpinConfig = {
  durationMs: number
  turns: number
  spinProfile: SpinProfile
  accelFraction: number
  maxTiltDeg: number
  tiltAxis: TiltAxis
  spinAxis: SpinAxis
  wobbleAmpDeg: number
  sphereRadius: number
  ringRadius: number
  ringThickness: number
  cameraScale: number
  frameCount: number
  spriteRows: number
  frameWidth: number
  frameHeight: number
  frameFit: FrameFit
  previewSpeed: number
  svgPrecision: number
  svgExportSize: number
  sphereColor: string
  ringColor: string
  material: GraphicMaterial
  sphereWidthSegments: number
  sphereHeightSegments: number
  ringRadialSegments: number
  ringTubularSegments: number
}

const derived = derivePlaceholderRoundel3d()

export const DEFAULT_PLACEHOLDER_ROUNDEL_SPIN_CONFIG: PlaceholderRoundelSpinConfig =
  {
    durationMs: 4100,
    turns: 6,
    spinProfile: "smootherstep",
    accelFraction: 0.14,
    maxTiltDeg: 16,
    tiltAxis: "x",
    spinAxis: "y",
    wobbleAmpDeg: 8.5,
    sphereRadius: derived.sphereRadius,
    ringRadius: derived.ringRadius,
    ringThickness: derived.ringThickness,
    cameraScale: 0.92,
    frameCount: 56,
    spriteRows: 8,
    frameWidth: 64,
    frameHeight: 64,
    frameFit: "square",
    previewSpeed: 1,
    svgPrecision: 1,
    svgExportSize: 200,
    sphereColor: PLACEHOLDER_ROUNDEL_COMPOSITED.sphere,
    ringColor: PLACEHOLDER_ROUNDEL_COMPOSITED.ring,
    material: "basic",
    sphereWidthSegments: 24,
    sphereHeightSegments: 16,
    ringRadialSegments: 12,
    ringTubularSegments: 48,
  }

export const animationInputsFromConfig = (
  config: PlaceholderRoundelSpinConfig
) => ({
  turns: config.turns,
  maxTiltDeg: config.maxTiltDeg,
  tiltAxis: config.tiltAxis,
  spinAxis: config.spinAxis,
  spinProfile: config.spinProfile,
  accelFraction: config.accelFraction,
  wobbleAmpDeg: config.wobbleAmpDeg,
  durationMs: config.durationMs,
  frameCount: config.frameCount,
})
