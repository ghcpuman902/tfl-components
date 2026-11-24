"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
import { LineBadge } from "@/components/tfl/brand/line-badge"
import {
  DISRUPTION_LEADING_CLASS,
  StatusDisruptionBlock,
} from "@/components/tfl/status/status-disruption-copy"
import { useUnattendedSequence } from "@/hooks/use-unattended-sequence"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import { partitionStatusBoardLines } from "@/lib/tfl/status-board"
import {
  buildStatusDisplayFrames,
  visibleHeadingChips,
  type StatusDetailScope,
  type StatusDisplayFrame,
} from "@/lib/tfl/status-display"
import type { StatusLine } from "@/lib/tfl/status-types"
import type { PrepareLineAnnouncementsOptions } from "@/lib/tfl/status-reason"
import {
  UNATTENDED_DEFAULT_DWELL_MS,
  UNATTENDED_SCROLL_HOLD_MS,
  UNATTENDED_SCROLL_MOVE_MS,
  resolveUnattendedDwellMs,
  unattendedScrollDwellMs,
} from "@/lib/tfl/unattended-sequence"
import { cn } from "@/lib/utils"

export type { StatusLine } from "@/lib/tfl/status-types"
export type { StatusDetailScope }

const BOARD_RHYTHM_VARS = {
  "--arrivals-unit": "0.5rem",
  "--arrivals-row": "calc(var(--arrivals-unit) * 6)",
} as CSSProperties

const TILE_CLASS =
  "box-border h-[var(--arrivals-row)] min-h-[var(--arrivals-row)] max-h-[var(--arrivals-row)] shrink-0 overflow-clip"

/** Heading tile: one row, or more when its chips wrap below the heading. */
const HEADING_TILE_CLASS = "box-border min-h-[var(--arrivals-row)] shrink-0"

export type TubeStatusDisplayProps = {
  data?: readonly StatusLine[]
  tiles?: number
  detailScope?: StatusDetailScope
  detailLineIds?: readonly string[]
  /** Show these lines in this order within each section; others keep their slot. */
  lineOrder?: readonly string[]
  now?: number
  currentOnly?: boolean
  dedupe?: boolean
  rawReason?: boolean
  dwellMs?: number
  startDelayMs?: number
  className?: string
  error?: string | null
}

const ChipDwellBar = ({
  filling,
  paused,
  frameKey,
  dwellMs,
}: {
  filling: boolean
  paused: boolean
  frameKey: string
  dwellMs: number
}) => (
  // Overlaid under the chip (no layout height) so the chip centres on the
  // heading exactly like a plain chip.
  <div
    className="absolute inset-x-0 top-full h-1 overflow-hidden bg-foreground/15"
    aria-hidden
  >
    {filling ? (
      <div
        key={`${frameKey}-go`}
        className="tfl-unattended-dwell h-full w-full bg-foreground/50"
        data-paused={paused ? "true" : undefined}
        style={{ "--unattended-dwell": `${dwellMs}ms` } as CSSProperties}
      />
    ) : null}
  </div>
)

const HeadingChips = ({
  lineIds,
  activeLineId,
  dwellMs,
  frameKey,
  paused,
  started,
  canAdvance,
}: {
  lineIds: readonly string[]
  activeLineId?: string
  dwellMs: number
  /** Frame id plus dwell restarts: a new key starts the bar from empty. */
  frameKey: string
  paused: boolean
  started: boolean
  canAdvance: boolean
}) => {
  const visible = visibleHeadingChips(lineIds, activeLineId)
  if (visible.length === 0) return null
  return (
    // Own flex item: wraps below the heading as a whole when it does not
    // fit beside it, and wraps its chips when a row is too narrow. Inline,
    // the growing heading pushes it to the right; wrapped, it starts at the
    // heading's left edge. Each line keeps a full tile; gap-y-2 leaves room
    // for the overlaid dwell bar.
    <div
      className="flex min-h-[var(--arrivals-row)] max-w-full min-w-0 flex-wrap content-center items-center justify-start gap-x-1 gap-y-2"
      aria-hidden
    >
      {visible.map((id) => {
        const isActive = id === activeLineId
        return (
          <div key={id} className="relative flex min-w-0 leading-none">
            <LineBadge
              lineId={id}
              className={cn(
                "h-5 justify-center px-1.5",
                activeLineId && !isActive && "opacity-40"
              )}
            />
            <ChipDwellBar
              filling={isActive && canAdvance && started}
              paused={paused}
              frameKey={frameKey}
              dwellMs={dwellMs}
            />
          </div>
        )
      })}
    </div>
  )
}

// Ported from mangl.es `OverflowMarquee` (src/components/london/overflow-marquee.tsx,
// vertical mode). Copy that fits is static. Copy taller than the window moves up
// one whole line at a time like Apple Music lyrics: hold, ease one line, hold.
// On a rotating Board it plays once and rests on the last line; the frame's
// dwell stretches to fit (see `unattendedScrollDwellMs`), so the Board rotates
// after the last line has held, never mid-scroll and never via the top.
// WAAPI only, so no React render ticks while it runs.
const SCROLL_EASE = "cubic-bezier(0.45, 0, 0.2, 1)"

type ScrollMotion =
  { mode: "static" } | { mode: "vertical"; steps: number; line: number }

const STATIC_SCROLL: ScrollMotion = { mode: "static" }

/**
 * Hold each window, ease one line up, hold again, until the last line has
 * held. `loop` (a Board that never rotates) eases back to the top and repeats.
 */
const verticalScrollFrames = (
  steps: number,
  line: number,
  loop: boolean
): { keyframes: Keyframe[]; duration: number } => {
  const stride = UNATTENDED_SCROLL_HOLD_MS + UNATTENDED_SCROLL_MOVE_MS
  const once = unattendedScrollDwellMs(steps)
  const duration = loop ? once + UNATTENDED_SCROLL_MOVE_MS : once
  const keyframes: Keyframe[] = []
  for (let i = 0; i <= steps; i++) {
    const start = i * stride
    const y = `translateY(${-i * line}px)`
    keyframes.push({ transform: y, offset: start / duration })
    keyframes.push({
      transform: y,
      offset: (start + UNATTENDED_SCROLL_HOLD_MS) / duration,
      easing: SCROLL_EASE,
    })
  }
  if (loop) keyframes.push({ transform: "translateY(0)", offset: 1 })
  return { keyframes, duration }
}

/**
 * Clips announcement copy to `lines` whole lines and scrolls the rest into
 * view, reporting how long one pass takes (`onDwell`, 0 when static) so the
 * Board can hold this frame until the last line has shown. Reduced motion
 * renders everything (`lines` ignored, reports 0) and the caller lets the
 * panel grow to fit.
 */
const AnnouncementScroller = ({
  lines,
  loop,
  restartToken,
  paused,
  reducedMotion,
  onDwell,
  children,
}: {
  lines: number | null
  loop: boolean
  restartToken: string
  paused: boolean
  reducedMotion: boolean
  onDwell?: (scrollMs: number) => void
  children: ReactNode
}) => {
  const viewportRef = useRef<HTMLDivElement>(null)
  const trackRef = useRef<HTMLDivElement>(null)
  const animationRef = useRef<Animation | null>(null)
  const inViewRef = useRef(true)
  const pausedRef = useRef(paused)
  const [motion, setMotion] = useState<ScrollMotion>(STATIC_SCROLL)
  const clipped = lines !== null && !reducedMotion

  useLayoutEffect(() => {
    const viewport = viewportRef.current
    const track = trackRef.current
    if (!viewport || !track || !clipped) {
      setMotion(STATIC_SCROLL)
      return
    }
    const update = () => {
      const block = track.firstElementChild ?? track
      const line = Number.parseFloat(getComputedStyle(block).lineHeight) || 0
      const height = viewport.clientHeight
      if (line <= 0 || height < line) {
        setMotion(STATIC_SCROLL)
        return
      }
      const fit = Math.max(1, Math.floor(height / line + 0.01))
      const total = Math.round(track.scrollHeight / line)
      if (total > fit) {
        const steps = total - fit
        setMotion((prev) =>
          prev.mode === "vertical" && prev.steps === steps && prev.line === line
            ? prev
            : { mode: "vertical", steps, line }
        )
        return
      }
      setMotion(STATIC_SCROLL)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(viewport)
    observer.observe(track)
    let cancelled = false
    document.fonts?.ready.then(() => {
      if (!cancelled) update()
    })
    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [clipped, restartToken])

  const scrollMs =
    clipped && motion.mode === "vertical"
      ? unattendedScrollDwellMs(motion.steps)
      : 0

  useLayoutEffect(() => {
    onDwell?.(scrollMs)
  }, [onDwell, scrollMs])

  const motionKey = JSON.stringify(motion)

  useEffect(() => {
    const viewport = viewportRef.current
    const track = trackRef.current
    if (!viewport || !track || motion.mode === "static" || !clipped) return
    const { keyframes, duration } = verticalScrollFrames(
      motion.steps,
      motion.line,
      loop
    )
    const animation = track.animate(keyframes, {
      duration,
      iterations: loop ? Infinity : 1,
      easing: "linear",
      // Rest on the last line until the Board rotates; no jump to the top.
      fill: "forwards",
    })
    animationRef.current = animation
    animation.pause()
    animation.currentTime = 0
    const resume = () => {
      if (inViewRef.current && !pausedRef.current) animation.play()
    }
    // Off-screen or a hidden tab restarts from the first line, in step with
    // the Board, which restarts this frame's dwell on return.
    const observer = new IntersectionObserver(
      ([entry]) => {
        inViewRef.current = entry?.isIntersecting ?? false
        animation.pause()
        animation.currentTime = 0
        resume()
      },
      { threshold: 0.35 }
    )
    observer.observe(viewport)
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return
      animation.pause()
      animation.currentTime = 0
      resume()
    }
    document.addEventListener("visibilitychange", onVisibility)
    return () => {
      observer.disconnect()
      document.removeEventListener("visibilitychange", onVisibility)
      animation.cancel()
      animationRef.current = null
    }
    // Keyed on the motion's value: an equal re-measure must not restart it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [motionKey, clipped, loop, restartToken])

  // Focus pauses in place (the Board's dwell is frozen too) and resumes there.
  useEffect(() => {
    pausedRef.current = paused
    const animation = animationRef.current
    if (!animation) return
    if (paused) animation.pause()
    else if (inViewRef.current) animation.play()
  }, [paused])

  return (
    <div
      ref={viewportRef}
      data-announcement-viewport=""
      data-scroll-mode={clipped ? motion.mode : "static"}
      data-scroll-ms={scrollMs}
      className={cn("relative min-w-0", clipped && "overflow-hidden")}
      style={
        clipped
          ? { height: `calc(var(--arrivals-row) / 2 * ${lines})` }
          : undefined
      }
    >
      <div ref={trackRef} data-announcement-track="">
        {children}
      </div>
    </div>
  )
}

const StatusDisplayFrameView = ({
  frame,
  tiles,
  dwellMs,
  started,
  paused,
  canAdvance,
  frameKey,
  reducedMotion,
  scrollPaused,
  onScrollDwell,
  dwellRestarts = 0,
}: {
  frame: StatusDisplayFrame
  tiles: number
  dwellMs: number
  started: boolean
  paused: boolean
  canAdvance: boolean
  frameKey: string
  reducedMotion: boolean
  scrollPaused: boolean
  onScrollDwell?: (scrollMs: number) => void
  dwellRestarts?: number
}) => {
  const expand = tiles <= 0
  const bodyTiles = expand ? 1 : Math.max(0, tiles - 1)
  const announcementTile = frame.tiles.find(
    (tile) => tile.kind === "announcements"
  )
  const chipsTile = frame.tiles.find((tile) => tile.kind === "chips")
  const showHeadingChips = frame.headingLineIds.length > 0
  const activeLineId = frame.activeLineId
  const namedHeading =
    frame.headingLineIds.length === 0 && Boolean(activeLineId)
  const pageIndex = frame.pageIndex ?? 0
  const pageCount = frame.pageCount ?? 1
  // Reduced motion: no scroll, so the panel grows to show every line.
  const growForReducedMotion =
    reducedMotion && !expand && announcementTile !== undefined

  return (
    <div
      className="flex w-full flex-col"
      aria-label={`${frame.heading}${
        frame.activeLineName ? `, ${frame.activeLineName}` : ""
      }${pageCount > 1 ? `, page ${pageIndex + 1} of ${pageCount}` : ""}`}
    >
      <div
        data-line={namedHeading ? activeLineId : undefined}
        className={cn(
          "relative flex flex-wrap items-center gap-x-2 text-xl leading-7 font-semibold",
          HEADING_TILE_CLASS
        )}
      >
        {/* Never truncated: chips wrap to their own row instead. */}
        <p
          className={cn(
            "m-0 flex min-h-[var(--arrivals-row)] min-w-0 grow items-center",
            namedHeading && "tfl-dark-line-text text-[var(--line-color)]"
          )}
        >
          {frame.heading}
        </p>
        {showHeadingChips ? (
          <HeadingChips
            lineIds={frame.headingLineIds}
            activeLineId={activeLineId}
            dwellMs={dwellMs}
            frameKey={`${frameKey}-${dwellRestarts}`}
            paused={paused}
            started={started}
            canAdvance={canAdvance}
          />
        ) : null}
      </div>
      {bodyTiles > 0 ? (
        <div
          className={cn(
            "relative",
            !expand && !growForReducedMotion && "overflow-clip"
          )}
          style={
            expand
              ? undefined
              : growForReducedMotion
                ? { minHeight: `calc(var(--arrivals-row) * ${bodyTiles})` }
                : { height: `calc(var(--arrivals-row) * ${bodyTiles})` }
          }
        >
          {announcementTile && announcementTile.kind === "announcements" ? (
            // 12px above and below keep the copy where it was; the window in
            // between is a whole number of 24px lines, so no line is cut at rest.
            <div className="py-[calc(var(--arrivals-row)/4)]">
              <AnnouncementScroller
                lines={expand ? null : bodyTiles * 2 - 1}
                loop={!canAdvance}
                restartToken={frameKey}
                paused={scrollPaused}
                reducedMotion={reducedMotion}
                onDwell={onScrollDwell}
              >
                <StatusDisruptionBlock
                  announcements={announcementTile.items}
                  quiet={announcementTile.quiet}
                />
              </AnnouncementScroller>
            </div>
          ) : null}
          {/* Marks the borderless announcement area: a 1ex right-angle
              triangle in the active line's colour, flush with the panel's
              bottom-right corner. Intentionally square (DROP SQUARE exception). */}
          {announcementTile && activeLineId ? (
            <span
              aria-hidden
              data-line={activeLineId}
              className="pointer-events-none absolute right-0 bottom-0 size-[1ex] bg-[var(--line-color)] text-base [clip-path:polygon(100%_0,100%_100%,0_100%)]"
            />
          ) : null}
          {chipsTile && chipsTile.kind === "chips" ? (
            <div className="flex min-h-0 flex-col">
              {frame.bodyHeading ? (
                <p
                  className={cn(
                    "m-0 flex items-center text-xl leading-7 font-semibold",
                    TILE_CLASS
                  )}
                >
                  {frame.bodyHeading}
                </p>
              ) : null}
              {/* Left-aligned under the heading. Chips flow as inline boxes
                  so `text-wrap: balance` evens the rows (no lone chip on the
                  last row); mr-1/mb-1 stand in for the old gap-1 (trailing,
                  so every row starts flush-left), -mb-1 drops the last
                  row's extra. */}
              <div className="-mb-1 w-full max-w-lg text-left leading-none text-balance">
                {chipsTile.lineIds.map((id) => (
                  <LineBadge
                    key={id}
                    lineId={id}
                    className="mr-1 mb-1 h-5 justify-center px-1.5 align-top"
                  />
                ))}
              </div>
            </div>
          ) : null}
          {frame.otherGoodServiceCopy ? (
            <p
              className={cn(
                "m-0 text-sm text-muted-foreground",
                DISRUPTION_LEADING_CLASS
              )}
            >
              {frame.otherGoodServiceCopy}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export const TubeStatusDisplaySkeleton = ({
  tiles = 4,
}: {
  tiles?: number
}) => (
  <div
    className="flex w-full flex-col saturate-0"
    style={BOARD_RHYTHM_VARS}
    aria-busy
    aria-label="Loading line status"
  >
    <div
      className={cn(
        "flex items-center text-xl leading-7 font-semibold text-muted-foreground",
        TILE_CLASS
      )}
    >
      Status
    </div>
    {Array.from({ length: Math.max(0, tiles - 1) }, (_, index) => (
      <div key={index} className={TILE_CLASS} />
    ))}
  </div>
)

export const TubeStatusDisplay = ({
  data,
  tiles = 4,
  detailScope = "network",
  detailLineIds,
  lineOrder,
  now,
  currentOnly = true,
  dedupe = true,
  rawReason,
  dwellMs = UNATTENDED_DEFAULT_DWELL_MS,
  startDelayMs = 0,
  className,
  error = null,
}: TubeStatusDisplayProps) => {
  const reducedMotion = usePrefersReducedMotion()
  const prepareOptions: PrepareLineAnnouncementsOptions = {
    now,
    currentOnly,
    dedupe,
    rawReason,
  }
  const sections = partitionStatusBoardLines(data ?? [], {
    ...prepareOptions,
    lineOrder,
  })
  const frames = buildStatusDisplayFrames(sections, {
    tiles,
    detailScope,
    detailLineIds,
    announcementPaging: "scroll",
  })
  const itemIds = frames.map((frame) => frame.id)
  // Scroll time each frame needs to reach its last line (0 when it fits).
  const [scrollDwellById, setScrollDwellById] = useState<
    Readonly<Record<string, number>>
  >({})
  const rootRef = useRef<HTMLDivElement>(null)
  const [offscreen, setOffscreen] = useState(false)
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const observer = new IntersectionObserver(
      ([entry]) => setOffscreen(!(entry?.isIntersecting ?? true)),
      { threshold: 0.35 }
    )
    observer.observe(root)
    return () => observer.disconnect()
  }, [])
  const sequence = useUnattendedSequence({
    itemIds,
    dwellMs,
    dwellMsById: scrollDwellById,
    offscreen,
    startDelayMs,
    enabled: itemIds.length > 1,
  })
  const frame = frames[sequence.index] ?? frames[0]
  const frameId = frame?.id
  const reportScrollDwell = useCallback(
    (scrollMs: number) => {
      if (!frameId) return
      setScrollDwellById((prev) =>
        (prev[frameId] ?? 0) === scrollMs
          ? prev
          : { ...prev, [frameId]: scrollMs }
      )
    },
    [frameId]
  )
  const frameDwellMs = resolveUnattendedDwellMs(frameId, {
    dwellMs,
    dwellMsById: scrollDwellById,
  })
  const heightClass = "flex w-full flex-col"

  const expand = tiles <= 0
  const lockedHeight = expand
    ? undefined
    : `calc(var(--arrivals-row) * ${tiles})`
  const fillerTiles = expand ? 0 : Math.max(0, tiles - 1)

  if (error) {
    return (
      <div
        className={cn(heightClass, className)}
        style={{
          ...BOARD_RHYTHM_VARS,
          minHeight: lockedHeight,
        }}
        role="alert"
      >
        <p
          className={cn(
            "flex items-center text-base text-destructive",
            TILE_CLASS
          )}
        >
          {error}
        </p>
        {Array.from({ length: fillerTiles }, (_, index) => (
          <div key={index} className={TILE_CLASS} aria-hidden />
        ))}
      </div>
    )
  }

  if (!frame) {
    return (
      <div
        className={cn(heightClass, className)}
        style={{
          ...BOARD_RHYTHM_VARS,
          minHeight: lockedHeight,
        }}
        role="status"
      >
        <p
          className={cn("flex items-center text-muted-foreground", TILE_CLASS)}
        >
          No status
        </p>
        {Array.from({ length: fillerTiles }, (_, index) => (
          <div key={index} className={TILE_CLASS} aria-hidden />
        ))}
      </div>
    )
  }

  return (
    <div
      ref={rootRef}
      className={cn(heightClass, className)}
      style={{
        ...BOARD_RHYTHM_VARS,
        minHeight: lockedHeight,
      }}
      data-frame-dwell-ms={frameDwellMs}
      onFocus={sequence.handleFocus}
      onBlur={sequence.handleBlur}
    >
      <div
        key={frame.id}
        className={cn(!reducedMotion && "transition-opacity duration-200")}
      >
        <StatusDisplayFrameView
          frame={frame}
          tiles={tiles}
          dwellMs={frameDwellMs}
          started={sequence.started}
          paused={sequence.pauseReasons.length > 0}
          canAdvance={itemIds.length > 1}
          frameKey={frame.id}
          reducedMotion={reducedMotion}
          // Starts with the frame's dwell (after the panel's stagger) and
          // freezes with it on focus, so the last line always gets its hold.
          scrollPaused={
            sequence.pauseReasons.includes("focus") ||
            (itemIds.length > 1 && !sequence.started)
          }
          onScrollDwell={reportScrollDwell}
          dwellRestarts={sequence.restarts}
        />
      </div>
    </div>
  )
}
