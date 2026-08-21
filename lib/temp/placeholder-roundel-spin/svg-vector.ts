import { animationInputsFromConfig } from "./config"
import type { PlaceholderRoundelSpinConfig } from "./config"
import { clipPlan, poseAtClip, type ClipId } from "./clips"
import { sampleTimes } from "./animation"
import { polylinePath, projectRoundelSvg } from "./project-ring"

const SVG_NS = "http://www.w3.org/2000/svg"

export type SvgExportResult =
  { ok: true; frames: string[] } | { ok: false; error: string }

export type SvgClipExportResult =
  | { ok: true; frames: string[]; clipFrames: Record<ClipId, string[]> }
  | { ok: false; error: string }

const exportFrameSize = (config: PlaceholderRoundelSpinConfig) =>
  Math.max(100, Math.round(config.svgExportSize || 200))

const fillPath = (d: string, color: string) =>
  d
    ? `<path d="${d}Z" fill="${color}" stroke="${color}" stroke-width="1" stroke-linejoin="round" fill-rule="nonzero"/>`
    : ""

export const renderVectorFrame = (
  config: PlaceholderRoundelSpinConfig,
  t: number,
  clip: ClipId = "intro"
): string => {
  const size = exportFrameSize(config)
  const pose = poseAtClip(clip, t, animationInputsFromConfig(config))
  const projected = projectRoundelSvg(config, pose, size)
  const half = size / 2
  const back = projected.back
    .map((contour) => fillPath(polylinePath(contour), config.ringColor))
    .join("")
  const front = projected.front
    .map((contour) => fillPath(polylinePath(contour), config.ringColor))
    .join("")
  const disc = `<circle cx="0" cy="0" r="${projected.discRadius.toFixed(1)}" fill="${config.sphereColor}"/>`
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="${SVG_NS}" width="${size}" height="${size}" viewBox="-${half} -${half} ${size} ${size}">${back}${disc}${front}</svg>`
}

export const renderSvgFrames = (
  config: PlaceholderRoundelSpinConfig
): SvgExportResult => {
  try {
    const clipsResult = renderSvgClips(config)
    if (!clipsResult.ok) return clipsResult
    return { ok: true, frames: clipsResult.frames }
  } catch (error) {
    const message = error instanceof Error ? error.message : "SVG export failed"
    return { ok: false, error: message }
  }
}

export const renderSvgClips = (
  config: PlaceholderRoundelSpinConfig
): SvgClipExportResult => {
  try {
    const frames = sampleTimes(config.frameCount).map((t) =>
      renderVectorFrame(config, t, "intro")
    )
    const clips = Object.fromEntries(
      clipPlan(config).map((clip) => [clip.id, clip])
    ) as Record<ClipId, ReturnType<typeof clipPlan>[number]>
    const clipFrames: Record<ClipId, string[]> = {
      intro: frames,
      accel: frames.slice(0, clips.accel.frameCount),
      loop: frames.slice(clips.loop.start, clips.loop.start + clips.loop.frameCount),
      decel: frames.slice(clips.decel.start),
    }

    return { ok: true, frames, clipFrames }
  } catch (error) {
    const message = error instanceof Error ? error.message : "SVG export failed"
    return { ok: false, error: message }
  }
}
