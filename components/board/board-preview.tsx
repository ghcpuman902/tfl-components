"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const LANDSCAPE = { width: 1180, height: 820 } as const
const PORTRAIT = { width: 390, height: 844 } as const
const MAX_HEIGHT_PX = 36 * 16
const MAX_HEIGHT_VH = 0.68
const PHONE_PAD_X = 10
const PHONE_PAD_TOP = 10
const PHONE_PAD_BOTTOM = 22

type BoardPreviewOrientation = "landscape" | "portrait"

type BoardPreviewProps = {
  href: string
  hydrated: boolean
  hasKey: boolean
  onAddKey: () => void
  className?: string
  /** Current builder blocks the iframe until a key exists. Staged uses a badge. */
  requireKeyOverlay?: boolean
  exampleLabel?: string
}

export const BoardPreview = ({
  href,
  hydrated,
  hasKey,
  onAddKey,
  className,
  requireKeyOverlay = true,
  exampleLabel,
}: BoardPreviewProps) => {
  const [orientation, setOrientation] =
    useState<BoardPreviewOrientation>("landscape")
  const frame = orientation === "landscape" ? LANDSCAPE : PORTRAIT
  const containerRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0.5)
  const isPortrait = orientation === "portrait"
  const chromeX = isPortrait ? PHONE_PAD_X * 2 : 0
  const chromeY = isPortrait ? PHONE_PAD_TOP + PHONE_PAD_BOTTOM : 0

  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const update = () => {
      const width = element.clientWidth
      const maxHeight = Math.min(MAX_HEIGHT_PX, window.innerHeight * MAX_HEIGHT_VH)
      setScale(
        Math.min(
          Math.max(width - chromeX, 1) / frame.width,
          Math.max(maxHeight - chromeY, 1) / frame.height,
          1
        )
      )
    }

    update()
    const observer = new ResizeObserver(update)
    observer.observe(element)
    window.addEventListener("resize", update)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", update)
    }
  }, [chromeX, chromeY, frame.height, frame.width])

  const screenWidth = frame.width * scale
  const screenHeight = frame.height * scale

  return (
    <section
      className={cn("space-y-2", className)}
      aria-labelledby="board-preview-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="board-preview-heading" className="text-lg font-semibold">
          Preview
        </h2>
        {exampleLabel ? (
          <p className="text-sm text-muted-foreground">{exampleLabel}</p>
        ) : null}
        <div className="flex gap-1">
          <Button
            type="button"
            size="sm"
            variant={orientation === "landscape" ? "default" : "outline"}
            aria-pressed={orientation === "landscape"}
            onClick={() => setOrientation("landscape")}
          >
            Landscape
          </Button>
          <Button
            type="button"
            size="sm"
            variant={orientation === "portrait" ? "default" : "outline"}
            aria-pressed={orientation === "portrait"}
            onClick={() => setOrientation("portrait")}
          >
            Portrait
          </Button>
        </div>
      </div>
      <p className="text-sm text-muted-foreground">
        {orientation === "landscape"
          ? "A landscape iPad can take 3 arrival rows per bound and a 4-tile status column."
          : "A portrait phone should keep one panel, usually arrivals."}
      </p>
      <div ref={containerRef} className="w-full">
        <div
          className={cn(
            "relative overflow-hidden bg-background",
            isPortrait
              ? "rounded-[2rem] bg-foreground"
              : "rounded-xl border border-border"
          )}
          style={{
            width: isPortrait ? screenWidth + chromeX : screenWidth,
            height: isPortrait ? screenHeight + chromeY : screenHeight,
            padding: isPortrait
              ? `${PHONE_PAD_TOP}px ${PHONE_PAD_X}px ${PHONE_PAD_BOTTOM}px`
              : undefined,
          }}
        >
          {isPortrait ? (
            <div
              aria-hidden
              className="pointer-events-none absolute top-1.5 left-1/2 z-10 h-1.5 w-20 -translate-x-1/2 rounded-full bg-background/40"
            />
          ) : null}
          {hydrated ? (
            <div
              className="overflow-hidden bg-background"
              style={{
                width: screenWidth,
                height: screenHeight,
                borderRadius: isPortrait ? "1.25rem" : undefined,
              }}
            >
              <div
                className="origin-top-left"
                style={{
                  width: frame.width,
                  height: frame.height,
                  transform: `scale(${scale})`,
                }}
              >
                <iframe
                  key={`${href}-${orientation}`}
                  title="Board preview"
                  src={href}
                  className="h-full w-full border-0 bg-background"
                />
              </div>
            </div>
          ) : (
            <div
              className="h-full w-full bg-muted"
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
          {isPortrait ? (
            <div
              aria-hidden
              className="pointer-events-none absolute bottom-1.5 left-1/2 h-1 w-24 -translate-x-1/2 rounded-full bg-background/50"
            />
          ) : null}
        </div>
      </div>
    </section>
  )
}
