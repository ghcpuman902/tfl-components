"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react"
import dynamic from "next/dynamic"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import { useDocumentVisible } from "@/hooks/use-document-visible"
import { LandingExampleObserver } from "@/components/landing/landing-example-observer"
import { LandingFoldCopy } from "@/components/landing/landing-fold-copy"
import { LandingRoomChat } from "@/components/landing/landing-room-chat"
import {
  hasLandingSpaceHash,
  landingRoomScrollTop,
  landingUrlWithoutHash,
  landingUrlWithSpaceHash,
} from "@/lib/landing/space-hash"
import {
  IpadDeviceSvg,
  IPAD_ASPECT,
  ipadCaseRounding,
  ipadHomeInset,
  ipadScreenInset,
  ipadScreenRounding,
} from "@/components/board/board-device-frame"
import {
  LANDING_BOARD_PRESETS,
  landingBoardPresetAt,
  nextLandingBoardHint,
  type LandingBoardIndexes,
} from "@/lib/tfl/landing-board"
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
  DOLLY_PARALLAX,
  DOLLY_SCALE,
  DOLLY_Y,
  HERO_COPY_BAND,
  HERO_COPY_GAP,
  HERO_GROUP_BIAS,
  HERO_TOP_INSET,
  IPAD_FRAME_ASPECT,
  IPAD_FRAME_WIDTH,
  PARALLAX_X,
  PARALLAX_Y,
  PHOTO_OVERLAY_WIDTH,
  ROOM_VEIL_OPACITY,
} from "./scene-constants"
import { syncBoxToSvg, syncOverlayToSvg } from "./sync-overlay"
import { useIpadZoom } from "./use-ipad-zoom"
import { useParallaxInput } from "./use-parallax-input"

const PHOTO_1_HEIGHT =
  PHOTO_OVERLAY_WIDTH * (PICTURE_FRAME_1.height / PICTURE_FRAME_1.width)
const PHOTO_2_HEIGHT =
  PHOTO_OVERLAY_WIDTH * (PICTURE_FRAME_2.height / PICTURE_FRAME_2.width)

const IpadBoardFrame = dynamic(
  () => import("./ipad-board-frame").then((mod) => mod.IpadBoardFrame),
  {
    ssr: true,
    loading: () => <div className="size-full bg-background" aria-hidden />,
  }
)

const LandingIpadHomeButton = ({
  hint,
  onClick,
}: {
  hint: string
  onClick: () => void
}) => (
  <button
    type="button"
    data-landing-chrome
    title={hint}
    aria-label={hint}
    onClick={onClick}
    className="absolute z-10 rounded-full bg-transparent focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
    style={{
      left: `${ipadHomeInset.left * 100}%`,
      top: `${ipadHomeInset.top * 100}%`,
      width: `${ipadHomeInset.width * 100}%`,
      height: `${ipadHomeInset.height * 100}%`,
    }}
  />
)

const LAYER_SMOOTH = 0.16
const POINTER_REST = { x: 0, y: 0 }

type LandingSceneProps = {
  production?: boolean
  board: LandingBoardIndexes
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
  const lampRef = useRef<SVGGElement>(null)
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
      className="relative flex w-full flex-col overflow-hidden"
      style={{ height: "calc(100dvh - var(--site-header-height))" }}
    >
      <div className="landing-hero-paper absolute inset-0" />
      <div className="absolute inset-0">
        <LandingArtwork
          svgRef={svgRef}
          l0Ref={l0Ref}
          l1Ref={l1Ref}
          lampRef={lampRef}
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
  board,
  onCtaClick,
  onZoomComplete,
  onHeroInteraction,
  onExampleSeen,
  onExampleInteraction,
}: LandingSceneProps) => {
  const reducedMotion = usePrefersReducedMotion()
  const pageVisible = useDocumentVisible()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const compositionRef = useRef<HTMLDivElement>(null)
  const cameraRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const veilRef = useRef<HTMLDivElement>(null)
  const letterboxRef = useRef<HTMLDivElement>(null)
  const copyRef = useRef<HTMLDivElement>(null)
  const copySlotRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const l0Ref = useRef<SVGGElement>(null)
  const l1Ref = useRef<SVGGElement>(null)
  const lampRef = useRef<SVGGElement>(null)
  const l2Ref = useRef<SVGGElement>(null)
  const l3Ref = useRef<SVGGElement>(null)
  const iPadRef = useRef<SVGGElement>(null)
  const iPadHitRef = useRef<SVGRectElement>(null)
  const iPadCaseRef = useRef<SVGRectElement>(null)
  const iPadScreenRef = useRef<SVGRectElement>(null)
  const pictureMat1Ref = useRef<SVGRectElement>(null)
  const pictureMat2Ref = useRef<SVGRectElement>(null)
  const mirrorGlassRef = useRef<SVGRectElement>(null)
  const ipadOverlayRef = useRef<HTMLDivElement>(null)
  const mirrorClipRef = useRef<HTMLDivElement>(null)
  const photo1OverlayRef = useRef<HTMLDivElement>(null)
  const photo2OverlayRef = useRef<HTMLDivElement>(null)

  const [roomComplete, setRoomComplete] = useState(false)
  const [sceneReady, setSceneReady] = useState(false)
  const [skipIntro, setSkipIntro] = useState(false)
  const [holdChat, setHoldChat] = useState(false)
  const [chatKey, setChatKey] = useState(0)
  const [journeyIndex, setJourneyIndex] = useState(0)

  const scrollToRoom = useCallback((behavior: ScrollBehavior) => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    const top = landingRoomScrollTop({
      wrapperTop: wrapper.getBoundingClientRect().top,
      wrapperHeight: wrapper.offsetHeight,
      scrollY: window.scrollY,
      viewportHeight: window.innerHeight,
    })
    window.scrollTo({ top, behavior })
  }, [])

  const writeSpaceHash = useCallback((present: boolean) => {
    const next = present
      ? landingUrlWithSpaceHash(window.location.pathname, window.location.search)
      : landingUrlWithoutHash(window.location.pathname, window.location.search)
    const current = `${window.location.pathname}${window.location.search}${window.location.hash}`
    if (current === next) return
    window.history.replaceState(null, "", next)
  }, [])

  useLayoutEffect(() => {
    const previousRestoration = window.history.scrollRestoration
    window.history.scrollRestoration = "manual"
    const hashed = hasLandingSpaceHash(window.location.hash)
    setSkipIntro(hashed)
    if (hashed) {
      scrollToRoom("auto")
    } else {
      window.scrollTo(0, 0)
    }
    return () => {
      window.history.scrollRestoration = previousRestoration
    }
  }, [scrollToRoom])

  useLayoutEffect(() => {
    if (!skipIntro || !sceneReady) return
    const snap = () => scrollToRoom("auto")
    snap()
    const frame = window.requestAnimationFrame(snap)
    const later = window.setTimeout(snap, 120)
    return () => {
      window.cancelAnimationFrame(frame)
      window.clearTimeout(later)
    }
  }, [sceneReady, scrollToRoom, skipIntro])

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
    scrollToRoom("smooth")
  }, [onHeroInteraction, reducedMotion, scrollToRoom])

  const handleStoryComplete = useCallback(() => {
    writeSpaceHash(true)
  }, [writeSpaceHash])

  const handleRestartIntro = useCallback(() => {
    setSkipIntro(false)
    setHoldChat(true)
    setChatKey((current) => current + 1)
    writeSpaceHash(false)
    window.scrollTo({
      top: 0,
      behavior: reducedMotion ? "auto" : "smooth",
    })
  }, [reducedMotion, writeSpaceHash])

  useEffect(() => {
    if (roomComplete) return
    setHoldChat(false)
  }, [roomComplete])

  const { valueRef, requestTilt, showMotionUnlock } = useParallaxInput({
    stageRef,
    enabled: !reducedMotion && roomComplete,
  })

  const { progressRef } = useIpadZoom({
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
    onRoomCompleteChange: handleRoomCompleteChange,
    onSceneReady: () => {
      setSceneReady(true)
    },
  })

  useEffect(() => {
    if (reducedMotion) return

    const layers = [
      {
        el: l0Ref.current,
        xAmount: PARALLAX_X.l0,
        yAmount: PARALLAX_Y.l0,
        dollyX: DOLLY_PARALLAX.l0,
        dollyY: DOLLY_Y.l0,
        dollyScale: DOLLY_SCALE.l0,
        x: 0,
        y: 0,
        scale: 1,
      },
      {
        el: l1Ref.current,
        xAmount: PARALLAX_X.l1,
        yAmount: PARALLAX_Y.l1,
        dollyX: DOLLY_PARALLAX.l1,
        dollyY: DOLLY_Y.l1,
        dollyScale: DOLLY_SCALE.l1,
        x: 0,
        y: 0,
        scale: 1,
      },
      {
        el: lampRef.current,
        xAmount: PARALLAX_X.lamp,
        yAmount: PARALLAX_Y.lamp,
        dollyX: DOLLY_PARALLAX.lamp,
        dollyY: DOLLY_Y.lamp,
        dollyScale: DOLLY_SCALE.lamp,
        x: 0,
        y: 0,
        scale: 1,
      },
      {
        el: l2Ref.current,
        xAmount: PARALLAX_X.l2,
        yAmount: PARALLAX_Y.l2,
        dollyX: DOLLY_PARALLAX.l2,
        dollyY: DOLLY_Y.l2,
        dollyScale: DOLLY_SCALE.l2,
        x: 0,
        y: 0,
        scale: 1,
      },
      {
        el: l3Ref.current,
        xAmount: PARALLAX_X.l3,
        yAmount: PARALLAX_Y.l3,
        dollyX: DOLLY_PARALLAX.l3,
        dollyY: DOLLY_Y.l3,
        dollyScale: DOLLY_SCALE.l3,
        x: 0,
        y: 0,
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
      if (!pageVisible) {
        frame = window.requestAnimationFrame(tick)
        return
      }
      const pointer = roomComplete ? valueRef.current : POINTER_REST
      const dolly = Math.sin(progressRef.current * Math.PI)
      for (const layer of layers) {
        const targetX = pointer.x * layer.xAmount + dolly * layer.dollyX
        const targetY = pointer.y * layer.yAmount + dolly * layer.dollyY
        const targetScale = 1 + dolly * layer.dollyScale
        layer.x += (targetX - layer.x) * LAYER_SMOOTH
        layer.y += (targetY - layer.y) * LAYER_SMOOTH
        layer.scale += (targetScale - layer.scale) * LAYER_SMOOTH
        layer.el.style.translate = `${layer.x}px ${layer.y}px`
        layer.el.style.scale = String(layer.scale)
      }

      const host = compositionRef.current
      if (host && sceneReady) {
        const clip = mirrorClipRef.current
        syncBoxToSvg(clip, mirrorGlassRef.current, host)
        if (clip) {
          syncOverlayToSvg(
            photo1OverlayRef.current,
            pictureMat1Ref.current,
            clip,
            PHOTO_OVERLAY_WIDTH,
            PHOTO_1_HEIGHT
          )
          syncOverlayToSvg(
            photo2OverlayRef.current,
            pictureMat2Ref.current,
            clip,
            PHOTO_OVERLAY_WIDTH,
            PHOTO_2_HEIGHT
          )
        }
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
    progressRef,
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
  const landingJourney = landingBoardPresetAt(journeyIndex)
  const landingJourneyHint = nextLandingBoardHint(journeyIndex)
  const handleNextLandingJourney = () => {
    setJourneyIndex((index) => (index + 1) % LANDING_BOARD_PRESETS.length)
  }

  const heroCopy = (
    <LandingFoldCopy copyRef={copyRef} onContinue={handleSeeSpace} />
  )

  const landingVars = {
    "--landing-ipad-width": IPAD_FRAME_WIDTH,
    "--landing-ipad-top": `max(${HERO_TOP_INSET}, calc((100dvh - var(--site-header-height) - (var(--landing-ipad-width) / ${IPAD_FRAME_ASPECT}) - ${HERO_COPY_GAP} - ${HERO_COPY_BAND}) / 2 - ${HERO_GROUP_BIAS}))`,
    "--landing-copy-top": `calc(var(--landing-ipad-top) + var(--landing-ipad-width) / ${IPAD_FRAME_ASPECT} + ${HERO_COPY_GAP})`,
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
                borderRadius: ipadScreenRounding,
              }}
            >
              <IpadBoardFrame
                key={landingJourney.id}
                interactive={false}
                board={board}
                previewConfig={landingJourney.config}
              />
            </div>
            <LandingIpadHomeButton
              hint={landingJourneyHint}
              onClick={handleNextLandingJourney}
            />
          </div>
          <div className="mt-5">{heroCopy}</div>
        </section>
        <LandingStaticRoom />
      </div>
    )
  }

  return (
    <div
      className="landing-home relative w-full min-w-0"
      style={landingVars}
    >
      <div
        ref={wrapperRef}
        className="relative w-full"
        style={{
          height: "calc(200dvh - var(--site-header-height))",
        }}
      >
        <div
          id="space"
          aria-hidden
          className="pointer-events-none absolute left-0 h-px w-px"
          style={{
            top: "calc(100dvh - var(--site-header-height) + var(--site-hash-scroll-margin))",
          }}
        />
        <div
          className="sticky z-10"
          style={{
            top: "var(--site-header-height)",
            height: "calc(100dvh - var(--site-header-height))",
          }}
        >
          <div
            ref={stageRef}
            className="pointer-events-none relative h-full overflow-hidden"
            style={{
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
              style={{ height: "calc(100dvh - var(--site-header-height))" }}
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
                    lampRef={lampRef}
                    l2Ref={l2Ref}
                    l3Ref={l3Ref}
                    iPadRef={iPadRef}
                    iPadHitRef={iPadHitRef}
                    iPadCaseRef={iPadCaseRef}
                    iPadScreenRef={iPadScreenRef}
                    pictureMat1Ref={pictureMat1Ref}
                    pictureMat2Ref={pictureMat2Ref}
                    mirrorGlassRef={mirrorGlassRef}
                    hideIpadSilhouette
                  />
                </div>
              </div>

              <div
                ref={mirrorClipRef}
                aria-hidden
                className="pointer-events-none absolute overflow-hidden"
                style={{ visibility: "hidden" }}
              >
                <div
                  ref={photo1OverlayRef}
                  className="absolute top-0 left-0 overflow-hidden"
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
                  className="absolute top-0 left-0 overflow-hidden"
                  style={{ visibility: "hidden" }}
                >
                  <MirrorPhotoLoop
                    slides={HOME_HERO_LANDSCAPE_SLIDES}
                    frozen={!pageVisible}
                    intervalMs={5400}
                  />
                </div>
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
                ref={letterboxRef}
                aria-hidden
                className="landing-hero-wall-fill pointer-events-none absolute inset-x-0 top-0 origin-top"
                style={{ height: 0 }}
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
                    borderRadius: ipadScreenRounding,
                  }}
                >
                  <IpadBoardFrame
                    key={landingJourney.id}
                    interactive={roomComplete}
                    board={board}
                    previewConfig={landingJourney.config}
                  />
                </div>
                <LandingIpadHomeButton
                  hint={landingJourneyHint}
                  onClick={handleNextLandingJourney}
                />
              </div>
              {production && roomComplete ? (
                <LandingExampleObserver
                  targetId="landing-example-board"
                  onSeen={() => onExampleSeen?.()}
                />
              ) : null}

              <LandingRoomChat
                key={chatKey}
                active={roomComplete && !holdChat}
                skipIntro={skipIntro}
                onBoardClick={onCtaClick}
                onStoryComplete={handleStoryComplete}
                onRestart={handleRestartIntro}
              />

              {showMotionUnlock ? (
                <button
                  type="button"
                  data-landing-chrome
                  onClick={() => {
                    onHeroInteraction?.()
                    void requestTilt()
                  }}
                  className="pointer-events-auto absolute right-4 bottom-4 z-20 inline-flex items-center text-[clamp(0.9375rem,0.85rem+0.3vw,1rem)] text-foreground underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:outline-none"
                >
                  Unlock motion
                </button>
              ) : null}
            </div>

            <div
              ref={copySlotRef}
              className="pointer-events-none absolute inset-x-0 z-20"
              style={{
                top: "var(--landing-copy-top)",
                visibility: roomComplete ? "hidden" : "visible",
              }}
            >
              {heroCopy}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
