"use client"

import { useMemo } from "react"
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
  buildSquareArrivalFrames,
  formatSquareArrivalMeta,
  prepareSquareArrivals,
  resolveSquareArrivalsPageSize,
} from "@/lib/tfl/board-square-arrivals"
import { getLineNameTiers, joinLineNames } from "@/lib/tfl/line-names"
import { usableTflText } from "@/lib/tfl/bus-stop-letter"
import { compareArrivalsLines } from "@/lib/tfl/arrivals-line-sort"
import { cn } from "@/lib/utils"

export type BoardSquareArrivalsProps = {
  data?: readonly RealtimePrediction[]
  stopName?: string
  stopPointId?: string
  /** Visible trains per frame. Default 3; prefer 2 when density=far. */
  pageSize?: number
  densityFar?: boolean
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
const formatSquareCountdown = (
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

const SquareArrivalRow = ({
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
  const meta = formatSquareArrivalMeta(arrival.platformName)
  const countdown = formatSquareCountdown(
    arrival.timeToStation,
    arrival.platformName
  )
  const lineChip = sharedChipLabel ? (
    <LineBadgeGroup variant="codes" lineIds={sharedChipIds} />
  ) : lineTiers && lineId ? (
    <LineBadge
      lineId={lineId}
      name={lineTiers.short}
      className="h-[clamp(3rem,6.5cqi,4rem)] min-w-[7.5ch] justify-center px-3 text-[clamp(1.25rem,2.6cqi,1.5rem)]"
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
      data-slot="board-square-row"
      aria-label={ariaLabel}
      className={cn(
        "grid min-h-0 min-w-0 flex-1 basis-0 grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-x-[clamp(0.75rem,2cqi,1.25rem)] py-[clamp(0.5rem,1.5cqi,1rem)]",
        showRule && "border-b border-border/70"
      )}
    >
      {lineId ? (
        <span
          data-line={lineId}
          className="box-border h-[68%] min-h-12 w-2.5 shrink-0 self-center rounded-sm bg-[var(--line-color)]"
          aria-hidden
        />
      ) : (
        <span className="w-2.5 shrink-0" aria-hidden />
      )}
      <div className="flex items-center" aria-hidden="true">
        {lineChip}
      </div>
      <div className="min-w-0" aria-hidden="true">
        <StationName
          name={destination}
          layout="auto"
          maxLines={2}
          allowAbbreviation
          allowScaleDown
          className="font-semibold text-[length:var(--square-dest)] leading-[1.1]"
        />
        <p
          data-slot="board-square-meta"
          className="mt-[0.35em] truncate text-[length:var(--square-meta)] leading-tight text-muted-foreground"
        >
          {meta ?? lineTiers?.full ?? "Next train"}
        </p>
      </div>
      <div
        data-slot="board-square-time"
        className="flex shrink-0 flex-col items-end justify-center tabular-nums tracking-tight"
        aria-hidden="true"
      >
        <span className="font-semibold leading-none text-[length:var(--square-time)]">
          {countdown.primary}
        </span>
        {countdown.unit ? (
          <span className="mt-[0.15em] text-[length:var(--square-unit)] font-medium leading-none text-muted-foreground">
            {countdown.unit}
          </span>
        ) : null}
      </div>
    </li>
  )
}

/**
 * Room-distance square Board arrivals: flat next trains, huge type, no scroll.
 * Pages overflow with the existing unattended sequence (pin-first).
 */
export const BoardSquareArrivals = ({
  data,
  stopName,
  pageSize: pageSizeProp,
  densityFar = false,
  pinFirst = true,
  dwellMs = 10_000,
  startDelayMs = 0,
  now,
  loading = false,
  error = null,
  emptyMessage,
  className,
  headingLevel = 2,
}: BoardSquareArrivalsProps) => {
  const pageSize = resolveSquareArrivalsPageSize(densityFar, pageSizeProp)
  const rows = useMemo(
    () => prepareSquareArrivals({ data: data ?? [], now }),
    [data, now]
  )
  const frames = useMemo(
    () => buildSquareArrivalFrames(rows, pageSize, { pinFirst }),
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

  if (loading && rows.length === 0 && !error) {
    return (
      <div
        data-slot="board-square-arrivals"
        data-density={densityFar ? "far" : "default"}
        className={cn(
          "@container/square-arrivals flex h-full min-h-0 w-full flex-col",
          className
        )}
        aria-busy
        aria-label="Loading arrivals"
      >
        <div className="flex shrink-0 items-center gap-x-5 pb-[clamp(1rem,2.5cqi,1.75rem)]">
          <div className="size-[clamp(3.5rem,7cqi,4.5rem)] animate-pulse rounded-full bg-muted" />
          <div className="h-[clamp(2.5rem,5cqi,3.25rem)] w-[min(70%,22rem)] animate-pulse rounded bg-muted" />
        </div>
        <ul className="flex min-h-0 flex-1 flex-col" aria-hidden>
          {Array.from({ length: pageSize }).map((_, index) => (
            <li
              key={index}
              className="flex min-h-0 flex-1 items-center gap-4 border-b border-border/60"
            >
              <div className="h-[70%] w-2 animate-pulse rounded-full bg-muted" />
              <div className="h-12 w-16 animate-pulse rounded bg-muted" />
              <div className="h-12 flex-1 animate-pulse rounded bg-muted" />
              <div className="h-16 w-20 animate-pulse rounded bg-muted" />
            </li>
          ))}
        </ul>
      </div>
    )
  }

  return (
    <div
      data-slot="board-square-arrivals"
      data-density={densityFar ? "far" : "default"}
      className={cn(
        "@container/square-arrivals flex h-full min-h-0 w-full flex-col overflow-hidden",
        className
      )}
      onFocus={sequence.handleFocus}
      onBlur={sequence.handleBlur}
    >
      <div className="flex shrink-0 items-center gap-x-[clamp(0.875rem,2cqi,1.25rem)] pb-[clamp(0.75rem,2cqi,1.25rem)]">
        <TfLRoundel
          variant="underground"
          className="size-[clamp(3.5rem,7cqi,4.5rem)] shrink-0"
          aria-hidden
        />
        {stopName ? (
          <TitleTag className="tfl-title min-w-0 flex-1 text-[length:var(--square-title)] leading-tight [font-synthesis:none] [font-weight:var(--tfl-title-weight,400)]">
            <StationNameTitle name={stopName} />
          </TitleTag>
        ) : (
          <TitleTag className="sr-only">Arrivals</TitleTag>
        )}
      </div>

      {error ? (
        <p
          className="flex min-h-0 flex-1 items-center text-[length:var(--square-dest)] text-destructive"
          role="alert"
        >
          {error}
        </p>
      ) : rows.length === 0 ? (
        <p
          className="flex min-h-0 flex-1 items-center text-[length:var(--square-dest)] text-muted-foreground"
          role="status"
        >
          {emptyCopy}
        </p>
      ) : (
        <>
          <ul
            data-slot="board-square-rows"
            className="m-0 flex min-h-0 flex-1 basis-0 list-none flex-col p-0"
            role="list"
          >
            {(activeFrame?.rows ?? []).map((row, index, list) => (
              <SquareArrivalRow
                key={row.key}
                row={row}
                showRule={index < list.length - 1}
              />
            ))}
          </ul>
          {frames.length > 1 ? (
            <div
              data-slot="board-square-dwell"
              className="relative mt-[clamp(0.75rem,1.8cqi,1.25rem)] h-2 w-full shrink-0 overflow-hidden rounded-full bg-muted"
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
          ) : null}
        </>
      )}
    </div>
  )
}
