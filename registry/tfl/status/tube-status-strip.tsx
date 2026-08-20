"use client"

import { type CSSProperties } from "react"
import { LineBadge, LineColorBar } from "@/components/tfl/brand/line-badge"
import { LineName } from "@/components/tfl/brand/line-name"
import { useUnattendedSequence } from "@/hooks/use-unattended-sequence"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import { partitionStatusBoardLines } from "@/lib/tfl/status-board"
import {
  allocateStatusStripRegions,
  buildStatusDisplayFrames,
  statusDisplayReasonText,
  visibleHeadingChips,
  type StatusDetailScope,
} from "@/lib/tfl/status-display"
import type { StatusLine } from "@/lib/tfl/status-types"
import type { PrepareLineAnnouncementsOptions } from "@/lib/tfl/status-reason"
import { UNATTENDED_DEFAULT_DWELL_MS } from "@/lib/tfl/unattended-sequence"
import { cn } from "@/lib/utils"

export type { StatusLine } from "@/lib/tfl/status-types"

export type TubeStatusStripProps = {
  data?: readonly StatusLine[]
  units?: number
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

const BOARD_RHYTHM_VARS = {
  "--arrivals-unit": "0.5rem",
  "--arrivals-row": "calc(var(--arrivals-unit) * 6)",
} as CSSProperties

const TILE_CLASS =
  "box-border h-[var(--arrivals-row)] min-h-[var(--arrivals-row)] max-h-[var(--arrivals-row)] overflow-clip"

export const TubeStatusStripSkeleton = ({ units = 4 }: { units?: number }) => (
  <div
    className="grid w-full saturate-0"
    style={{
      ...BOARD_RHYTHM_VARS,
      gridTemplateColumns: `repeat(${Math.max(1, units)}, minmax(0, 1fr))`,
    }}
    aria-busy
    aria-label="Loading line status"
  >
    {Array.from({ length: Math.max(1, units) }, (_, index) => (
      <div key={index} className={cn(TILE_CLASS, "bg-muted/30")} />
    ))}
  </div>
)

export const TubeStatusStrip = ({
  data,
  units = 4,
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
}: TubeStatusStripProps) => {
  const reducedMotion = usePrefersReducedMotion()
  const regions = allocateStatusStripRegions(units)
  const prepareOptions: PrepareLineAnnouncementsOptions = {
    now,
    currentOnly,
    dedupe,
    rawReason,
  }
  const sections = partitionStatusBoardLines(data ?? [], prepareOptions)
  const frames = buildStatusDisplayFrames(sections, {
    tiles: Math.max(2, regions.reasonUnits + 1),
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
  const columns = [
    regions.showDisruptedSummary ? "minmax(0, 1fr)" : null,
    `minmax(0, ${regions.reasonUnits}fr)`,
    regions.showOtherSummary ? "minmax(0, 1fr)" : null,
  ]
    .filter(Boolean)
    .join(" ")

  const reasonText = frame ? statusDisplayReasonText(frame.tiles) : ""
  const hasLine = Boolean(frame?.activeLineId && frame.activeLineName)
  const chipsTile = frame?.tiles.find((tile) => tile.kind === "chips")
  const disruptedIds = visibleHeadingChips(
    frame?.heading === "Service disruptions" ? frame.headingLineIds : [],
    frame?.activeLineId
  )
  const otherIds = visibleHeadingChips(
    chipsTile?.kind === "chips"
      ? chipsTile.lineIds
      : frame?.phase === "good-service"
        ? frame.headingLineIds
        : [],
    frame?.activeLineId
  )

  return (
    <div
      className={cn("grid w-full items-stretch", className)}
      style={{ ...BOARD_RHYTHM_VARS, gridTemplateColumns: columns }}
      onFocus={sequence.handleFocus}
      onBlur={sequence.handleBlur}
      role={error ? "alert" : "status"}
      aria-label={
        error
          ? error
          : frame
            ? `${frame.heading}${frame.activeLineName ? `, ${frame.activeLineName}` : ""}`
            : "No status"
      }
    >
      {regions.showDisruptedSummary ? (
        <div className={cn("flex items-center gap-1 px-2", TILE_CLASS)}>
          {disruptedIds.map((id) => (
            <LineBadge
              key={id}
              lineId={id}
              className={cn(
                "h-5 justify-center px-1.5",
                frame?.activeLineId && id !== frame.activeLineId && "opacity-40"
              )}
            />
          ))}
        </div>
      ) : null}
      <div
        key={frame?.id ?? "empty"}
        className={cn(
          "flex min-w-0 items-center gap-3 px-2",
          TILE_CLASS,
          !reducedMotion && "transition-opacity duration-200"
        )}
      >
        {error ? (
          <p className="truncate text-destructive">{error}</p>
        ) : hasLine ? (
          <>
            <div
              data-line={frame?.activeLineId}
              className="relative min-w-0 shrink-0"
            >
              <p className="tfl-dark-line-text m-0 truncate text-xl leading-7 font-semibold text-[var(--line-color)]">
                <LineName
                  lineId={frame?.activeLineId}
                  name={frame?.activeLineName}
                />
              </p>
              <LineColorBar
                lineId={frame?.activeLineId}
                modeName={frame?.activeModeName}
                heightClass="h-1"
              />
            </div>
            {reasonText ? (
              <p className="min-w-0 truncate text-base text-foreground/80">
                {reasonText}
              </p>
            ) : null}
          </>
        ) : (
          <p className="truncate text-muted-foreground">
            {frame?.heading ?? "No status"}
          </p>
        )}
      </div>
      {regions.showOtherSummary ? (
        <div
          className={cn("flex items-center justify-end gap-1 px-2", TILE_CLASS)}
        >
          {otherIds.map((id) => (
            <LineBadge
              key={id}
              lineId={id}
              className="h-5 justify-center px-1.5"
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}
