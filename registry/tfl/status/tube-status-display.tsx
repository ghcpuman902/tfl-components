"use client"

import { type CSSProperties } from "react"
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
  <div className="h-1 w-full overflow-hidden bg-foreground/15" aria-hidden>
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
  frameKey: string
  paused: boolean
  started: boolean
  canAdvance: boolean
}) => {
  const visible = visibleHeadingChips(lineIds, activeLineId)
  if (visible.length === 0) return null
  return (
    <div className="flex min-w-0 shrink-0 items-end gap-1" aria-hidden>
      {visible.map((id) => {
        const isActive = id === activeLineId
        return (
          <div key={id} className="flex min-w-0 flex-col leading-none">
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

const StatusDisplayFrameView = ({
  frame,
  tiles,
  dwellMs,
  started,
  paused,
  canAdvance,
  frameKey,
}: {
  frame: StatusDisplayFrame
  tiles: number
  dwellMs: number
  started: boolean
  paused: boolean
  canAdvance: boolean
  frameKey: string
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
          "relative flex items-center text-xl leading-7 font-semibold",
          TILE_CLASS
        )}
      >
        <p
          className={cn(
            "m-0 min-w-0 flex-1 truncate",
            showHeadingChips && "pr-2",
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
            frameKey={frameKey}
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
            !expand && "overflow-clip",
            announcementTile && "bg-muted"
          )}
          style={
            expand
              ? undefined
              : {
                  height: `calc(var(--arrivals-row) * ${bodyTiles})`,
                }
          }
        >
          {announcementTile && announcementTile.kind === "announcements" ? (
            <div className="py-[calc(var(--arrivals-row)/4)]">
              <StatusDisruptionBlock
                announcements={announcementTile.items}
                quiet={announcementTile.quiet}
              />
            </div>
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
              <div className="ml-auto flex w-full max-w-lg flex-wrap justify-end gap-1">
                {chipsTile.lineIds.map((id) => (
                  <LineBadge
                    key={id}
                    lineId={id}
                    className="h-5 justify-center px-1.5"
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
      className={cn(heightClass, className)}
      style={{
        ...BOARD_RHYTHM_VARS,
        minHeight: lockedHeight,
      }}
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
          dwellMs={dwellMs}
          started={sequence.started}
          paused={sequence.pauseReasons.length > 0}
          canAdvance={itemIds.length > 1}
          frameKey={frame.id}
        />
      </div>
    </div>
  )
}
