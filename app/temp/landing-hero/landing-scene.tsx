"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import { useDocumentVisible } from "@/hooks/use-document-visible"
import { LandingExampleObserver } from "@/components/landing/landing-example-observer"
import { LandingFoldCopy } from "@/components/landing/landing-fold-copy"
import {
  IpadDeviceSvg,
  IPAD_ASPECT,
  ipadCaseRounding,
  ipadScreenInset,
} from "@/components/board/board-device-frame"
import { IpadBoardFrame } from "./ipad-board-frame"
import {
  BOARD_CASE_HEIGHT,
  BOARD_CASE_WIDTH,
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
  HERO_COPY_BAND,
  HERO_TOP_INSET,
  IPAD_FRAME_ASPECT,
  IPAD_FRAME_WIDTH,
  PARALLAX_X,
  PHOTO_OVERLAY_WIDTH,
  ROOM_VEIL_OPACITY,
} from "./scene-constants"
import { syncOverlayToSvg } from "./sync-overlay"
import { useIpadZoom } from "./use-ipad-zoom"
import { useParallaxInput } from "./use-parallax-input"

const PHOTO_1_HEIGHT =
  PHOTO_OVERLAY_WIDTH * (PICTURE_FRAME_1.height / PICTURE_FRAME_1.width)
const PHOTO_2_HEIGHT =
  PHOTO_OVERLAY_WIDTH * (PICTURE_FRAME_2.height / PICTURE_FRAME_2.width)

const LAYER_SMOOTH = 0.16

type LandingSceneProps = {
  production?: boolean
  onCtaClick?: () => void
  onZoomComplete?: () => void
  onHeroInteraction?: () => void
  onExampleSeen?: () => void
  onExampleInteraction?: () => void
}

const LandingStaticRoom = () => {
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

  return (
    <section
      id="landing-room"
      className="relative w-full overflow-hidden"
      style={{ height: "calc(100dvh - var(--site-header-height))" }}
    >
      <div className="landing-hero-paper absolute inset-0" />
      <div className="absolute inset-0">
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
        />
      </div>
    </section>
  )
}

export const LandingScene = ({
  production = false,
  onZoomComplete,
  onHeroInteraction,
  onExampleSeen,
  onExampleInteraction,
}: LandingSceneProps = {}) => {
  const reducedMotion = usePrefersReducedMotion()
  const pageVisible = useDocumentVisible()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const compositionRef = useRef<HTMLDivElement>(null)
  const cameraRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const veilRef = useRef<HTMLDivElement>(null)
  const copyRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const l0Ref = useRef<SVGGElement>(null)
  const l1Ref = useRef<SVGGElement>(null)
  const l2Ref = useRef<SVGGElement>(null)
  const l3Ref = useRef<SVGGElement>(null)
  const iPadRef = useRef<SVGGElement>(null)
  const iPadHitRef = useRef<SVGRectElement>(null)
  const iPadCaseRef = useRef<SVGRectElement>(null)
  const iPadScreenRef = useRef<SVGRectElement>(null)
  const pictureMat1Ref = useRef<SVGRectElement>(null)
  const pictureMat2Ref = useRef<SVGRectElement>(null)
  const ipadOverlayRef = useRef<HTMLDivElement>(null)
  const photo1OverlayRef = useRef<HTMLDivElement>(null)
  const photo2OverlayRef = useRef<HTMLDivElement>(null)

  const [roomComplete, setRoomComplete] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)

  const handleRoomCompleteChange = useCallback((complete: boolean) => {
    setRoomComplete((current) => {
      if (current === complete) return current
      if (complete) onZoomComplete?.()
      return complete
    })
  }, [onZoomComplete])

  const handleSeeSpace = useCallback(() => {
    onHeroInteraction?.()
    if (reducedMotion) {
      document.getElementById("landing-room")?.scrollIntoView({
        behavior: "auto",
        block: "start",
      })
      return
    }
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const top =
      window.scrollY +
      wrapper.getBoundingClientRect().top +
      wrapper.offsetHeight -
      window.innerHeight
    window.scrollTo({ top: Math.max(0, top), behavior: "smooth" })
  }, [onHeroInteraction, reducedMotion])

  const { valueRef, requestTilt, showTiltButton } = useParallaxInput({
    stageRef,
    enabled: !reducedMotion && roomComplete,
    production,
  })

  const { progressRef } = useIpadZoom({
    wrapperRef,
    compositionRef,
    cameraRef,
    canvasRef,
    veilRef,
    svgRef,
    iPadRef,
    copyRef,
    reducedMotion,
    onRoomCompleteChange: handleRoomCompleteChange,
    onSceneReady: () => {
      setSceneReady(true)
    },
  })

  useEffect(() => {
    if (reducedMotion) return

    const layers = [
      { el: l0Ref.current, xAmount: PARALLAX_X.l0, x: 0, scale: 1 },
      { el: l1Ref.current, xAmount: PARALLAX_X.l1, x: 0, scale: 1 },
      { el: l2Ref.current, xAmount: PARALLAX_X.l2, x: 0, scale: 1 },
      { el: l3Ref.current, xAmount: PARALLAX_X.l3, x: 0, scale: 1 },
    ].filter((layer): layer is typeof layer & { el: SVGGElement } =>
      Boolean(layer.el)
    )

    for (const layer of layers) {
      layer.el.style.transformOrigin = "50% 50%"
      layer.el.style.transformBox = "fill-box"
    }

    let frame = 0
    const tick = () => {
      if (!pageVisible) {
        frame = window.requestAnimationFrame(tick)
        return
      }
      const pointer =
        roomComplete && production
          ? valueRef.current * 0.45
          : roomComplete
            ? valueRef.current
            : 0
      for (const layer of layers) {
        const targetX = pointer * layer.xAmount
        const targetScale = 1
        layer.x += (targetX - layer.x) * LAYER_SMOOTH
        layer.scale += (targetScale - layer.scale) * LAYER_SMOOTH
        layer.el.style.translate = `${layer.x}px`
        layer.el.style.scale = String(layer.scale)
      }

      const host = compositionRef.current
      if (host && sceneReady) {
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
          iPadCaseRef.current,
          host,
          BOARD_CASE_WIDTH,
          BOARD_CASE_HEIGHT
        )
      }

      frame = window.requestAnimationFrame(tick)
    }
    frame = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(frame)
  }, [
    pageVisible,
    production,
    reducedMotion,
    roomComplete,
    sceneReady,
    valueRef,
  ])

  useLayoutEffect(() => {
    if (!sceneReady) return
    const host = compositionRef.current
    if (!host) return
    syncOverlayToSvg(
      ipadOverlayRef.current,
      iPadCaseRef.current,
      host,
      BOARD_CASE_WIDTH,
      BOARD_CASE_HEIGHT
    )
  }, [sceneReady])

  const exampleInteracted = useRef(false)

  const heroCopy = (
    <LandingFoldCopy copyRef={copyRef} onContinue={handleSeeSpace} />
  )

  const landingVars = {
    "--landing-ipad-width": IPAD_FRAME_WIDTH,
    "--landing-ipad-top": `max(${HERO_TOP_INSET}, calc(${HERO_TOP_INSET} + (100dvh - var(--site-header-height) - ${HERO_COPY_BAND} - (var(--landing-ipad-width) / ${IPAD_FRAME_ASPECT})) / 2))`,
  } as CSSProperties

  if (reducedMotion) {
    return (
      <div className="landing-home w-full min-w-0" style={landingVars}>
        <section className="mx-auto flex min-h-[calc(100dvh-var(--site-header-height))] w-full flex-col justify-center px-4 pt-4 pb-10">
          <div
            className="relative mx-auto w-(--landing-ipad-width)"
            style={{ aspectRatio: IPAD_ASPECT }}
          >
            <IpadDeviceSvg showCable={false} />
            <div
              className="absolute overflow-hidden"
              style={{
                left: `${ipadScreenInset.left * 100}%`,
                top: `${ipadScreenInset.top * 100}%`,
                width: `${ipadScreenInset.width * 100}%`,
                height: `${ipadScreenInset.height * 100}%`,
                borderRadius: `${(ipadScreenInset.radius / ipadScreenInset.width) * 100}%`,
              }}
            >
              <IpadBoardFrame interactive={false} />
            </div>
          </div>
          <div className="mt-5">{heroCopy}</div>
        </section>
        <LandingStaticRoom />
      </div>
    )
  }

  return (
    <div
      className="landing-home relative w-full min-w-0 overflow-x-clip"
      style={landingVars}
    >
      <div
        ref={wrapperRef}
        className="relative w-full"
        style={{
          height: "calc(100dvh - var(--site-header-height) + 100svh)",
        }}
      >
        <div
          className="sticky z-10 h-0"
          style={{ top: "var(--site-header-height)" }}
        >
          <div
            ref={stageRef}
            className="pointer-events-none relative overflow-hidden"
            style={{
              height: "calc(100dvh - var(--site-header-height))",
              touchAction: production ? "pan-y pinch-zoom" : undefined,
            }}
            onPointerDown={() => {
              onHeroInteraction?.()
            }}
          >
            <div className="landing-hero-paper pointer-events-none absolute inset-0" />
            <div
              ref={compositionRef}
              className="absolute inset-x-0 top-0 overflow-hidden"
              style={{ height: "calc(100svh - var(--site-header-height))" }}
            >
              <div
                ref={cameraRef}
                className="relative size-full"
                style={{ visibility: sceneReady ? "visible" : "hidden" }}
              >
                <div ref={canvasRef} className="absolute top-0 left-0">
                  <LandingArtwork
                    svgRef={svgRef}
                    l0Ref={l0Ref}
                    l1Ref={l1Ref}
                    l2Ref={l2Ref}
                    l3Ref={l3Ref}
                    iPadRef={iPadRef}
                    iPadHitRef={iPadHitRef}
                    iPadCaseRef={iPadCaseRef}
                    iPadScreenRef={iPadScreenRef}
                    pictureMat1Ref={pictureMat1Ref}
                    pictureMat2Ref={pictureMat2Ref}
                    hideIpadSilhouette
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
                  frozen={!pageVisible}
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
                  frozen={!pageVisible}
                  intervalMs={5400}
                />
              </div>
              <div
                ref={veilRef}
                aria-hidden
                className="landing-hero-paper pointer-events-none absolute inset-0"
                style={{
                  opacity: ROOM_VEIL_OPACITY,
                  visibility: sceneReady ? "visible" : "hidden",
                }}
              />
              <div
                ref={ipadOverlayRef}
                id="landing-example-board"
                className="absolute overflow-hidden"
                style={{
                  top: "var(--landing-ipad-top)",
                  left: "50%",
                  width: "var(--landing-ipad-width)",
                  aspectRatio: IPAD_FRAME_ASPECT,
                  translate: "-50% 0",
                  borderRadius: ipadCaseRounding,
                  pointerEvents: roomComplete ? "auto" : "none",
                }}
                onPointerDown={() => {
                  if (!roomComplete || exampleInteracted.current) return
                  exampleInteracted.current = true
                  onExampleInteraction?.()
                }}
              >
                <IpadDeviceSvg showCable={false} />
                <div
                  className="absolute overflow-hidden"
                  style={{
                    left: `${ipadScreenInset.left * 100}%`,
                    top: `${ipadScreenInset.top * 100}%`,
                    width: `${ipadScreenInset.width * 100}%`,
                    height: `${ipadScreenInset.height * 100}%`,
                    borderRadius: `${(ipadScreenInset.radius / ipadScreenInset.width) * 100}%`,
                  }}
                >
                  <IpadBoardFrame interactive={roomComplete} />
                </div>
              </div>
              {production && roomComplete ? (
                <LandingExampleObserver
                  targetId="landing-example-board"
                  onSeen={() => onExampleSeen?.()}
                />
              ) : null}

              {showTiltButton && !production ? (
                <button
                  type="button"
                  data-landing-chrome
                  onClick={() => {
                    void requestTilt()
                  }}
                  className="pointer-events-auto absolute right-4 bottom-4 z-20 cursor-pointer rounded-full bg-black/55 px-3 py-1.5 text-xs text-white hover:bg-black/70 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
                >
                  Enable tilt
                </button>
              ) : null}
            </div>

            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 z-20"
              style={{
                height: HERO_COPY_BAND,
                visibility: roomComplete ? "hidden" : "visible",
              }}
            >
              <div className="flex size-full items-end justify-center pb-5">
                {heroCopy}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
