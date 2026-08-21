"use client"

import { useCallback, useLayoutEffect, useRef, type RefObject } from "react"
import type { ScrollTrigger } from "gsap/ScrollTrigger"
import { getLandingGsap } from "./gsap-client"
import { IPAD_CASE } from "./landing-artwork"
import {
  CROP_SCALE,
  HERO_COPY_BAND,
  HERO_SIDE_INSET,
  HERO_TOP_INSET,
  COPY_FADE_DURATION,
  COPY_FADE_START,
  ROOM_COMPLETE_AT,
  ROOM_FADE_DURATION,
  ROOM_FADE_START,
  ROOM_VEIL_OPACITY,
} from "./scene-constants"

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

const readCssLength = (raw: string, fallback: number) => {
  const probe = document.createElement("div")
  probe.style.cssText = `position:absolute;visibility:hidden;width:${raw}`
  document.body.append(probe)
  const width = probe.getBoundingClientRect().width
  probe.remove()
  return width > 0 ? width : fallback
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
  canvas: HTMLElement
) => {
  const { coverScale, panX, panY, viewBox } = layoutCoverCanvas(
    svg,
    composition,
    canvas
  )
  const width = composition.clientWidth
  const height = composition.clientHeight
  const iPadWidth = IPAD_CASE.width * coverScale
  const iPadHeight = IPAD_CASE.height * coverScale
  const iPadLeft = panX + (IPAD_CASE.x - viewBox.x) * coverScale
  const iPadTop = panY + (IPAD_CASE.y - viewBox.y) * coverScale

  const topInset = readCssLength(HERO_TOP_INSET, 16)
  const copyBand = readCssLength(HERO_COPY_BAND, 104)
  const availableWidth = width * (1 - HERO_SIDE_INSET * 2)
  const availableHeight = Math.max(80, height - topInset - copyBand)
  const desiredWidth = Math.min(
    availableWidth,
    availableHeight * (IPAD_CASE.width / IPAD_CASE.height)
  )
  const desiredHeight = desiredWidth * (IPAD_CASE.height / IPAD_CASE.width)
  const desiredTop =
    topInset + Math.max(0, (availableHeight - desiredHeight) / 2)
  const desiredLeft = (width - desiredWidth) / 2

  const targetScale = desiredWidth / iPadWidth
  const iPadCenterX = iPadLeft + iPadWidth / 2
  const iPadCenterY = iPadTop + iPadHeight / 2

  return {
    targetScale,
    targetX: desiredLeft + desiredWidth / 2 - targetScale * iPadCenterX,
    targetY: desiredTop + desiredHeight / 2 - targetScale * iPadCenterY,
  }
}

type UseIpadZoomArgs = {
  wrapperRef: RefObject<HTMLElement | null>
  compositionRef: RefObject<HTMLElement | null>
  cameraRef: RefObject<HTMLElement | null>
  canvasRef: RefObject<HTMLElement | null>
  veilRef: RefObject<HTMLElement | null>
  svgRef: RefObject<SVGSVGElement | null>
  iPadRef: RefObject<SVGGElement | null>
  copyRef: RefObject<HTMLElement | null>
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
  svgRef,
  iPadRef,
  copyRef,
  reducedMotion,
  onRoomCompleteChange,
  onSceneReady,
}: UseIpadZoomArgs) => {
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const triggerRef = useRef<ScrollTrigger | null>(null)
  const progressRef = useRef(0)
  const onRoomCompleteChangeRef = useRef(onRoomCompleteChange)
  onRoomCompleteChangeRef.current = onRoomCompleteChange
  const onSceneReadyRef = useRef(onSceneReady)
  onSceneReadyRef.current = onSceneReady

  const applyProgress = useCallback((progress: number) => {
    const clamped = clamp(progress, 0, 1)
    progressRef.current = clamped
    timelineRef.current?.progress(clamped)
    onRoomCompleteChangeRef.current(clamped >= ROOM_COMPLETE_AT)
  }, [])

  useLayoutEffect(() => {
    const { gsap, ScrollTrigger } = getLandingGsap()
    const wrapper = wrapperRef.current
    const composition = compositionRef.current
    const camera = cameraRef.current
    const canvas = canvasRef.current
    const veil = veilRef.current
    const svg = svgRef.current
    const iPad = iPadRef.current
    const copy = copyRef.current
    if (!wrapper || !composition || !camera || !canvas || !svg || !iPad) return

    const ctx = gsap.context(() => {
      const startCamera = () => framedIpadCamera(svg, composition, canvas)
      const start = startCamera()
      gsap.set(camera, {
        x: start.targetX,
        y: start.targetY,
        scale: start.targetScale,
        transformOrigin: "0 0",
      })

      const timeline = gsap.timeline({
        paused: true,
        defaults: { ease: "none" },
      })

      timeline.fromTo(
        camera,
        {
          x: () => startCamera().targetX,
          y: () => startCamera().targetY,
          scale: () => startCamera().targetScale,
          transformOrigin: "0 0",
        },
        {
          x: 0,
          y: 0,
          scale: 1,
          duration: 1,
        },
        0
      )

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
          startCamera()
          timeline.invalidate()
          applyProgress(self.progress)
        },
        onUpdate: (self) => {
          applyProgress(self.progress)
        },
      })

      triggerRef.current = trigger
      applyProgress(trigger.progress)
      ScrollTrigger.refresh()
    }, wrapper)

    const handleResize = () => {
      getLandingGsap().ScrollTrigger.refresh()
    }
    window.addEventListener("resize", handleResize)
    window.addEventListener("orientationchange", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("orientationchange", handleResize)
      timelineRef.current = null
      triggerRef.current = null
      ctx.revert()
    }
  }, [
    applyProgress,
    cameraRef,
    canvasRef,
    compositionRef,
    copyRef,
    iPadRef,
    reducedMotion,
    svgRef,
    veilRef,
    wrapperRef,
  ])

  return { progressRef }
}
