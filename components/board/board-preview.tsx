"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  IpadDeviceSvg,
  IphoneDeviceSvg,
  IPAD_ASPECT,
  IPHONE_ASPECT,
  ipadScreenInset,
  iphoneScreenInset,
} from "@/components/board/board-device-frame"
import {
  previewFrameForProfile,
  type BoardScreenProfile,
} from "@/lib/tfl/board-setup-state"
import { cn } from "@/lib/utils"

const MAX_HEIGHT_PX = 34 * 16
const MAX_HEIGHT_VH = 0.58
const COMPACT_HEIGHT_PX = 22 * 16
const COMPACT_HEIGHT_VH = 0.42

type BoardPreviewProps = {
  href: string
  hydrated: boolean
  hasKey: boolean
  onAddKey: () => void
  className?: string
  requireKeyOverlay?: boolean
  screenProfile?: BoardScreenProfile | null
  compact?: boolean
}

export const BoardPreview = ({
  href,
  hydrated,
  hasKey,
  onAddKey,
  className,
  requireKeyOverlay = true,
  screenProfile = "large",
  compact = false,
}: BoardPreviewProps) => {
  const profile = screenProfile ?? "large"
  const frame = previewFrameForProfile(profile)
  const isPhone = profile === "small"
  const aspect = isPhone ? IPHONE_ASPECT : IPAD_ASPECT
  const inset = isPhone ? iphoneScreenInset : ipadScreenInset
  const containerRef = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState({ width: 320, height: 200 })

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const update = () => {
      const availableWidth = element.clientWidth
      const maxHeight = compact
        ? Math.min(COMPACT_HEIGHT_PX, window.innerHeight * COMPACT_HEIGHT_VH)
        : Math.min(MAX_HEIGHT_PX, window.innerHeight * MAX_HEIGHT_VH)
      const width = Math.min(availableWidth, maxHeight * aspect)
      setBox({ width, height: width / aspect })
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    window.addEventListener("resize", update)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", update)
    }
  }, [aspect, compact])

  const screenWidth = box.width * inset.width
  const screenHeight = box.height * inset.height
  const scale = Math.min(screenWidth / frame.width, screenHeight / frame.height)

  return (
    <div
      ref={containerRef}
      className={cn("flex w-full justify-center", className)}
    >
      <div
        className="relative shrink-0 drop-shadow-md"
        style={{ width: box.width, height: box.height }}
      >
        {isPhone ? <IphoneDeviceSvg /> : <IpadDeviceSvg />}
        <div
          className="absolute overflow-hidden bg-background"
          style={{
            left: `${inset.left * 100}%`,
            top: `${inset.top * 100}%`,
            width: `${inset.width * 100}%`,
            height: `${inset.height * 100}%`,
            borderRadius: isPhone ? "1.15rem" : "1.35rem",
          }}
        >
          {hydrated ? (
            <div
              className="origin-top-left"
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
                className="h-full w-full border-0 bg-background"
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
          {isPhone ? (
            <div
              aria-hidden
              className="pointer-events-none absolute top-2 left-1/2 z-10 h-5 w-[28%] -translate-x-1/2 rounded-full bg-[#3d4f46]"
            />
          ) : null}
        </div>
      </div>
    </div>
  )
}
