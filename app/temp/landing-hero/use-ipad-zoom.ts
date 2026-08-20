"use client"

import { useCallback, useLayoutEffect, useRef, type RefObject } from "react"
import { getLandingGsap } from "./gsap-client"
import {
  CAPTION_FADE_DURATION,
  CAPTION_FADE_START,
  CLICK_SETTLE_DURATION,
  CLICK_SETTLE_EASE,
  COMMIT_THRESHOLD,
  COPY_FADE_DURATION,
  CROP_SCALE,
  DEFOCUS,
  IPAD_PADDING_FRACTION,
  SETTLE_DURATION_MAX,
  SETTLE_DURATION_MIN,
  SETTLE_EASE,
  SNAP_DELAY,
  ZOOM_COMPLETE_AT,
  ZOOM_SCROLL_FRACTION,
} from "./scene-constants"

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const layoutCoverCanvas = (
  svg: SVGSVGElement,
  iPad: SVGGElement,
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

  const bbox = iPad.getBBox()
  const iPadLeft = (bbox.x - viewBox.x) * coverScale
  const iPadTop = (bbox.y - viewBox.y) * coverScale
  const iPadWidth = bbox.width * coverScale
  const iPadHeight = bbox.height * coverScale
  const iPadRight = iPadLeft + iPadWidth
  const iPadBottom = iPadTop + iPadHeight

  const padX = (width * IPAD_PADDING_FRACTION) / 2
  const padY = (height * IPAD_PADDING_FRACTION) / 2

  let panX = (width - canvasW) / 2
  let panY = (height - canvasH) / 2

  if (panX + iPadRight > width - padX) panX = width - padX - iPadRight
  if (panX + iPadLeft < padX) panX = padX - iPadLeft
  if (panY + iPadBottom > height - padY) panY = height - padY - iPadBottom
  if (panY + iPadTop < padY) panY = padY - iPadTop

  panX = clamp(panX, width - canvasW, 0)
  panY = clamp(panY, height - canvasH, 0)

  canvas.style.width = `${canvasW}px`
  canvas.style.height = `${canvasH}px`
  canvas.style.translate = `${panX}px ${panY}px`

  const iPadCenterX = panX + iPadLeft + iPadWidth / 2
  const iPadCenterY = panY + iPadTop + iPadHeight / 2
  const paddedWidth = width * (1 - IPAD_PADDING_FRACTION)
  const paddedHeight = height * (1 - IPAD_PADDING_FRACTION)
  const targetScale = Math.min(
    paddedWidth / iPadWidth,
    paddedHeight / iPadHeight
  )

  return {
    targetScale,
    targetX: width / 2 - targetScale * iPadCenterX,
    targetY: height / 2 - targetScale * iPadCenterY,
  }
}

type UseIpadZoomArgs = {
  wrapperRef: RefObject<HTMLElement | null>
  compositionRef: RefObject<HTMLElement | null>
  cameraRef: RefObject<HTMLElement | null>
  canvasRef: RefObject<HTMLElement | null>
  svgRef: RefObject<SVGSVGElement | null>
  iPadRef: RefObject<SVGGElement | null>
  l0Ref: RefObject<SVGGElement | null>
  l1Ref: RefObject<SVGGElement | null>
  copyRef: RefObject<HTMLElement | null>
  captionRef: RefObject<HTMLElement | null>
  reducedMotion: boolean
  onZoomCompleteChange: (complete: boolean) => void
}

export const useIpadZoom = ({
  wrapperRef,
  compositionRef,
  cameraRef,
  canvasRef,
  svgRef,
  iPadRef,
  l0Ref,
  l1Ref,
  copyRef,
  captionRef,
  reducedMotion,
  onZoomCompleteChange,
}: UseIpadZoomArgs) => {
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const triggerRef = useRef<ScrollTrigger | null>(null)
  const scrollTweenRef = useRef<gsap.core.Tween | null>(null)
  const debugHeldRef = useRef(false)
  const progressRef = useRef(0)
  const directionRef = useRef(1)
  const onZoomCompleteChangeRef = useRef(onZoomCompleteChange)
  onZoomCompleteChangeRef.current = onZoomCompleteChange

  const applyScrollProgress = useCallback((scrollProgress: number) => {
    const visual = clamp(scrollProgress / ZOOM_SCROLL_FRACTION, 0, 1)
    progressRef.current = visual
    timelineRef.current?.progress(visual)
    onZoomCompleteChangeRef.current(visual >= ZOOM_COMPLETE_AT)
  }, [])

  const applyProgress = useCallback((progress: number) => {
    const clamped = clamp(progress, 0, 1)
    progressRef.current = clamped
    timelineRef.current?.progress(clamped)
    onZoomCompleteChangeRef.current(clamped >= ZOOM_COMPLETE_AT)
  }, [])

  const zoomEndScroll = (trigger: ScrollTrigger) =>
    trigger.start + (trigger.end - trigger.start) * ZOOM_SCROLL_FRACTION

  const killScrollTween = useCallback(() => {
    scrollTweenRef.current?.kill()
    scrollTweenRef.current = null
  }, [])

  const animateTriggerScroll = useCallback(
    (target: number, duration: number, ease: string) => {
      const trigger = triggerRef.current
      if (!trigger) return
      killScrollTween()
      const { gsap } = getLandingGsap()
      const proxy = { n: trigger.scroll() }
      scrollTweenRef.current = gsap.to(proxy, {
        n: target,
        duration,
        ease,
        overwrite: true,
        onUpdate: () => trigger.scroll(proxy.n),
        onComplete: () => {
          scrollTweenRef.current = null
          trigger.scroll(target)
        },
      })
    },
    [killScrollTween]
  )

  const scrollToIpad = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    if (trigger.progress >= ZOOM_SCROLL_FRACTION - 0.001) return
    animateTriggerScroll(
      zoomEndScroll(trigger),
      CLICK_SETTLE_DURATION,
      CLICK_SETTLE_EASE
    )
  }, [animateTriggerScroll])

  const setDebugProgress = useCallback(
    (progress: number) => {
      debugHeldRef.current = true
      killScrollTween()
      triggerRef.current?.disable(false)
      applyProgress(progress)
    },
    [applyProgress, killScrollTween]
  )

  const releaseDebugProgress = useCallback(() => {
    debugHeldRef.current = false
    triggerRef.current?.enable()
    triggerRef.current?.refresh()
  }, [])

  useLayoutEffect(() => {
    const { gsap, ScrollTrigger } = getLandingGsap()
    const wrapper = wrapperRef.current
    const composition = compositionRef.current
    const camera = cameraRef.current
    const canvas = canvasRef.current
    const svg = svgRef.current
    const iPad = iPadRef.current
    const l0 = l0Ref.current
    const l1 = l1Ref.current
    const copy = copyRef.current
    const caption = captionRef.current
    if (!wrapper || !composition || !camera || !canvas || !svg || !iPad) return

    const ctx = gsap.context(() => {
      const targets = () => layoutCoverCanvas(svg, iPad, composition, canvas)
      const timeline = gsap.timeline({
        paused: true,
        defaults: { ease: "none" },
      })

      timeline.fromTo(
        camera,
        {
          x: 0,
          y: 0,
          scale: 1,
          transformOrigin: "0 0",
        },
        {
          x: () => targets().targetX,
          y: () => targets().targetY,
          scale: () => targets().targetScale,
          duration: 1,
        },
        0
      )

      if (l0) {
        timeline.fromTo(
          l0,
          {
            opacity: 1,
            filter: "blur(0px)",
          },
          {
            opacity: reducedMotion ? 0.35 : DEFOCUS.l0.opacity,
            filter: reducedMotion ? "blur(0px)" : `blur(${DEFOCUS.l0.blur}px)`,
            duration: DEFOCUS.l0.duration,
          },
          DEFOCUS.l0.start
        )
      }

      if (l1) {
        timeline.fromTo(
          l1,
          { opacity: 1, filter: "blur(0px)" },
          {
            opacity: reducedMotion ? 0.55 : DEFOCUS.l1.opacity,
            filter: reducedMotion ? "blur(0px)" : `blur(${DEFOCUS.l1.blur}px)`,
            duration: DEFOCUS.l1.duration,
          },
          DEFOCUS.l1.start
        )
      }

      if (copy) {
        timeline.fromTo(
          copy,
          {
            opacity: 1,
            y: 0,
            scale: 1,
            transformOrigin: "center center",
          },
          {
            opacity: 0,
            y: reducedMotion ? 0 : -16,
            scale: reducedMotion ? 1 : 0.96,
            duration: COPY_FADE_DURATION,
            onUpdate: () => {
              const opacity = Number(gsap.getProperty(copy, "opacity"))
              copy.style.pointerEvents = opacity < 0.05 ? "none" : "auto"
            },
          },
          0
        )
      }

      if (caption) {
        timeline.fromTo(
          caption,
          { opacity: 0 },
          { opacity: 1, duration: CAPTION_FADE_DURATION },
          CAPTION_FADE_START
        )
      }

      timelineRef.current = timeline

      const trigger = ScrollTrigger.create({
        trigger: wrapper,
        start: () =>
          `top ${getComputedStyle(document.documentElement).getPropertyValue("--site-header-height").trim() || "3rem"}`,
        end: "bottom bottom",
        pin: false,
        invalidateOnRefresh: true,
        snap: reducedMotion
          ? false
          : {
              snapTo: (value: number) => {
                if (value > ZOOM_SCROLL_FRACTION + 0.002) return value
                if (directionRef.current >= 0) {
                  return value >= ZOOM_SCROLL_FRACTION * COMMIT_THRESHOLD
                    ? ZOOM_SCROLL_FRACTION
                    : 0
                }
                return value <= ZOOM_SCROLL_FRACTION * (1 - COMMIT_THRESHOLD)
                  ? 0
                  : ZOOM_SCROLL_FRACTION
              },
              duration: {
                min: SETTLE_DURATION_MIN,
                max: SETTLE_DURATION_MAX,
              },
              delay: SNAP_DELAY,
              ease: SETTLE_EASE,
              directional: true,
            },
        onRefresh: (self) => {
          targets()
          timeline.invalidate()
          if (!debugHeldRef.current) applyScrollProgress(self.progress)
        },
        onUpdate: (self) => {
          directionRef.current = self.direction
          if (debugHeldRef.current) return
          applyScrollProgress(self.progress)
        },
      })

      triggerRef.current = trigger
      applyScrollProgress(trigger.progress)
      ScrollTrigger.refresh()
    }, wrapper)

    const handleResize = () => {
      ScrollTrigger.refresh()
    }
    window.addEventListener("resize", handleResize)
    window.addEventListener("orientationchange", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("orientationchange", handleResize)
      killScrollTween()
      timelineRef.current = null
      triggerRef.current = null
      ctx.revert()
    }
  }, [
    applyScrollProgress,
    cameraRef,
    canvasRef,
    captionRef,
    compositionRef,
    copyRef,
    iPadRef,
    killScrollTween,
    l0Ref,
    l1Ref,
    reducedMotion,
    svgRef,
    wrapperRef,
  ])

  return { scrollToIpad, setDebugProgress, releaseDebugProgress, progressRef }
}
