"use client"

import { useCallback, useEffect, useRef, type RefObject } from "react"
import gsap from "gsap"
import { getLandingGsap } from "./gsap-client"
import {
  COPY_FADE_DURATION,
  CROP_SCALE,
  DEFOCUS,
  IPAD_PADDING_FRACTION,
  ZOOM_COMPLETE_AT,
} from "./scene-constants"

type Point = { x: number; y: number; scale: number }

const mapSvgPointToComposition = (
  svg: SVGSVGElement,
  composition: HTMLElement,
  x: number,
  y: number
): Point => {
  const viewBox = svg.viewBox.baseVal
  const width = composition.clientWidth
  const height = composition.clientHeight
  const scale = Math.min(width / viewBox.width, height / viewBox.height)
  const offsetX = (width - viewBox.width * scale) / 2
  const offsetY = (height - viewBox.height * scale) / 2
  return {
    x: offsetX + (x - viewBox.x) * scale,
    y: offsetY + (y - viewBox.y) * scale,
    scale,
  }
}

const readCameraTargets = (
  svg: SVGSVGElement,
  iPad: SVGGElement,
  composition: HTMLElement
) => {
  const width = composition.clientWidth
  const height = composition.clientHeight
  const bbox = iPad.getBBox()
  const topLeft = mapSvgPointToComposition(svg, composition, bbox.x, bbox.y)
  const iPadWidth = bbox.width * topLeft.scale
  const iPadHeight = bbox.height * topLeft.scale
  const iPadCenterX = topLeft.x + iPadWidth / 2
  const iPadCenterY = topLeft.y + iPadHeight / 2

  const cropScale = CROP_SCALE
  const cropX = (width / 2) * (1 - cropScale)
  const cropY = (height / 2) * (1 - cropScale)

  const paddedWidth = width * (1 - IPAD_PADDING_FRACTION)
  const paddedHeight = height * (1 - IPAD_PADDING_FRACTION)
  const targetScale = Math.min(
    paddedWidth / iPadWidth,
    paddedHeight / iPadHeight
  )
  const targetX = width / 2 - targetScale * iPadCenterX
  const targetY = height / 2 - targetScale * iPadCenterY

  return { cropScale, cropX, cropY, targetScale, targetX, targetY }
}

type UseIpadZoomArgs = {
  wrapperRef: RefObject<HTMLElement | null>
  compositionRef: RefObject<HTMLElement | null>
  cameraRef: RefObject<HTMLElement | null>
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

  useEffect(() => {
    const { gsap, ScrollTrigger } = getLandingGsap()
    const wrapper = wrapperRef.current
    const composition = compositionRef.current
    const camera = cameraRef.current
    const svg = svgRef.current
    const iPad = iPadRef.current
    const l0 = l0Ref.current
    const l1 = l1Ref.current
    const copy = copyRef.current
    if (!wrapper || !composition || !camera || !svg || !iPad) return

    const ctx = gsap.context(() => {
      const targets = () => readCameraTargets(svg, iPad, composition)
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
          onUpdate: (self) => {
            if (debugHeldRef.current) return
            onZoomCompleteChange(self.progress >= ZOOM_COMPLETE_AT)
          },
        },
      })

      timeline.fromTo(
        camera,
        {
          x: () => targets().cropX,
          y: () => targets().cropY,
          scale: () => targets().cropScale,
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

  return { scrollToIpad, setDebugProgress, releaseDebugProgress }
}
