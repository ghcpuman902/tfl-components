"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import { Button } from "@/components/ui/button"
import {
  IpadDeviceSvg,
  IphoneDeviceSvg,
  ipadCaseRounding,
  ipadScreenInset,
  iphoneCaseRounding,
  iphoneScreenInset,
} from "@/components/board/board-device-frame"
import {
  previewFrameForProfile,
  type BoardScreenProfile,
} from "@/lib/tfl/board-setup-state"
import { cn } from "@/lib/utils"

const SLOT_WIDE =
  "w-full max-w-[calc(min(42dvh,22rem)*125.7409/88.4773)] md:w-[min(calc(min(50dvh,26rem)*125.7409/88.4773),calc(100vw-26rem))] md:max-w-none"
const SLOT_NARROW =
  "w-full max-w-[calc(min(42dvh,22rem)*75/154)] md:w-[min(calc(min(50dvh,26rem)*75/154),calc(100vw-26rem))] md:max-w-none"
const SLOT_UNRESOLVED = cn(
  "w-full max-w-[calc(min(42dvh,22rem)*75/154)]",
  "md:w-[min(calc(min(50dvh,26rem)*125.7409/88.4773),calc(100vw-26rem))] md:max-w-none"
)

type BoardPreviewProps = {
  href: string
  hydrated: boolean
  hasKey: boolean
  onAddKey: () => void
  className?: string
  requireKeyOverlay?: boolean
  screenProfile?: BoardScreenProfile | null
}

export const BoardPreview = ({
  href,
  hydrated,
  hasKey,
  onAddKey,
  className,
  requireKeyOverlay = true,
  screenProfile = "large",
}: BoardPreviewProps) => {
  const profile = screenProfile
  const isPhone = profile === "small"
  const frame = profile ? previewFrameForProfile(profile) : null
  const inset = isPhone ? iphoneScreenInset : ipadScreenInset
  const caseRounding = isPhone ? iphoneCaseRounding : ipadCaseRounding
  const [reveal, setReveal] = useState(false)
  const screenRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useEffect(() => {
    if (!profile) {
      setReveal(false)
      return
    }
    setReveal(false)
    const id = window.requestAnimationFrame(() => setReveal(true))
    return () => window.cancelAnimationFrame(id)
  }, [profile])

  useEffect(() => {
    const element = screenRef.current
    if (!element || !frame) return
    const update = () => {
      const width = element.clientWidth
      const height = element.clientHeight
      if (width <= 0 || height <= 0) return
      setScale(Math.min(width / frame.width, height / frame.height))
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    return () => observer.disconnect()
  }, [frame?.width, frame?.height])

  return (
    <div className={cn("flex w-full justify-center md:w-auto", className)}>
      <div
        className={cn(
          "relative @container",
          profile === "small"
            ? SLOT_NARROW
            : profile === "large"
              ? SLOT_WIDE
              : SLOT_UNRESOLVED
        )}
        style={
          {
            "--preview-rounding-narrow": iphoneCaseRounding,
            "--preview-rounding-wide": ipadCaseRounding,
          } as CSSProperties
        }
      >
        <div
          aria-hidden
          className={cn(
            profile === "small"
              ? "aspect-75/154"
              : profile === "large"
                ? "aspect-[125.7409/88.4773]"
                : "aspect-75/154 md:aspect-[125.7409/88.4773]",
            "w-full bg-muted",
            !profile &&
              "rounded-(--preview-rounding-narrow) md:rounded-(--preview-rounding-wide)"
          )}
          style={profile ? { borderRadius: caseRounding } : undefined}
        />
        {profile && frame ? (
          <div
            className={cn(
              "absolute inset-0 drop-shadow-md transition-opacity duration-300 motion-reduce:transition-none motion-reduce:opacity-100",
              reveal ? "opacity-100" : "opacity-0"
            )}
          >
            {isPhone ? <IphoneDeviceSvg /> : <IpadDeviceSvg />}
            <div
              ref={screenRef}
              className="absolute overflow-hidden bg-background"
              style={{
                left: `${inset.left * 100}%`,
                top: `${inset.top * 100}%`,
                width: `${inset.width * 100}%`,
                height: `${inset.height * 100}%`,
                borderRadius: `calc(${inset.radius} * 100cqw)`,
              }}
            >
              {hydrated ? (
                <div
                  className="absolute top-0 left-0 origin-top-left"
                  style={{
                    width: frame.width,
                    height: frame.height,
                    transform: `scale(${scale})`,
                  }}
                >
                  <iframe
                    key={`${href}-${profile}`}
                    title="Board preview"
                    src={href}
                    className="h-full w-full overflow-auto border-0 bg-background [touch-action:pan-y]"
                  />
                </div>
              ) : (
                <div
                  className="size-full bg-muted"
                  aria-busy="true"
                  aria-label="Loading board preview"
                />
              )}
              {hydrated && !hasKey && requireKeyOverlay ? (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 p-4">
                  <Button type="button" onClick={onAddKey}>
                    Add TfL API key — stays in this browser
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
