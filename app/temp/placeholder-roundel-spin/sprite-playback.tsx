"use client"

import { useEffect, useRef, useState } from "react"
import {
  atlasCell,
  atlasLayout,
  clipPlan,
  frameIndexForTime,
  parseSvgDocument,
  totalClipFrames,
  type PlaceholderRoundelSpinConfig,
} from "@/lib/temp/placeholder-roundel-spin"

type SpritePlaybackProps = {
  atlasSvg: string
  config: PlaceholderRoundelSpinConfig
  playing: boolean
  mode?: "intro" | "hover"
}

export const SpritePlayback = ({
  atlasSvg,
  config,
  playing,
  mode = "intro",
}: SpritePlaybackProps) => {
  const [liveFrame, setLiveFrame] = useState(0)
  const playingRef = useRef(false)

  useEffect(() => {
    playingRef.current = playing
  }, [playing])

  useEffect(() => {
    if (!playing) return
    const clips = clipPlan(config)
    const intro = clips.find((clip) => clip.id === "intro")
    const accel = clips.find((clip) => clip.id === "accel")
    const loop = clips.find((clip) => clip.id === "loop")
    if (!intro || !accel || !loop) return
    const startedAt = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const elapsed = (now - startedAt) * config.previewSpeed
      if (mode === "intro") {
        const nextT = Math.min(1, elapsed / intro.durationMs)
        setLiveFrame(
          intro.start + frameIndexForTime(nextT, intro.frameCount)
        )
        if (nextT < 1 && playingRef.current) raf = requestAnimationFrame(tick)
        return
      }
      if (elapsed < accel.durationMs) {
        const nextT = elapsed / accel.durationMs
        setLiveFrame(
          accel.start + frameIndexForTime(nextT, accel.frameCount)
        )
      } else {
        const loopElapsed = elapsed - accel.durationMs
        const cycle = (loopElapsed % loop.durationMs) / loop.durationMs
        setLiveFrame(
          loop.start + Math.floor(cycle * loop.frameCount) % loop.frameCount
        )
      }
      if (playingRef.current) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, mode, config, atlasSvg])

  const frame = playing ? liveFrame : 0
  const layout = atlasLayout({
    ...config,
    frameCount: totalClipFrames(config),
  })
  const cell = atlasCell(frame, layout)
  const inner = parseSvgDocument(atlasSvg).inner

  return (
    <div className="flex flex-wrap items-end gap-6">
      <SpriteWindow
        inner={inner}
        viewBox={`${cell.x} ${cell.y} ${layout.frameWidth} ${layout.frameHeight}`}
        size={20}
        label="Header size"
      />
      <SpriteWindow
        inner={inner}
        viewBox={`${cell.x} ${cell.y} ${layout.frameWidth} ${layout.frameHeight}`}
        size={64}
        label="64px"
      />
      <p className="text-xs text-muted-foreground tabular-nums">
        Sprite {mode} · frame {frame} · no Three.js
      </p>
    </div>
  )
}

const SpriteWindow = ({
  inner,
  viewBox,
  size,
  label,
}: {
  inner: string
  viewBox: string
  size: number
  label: string
}) => (
  <div className="space-y-1">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox={viewBox}
      className="bg-white"
      role="img"
      aria-label={`${label} sprite preview`}
      dangerouslySetInnerHTML={{ __html: inner }}
    />
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
)
