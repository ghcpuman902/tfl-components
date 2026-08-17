"use client"

import { type CSSProperties } from "react"
import { LINE_ORDER } from "tfl-ts"
import { LineBadge, LineColorBar } from "@/components/tfl/brand/line-badge"
import { LineName } from "@/components/tfl/brand/line-name"
import { useUnattendedSequence } from "@/hooks/use-unattended-sequence"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import { partitionStatusBoardLines } from "@/lib/tfl/status-board"
import {
  buildStatusDisplayFrames,
  visibleHeadingChips,
  type StatusDetailScope,
  type StatusDisplayFrame,
  type StatusDisplayTile,
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

const ROW_RULE_CLASS =
  "relative after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-border/60"

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
            id === activeLineId && "ring-1 ring-foreground/40"
          )}
        />
      ))}
    </div>
  )
}

const DisplayTile = ({
  tile,
  showRule,
}: {
  tile: StatusDisplayTile
  showRule: boolean
}) => {
  if (tile.kind === "empty") {
    return (
      <div
        className={cn(TILE_CLASS, showRule && ROW_RULE_CLASS)}
        aria-hidden
      />
    )
  }
  if (tile.kind === "line") {
    return (
      <div
        data-line={tile.lineId}
        className={cn("relative flex items-center", TILE_CLASS, showRule && ROW_RULE_CLASS)}
      >
        <p className="m-0 min-w-0 flex-1 truncate text-xl leading-7 font-semibold text-[var(--line-color)] tfl-dark-line-text">
          <LineName lineId={tile.lineId} name={tile.name} />
        </p>
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0"
          aria-hidden
        >
          <LineColorBar
            lineId={tile.lineId}
            modeName={tile.modeName}
            heightClass="h-1"
          />
        </div>
      </div>
    )
  }
  return (
    <p
      className={cn(
        "flex items-center text-base text-pretty text-foreground/80",
        TILE_CLASS,
        showRule && ROW_RULE_CLASS
      )}
    >
      <span className="line-clamp-2">{tile.text}</span>
    </p>
  )
}

const StatusDisplayFrameView = ({
  frame,
  tiles,
}: {
  frame: StatusDisplayFrame
  tiles: number
}) => {
  const heading =
    frame.headingLineIds.length === 0 && frame.activeLineId
      ? frame.heading
      : frame.heading
  return (
    <div
      className="flex w-full flex-col"
      aria-label={`${heading}${frame.activeLineId ? `, ${frame.activeLineId}` : ""}`}
    >
      <div
        className={cn(
          "flex items-center gap-2 text-xl leading-7 font-semibold",
          TILE_CLASS,
          ROW_RULE_CLASS
        )}
      >
        <p className="m-0 min-w-0 flex-1 truncate">{frame.heading}</p>
        <HeadingChips
          lineIds={frame.headingLineIds}
          activeLineId={frame.activeLineId}
        />
      </div>
      {frame.tiles.map((tile, index) => (
        <DisplayTile
          key={`${frame.id}-${index}`}
          tile={tile}
          showRule={index < frame.tiles.length - 1 || tiles > frame.tiles.length + 1}
        />
      ))}
      {frame.otherGoodServiceCopy && tiles >= 4 ? (
        <p
          className={cn(
            "flex items-center text-sm text-muted-foreground",
            TILE_CLASS
          )}
        >
          {frame.otherGoodServiceCopy}
        </p>
      ) : null}
    </div>
  )
}

export const TubeStatusDisplaySkeleton = ({
  tiles = 4,
  lineIds = LINE_ORDER.slice(0, 4),
}: {
  tiles?: number
  lineIds?: readonly string[]
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
        TILE_CLASS,
        ROW_RULE_CLASS
      )}
    >
      Status
    </div>
    {Array.from({ length: Math.max(0, tiles - 1) }, (_, index) => {
      const lineId = lineIds[index]
      return (
        <div
          key={lineId ?? index}
          data-line={lineId}
          className={cn("relative flex items-center", TILE_CLASS, ROW_RULE_CLASS)}
        >
          {lineId ? (
            <p className="m-0 truncate text-xl leading-7 font-semibold text-[var(--line-color)] tfl-dark-line-text">
              <LineName lineId={lineId} />
            </p>
          ) : null}
        </div>
      )
    })}
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
