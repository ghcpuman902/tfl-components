import { useEffect, useRef, useState } from "react"
import {
  nextHeaderRoundelPhase,
  type HeaderRoundelPhase,
} from "@/lib/brand/header-roundel-playback"
import {
  animationInputsFromConfig,
  clipPlan,
  deriveHoverWindows,
  poseAtClip,
  type ClipId,
  type PlaceholderRoundelSpinConfig,
  type Pose,
} from "@/lib/temp/placeholder-roundel-spin"

const restPose = (config: PlaceholderRoundelSpinConfig): Pose =>
  poseAtClip("intro", 1, animationInputsFromConfig(config))

const introTForPhase = (
  phase: HeaderRoundelPhase,
  localT: number,
  config: PlaceholderRoundelSpinConfig
) => {
  if (phase === "rest") return 1
  if (phase === "intro") return localT
  const { t0, t1 } = deriveHoverWindows(config)
  if (phase === "accel") return t0 * localT
  if (phase === "loop") return t0 + (t1 - t0) * localT
  return t1 + (1 - t1) * localT
}

export const useClipPlayback = (
  config: PlaceholderRoundelSpinConfig,
  loopIntro: boolean
) => {
  const hoveredRef = useRef(false)
  const pausedRef = useRef(false)
  const loopIntroRef = useRef(loopIntro)
  const configRef = useRef(config)
  const resumeFromRestRef = useRef<(() => void) | null>(null)
  const playIntroRef = useRef<(() => void) | null>(null)
  const playHoverRef = useRef<(() => void) | null>(null)
  const pauseRef = useRef<(() => void) | null>(null)
  const scrubRef = useRef<((t: number) => void) | null>(null)
  const [pose, setPose] = useState(() => restPose(config))
  const [clock, setClock] = useState({
    t: 0,
    phase: "intro" as HeaderRoundelPhase,
  })

  useEffect(() => {
    configRef.current = config
  }, [config])

  useEffect(() => {
    loopIntroRef.current = loopIntro
  }, [loopIntro])

  useEffect(() => {
    const clips = Object.fromEntries(
      clipPlan(config).map((clip) => [clip.id, clip])
    ) as Record<ClipId, ReturnType<typeof clipPlan>[number]>
    const inputs = () => animationInputsFromConfig(configRef.current)

    let raf = 0
    let phase: HeaderRoundelPhase = "intro"
    let startedAt = performance.now()
    let loopLeftZero = false

    const report = (next: HeaderRoundelPhase, localT: number) => {
      setClock({
        t: introTForPhase(next, localT, configRef.current),
        phase: next,
      })
    }

    const apply = (next: HeaderRoundelPhase, localT: number) => {
      if (next === "rest") {
        setPose(restPose(configRef.current))
        report("rest", 1)
        return
      }
      setPose(poseAtClip(next, localT, inputs()))
      report(next, localT)
    }

    const startPhase = (next: HeaderRoundelPhase, now: number) => {
      phase = next
      startedAt = now
      loopLeftZero = false
      apply(next, next === "rest" ? 1 : 0)
    }

    const schedule = () => {
      if (pausedRef.current) return
      raf = requestAnimationFrame(tick)
    }

    const tick = (now: number) => {
      if (pausedRef.current || phase === "rest") return
      const clip = clips[phase as ClipId]
      const elapsed =
        (now - startedAt) * configRef.current.previewSpeed

      if (clip.loop) {
        const t = (elapsed % clip.durationMs) / clip.durationMs
        if (t > 0.02) loopLeftZero = true
        apply("loop", t)
        if (
          !hoveredRef.current &&
          t < 1 / clip.frameCount &&
          (loopLeftZero || elapsed >= clip.durationMs / clip.frameCount)
        ) {
          startPhase("decel", now)
        }
        schedule()
        return
      }

      const t = Math.min(1, elapsed / clip.durationMs)
      apply(phase, t)
      if (t < 1) {
        schedule()
        return
      }

      if (phase === "intro" && loopIntroRef.current && !hoveredRef.current) {
        startPhase("intro", now)
        schedule()
        return
      }

      const next = nextHeaderRoundelPhase(phase as ClipId, hoveredRef.current)
      startPhase(next, now)
      if (next !== "rest") schedule()
    }

    const playIntro = () => {
      pausedRef.current = false
      hoveredRef.current = false
      cancelAnimationFrame(raf)
      startPhase("intro", performance.now())
      schedule()
    }

    const playHover = () => {
      pausedRef.current = false
      hoveredRef.current = true
      cancelAnimationFrame(raf)
      startPhase("accel", performance.now())
      schedule()
    }

    const pause = () => {
      pausedRef.current = true
      cancelAnimationFrame(raf)
      raf = 0
    }

    const scrub = (t: number) => {
      pausedRef.current = true
      cancelAnimationFrame(raf)
      raf = 0
      hoveredRef.current = false
      phase = "intro"
      apply("intro", Math.min(1, Math.max(0, t)))
    }

    const resumeFromRest = () => {
      if (phase !== "rest" || pausedRef.current) return
      startPhase("accel", performance.now())
      schedule()
    }

    playIntroRef.current = playIntro
    playHoverRef.current = playHover
    pauseRef.current = pause
    scrubRef.current = scrub
    resumeFromRestRef.current = resumeFromRest

    playIntro()
    return () => {
      cancelAnimationFrame(raf)
      playIntroRef.current = null
      playHoverRef.current = null
      pauseRef.current = null
      scrubRef.current = null
      resumeFromRestRef.current = null
    }
  }, [config])

  return {
    pose,
    t: clock.t,
    phase: clock.phase,
    playIntro: () => playIntroRef.current?.(),
    playHover: () => playHoverRef.current?.(),
    pause: () => pauseRef.current?.(),
    scrub: (t: number) => scrubRef.current?.(t),
    handlePointerEnter: () => {
      hoveredRef.current = true
      if (pausedRef.current) return
      resumeFromRestRef.current?.()
    },
    handlePointerLeave: () => {
      hoveredRef.current = false
    },
  }
}
