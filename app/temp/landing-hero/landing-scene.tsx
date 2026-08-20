"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import { getLandingGsap } from "./gsap-client"
import { HeroCopyPanel } from "./hero-copy-panel"
import { IpadBoardFrame } from "./ipad-board-frame"
import { LandingArtwork } from "./landing-artwork"
import { MirrorPhotoLoop } from "./mirror-photo-loop"
import { LANDING_PAPER } from "@/app/temp/landing-palette/palette"
import { HERO_SCROLL_HEIGHT, PARALLAX_X } from "./scene-constants"
import { useIpadZoom } from "./use-ipad-zoom"
import { useParallaxInput } from "./use-parallax-input"

export const LandingScene = () => {
  const reducedMotion = usePrefersReducedMotion()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const compositionRef = useRef<HTMLDivElement>(null)
  const cameraRef = useRef<HTMLDivElement>(null)
  const copyRef = useRef<HTMLElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const l0Ref = useRef<SVGGElement>(null)
  const l1Ref = useRef<SVGGElement>(null)
  const l2Ref = useRef<SVGGElement>(null)
  const l3Ref = useRef<SVGGElement>(null)
  const iPadRef = useRef<SVGGElement>(null)
  const iPadHitRef = useRef<SVGRectElement>(null)

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

  const { scrollToIpad, setDebugProgress, releaseDebugProgress } = useIpadZoom({
    wrapperRef,
    compositionRef,
    cameraRef,
    svgRef,
    iPadRef,
    l0Ref,
    l1Ref,
    copyRef,
    reducedMotion,
    onZoomCompleteChange: handleZoomCompleteChange,
  })

  useEffect(() => {
    if (reducedMotion) return
    const { gsap } = getLandingGsap()
    const layers = [
      { el: l0Ref.current, amount: PARALLAX_X.l0 },
      { el: l1Ref.current, amount: PARALLAX_X.l1 },
      { el: l2Ref.current, amount: PARALLAX_X.l2 },
      { el: l3Ref.current, amount: PARALLAX_X.l3 },
    ]

    const setters = layers.flatMap((layer) => {
      if (!layer.el) return []
      return [
        {
          amount: layer.amount,
          to: gsap.quickTo(layer.el, "x", {
            duration: 0.45,
            ease: "power3.out",
          }),
        },
      ]
    })

    let frame = 0
    const tick = () => {
      const value = valueRef.current
      for (const setter of setters) setter.to(value * setter.amount)
      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [reducedMotion, valueRef])

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
        className="sticky z-0 overflow-hidden"
        data-landing-scheme="light"
        style={{
          top: "var(--site-header-height)",
          height: "calc(100dvh - var(--site-header-height))",
          background: LANDING_PAPER.light,
        }}
      >
        <div
          ref={compositionRef}
          className="absolute inset-x-0 top-0 overflow-hidden"
          style={{ height: "calc(100svh - var(--site-header-height))" }}
        >
          <div ref={cameraRef} className="size-full will-change-transform">
            <LandingArtwork
              svgRef={svgRef}
              l0Ref={l0Ref}
              l1Ref={l1Ref}
              l2Ref={l2Ref}
              l3Ref={l3Ref}
              iPadRef={iPadRef}
              iPadHitRef={iPadHitRef}
              iPadScreen={<IpadBoardFrame interactive={zoomComplete} />}
              pictureFrame1={
                <MirrorPhotoLoop startOffset={0} frozen={reducedMotion} />
              }
              pictureFrame2={
                <MirrorPhotoLoop startOffset={3} frozen={reducedMotion} />
              }
              onIpadClick={handleIpadClick}
              onIpadKeyDown={handleIpadKeyDown}
            />
          </div>

          <HeroCopyPanel copyRef={copyRef} />

          {overlayOpacity > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src="/images/landing/landing-reference.svg"
              alt=""
              aria-hidden
              className="pointer-events-none absolute inset-0 size-full object-contain"
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
