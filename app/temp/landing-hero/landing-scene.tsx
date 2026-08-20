"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import { HeroCopyPanel } from "./hero-copy-panel"
import { IpadBoardFrame } from "./ipad-board-frame"
import {
  BOARD_IFRAME_HEIGHT,
  BOARD_IFRAME_WIDTH,
  PICTURE_FRAME_1,
  PICTURE_FRAME_2,
  LandingArtwork,
} from "./landing-artwork"
import {
  HOME_HERO_LANDSCAPE_SLIDES,
  HOME_HERO_PORTRAIT_SLIDES,
} from "@/components/docs/home-hero-photos"
import { MirrorPhotoLoop } from "./mirror-photo-loop"
import {
  DOLLY_PARALLAX,
  DOLLY_SCALE,
  HERO_SCROLL_HEIGHT,
  PARALLAX_X,
  PHOTO_OVERLAY_WIDTH,
} from "./scene-constants"
import { syncOverlayToSvg } from "./sync-overlay"
import { useIpadZoom } from "./use-ipad-zoom"
import { useParallaxInput } from "./use-parallax-input"

const PHOTO_1_HEIGHT =
  PHOTO_OVERLAY_WIDTH * (PICTURE_FRAME_1.height / PICTURE_FRAME_1.width)
const PHOTO_2_HEIGHT =
  PHOTO_OVERLAY_WIDTH * (PICTURE_FRAME_2.height / PICTURE_FRAME_2.width)

const LAYER_SMOOTH = 0.16

export const LandingScene = () => {
  const reducedMotion = usePrefersReducedMotion()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const compositionRef = useRef<HTMLDivElement>(null)
  const cameraRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const copyRef = useRef<HTMLElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const l0Ref = useRef<SVGGElement>(null)
  const l1Ref = useRef<SVGGElement>(null)
  const l2Ref = useRef<SVGGElement>(null)
  const l3Ref = useRef<SVGGElement>(null)
  const iPadRef = useRef<SVGGElement>(null)
  const iPadHitRef = useRef<SVGRectElement>(null)
  const iPadScreenRef = useRef<SVGRectElement>(null)
  const pictureMat1Ref = useRef<SVGRectElement>(null)
  const pictureMat2Ref = useRef<SVGRectElement>(null)
  const ipadOverlayRef = useRef<HTMLDivElement>(null)
  const photo1OverlayRef = useRef<HTMLDivElement>(null)
  const photo2OverlayRef = useRef<HTMLDivElement>(null)

  const [zoomComplete, setZoomComplete] = useState(false)
  const [debugOpen, setDebugOpen] = useState(false)
  const [overlayOpacity, setOverlayOpacity] = useState(0)
  const [debugProgress, setDebugProgressValue] = useState(0)

  const handleZoomCompleteChange = useCallback((complete: boolean) => {
    setZoomComplete((current) => (current === complete ? current : complete))
  }, [])

  const { valueRef, requestTilt, showTiltButton } = useParallaxInput({
    stageRef,
    enabled: !reducedMotion,
  })

  const { scrollToIpad, setDebugProgress, releaseDebugProgress, progressRef } =
    useIpadZoom({
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
      onZoomCompleteChange: handleZoomCompleteChange,
    })

  useEffect(() => {
    const layers = [
      {
        el: l0Ref.current,
        xAmount: PARALLAX_X.l0,
        dollyX: DOLLY_PARALLAX.l0,
        dollyScale: DOLLY_SCALE.l0,
        x: 0,
        scale: 1,
      },
      {
        el: l1Ref.current,
        xAmount: PARALLAX_X.l1,
        dollyX: DOLLY_PARALLAX.l1,
        dollyScale: DOLLY_SCALE.l1,
        x: 0,
        scale: 1,
      },
      {
        el: l2Ref.current,
        xAmount: PARALLAX_X.l2,
        dollyX: DOLLY_PARALLAX.l2,
        dollyScale: DOLLY_SCALE.l2,
        x: 0,
        scale: 1,
      },
      {
        el: l3Ref.current,
        xAmount: PARALLAX_X.l3,
        dollyX: DOLLY_PARALLAX.l3,
        dollyScale: DOLLY_SCALE.l3,
        x: 0,
        scale: 1,
      },
    ].filter((layer): layer is typeof layer & { el: SVGGElement } =>
      Boolean(layer.el)
    )

    for (const layer of layers) {
      layer.el.style.transformOrigin = "50% 50%"
      layer.el.style.transformBox = "fill-box"
    }

    let frame = 0
    const tick = () => {
      const pointer = reducedMotion ? 0 : valueRef.current
      const dolly = reducedMotion ? 0 : progressRef.current
      for (const layer of layers) {
        const targetX = pointer * layer.xAmount + dolly * layer.dollyX
        const targetScale = 1 + dolly * layer.dollyScale
        layer.x += (targetX - layer.x) * LAYER_SMOOTH
        layer.scale += (targetScale - layer.scale) * LAYER_SMOOTH
        layer.el.style.translate = `${layer.x}px`
        layer.el.style.scale = String(layer.scale)
      }

      const host = compositionRef.current
      if (host) {
        syncOverlayToSvg(
          photo1OverlayRef.current,
          pictureMat1Ref.current,
          host,
          PHOTO_OVERLAY_WIDTH,
          PHOTO_1_HEIGHT
        )
        syncOverlayToSvg(
          photo2OverlayRef.current,
          pictureMat2Ref.current,
          host,
          PHOTO_OVERLAY_WIDTH,
          PHOTO_2_HEIGHT
        )
        syncOverlayToSvg(
          ipadOverlayRef.current,
          iPadScreenRef.current,
          host,
          BOARD_IFRAME_WIDTH,
          BOARD_IFRAME_HEIGHT
        )
      }

      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [progressRef, reducedMotion, valueRef])

  useEffect(() => {
    const hit = iPadHitRef.current
    if (!hit) return
    hit.style.pointerEvents = zoomComplete ? "none" : "auto"
    hit.setAttribute("aria-hidden", zoomComplete ? "true" : "false")
    if (zoomComplete) hit.blur()
  }, [zoomComplete])

  useEffect(() => {
    const handleKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "d" && event.key !== "D") return
      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return
      }
      setDebugOpen((current) => !current)
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const handleIpadClick = () => {
    if (zoomComplete) return
    scrollToIpad()
  }

  const handleIpadKeyDown = (event: KeyboardEvent<SVGRectElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return
    event.preventDefault()
    handleIpadClick()
  }

  const handleDebugProgress = (value: number) => {
    setDebugProgressValue(value)
    setDebugProgress(value)
  }

  return (
    <div
      ref={wrapperRef}
      className="relative w-full"
      style={{ height: HERO_SCROLL_HEIGHT }}
    >
      <div
        ref={stageRef}
        className="landing-hero-paper sticky z-0 overflow-hidden"
        style={{
          top: "var(--site-header-height)",
          height: "calc(100dvh - var(--site-header-height))",
        }}
      >
        <div
          ref={compositionRef}
          className="absolute inset-x-0 top-0 overflow-hidden"
          style={{ height: "calc(100svh - var(--site-header-height))" }}
        >
          <div ref={cameraRef} className="relative size-full">
            <div ref={canvasRef} className="absolute top-0 left-0">
              <LandingArtwork
                svgRef={svgRef}
                l0Ref={l0Ref}
                l1Ref={l1Ref}
                l2Ref={l2Ref}
                l3Ref={l3Ref}
                iPadRef={iPadRef}
                iPadHitRef={iPadHitRef}
                iPadScreenRef={iPadScreenRef}
                pictureMat1Ref={pictureMat1Ref}
                pictureMat2Ref={pictureMat2Ref}
                onIpadClick={handleIpadClick}
                onIpadKeyDown={handleIpadKeyDown}
              />
            </div>
          </div>

          <div
            ref={photo1OverlayRef}
            aria-hidden
            className="pointer-events-none absolute top-0 left-0 overflow-hidden"
            style={{ visibility: "hidden" }}
          >
            <MirrorPhotoLoop
              slides={HOME_HERO_PORTRAIT_SLIDES}
              frozen={reducedMotion}
              intervalMs={4200}
            />
          </div>
          <div
            ref={photo2OverlayRef}
            aria-hidden
            className="pointer-events-none absolute top-0 left-0 overflow-hidden"
            style={{ visibility: "hidden" }}
          >
            <MirrorPhotoLoop
              slides={HOME_HERO_LANDSCAPE_SLIDES}
              frozen={reducedMotion}
              intervalMs={5400}
            />
          </div>
          <div
            ref={ipadOverlayRef}
            className="absolute top-0 left-0"
            style={{
              pointerEvents: zoomComplete ? "auto" : "none",
              visibility: "hidden",
            }}
          >
            <IpadBoardFrame interactive={zoomComplete} />
          </div>

          <HeroCopyPanel copyRef={copyRef} />

          {overlayOpacity > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/images/landing/landing-reference.svg"
              alt=""
              aria-hidden
              className="pointer-events-none absolute inset-0 size-full object-cover"
              style={{ opacity: overlayOpacity }}
            />
          ) : null}

          {showTiltButton ? (
            <button
              type="button"
              onClick={() => {
                void requestTilt()
              }}
              className="absolute right-4 bottom-4 z-20 rounded-full bg-black/55 px-3 py-1.5 text-xs text-white hover:bg-black/70 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
            >
              Enable tilt
            </button>
          ) : null}
        </div>

        {debugOpen ? (
          <div className="absolute right-3 bottom-3 z-30 flex max-w-xs flex-col gap-2 rounded-md bg-black/70 p-3 text-xs text-white">
            <p className="font-medium">Landing debug (D)</p>
            <label className="flex items-center gap-2">
              Overlay
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={overlayOpacity}
                onChange={(event) =>
                  setOverlayOpacity(Number(event.target.value))
                }
              />
            </label>
            <label className="flex items-center gap-2">
              Camera
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={debugProgress}
                onChange={(event) =>
                  handleDebugProgress(Number(event.target.value))
                }
              />
            </label>
            <button
              type="button"
              className="self-start underline"
              onClick={() => {
                releaseDebugProgress()
                setDebugProgressValue(0)
              }}
            >
              Resume scroll
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
