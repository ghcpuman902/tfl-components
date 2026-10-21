"use client"

import { useLayoutEffect, useMemo, useRef, useState } from "react"
import type { PredictionWithSharedTrackIdentity, RealtimePrediction } from "tfl-ts"
import {
  ARRIVALS_IDENTITY_CHIP_WIDTH_CLASS,
  CHIP_CAP_TEXT_BOX_CLASS,
} from "@/components/tfl/arrivals/chip-text"
import { LineBadge, LineBadgeGroup } from "@/components/tfl/brand/line-badge"
import { TfLRoundel } from "@/components/tfl/brand/tfl-roundel"
import { StationName, StationNameTitle } from "@/components/tfl/station-name"
import { useUnattendedSequence } from "@/hooks/use-unattended-sequence"
import { resolveArrivalsDestinationText } from "@/lib/tfl/arrivals-destination-text"
import type { ArrivalsEmptyKind } from "@/lib/tfl/arrivals-empty"
import { ARRIVALS_EMPTY_COPY } from "@/lib/tfl/arrivals-empty"
import { isUnknownArrivalsPlatform } from "@/lib/tfl/arrivals-bound-sort"
import type { ArrivalsPreparedRow } from "@/lib/tfl/arrivals-prepare"
import {
  buildGlanceArrivalFrames,
  formatGlanceArrivalMeta,
  prepareGlanceArrivals,
  resolveGlanceArrivalsPageSize,
} from "@/lib/tfl/board-glance-arrivals"
import { getLineNameTiers, joinLineNames } from "@/lib/tfl/line-names"
import { usableTflText } from "@/lib/tfl/bus-stop-letter"
import { compareArrivalsLines } from "@/lib/tfl/arrivals-line-sort"
import { cn } from "@/lib/utils"

export type BoardGlanceArrivalsProps = {
  data?: readonly RealtimePrediction[]
  stopName?: string
  stopPointId?: string
  /** Visible trains per frame. Omit to pick 2 or 3 from container aspect. */
  pageSize?: number
  pinFirst?: boolean
  dwellMs?: number
  startDelayMs?: number
  now?: number
  loading?: boolean
  error?: string | null
  emptyKind?: ArrivalsEmptyKind
  emptyMessage?: string
  className?: string
  headingLevel?: 1 | 2 | 3 | 4 | 5 | 6
}

/** Wall-board countdown: hero number + unit, or a single Due word. */
const formatGlanceCountdown = (
  seconds?: number,
  platformName?: string
): { primary: string; unit?: string } => {
  if (isUnknownArrivalsPlatform(platformName)) {
    return { primary: "Sched" }
  }
  if (seconds === undefined || seconds < 0) return { primary: "—" }
  if (seconds < 60) return { primary: "Due" }
  return { primary: `${Math.floor(seconds / 60)}`, unit: "min" }
}

/*
 * One grid for loaded and loading rows: rail spans the stack, chip /
 * destination / meta stack in 1u cap-trimmed gaps, minutes sit on the
 * destination baseline. Sizes are `--glance-*` steps (globals.css).
 */
const ROW_CLASS =
  "relative grid min-h-0 min-w-0 flex-1 basis-0 grid-cols-[auto_minmax(0,1fr)_auto] content-center gap-x-[length:var(--glance-u)] gap-y-[length:var(--glance-u)]"
const ROW_RULE_CLASS =
  "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-border/70"
const RAIL_CLASS =
  "col-start-1 row-span-3 row-start-1 w-[length:var(--glance-rail)]"
const CHIP_SIZE_CLASS =
  "h-[length:var(--glance-chip-h)] text-[length:var(--glance-small)]"
/* Board row weight (no synthetic bold, so canvas fit matches paint); leading matches StationName's multiline. */
const DEST_CLASS =
  "font-medium text-[length:var(--glance-dest)] leading-[1.15]"
const META_CLASS =
  "col-span-2 col-start-2 row-start-3 m-0 font-medium text-[length:var(--glance-small)] leading-tight text-muted-foreground [text-box:trim-both_cap_alphabetic]"
const TIME_CLASS =
  "col-start-3 row-span-2 row-start-1 flex items-baseline justify-end gap-x-[length:var(--glance-rail)] self-end pl-[length:var(--glance-rail)] font-semibold tabular-nums"
const NUMBER_CLASS = cn(
  "min-w-[2ch] text-right text-[length:var(--glance-time)]",
  CHIP_CAP_TEXT_BOX_CLASS
)
const UNIT_CLASS = cn(
  "font-medium text-[length:var(--glance-dest)] text-muted-foreground",
  CHIP_CAP_TEXT_BOX_CLASS
)
const SKELETON_FILL_CLASS = "animate-pulse bg-muted text-transparent"

const GlanceArrivalRow = ({
  row,
  showRule,
}: {
  row: ArrivalsPreparedRow
  showRule: boolean
}) => {
  const arrival = row.arrival
  const rawDestination =
    usableTflText(arrival.towards) ||
    usableTflText(arrival.destinationName) ||
    "Unknown"
  const tagged = arrival as PredictionWithSharedTrackIdentity
  const rawLineId = arrival.lineId?.trim() || ""
  const identity = tagged.sharedTrackIdentity
  const canonicalLineId =
    identity?.confidence === "exclusive-segment"
      ? identity.canonicalLineId.trim()
      : undefined
  const lineId = canonicalLineId || rawLineId
  const remapped = Boolean(canonicalLineId) && canonicalLineId !== rawLineId
  const sharedChipIds =
    identity?.confidence === "ambiguous" && identity.rawLineIds.length >= 2
      ? [...identity.rawLineIds]
          .map((id) => id.trim())
          .filter(Boolean)
          .sort((a, b) =>
            compareArrivalsLines(
              { lineId: a, lineName: getLineNameTiers(a).full },
              { lineId: b, lineName: getLineNameTiers(b).full }
            )
          )
      : []
  const lineTiers = lineId
    ? getLineNameTiers(lineId, remapped ? undefined : arrival.lineName)
    : null
  const sharedChipLabel =
    sharedChipIds.length >= 2
      ? joinLineNames(sharedChipIds.map((id) => getLineNameTiers(id).full))
      : null
  const destination = resolveArrivalsDestinationText({
    destination: rawDestination,
    lineName: sharedChipLabel ?? lineTiers?.full,
    currentLocation: usableTflText(arrival.currentLocation),
  })
  const meta = formatGlanceArrivalMeta(arrival.platformName)
  const countdown = formatGlanceCountdown(
    arrival.timeToStation,
    arrival.platformName
  )
  const lineChip = sharedChipLabel ? (
    <LineBadgeGroup
      variant="codes"
      lineIds={sharedChipIds}
      className={CHIP_SIZE_CLASS}
    />
  ) : lineTiers && lineId ? (
    <LineBadge
      lineId={lineId}
      name={lineTiers.short}
      className={cn(
        "justify-center px-0",
        CHIP_SIZE_CLASS,
        ARRIVALS_IDENTITY_CHIP_WIDTH_CLASS
      )}
    />
  ) : null

  const spokenTime = countdown.unit
    ? `${countdown.primary} ${countdown.unit}`
    : countdown.primary
  const ariaLabel = [
    sharedChipLabel ?? lineTiers?.full,
    meta,
    destination,
    spokenTime,
  ]
    .filter(Boolean)
    .join(", ")

  return (
    <li
      data-slot="board-glance-row"
      aria-label={ariaLabel}
      className={cn(ROW_CLASS, showRule && ROW_RULE_CLASS)}
    >
      <span
        data-line={lineId || undefined}
        className={cn(RAIL_CLASS, lineId && "bg-[var(--line-color)]")}
        aria-hidden
      />
      {lineChip ? (
        <div className="col-start-2 row-start-1 flex" aria-hidden="true">
          {lineChip}
        </div>
      ) : null}
      <div
        className="col-start-2 row-start-2 flex min-w-0 overflow-x-clip"
        aria-hidden="true"
      >
        {/*
          CSS-wraps before the fit measures, so the line count is right on
          first paint; clamped to two lines (padding keeps descenders past the
          cap trim, negative margin keeps the box).
        */}
        <StationName
          name={destination}
          layout="auto"
          maxLines={2}
          allowAbbreviation
          allowScaleDown
          nowrap={false}
          className={cn(
            "text-balance [&>span>span]:[text-box:trim-both_cap_alphabetic]",
            DEST_CLASS
          )}
        />
      </div>
      <p
        data-slot="board-glance-meta"
        className={cn("text-balance", META_CLASS)}
        aria-hidden="true"
      >
        {meta ?? lineTiers?.full ?? "Next train"}
      </p>
      <div data-slot="board-glance-time" className={TIME_CLASS} aria-hidden="true">
        <span className={NUMBER_CLASS}>{countdown.primary}</span>
        {countdown.unit ? (
          <span className={UNIT_CLASS}>{countdown.unit}</span>
        ) : null}
      </div>
    </li>
  )
}

/**
 * Room-distance glance Board arrivals: flat next trains, huge type, no scroll.
 * Works on any aspect ratio. Pages overflow with unattended pin-first frames.
 */
export const BoardGlanceArrivals = ({
  data,
  stopName,
  pageSize: pageSizeProp,
  pinFirst = true,
  dwellMs = 10_000,
  startDelayMs = 0,
  now,
  loading = false,
  error = null,
  emptyMessage,
  className,
  headingLevel = 2,
}: BoardGlanceArrivalsProps) => {
  const rootRef = useRef<HTMLDivElement>(null)
  const [aspect, setAspect] = useState<number | undefined>(undefined)

  useLayoutEffect(() => {
    const el = rootRef.current
    if (!el || typeof ResizeObserver === "undefined") return
    // The shell sizes `--glance-u`; its box never depends on the row count.
    const target =
      el.closest<HTMLElement>(".board-embed.board-glance") ??
      el.parentElement ??
      el
    const update = () => {
      const box = target.getBoundingClientRect()
      if (box.width > 0 && box.height > 0) setAspect(box.height / box.width)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  const pageSize = resolveGlanceArrivalsPageSize(aspect, pageSizeProp)
  const rows = useMemo(
    () => prepareGlanceArrivals({ data: data ?? [], now }),
    [data, now]
  )
  const frames = useMemo(
    () => buildGlanceArrivalFrames(rows, pageSize, { pinFirst }),
    [rows, pageSize, pinFirst]
  )
  const frameIds = useMemo(() => frames.map((frame) => frame.id), [frames])
  const sequence = useUnattendedSequence({
    itemIds: frameIds,
    dwellMs,
    startDelayMs,
    enabled: frames.length > 1,
  })
  const activeFrame =
    frames.find((frame) => frame.id === sequence.itemId) ?? frames[0]
  const TitleTag = `h${headingLevel}` as const
  const emptyCopy = emptyMessage ?? ARRIVALS_EMPTY_COPY.empty

  const showSkeleton = loading && rows.length === 0 && !error

  return (
    <div
      ref={rootRef}
      data-slot="board-glance-arrivals"
      data-glance-rows={pageSize}
      className={cn(
        "flex min-h-0 w-full flex-1 flex-col overflow-hidden",
        className
      )}
      aria-busy={showSkeleton || undefined}
      onFocus={sequence.handleFocus}
      onBlur={sequence.handleBlur}
    >
      <div className="mb-[length:var(--glance-u)] box-border flex h-[length:var(--glance-roundel)] shrink-0 items-center gap-x-[length:var(--glance-gutter)] overflow-clip">
        <TfLRoundel
          variant="underground"
          className="size-[clamp(4.5rem,9.5cqi,6.25rem)] shrink-0"
          aria-hidden
        />
        {stopName ? (
          <TitleTag className="tfl-title min-w-0 flex-1 text-balance text-[length:var(--glance-title)] leading-tight [font-synthesis:none] [font-weight:var(--tfl-title-weight,400)]">
            <StationNameTitle name={stopName} />
          </TitleTag>
        ) : (
          <TitleTag className="sr-only">Arrivals</TitleTag>
        )}
      </div>

      {showSkeleton ? (
        <ul
          className="m-0 flex min-h-0 flex-1 basis-0 list-none flex-col p-0"
          aria-label="Loading arrivals"
        >
          {Array.from({ length: pageSize }).map((_, index) => (
            <li
              key={index}
              className={cn(ROW_CLASS, index < pageSize - 1 && ROW_RULE_CLASS)}
            >
              <span className={cn(RAIL_CLASS, "animate-pulse bg-muted")} />
              <div className="col-start-2 row-start-1 flex">
                <span
                  className={cn(
                    "font-bold",
                    CHIP_SIZE_CLASS,
                    ARRIVALS_IDENTITY_CHIP_WIDTH_CLASS,
                    SKELETON_FILL_CLASS
                  )}
                />
              </div>
              <div className="col-start-2 row-start-2 flex min-w-0">
                <span
                  className={cn(
                    "w-3/4 max-w-sm [text-box:trim-both_cap_alphabetic]",
                    DEST_CLASS,
                    SKELETON_FILL_CLASS
                  )}
                >
                  {" "}
                </span>
              </div>
              <p className={cn("w-1/2 max-w-xs", META_CLASS, SKELETON_FILL_CLASS)}>
                {" "}
              </p>
              <div className={TIME_CLASS}>
                <span className={cn(NUMBER_CLASS, SKELETON_FILL_CLASS)}>00</span>
                <span className={cn(UNIT_CLASS, SKELETON_FILL_CLASS)}>min</span>
              </div>
            </li>
          ))}
        </ul>
      ) : error ? (
        <p
          className="flex min-h-0 flex-1 items-center text-[length:var(--glance-dest)] text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : rows.length === 0 ? (
        <p
          className="flex min-h-0 flex-1 items-center text-[length:var(--glance-dest)] text-muted-foreground"
          role="status"
        >
          {emptyCopy}
        </p>
      ) : (
        <ul
          data-slot="board-glance-rows"
          className="m-0 flex min-h-0 flex-1 basis-0 list-none flex-col p-0"
          role="list"
        >
          {(activeFrame?.rows ?? []).map((row, index, list) => (
            <GlanceArrivalRow
              key={row.key}
              row={row}
              showRule={index < list.length - 1}
            />
          ))}
        </ul>
      )}
      <div
        data-slot="board-glance-dwell"
        className={cn(
          "relative mt-[length:var(--glance-u)] h-1 w-full shrink-0 overflow-hidden bg-foreground/15",
          frames.length > 1 && !error ? undefined : "invisible"
        )}
        aria-hidden
      >
        <div
          className="absolute inset-y-0 left-0 bg-foreground/50 transition-[width] duration-200 ease-linear"
          style={{
            width: sequence.started
              ? `${Math.round(sequence.progress * 100)}%`
              : "0%",
          }}
        />
      </div>
    </div>
  )
}
