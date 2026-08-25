"use client"

import { useCallback, useLayoutEffect, useRef, type RefObject } from "react"
import type { ScrollTrigger } from "gsap/ScrollTrigger"
import { getLandingGsap } from "./gsap-client"
import { IPAD_CASE } from "./landing-artwork"
import {
  CROP_SCALE,
  HERO_COPY_GAP,
  HERO_SIDE_INSET,
  HERO_TOP_INSET,
  IPAD_FRAME_WIDTH,
  COPY_FADE_DURATION,
  COPY_FADE_START,
  LETTERBOX_FADE_DURATION,
  LETTERBOX_FADE_START,
  ROOM_COMPLETE_AT,
  ROOM_FADE_DURATION,
  ROOM_FADE_START,
  ROOM_IPAD_VIEW_MARGIN,
  ROOM_MIN_HEIGHT_FILL,
  ROOM_VEIL_OPACITY,
} from "./scene-constants"

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

/** Live recasts while the user drags; one accurate pass after they stop. */
const RESIZE_THROTTLE_MS = 80
const RESIZE_SETTLE_MS = 140

type ReadCssLength = (raw: string, fallback: number) => number

const createCssLengthProbe = () => {
  const probe = document.createElement("div")
  probe.setAttribute("aria-hidden", "true")
  probe.style.cssText =
    "position:absolute;visibility:hidden;pointer-events:none;inset:0 auto auto 0"
  document.body.append(probe)
  const readCssLength: ReadCssLength = (raw, fallback) => {
    probe.style.width = raw
    const width = probe.getBoundingClientRect().width
    return width > 0 ? width : fallback
  }
  return { readCssLength, dispose: () => probe.remove() }
}

const layoutCoverCanvas = (
  svg: SVGSVGElement,
  composition: HTMLElement,
  canvas: HTMLElement
) => {
  const width = composition.clientWidth
  const height = composition.clientHeight
  const viewBox = svg.viewBox.baseVal
  const coverScale =
    Math.max(width / viewBox.width, height / viewBox.height) * CROP_SCALE
  const canvasW = viewBox.width * coverScale
  const canvasH = viewBox.height * coverScale
  const panX = (width - canvasW) / 2
  const panY = (height - canvasH) / 2

  canvas.style.width = `${canvasW}px`
  canvas.style.height = `${canvasH}px`
  canvas.style.translate = `${panX}px ${panY}px`

  return { coverScale, panX, panY, viewBox }
}

const framedIpadCamera = (
  svg: SVGSVGElement,
  composition: HTMLElement,
  canvas: HTMLElement,
  readCssLength: ReadCssLength
) => {
  const { coverScale, panX, panY, viewBox } = layoutCoverCanvas(
    svg,
    composition,
    canvas
  )
  const width = composition.clientWidth
  const iPadWidth = IPAD_CASE.width * coverScale
  const iPadHeight = IPAD_CASE.height * coverScale
  const iPadLeft = panX + (IPAD_CASE.x - viewBox.x) * coverScale
  const iPadTop = panY + (IPAD_CASE.y - viewBox.y) * coverScale

  const styles = getComputedStyle(composition)
  const desiredWidth = readCssLength(
    styles.getPropertyValue("--landing-ipad-width").trim() || IPAD_FRAME_WIDTH,
    width * (1 - HERO_SIDE_INSET * 2)
  )
  const desiredTop = readCssLength(
    styles.getPropertyValue("--landing-ipad-top").trim() || HERO_TOP_INSET,
    16
  )
  const desiredHeight = desiredWidth * (IPAD_CASE.height / IPAD_CASE.width)
  const desiredLeft = (width - desiredWidth) / 2
  const copyGap = readCssLength(HERO_COPY_GAP, 20)
  const copyTop = desiredTop + desiredHeight + copyGap

  const targetScale = desiredWidth / iPadWidth
  const iPadCenterX = iPadLeft + iPadWidth / 2
  const iPadCenterY = iPadTop + iPadHeight / 2

  return {
    targetScale,
    targetX: desiredLeft + desiredWidth / 2 - targetScale * iPadCenterX,
    targetY: desiredTop + desiredHeight / 2 - targetScale * iPadCenterY,
    copyTop,
  }
}

/**
 * Keep the room filling the viewport. Pan so the iPad stays in frame.
 * Scale down only as far as needed for that crop — never the full width.
 * Leftover top (if any) is a late letterbox, not a mid-scroll crop.
 */
const roomEndCamera = (
  svg: SVGSVGElement,
  composition: HTMLElement,
  canvas: HTMLElement
) => {
  const { coverScale, panX, panY, viewBox } = layoutCoverCanvas(
    svg,
    composition,
    canvas
  )
  const width = composition.clientWidth
  const height = composition.clientHeight
  const iPadLeft = IPAD_CASE.x
  const iPadRight = IPAD_CASE.x + IPAD_CASE.width
  const neededW = iPadRight - iPadLeft + ROOM_IPAD_VIEW_MARGIN * 2
  const targetScale = clamp(
    width / (coverScale * neededW),
    ROOM_MIN_HEIGHT_FILL,
    1
  )
  const shownW = width / (coverScale * targetScale)
  const maxLeft = viewBox.x + Math.max(0, viewBox.width - shownW)
  let visibleLeft = viewBox.x + (viewBox.width - shownW) / 2
  if (iPadRight + ROOM_IPAD_VIEW_MARGIN > visibleLeft + shownW) {
    visibleLeft = iPadRight + ROOM_IPAD_VIEW_MARGIN - shownW
  }
  if (iPadLeft - ROOM_IPAD_VIEW_MARGIN < visibleLeft) {
    visibleLeft = iPadLeft - ROOM_IPAD_VIEW_MARGIN
  }
  visibleLeft = clamp(visibleLeft, viewBox.x, maxLeft)

  const canvasH = viewBox.height * coverScale
  const letterbox = Math.max(0, height - canvasH * targetScale)

  return {
    targetScale,
    targetX: -targetScale * (panX + (visibleLeft - viewBox.x) * coverScale),
    targetY: letterbox > 0.5 ? letterbox - targetScale * panY : 0,
    letterbox,
  }
}

type UseIpadZoomArgs = {
  wrapperRef: RefObject<HTMLElement | null>
  compositionRef: RefObject<HTMLElement | null>
  cameraRef: RefObject<HTMLElement | null>
  canvasRef: RefObject<HTMLElement | null>
  veilRef: RefObject<HTMLElement | null>
  letterboxRef?: RefObject<HTMLElement | null>
  svgRef: RefObject<SVGSVGElement | null>
  iPadRef: RefObject<SVGGElement | null>
  copyRef: RefObject<HTMLElement | null>
  copySlotRef: RefObject<HTMLElement | null>
  reducedMotion: boolean
  onRoomCompleteChange: (complete: boolean) => void
  onSceneReady: () => void
}

export const useIpadZoom = ({
  wrapperRef,
  compositionRef,
  cameraRef,
  canvasRef,
  veilRef,
  letterboxRef,
  svgRef,
  iPadRef,
  copyRef,
  copySlotRef,
  reducedMotion,
  onRoomCompleteChange,
  onSceneReady,
}: UseIpadZoomArgs) => {
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const triggerRef = useRef<ScrollTrigger | null>(null)
  const progressRef = useRef(0)
  /**
   * Captured just before a resize-driven `ScrollTrigger.refresh()`. The
   * trigger's start/end are page-pixel positions derived from `dvh`, so a
   * viewport resize changes the scroll distance under a fixed `scrollY` —
   * naively refreshing would read a different, distorted progress. Snap
   * exactly to 0/1 at rest so top and end match a fresh load; otherwise
   * replay the same fractional progress under the new geometry.
   */
  const resizeProgressRef = useRef<number | null>(null)
  const onRoomCompleteChangeRef = useRef(onRoomCompleteChange)
  onRoomCompleteChangeRef.current = onRoomCompleteChange
  const onSceneReadyRef = useRef(onSceneReady)
  onSceneReadyRef.current = onSceneReady

  const applyProgress = useCallback((progress: number, force = false) => {
    const clamped = clamp(progress, 0, 1)
    progressRef.current = clamped
    const timeline = timelineRef.current
    if (timeline) {
      if (force) {
        // `.progress(x)` is a no-op when `x` already equals the timeline's
        // cached time — invalidate() (after a resize) never gets rendered,
        // so the camera keeps its pre-resize transform under a freshly
        // resized canvas. `.render(..., force: true)` re-runs the dynamic
        // x/y/scale getters unconditionally.
        timeline.render(clamped * timeline.duration(), false, true)
      } else {
        timeline.progress(clamped)
      }
    }
    onRoomCompleteChangeRef.current(clamped >= ROOM_COMPLETE_AT)
  }, [])

  useLayoutEffect(() => {
    const { gsap, ScrollTrigger } = getLandingGsap()
    const wrapper = wrapperRef.current
    const composition = compositionRef.current
    const camera = cameraRef.current
    const canvas = canvasRef.current
    const veil = veilRef.current
    const letterbox = letterboxRef?.current
    const svg = svgRef.current
    const iPad = iPadRef.current
    const copy = copyRef.current
    const copySlot = copySlotRef.current
    if (!wrapper || !composition || !camera || !canvas || !svg || !iPad) return

    const cssProbe = createCssLengthProbe()
    const ctx = gsap.context(() => {
      const startCamera = () => {
        const next = framedIpadCamera(
          svg,
          composition,
          canvas,
          cssProbe.readCssLength
        )
        if (copySlot) {
          copySlot.style.top = `${next.copyTop}px`
          copySlot.style.bottom = "auto"
          copySlot.style.height = "auto"
        }
        return next
      }
      const endCamera = () => {
        const next = roomEndCamera(svg, composition, canvas)
        if (letterbox) {
          letterbox.style.height = `${next.letterbox}px`
        }
        return next
      }
      let start = startCamera()
      let end = endCamera()
      gsap.set(camera, {
        x: start.targetX,
        y: start.targetY,
        scale: start.targetScale,
        transformOrigin: "0 0",
      })
      if (letterbox) {
        gsap.set(letterbox, { scaleY: 0, transformOrigin: "50% 0%" })
      }

      const timeline = gsap.timeline({
        paused: true,
        defaults: { ease: "none" },
      })

      timeline.fromTo(
        camera,
        {
          x: () => start.targetX,
          y: () => start.targetY,
          scale: () => start.targetScale,
          transformOrigin: "0 0",
        },
        {
          x: () => end.targetX,
          y: () => end.targetY,
          scale: () => end.targetScale,
          duration: 1,
        },
        0
      )

      if (letterbox) {
        timeline.fromTo(
          letterbox,
          { scaleY: 0, transformOrigin: "50% 0%" },
          { scaleY: 1, duration: LETTERBOX_FADE_DURATION },
          LETTERBOX_FADE_START
        )
      }

      if (veil) {
        timeline.fromTo(
          veil,
          { opacity: ROOM_VEIL_OPACITY },
          { opacity: 0, duration: ROOM_FADE_DURATION },
          ROOM_FADE_START
        )
      }

      if (copy) {
        timeline.fromTo(
          copy,
          { opacity: 1 },
          { opacity: 0, duration: COPY_FADE_DURATION },
          COPY_FADE_START
        )
      }

      timelineRef.current = timeline
      onSceneReadyRef.current()

      if (reducedMotion) {
        applyProgress(0)
        return
      }

      const trigger = ScrollTrigger.create({
        trigger: wrapper,
        start: () =>
          `top ${getComputedStyle(document.documentElement).getPropertyValue("--site-header-height").trim() || "3rem"}`,
        end: "bottom bottom",
        pin: false,
        invalidateOnRefresh: true,
        onRefresh: (self) => {
          start = startCamera()
          end = endCamera()
          timeline.invalidate()
          const preserved = resizeProgressRef.current
          resizeProgressRef.current = null
          const target = preserved ?? self.progress
          applyProgress(target, true)
          if (preserved != null && self.end > self.start) {
            const targetScrollY = self.start + target * (self.end - self.start)
            if (Math.abs(window.scrollY - targetScrollY) > 0.5) {
              window.scrollTo({ top: targetScrollY, behavior: "auto" })
            }
          }
        },
        onUpdate: (self) => {
          applyProgress(self.progress)
        },
      })

      triggerRef.current = trigger
      applyProgress(trigger.progress)
      ScrollTrigger.refresh()
    }, wrapper)

    if (reducedMotion) {
      return () => {
        cssProbe.dispose()
        timelineRef.current = null
        triggerRef.current = null
        ctx.revert()
      }
    }

    let resizeFrame = 0
    let settleTimer = 0
    let lastRefreshAt = 0
    let lastSizeW = -1
    let lastSizeH = -1

    const captureResizeProgress = () => {
      const current = progressRef.current
      resizeProgressRef.current =
        current >= ROOM_COMPLETE_AT ? 1 : current <= 0 ? 0 : current
    }

    const refreshScene = (force: boolean) => {
      const width = composition.clientWidth
      const height = composition.clientHeight
      if (!force && width === lastSizeW && height === lastSizeH) return
      lastSizeW = width
      lastSizeH = height
      lastRefreshAt = performance.now()
      getLandingGsap().ScrollTrigger.refresh()
    }

    const handleResize = () => {
      captureResizeProgress()
      if (settleTimer) window.clearTimeout(settleTimer)
      settleTimer = window.setTimeout(() => {
        settleTimer = 0
        captureResizeProgress()
        refreshScene(true)
      }, RESIZE_SETTLE_MS)
      if (performance.now() - lastRefreshAt < RESIZE_THROTTLE_MS) return
      if (resizeFrame) return
      resizeFrame = window.requestAnimationFrame(() => {
        resizeFrame = 0
        refreshScene(false)
      })
    }
    window.addEventListener("resize", handleResize)
    window.addEventListener("orientationchange", handleResize)
    const viewport = window.visualViewport
    viewport?.addEventListener("resize", handleResize)
    // Gutter / :has() / overlay-scrollbar changes resize the stage without a
    // window resize — that is the “extra edge padding” flash on landing.
    const stageObserver = new ResizeObserver(handleResize)
    stageObserver.observe(composition)

    return () => {
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("orientationchange", handleResize)
      viewport?.removeEventListener("resize", handleResize)
      stageObserver.disconnect()
      if (resizeFrame) window.cancelAnimationFrame(resizeFrame)
      if (settleTimer) window.clearTimeout(settleTimer)
      cssProbe.dispose()
      timelineRef.current = null
      triggerRef.current = null
      ctx.revert()
    }
  }, [applyProgress, reducedMotion])

  return { progressRef }
}
