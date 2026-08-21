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

/** Coalesce rapid slot/config edits so the iframe does not reload twice. */
const PREVIEW_HREF_DEBOUNCE_MS = 280

const sameBoardDocument = (current: Location, next: URL) =>
  current.pathname === next.pathname && current.search === next.search

const applyBoardPreviewHref = (
  iframe: HTMLIFrameElement,
  href: string,
  assignedHref: { current: string }
) => {
  const next = new URL(href, window.location.origin)
  const win = iframe.contentWindow
  try {
    if (
      win &&
      win.location.protocol !== "about:" &&
      sameBoardDocument(win.location, next)
    ) {
      const currentHref = `${win.location.pathname}${win.location.search}${win.location.hash}`
      const nextHref = `${next.pathname}${next.search}${next.hash}`
      if (currentHref !== nextHref) {
        win.location.replace(next.href)
      }
      assignedHref.current = href
      return
    }
  } catch {
    // Not ready, or the frame navigated away from our origin.
  }
  if (assignedHref.current === href) return
  iframe.src = href
  assignedHref.current = href
}

type BoardPreviewFrameProps = {
  href: string
}

const BoardPreviewFrame = ({ href }: BoardPreviewFrameProps) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const hrefRef = useRef(href)
  const initialSrc = useRef(href)
  const assignedHref = useRef(href)
  hrefRef.current = href

  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    applyBoardPreviewHref(iframe, href, assignedHref)
  }, [href])

  const handleLoad = () => {
    const iframe = iframeRef.current
    if (!iframe) return
    applyBoardPreviewHref(iframe, hrefRef.current, assignedHref)
  }

  return (
    <iframe
      ref={iframeRef}
      title="Board preview"
      src={initialSrc.current}
      onLoad={handleLoad}
      className="h-full w-full overflow-auto border-0 bg-background [touch-action:pan-y]"
    />
  )
}

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
  const [previewHref, setPreviewHref] = useState(href)
  const applyHrefImmediately = useRef(true)

  useEffect(() => {
    if (applyHrefImmediately.current) {
      applyHrefImmediately.current = false
      setPreviewHref(href)
      return
    }
    const id = window.setTimeout(() => {
      setPreviewHref(href)
    }, PREVIEW_HREF_DEBOUNCE_MS)
    return () => window.clearTimeout(id)
  }, [href])

  useEffect(() => {
    if (!hydrated) return
    const id = window.setTimeout(() => {
      void import("@/components/tfl/cycle-hire/cycle-hire-docks")
    }, 800)
    return () => window.clearTimeout(id)
  }, [hydrated])

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
                  <BoardPreviewFrame href={previewHref} />
                </div>
              ) : (
                <div
                  className="size-full animate-pulse bg-muted"
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
