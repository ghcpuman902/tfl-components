"use client"

import { useCallback, useLayoutEffect, useRef, type RefObject } from "react"
import type { ScrollTrigger } from "gsap/ScrollTrigger"
import { getLandingGsap } from "./gsap-client"
import { IPAD_CASE } from "./landing-artwork"
import {
  CROP_SCALE,
  HERO_COPY_GAP,
  HERO_GROUP_BIAS,
  HERO_SIDE_INSET,
  HERO_TOP_INSET,
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
  canvas: HTMLElement,
  copySlot?: HTMLElement | null
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
  const copyGap = readCssLength(HERO_COPY_GAP, 20)
  const groupBias = readCssLength(HERO_GROUP_BIAS, 20)
  const measuredCopy = copySlot?.getBoundingClientRect().height ?? 0
  const copyBand = Math.max(measuredCopy, readCssLength("4.25rem", 68))
  const availableWidth = width * (1 - HERO_SIDE_INSET * 2)
  const maxIpadHeight = Math.max(80, height - topInset - copyGap - copyBand)
  const desiredWidth = Math.min(
    availableWidth,
    maxIpadHeight * (IPAD_CASE.width / IPAD_CASE.height)
  )
  const desiredHeight = desiredWidth * (IPAD_CASE.height / IPAD_CASE.width)
  const groupHeight = desiredHeight + copyGap + copyBand
  const desiredTop = Math.max(topInset, (height - groupHeight) / 2 - groupBias)
  const desiredLeft = (width - desiredWidth) / 2
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
    const letterbox = letterboxRef?.current
    const svg = svgRef.current
    const iPad = iPadRef.current
    const copy = copyRef.current
    const copySlot = copySlotRef.current
    if (!wrapper || !composition || !camera || !canvas || !svg || !iPad) return

    const ctx = gsap.context(() => {
      const startCamera = () => {
        const next = framedIpadCamera(svg, composition, canvas, copySlot)
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
      const start = startCamera()
      endCamera()
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
          x: () => startCamera().targetX,
          y: () => startCamera().targetY,
          scale: () => startCamera().targetScale,
          transformOrigin: "0 0",
        },
        {
          x: () => endCamera().targetX,
          y: () => endCamera().targetY,
          scale: () => endCamera().targetScale,
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
          startCamera()
          endCamera()
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
  }, [applyProgress, reducedMotion])

  return { progressRef }
}
