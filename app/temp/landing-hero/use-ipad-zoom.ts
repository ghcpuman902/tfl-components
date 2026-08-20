"use client"

import { useCallback, useLayoutEffect, useRef, type RefObject } from "react"
import { getLandingGsap } from "./gsap-client"
import {
  COPY_FADE_DURATION,
  CROP_SCALE,
  DEFOCUS,
  IPAD_PADDING_FRACTION,
  ZOOM_COMPLETE_AT,
} from "./scene-constants"

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const layoutCoverCanvas = (
  svg: SVGSVGElement,
  iPad: SVGGElement,
  composition: HTMLElement,
  canvas: HTMLElement,
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
    paddedHeight / iPadHeight,
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
  reducedMotion,
  onZoomCompleteChange,
}: UseIpadZoomArgs) => {
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const debugHeldRef = useRef(false)
  const progressRef = useRef(0)

  const scrollToIpad = useCallback(() => {
    const timeline = timelineRef.current
    const trigger = timeline?.scrollTrigger
    if (!trigger) return
    trigger.scroll(trigger.end)
  }, [])

  const setDebugProgress = useCallback(
    (progress: number) => {
      const timeline = timelineRef.current
      if (!timeline) return
      debugHeldRef.current = true
      progressRef.current = progress
      timeline.scrollTrigger?.disable(false)
      timeline.progress(progress)
      onZoomCompleteChange(progress >= ZOOM_COMPLETE_AT)
    },
    [onZoomCompleteChange]
  )

  const releaseDebugProgress = useCallback(() => {
    debugHeldRef.current = false
    timelineRef.current?.scrollTrigger?.enable()
    timelineRef.current?.scrollTrigger?.refresh()
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
    if (!wrapper || !composition || !camera || !canvas || !svg || !iPad) return

    const ctx = gsap.context(() => {
      const targets = () => layoutCoverCanvas(svg, iPad, composition, canvas)
      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: wrapper,
          start: () =>
            `top ${getComputedStyle(document.documentElement).getPropertyValue("--site-header-height").trim() || "3rem"}`,
          end: "bottom bottom",
          scrub: true,
          pin: false,
          invalidateOnRefresh: true,
          onRefresh: () => {
            targets()
          },
          onUpdate: (self) => {
            progressRef.current = self.progress
            if (debugHeldRef.current) return
            onZoomCompleteChange(self.progress >= ZOOM_COMPLETE_AT)
          },
        },
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
            filter: reducedMotion ? "blur(0px)" : "blur(0px)",
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
            x: 0,
            scale: 1,
            transformOrigin: "left center",
          },
          {
            opacity: 0,
            x: reducedMotion ? 0 : -28,
            scale: reducedMotion ? 1 : 0.92,
            duration: COPY_FADE_DURATION,
            onUpdate: () => {
              const opacity = Number(gsap.getProperty(copy, "opacity"))
              copy.style.pointerEvents = opacity < 0.05 ? "none" : "auto"
            },
          },
          0
        )
      }

      timelineRef.current = timeline
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
      timelineRef.current = null
      ctx.revert()
    }
  }, [
    cameraRef,
    canvasRef,
    compositionRef,
    copyRef,
    iPadRef,
    l0Ref,
    l1Ref,
    onZoomCompleteChange,
    reducedMotion,
    svgRef,
    wrapperRef,
  ])

  return { scrollToIpad, setDebugProgress, releaseDebugProgress, progressRef }
}
