"use client"

import { type CSSProperties } from "react"
import { LineBadge, LineColorBar } from "@/components/tfl/brand/line-badge"
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
import { UNATTENDED_DEFAULT_DWELL_MS } from "@/lib/tfl/unattended-sequence"
import { cn } from "@/lib/utils"

export type { StatusLine } from "@/lib/tfl/status-types"
export type { StatusDetailScope }

const BOARD_RHYTHM_VARS = {
  "--arrivals-unit": "0.5rem",
  "--arrivals-row": "calc(var(--arrivals-unit) * 6)",
} as CSSProperties

const TILE_CLASS =
  "box-border h-[var(--arrivals-row)] min-h-[var(--arrivals-row)] max-h-[var(--arrivals-row)] shrink-0 overflow-clip"

const DISRUPTION_LEADING_CLASS = "leading-[calc(var(--arrivals-row)/2)]"

const STRIPED_MODE_NAMES = new Set([
  "overground",
  "elizabeth-line",
  "cable-car",
])

export type TubeStatusDisplayProps = {
  data?: readonly StatusLine[]
  tiles?: number
  detailScope?: StatusDetailScope
  detailLineIds?: readonly string[]
  now?: number
  currentOnly?: boolean
  dedupe?: boolean
  rawReason?: boolean
  dwellMs?: number
  startDelayMs?: number
  className?: string
  error?: string | null
}

const HeadingChips = ({
  lineIds,
  activeLineId,
}: {
  lineIds: readonly string[]
  activeLineId?: string
}) => {
  const visible = visibleHeadingChips(lineIds, activeLineId)
  if (visible.length === 0) return null
  return (
    <div className="flex min-w-0 shrink-0 items-center gap-1" aria-hidden>
      {visible.map((id) => (
        <LineBadge
          key={id}
          lineId={id}
          className={cn(
            "h-5 justify-center px-1.5",
            activeLineId && id !== activeLineId && "opacity-40"
          )}
        />
      ))}
    </div>
  )
}

const PageDots = ({
  pageIndex,
  pageCount,
}: {
  pageIndex: number
  pageCount: number
}) => {
  if (pageCount <= 1) return null
  const dots = Array.from({ length: pageCount }, (_, index) => (
    <span
      key={index}
      className={cn(
        "size-1.5 rounded-full bg-current",
        index === pageIndex ? "opacity-100" : "opacity-40"
      )}
    />
  ))
  return (
    <>
      <div
        className={cn(
          "pointer-events-none absolute top-1 right-0 hidden items-center gap-1 bg-linear-to-l from-background from-70% via-background to-transparent pl-6 text-muted-foreground opacity-0 transition-opacity duration-150 [@media(hover:hover)]:flex",
          "[@media(hover:hover)]:group-hover/status-display:opacity-50"
        )}
        aria-hidden
      >
        {dots}
      </div>
      <div
        className="pointer-events-none absolute top-1 right-0 flex items-center gap-1 text-muted-foreground opacity-50 [@media(hover:hover)]:hidden"
        aria-hidden
      >
        {dots}
      </div>
      <span className="sr-only">
        Page {pageIndex + 1} of {pageCount}
      </span>
    </>
  )
}

const StatusDisplayFrameView = ({
  frame,
  tiles,
}: {
  frame: StatusDisplayFrame
  tiles: number
}) => {
  const bodyTiles = Math.max(0, tiles - 1)
  const textTile = frame.tiles.find((tile) => tile.kind === "text")
  const chipsTile = frame.tiles.find((tile) => tile.kind === "chips")
  const showHeadingChips =
    frame.phase === "disruptions" || bodyTiles === 0
  const activeLineId = frame.activeLineId
  const isLineHeading = Boolean(activeLineId)
  const isStriped = Boolean(
    frame.activeModeName && STRIPED_MODE_NAMES.has(frame.activeModeName)
  )
  const pageIndex = frame.pageIndex ?? 0
  const pageCount = frame.pageCount ?? 1

  return (
    <div
      className="group/status-display flex w-full flex-col"
      aria-label={`${frame.heading}${
        frame.activeLineName ? `, ${frame.activeLineName}` : ""
      }${pageCount > 1 ? `, page ${pageIndex + 1} of ${pageCount}` : ""}`}
    >
      <div
        data-line={isLineHeading ? activeLineId : undefined}
        className={cn(
          "relative flex items-center text-xl leading-7 font-semibold",
          TILE_CLASS,
          isLineHeading && !isStriped && "border-b-4"
        )}
        style={
          isLineHeading && !isStriped
            ? { borderBottomColor: "var(--line-color)" }
            : undefined
        }
      >
        <p
          className={cn(
            "m-0 min-w-0 flex-1 truncate",
            showHeadingChips && "pr-2",
            frame.headingLineIds.length === 0 &&
              isLineHeading &&
              "text-[var(--line-color)] tfl-dark-line-text"
          )}
        >
          {frame.heading}
        </p>
        {showHeadingChips ? (
          <HeadingChips
            lineIds={frame.headingLineIds}
            activeLineId={activeLineId}
          />
        ) : null}
        <PageDots pageIndex={pageIndex} pageCount={pageCount} />
        {isLineHeading && isStriped ? (
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0"
            aria-hidden
          >
            <LineColorBar
              lineId={activeLineId}
              modeName={frame.activeModeName}
              heightClass="h-1"
            />
          </div>
        ) : null}
      </div>
      {bodyTiles > 0 ? (
        <div
          className="overflow-clip"
          style={{
            height: `calc(var(--arrivals-row) * ${bodyTiles})`,
          }}
        >
          {textTile && textTile.kind === "text" ? (
            <p
              className={cn(
                "m-0 text-base text-pretty text-foreground/80",
                DISRUPTION_LEADING_CLASS
              )}
            >
              {textTile.text}
            </p>
          ) : null}
          {chipsTile && chipsTile.kind === "chips" ? (
            <div className="flex flex-wrap content-start gap-1">
              {chipsTile.lineIds.map((id) => (
                <LineBadge
                  key={id}
                  lineId={id}
                  className="h-5 justify-center px-1.5"
                />
              ))}
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
  const sections = partitionStatusBoardLines(data ?? [], prepareOptions)
  const frames = buildStatusDisplayFrames(sections, {
    tiles,
    detailScope,
    detailLineIds,
  })
  const itemIds = frames.map((frame) => frame.id)
  const sequence = useUnattendedSequence({
    itemIds,
    dwellMs,
    startDelayMs,
    enabled: itemIds.length > 1,
  })
  const frame = frames[sequence.index] ?? frames[0]
  const heightClass = "flex w-full flex-col"

  if (error) {
    return (
      <div
        className={cn(heightClass, className)}
        style={{
          ...BOARD_RHYTHM_VARS,
          minHeight: `calc(var(--arrivals-row) * ${tiles})`,
        }}
        role="alert"
      >
        <p className={cn("flex items-center text-base text-destructive", TILE_CLASS)}>
          {error}
        </p>
        {Array.from({ length: tiles - 1 }, (_, index) => (
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
          minHeight: `calc(var(--arrivals-row) * ${tiles})`,
        }}
        role="status"
      >
        <p className={cn("flex items-center text-muted-foreground", TILE_CLASS)}>
          No status
        </p>
        {Array.from({ length: tiles - 1 }, (_, index) => (
          <div key={index} className={TILE_CLASS} aria-hidden />
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(heightClass, className)}
      style={{
        ...BOARD_RHYTHM_VARS,
        minHeight: `calc(var(--arrivals-row) * ${tiles})`,
      }}
      onFocus={sequence.handleFocus}
      onBlur={sequence.handleBlur}
    >
      <div
        key={frame.id}
        className={cn(!reducedMotion && "transition-opacity duration-200")}
      >
        <StatusDisplayFrameView frame={frame} tiles={tiles} />
      </div>
    </div>
  )
}
