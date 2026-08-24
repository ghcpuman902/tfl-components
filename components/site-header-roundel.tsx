"use client"

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import {
  atlasInnerMarkup,
  headerRoundelCell,
  nextHeaderRoundelPhase,
  type HeaderRoundelPhase,
} from "@/lib/brand/header-roundel-playback"
import {
  PLACEHOLDER_ROUNDEL_SPIN_ATLAS,
  PLACEHOLDER_ROUNDEL_SPIN_META,
} from "@/lib/brand/placeholder-roundel-spin-meta"
import { PlaceholderRoundelSvg } from "@/registry/tfl/brand/tfl-roundel"
import { cn } from "@/lib/utils"
import type { ClipId } from "@/lib/temp/placeholder-roundel-spin"

const META = PLACEHOLDER_ROUNDEL_SPIN_META
const CLIPS = Object.fromEntries(
  META.clips.map((clip) => [clip.id, clip])
) as Record<(typeof META.clips)[number]["id"], (typeof META.clips)[number]>

type HeaderRoundelProps = {
  className?: string
}

export const HeaderRoundel = ({ className }: HeaderRoundelProps) => {
  const reduced = usePrefersReducedMotion()
  const svgRef = useRef<SVGSVGElement>(null)
  const hoveredRef = useRef(false)
  const resumeFromRestRef = useRef<(() => void) | null>(null)
  const [atlasInner, setAtlasInner] = useState<string | null>(null)

  useEffect(() => {
    if (reduced) return
    let cancelled = false
    const load = async () => {
      const response = await fetch(PLACEHOLDER_ROUNDEL_SPIN_ATLAS)
      if (!response.ok) return
      const markup = atlasInnerMarkup(await response.text())
      if (!cancelled) setAtlasInner(markup)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [reduced])

  useLayoutEffect(() => {
    const svg = svgRef.current
    if (!svg || !atlasInner || reduced) return
    svg.innerHTML = atlasInner

    const apply = (frameIndex: number) => {
      svg.setAttribute(
        "viewBox",
        headerRoundelCell(
          frameIndex,
          META.columns,
          META.frameWidth,
          META.frameHeight
        ).viewBox
      )
    }

    const show = (phase: HeaderRoundelPhase, local: number) => {
      if (phase === "rest") {
        apply(CLIPS.intro.start + CLIPS.intro.frameCount - 1)
        return
      }
      apply(CLIPS[phase].start + local)
    }

    let raf = 0
    let phase: HeaderRoundelPhase = "intro"
    let clipStarted = performance.now()
    let loopLeftZero = false

    const startPhase = (next: HeaderRoundelPhase, now: number) => {
      phase = next
      clipStarted = now
      loopLeftZero = false
      show(next, next === "rest" ? CLIPS.intro.frameCount - 1 : 0)
    }

    const schedule = () => {
      raf = requestAnimationFrame(tick)
    }

    const tick = (now: number) => {
      if (phase === "rest") return

      const clip = CLIPS[phase as ClipId]
      const elapsed = now - clipStarted

      if (clip.loop) {
        const local =
          Math.floor(
            ((elapsed % clip.durationMs) / clip.durationMs) * clip.frameCount
          ) % clip.frameCount
        if (local !== 0) loopLeftZero = true
        show("loop", local)
        const frameMs = clip.durationMs / clip.frameCount
        if (
          !hoveredRef.current &&
          local === 0 &&
          (loopLeftZero || elapsed >= frameMs)
        ) {
          startPhase("decel", now)
        }
        schedule()
        return
      }

      const t = Math.min(1, elapsed / clip.durationMs)
      show(phase, Math.round(t * (clip.frameCount - 1)))
      if (t < 1) {
        schedule()
        return
      }

      const next = nextHeaderRoundelPhase(phase as ClipId, hoveredRef.current)
      startPhase(next, now)
      if (next !== "rest") schedule()
    }

    resumeFromRestRef.current = () => {
      if (phase !== "rest") return
      startPhase("accel", performance.now())
      schedule()
    }

    startPhase("intro", performance.now())
    schedule()
    return () => {
      cancelAnimationFrame(raf)
      resumeFromRestRef.current = null
    }
  }, [atlasInner, reduced])

  const handlePointerEnter = () => {
    hoveredRef.current = true
    resumeFromRestRef.current?.()
  }
  const handlePointerLeave = () => {
    hoveredRef.current = false
  }

  return (
    <span
      className={cn("inline-block shrink-0", className)}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      aria-hidden
    >
      {atlasInner && !reduced ? (
        <svg
          ref={svgRef}
          xmlns="http://www.w3.org/2000/svg"
          viewBox={`0 0 ${META.frameWidth} ${META.frameHeight}`}
          className="size-full"
        />
      ) : (
        <PlaceholderRoundelSvg
          framed={false}
          ringColor="#cecece"
          barColor="#888888"
          className="size-full"
        />
      )}
    </span>
  )
}
