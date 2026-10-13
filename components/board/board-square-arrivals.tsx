"use client"

import { useMemo } from "react"
import type { PredictionWithSharedTrackIdentity, RealtimePrediction } from "tfl-ts"
import { LineBadge, LineBadgeGroup } from "@/components/tfl/brand/line-badge"
import { TfLRoundel } from "@/components/tfl/brand/tfl-roundel"
import { StationName, StationNameTitle } from "@/components/tfl/station-name"
import { formatArrivalsCountdown } from "@/components/tfl/arrivals/arrivals-bound-group"
import { useUnattendedSequence } from "@/hooks/use-unattended-sequence"
import { resolveArrivalsDestinationText } from "@/lib/tfl/arrivals-destination-text"
import type { ArrivalsEmptyKind } from "@/lib/tfl/arrivals-empty"
import { ARRIVALS_EMPTY_COPY } from "@/lib/tfl/arrivals-empty"
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
  const countdown = formatArrivalsCountdown(arrival.timeToStation, {
    platformName: arrival.platformName,
  })
  const lineChip = sharedChipLabel ? (
    <LineBadgeGroup variant="codes" lineIds={sharedChipIds} />
  ) : lineTiers && lineId ? (
    <LineBadge
      lineId={lineId}
      name={lineTiers.short}
      className="h-12 min-w-[6ch] justify-center px-2 text-lg"
    />
  ) : null

  const ariaLabel = [
    sharedChipLabel ?? lineTiers?.full,
    meta,
    destination,
    countdown,
  ]
    .filter(Boolean)
    .join(", ")

  return (
    <li
      data-slot="board-square-row"
      aria-label={ariaLabel}
      className={cn(
        "grid min-h-0 min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)_auto] grid-rows-[auto_1fr] gap-x-4 gap-y-1 py-3",
        showRule && "border-b border-border/80"
      )}
    >
      <div className="row-span-2 flex items-start pt-1">{lineChip}</div>
      <div className="min-w-0 self-end text-muted-foreground">
        {meta ? (
          <p data-slot="board-square-meta" className="truncate text-[length:var(--square-meta)] leading-tight">
            {meta}
          </p>
        ) : (
          <p data-slot="board-square-meta" className="truncate text-[length:var(--square-meta)] leading-tight">
            {lineTiers?.full ?? "Next train"}
          </p>
        )}
      </div>
      <div
        data-slot="board-square-time"
        className="row-span-2 flex items-end justify-end self-stretch font-semibold tabular-nums leading-none tracking-tight text-[length:var(--square-time)]"
        aria-hidden="true"
      >
        {countdown}
      </div>
      <div className="min-w-0 self-start" aria-hidden="true">
        <StationName
          name={destination}
          layout="auto"
          maxLines={2}
          allowAbbreviation
          allowScaleDown
          className="font-medium text-[length:var(--square-dest)] leading-tight"
        />
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
        <div className="flex shrink-0 items-center gap-x-4 pb-4">
          <div className="size-14 animate-pulse rounded-full bg-muted" />
          <div className="h-10 w-64 max-w-[70%] animate-pulse rounded bg-muted" />
        </div>
        <ul className="flex min-h-0 flex-1 flex-col" aria-hidden>
          {Array.from({ length: pageSize }).map((_, index) => (
            <li
              key={index}
              className="flex min-h-0 flex-1 flex-col justify-center gap-3 border-b border-border/60 py-4"
            >
              <div className="h-6 w-40 animate-pulse rounded bg-muted" />
              <div className="h-10 w-full max-w-md animate-pulse rounded bg-muted" />
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
      <div className="flex shrink-0 items-center gap-x-4 pb-3">
        <TfLRoundel variant="underground" className="size-14 shrink-0" aria-hidden />
        {stopName ? (
          <TitleTag className="tfl-title min-w-0 flex-1 text-[clamp(1.75rem,4.2cqi,2.25rem)] leading-tight [font-synthesis:none] [font-weight:var(--tfl-title-weight,400)]">
            <StationNameTitle name={stopName} />
          </TitleTag>
        ) : (
          <TitleTag className="sr-only">Arrivals</TitleTag>
        )}
      </div>

      {error ? (
        <p className="flex min-h-0 flex-1 items-center text-2xl text-destructive" role="alert">
          {error}
        </p>
      ) : rows.length === 0 ? (
        <p
          className="flex min-h-0 flex-1 items-center text-2xl text-muted-foreground"
          role="status"
        >
          {emptyCopy}
        </p>
      ) : (
        <>
          <ul
            data-slot="board-square-rows"
            className="m-0 flex min-h-0 flex-1 list-none flex-col p-0"
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
              className="relative mt-2 h-1.5 w-full shrink-0 overflow-hidden rounded-full bg-muted"
              aria-hidden
            >
              <div
                className="absolute inset-y-0 left-0 bg-foreground/70 transition-[width] duration-200 ease-linear"
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
