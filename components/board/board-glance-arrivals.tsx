"use client"

import { useLayoutEffect, useMemo, useRef, useState } from "react"
import type { PredictionWithSharedTrackIdentity, RealtimePrediction } from "tfl-ts"
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
    <LineBadgeGroup variant="codes" lineIds={sharedChipIds} />
  ) : lineTiers && lineId ? (
    <LineBadge
      lineId={lineId}
      name={lineTiers.short}
      className="h-[length:var(--glance-chip-h)] min-w-[5ch] justify-center px-3 text-[length:var(--glance-chip-text)]"
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
      className={cn(
        "grid min-h-0 min-w-0 flex-1 basis-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-[clamp(0.5rem,2cqi,1.25rem)] py-[clamp(0.35rem,1.5cqi,1rem)]",
        showRule && "border-b border-border/70"
      )}
    >
      {lineId ? (
        <span
          data-line={lineId}
          className="box-border h-[68%] min-h-8 w-2 shrink-0 self-center rounded-sm bg-[var(--line-color)] @min-[28rem]/glance-arrivals:min-h-12 @min-[28rem]/glance-arrivals:w-2.5"
          aria-hidden
        />
      ) : (
        <span className="w-2 shrink-0 @min-[28rem]/glance-arrivals:w-2.5" aria-hidden />
      )}
      <div className="min-w-0 overflow-hidden" aria-hidden="true">
        {lineChip ? (
          <div className="mb-[0.35em] flex items-center">{lineChip}</div>
        ) : null}
        <StationName
          name={destination}
          layout="auto"
          maxLines={2}
          allowAbbreviation
          allowScaleDown
          className="text-balance font-semibold text-[length:var(--glance-dest)] leading-[1.1]"
        />
        <p
          data-slot="board-glance-meta"
          className="mt-[0.35em] truncate text-balance font-medium text-[length:var(--glance-meta)] leading-tight text-foreground/80"
        >
          {meta ?? lineTiers?.full ?? "Next train"}
        </p>
      </div>
      <div
        data-slot="board-glance-time"
        className="flex w-[4.5ch] shrink-0 flex-col items-end justify-center tabular-nums tracking-tight @min-[28rem]/glance-arrivals:w-auto"
        aria-hidden="true"
      >
        <span className="font-semibold leading-none text-[length:var(--glance-time)]">
          {countdown.primary}
        </span>
        {countdown.unit ? (
          <span className="mt-[0.15em] text-[length:var(--glance-unit)] font-medium leading-none text-muted-foreground">
            {countdown.unit}
          </span>
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
    const update = () => {
      // Prefer the filled parent (aspect-ratio frame); the root can lag on first paint.
      const box = (el.parentElement ?? el).getBoundingClientRect()
      if (box.width > 0 && box.height > 0) setAspect(box.height / box.width)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el.parentElement ?? el)
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
      className={cn(
        "@container/glance-arrivals flex min-h-0 w-full flex-1 flex-col overflow-hidden",
        className
      )}
      aria-busy={showSkeleton || undefined}
      onFocus={sequence.handleFocus}
      onBlur={sequence.handleBlur}
    >
      <div className="flex shrink-0 items-center gap-x-[clamp(0.875rem,2cqi,1.25rem)] pb-[clamp(0.75rem,2cqi,1.25rem)]">
        <TfLRoundel
          variant="underground"
          className="size-[clamp(4.5rem,9.5cqi,6.25rem)] shrink-0"
          aria-hidden
        />
        {stopName ? (
          <TitleTag className="tfl-title min-w-0 flex-1 text-[length:var(--glance-title)] leading-tight [font-synthesis:none] [font-weight:var(--tfl-title-weight,400)]">
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
              className={cn(
                "grid min-h-0 flex-1 basis-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-[clamp(0.5rem,2cqi,1.25rem)] py-[clamp(0.35rem,1.5cqi,1rem)]",
                index < pageSize - 1 && "border-b border-border/70"
              )}
            >
              <div className="h-[68%] w-2 animate-pulse rounded-sm bg-muted" />
              <div className="flex min-w-0 flex-col gap-[0.35em]">
                <div className="h-[length:var(--glance-chip-h)] w-24 animate-pulse rounded bg-muted" />
                <div className="h-[1.2em] w-3/4 max-w-sm animate-pulse rounded bg-muted text-[length:var(--glance-dest)]" />
                <div className="h-[1.1em] w-48 animate-pulse rounded bg-muted text-[length:var(--glance-meta)]" />
              </div>
              <div className="h-16 w-20 animate-pulse rounded bg-muted" />
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
          "relative mt-[clamp(0.75rem,1.8cqi,1.25rem)] h-2 w-full shrink-0 overflow-hidden rounded-full bg-muted",
          frames.length > 1 && !error ? undefined : "invisible"
        )}
        aria-hidden
      >
        <div
          className="absolute inset-y-0 left-0 bg-foreground/75 transition-[width] duration-200 ease-linear"
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
