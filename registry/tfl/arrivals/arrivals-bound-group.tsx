"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react"
import { Play, RotateCcw, RotateCw } from "lucide-react"
import type { PredictionWithSharedTrackIdentity } from "tfl-ts"
import { BusNumberChip } from "@/components/tfl/arrivals/bus-number-chip"
import {
  ARRIVALS_IDENTITY_CHIP_WIDTH_CLASS,
  CHIP_CAP_TEXT_BOX_CLASS,
} from "@/components/tfl/arrivals/chip-text"
import { QuietChip } from "@/components/tfl/arrivals/quiet-chip"
import { useUnattendedSequence } from "@/hooks/use-unattended-sequence"
import {
  buildPinnedFrames,
  type ArrivalsPinAdvance,
} from "@/lib/tfl/arrivals-unattended-frames"
import type { ArrivalsLockHeight } from "@/lib/tfl/arrivals-prepare"
import {
  UNATTENDED_DEFAULT_DWELL_MS,
  type DisplayBehaviour,
} from "@/lib/tfl/unattended-sequence"
import { PlatformChip } from "@/components/tfl/arrivals/platform-chip"
import {
  LineBadge,
  LineBadgeGroup,
  LineColorBar,
} from "@/components/tfl/brand/line-badge"
import { LineName } from "@/components/tfl/brand/line-name"
import { StationName } from "@/components/tfl/station-name"
import {
  ARRIVALS_END_COPY,
  ARRIVALS_END_COPY_SHORT,
  ARRIVALS_LINE_EMPTY_COPY,
} from "@/lib/tfl/arrivals-empty"
import {
  formatArrivalsBoundLabel,
  formatArrivalsRailDesignationLabel,
  isUnknownArrivalsPlatform,
  parseArrivalsPlatformLabel,
  type ArrivalsRailDesignation,
} from "@/lib/tfl/arrivals-bound-sort"
import { resolveArrivalsDestinationText } from "@/lib/tfl/arrivals-destination-text"
import { compareArrivalsLines } from "@/lib/tfl/arrivals-line-sort"
import { getLineNameTiers, joinLineNames } from "@/lib/tfl/line-names"
import {
  chunkBoundPages,
  type ArrivalsPageFill,
  type ArrivalsPreparedBound,
  type ArrivalsPreparedGroup,
  type ArrivalsPreparedRow,
} from "@/lib/tfl/arrivals-prepare"
import { usableTflText } from "@/lib/tfl/bus-stop-letter"
import { cn } from "@/lib/utils"

type ArrivalsBoardMode = "rail" | "bus"

/**
 * Layout-level class overrides for generated board parts. Each key maps to a
 * stable `data-slot` element. Keep to layout levels — decorative spans, chips,
 * and countdowns are styled through the theme, not this API.
 *
 * - `groups` → `arrivals-groups`: the line / route sections container.
 * - `group` → `arrivals-group`: one line (rail) or route (bus) section. Each
 *   is also a container named `arrivals-group`, so children can respond to the
 *   section's own width.
 * - `subgroups` → `arrivals-subgroups`: rail only — the bounds list inside a
 *   line section.
 * - `subgroup` → `arrivals-subgroup`: rail only — one bound (label + rows).
 * - `rows` → `arrivals-rows`: the arrival rows list (per bound on rail, per
 *   route on grouped bus, the whole list on flat bus).
 */
export type ArrivalsBoardClassNames = {
  groups?: string
  group?: string
  subgroups?: string
  subgroup?: string
  rows?: string
}

/**
 * Keep in sync with `ARRIVALS_TILE_CLASS` / row rule in arrivals-board-view.
 * This file cannot import those constants — the view imports this module.
 */
const TILE_CLASS =
  "box-border h-[var(--arrivals-row)] min-h-[var(--arrivals-row)] max-h-[var(--arrivals-row)] shrink-0 overflow-clip"

const ROW_RULE_CLASS =
  "relative after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-border/60"

const LIST_RESET_CLASS = "m-0 ml-0 list-none space-y-0 p-0 [&>li]:mt-0"

const STRIPED_MODE_NAMES = new Set([
  "overground",
  "elizabeth-line",
  "cable-car",
])

/**
 * A `Platform Unknown` mainline row (Weaver not yet platformed) reports a
 * fixed ~45s `timeToStation` no matter how far away the train really is —
 * confirmed against `timeToLive` on live Liverpool Street data, real gaps
 * up to 98 minutes. "Due"/"X min" would be a fabricated countdown; TfL
 * hasn't allocated a platform yet, so there's no live position to count
 * down from. See docs/arrivals-shared-platforms.md.
 */
export const formatArrivalsCountdown = (
  seconds?: number,
  options?: { platformName?: string }
): string => {
  if (isUnknownArrivalsPlatform(options?.platformName)) return "Scheduled"
  if (seconds === undefined || seconds < 0) return "-"
  if (seconds < 60) return "Due"
  return `${Math.floor(seconds / 60)} min`
}

export const getArrivalsPlatformNumber = (
  platformName?: string
): string | null => parseArrivalsPlatformLabel(platformName)

export const ArrivalRowItem = ({
  row,
  mode,
  showRule,
  showLineChip = false,
  hoistPlatform = false,
  rank,
}: {
  row: ArrivalsPreparedRow
  mode: ArrivalsBoardMode
  showRule: boolean
  /** Mixed-line section: line identity before the destination. */
  showLineChip?: boolean
  /** Platform already lives in the subgroup heading — omit the row chip. */
  hoistPlatform?: boolean
  /** 1-based rank in the full ordered list (unattended). */
  rank?: number
}) => {
  const rawDestination =
    usableTflText(row.arrival.towards) ||
    usableTflText(row.arrival.destinationName) ||
    "Unknown"
  const platformNumber =
    mode === "rail" && !hoistPlatform
      ? getArrivalsPlatformNumber(row.arrival.platformName)
      : null
  const tagged = row.arrival as PredictionWithSharedTrackIdentity
  const rawLineId = row.arrival.lineId?.trim() || ""
  const identity = tagged.sharedTrackIdentity
  const canonicalLineId =
    identity?.confidence === "exclusive-segment"
      ? identity.canonicalLineId.trim()
      : undefined
  const lineId = canonicalLineId || rawLineId
  const remapped = Boolean(canonicalLineId) && canonicalLineId !== rawLineId
  const sharedChipIds =
    showLineChip &&
    identity?.confidence === "ambiguous" &&
    identity.rawLineIds.length >= 2
      ? [...identity.rawLineIds]
          .map((id) => id.trim())
          .filter(Boolean)
          .sort((a, b) =>
            compareArrivalsLines(
              { lineId: a, lineName: getLineNameTiers(a).full },
              { lineId: b, lineName: getLineNameTiers(b).full },
            ),
          )
      : []
  const lineTiers = lineId
    ? getLineNameTiers(lineId, remapped ? undefined : row.arrival.lineName)
    : null
  const lineChipLabel =
    showLineChip && sharedChipIds.length < 2 && lineTiers
      ? lineTiers.short
      : null
  const sharedChipLabel =
    sharedChipIds.length >= 2
      ? joinLineNames(sharedChipIds.map((id) => getLineNameTiers(id).full))
      : null
  const remapNote = remapped && lineTiers
    ? `TfL currently labels this arrival ${getLineNameTiers(rawLineId, row.arrival.lineName).full} on this platform; it's running the ${lineTiers.full} line loop`
    : null
  const sharedNote =
    !remapNote && sharedChipLabel
      ? `TfL currently lists this arrival on ${sharedChipLabel}`
      : null
  const routeLabel =
    mode === "bus"
      ? (row.arrival.lineName ?? row.arrival.lineId ?? "").trim() || null
      : null
  // TfL sometimes repeats the line name as the destination ("Circle Line" on
  // the Circle line) or sends a generic instruction ("Check Front of
  // Train") — both are already implied by the line heading/chip. Prefer
  // `currentLocation` ("At South Kensington Platform 1") when present; see
  // docs/arrivals-shared-platforms.md.
  const destination = resolveArrivalsDestinationText({
    destination: rawDestination,
    lineName: sharedChipLabel ?? lineTiers?.full ?? routeLabel,
    currentLocation: usableTflText(row.arrival.currentLocation),
  })
  const countdown = formatArrivalsCountdown(row.arrival.timeToStation, {
    platformName: row.arrival.platformName,
  })
  const rowLabel = [
    rank ? `Arrival ${rank}` : null,
    platformNumber ? `Platform ${platformNumber}` : null,
    sharedChipLabel ??
      (lineChipLabel
        ? lineTiers?.full
        : routeLabel
          ? `Route ${routeLabel}`
          : null),
    destination,
    countdown,
    remapNote ?? sharedNote,
  ]
    .filter(Boolean)
    .join(", ")

  const lineChip = sharedChipLabel ? (
    <LineBadgeGroup variant="codes" lineIds={sharedChipIds} />
  ) : lineChipLabel ? (
    <LineBadge
      lineId={lineId}
      name={lineChipLabel}
      className={cn(
        "h-5 justify-center px-0",
        ARRIVALS_IDENTITY_CHIP_WIDTH_CLASS,
        CHIP_CAP_TEXT_BOX_CLASS,
      )}
    />
  ) : null

  const identityLead =
    mode === "bus"
      ? routeLabel
        ? <BusNumberChip label={routeLabel} />
        : null
      : platformNumber || lineChip
        ? (
          <div className="flex min-w-0 items-center gap-x-2">
            {platformNumber ? (
              <PlatformChip number={platformNumber} compact />
            ) : null}
            {lineChip}
          </div>
        )
        : null

  const leading =
    rank || identityLead ? (
      <div className="flex min-w-0 items-center gap-x-2">
        {rank ? (
          <QuietChip aria-hidden>{rank}</QuietChip>
        ) : null}
        {identityLead}
      </div>
    ) : null

  return (
    <li
      data-slot="arrivals-row"
      aria-label={rowLabel}
      title={remapNote ?? sharedNote ?? undefined}
      className={cn(
        "grid items-center gap-x-3 text-base",
        leading
          ? "grid-cols-[auto_minmax(0,1fr)_auto]"
          : "grid-cols-[minmax(0,1fr)_auto]",
        TILE_CLASS,
        showRule && ROW_RULE_CLASS
      )}
    >
      {leading}
      <div className="min-w-0" aria-hidden="true">
        <StationName
          name={destination}
          layout="auto"
          maxLines={2}
          allowAbbreviation
          allowScaleDown
          className="font-medium"
        />
      </div>
      <span className="shrink-0 font-semibold tabular-nums" aria-hidden="true">
        {countdown}
      </span>
    </li>
  )
}

const useArrivalsPageTrack = (pageCount: number) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<(HTMLElement | null)[]>([])
  const [activePage, setActivePage] = useState(0)

  useEffect(() => {
    slideRefs.current = slideRefs.current.slice(0, pageCount)
  }, [pageCount])

  useEffect(() => {
    if (activePage <= pageCount - 1) return
    const safe = Math.max(0, pageCount - 1)
    setActivePage(safe)
    const frame = requestAnimationFrame(() => {
      slideRefs.current[safe]?.scrollIntoView({
        inline: "start",
        block: "nearest",
        behavior: "auto",
      })
    })
    return () => cancelAnimationFrame(frame)
  }, [activePage, pageCount])

  useEffect(() => {
    const container = containerRef.current
    if (!container || pageCount <= 1) return

    const ratios = new Map<Element, number>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target, entry.intersectionRatio)
        }
        let bestIndex = 0
        let bestRatio = -1
        for (let index = 0; index < pageCount; index++) {
          const slide = slideRefs.current[index]
          if (!slide) continue
          const ratio = ratios.get(slide) ?? 0
          if (ratio > bestRatio) {
            bestRatio = ratio
            bestIndex = index
          }
        }
        setActivePage((current) =>
          current === bestIndex ? current : bestIndex
        )
      },
      { root: container, threshold: [0.5, 0.6, 0.75, 1] }
    )

    const frame = requestAnimationFrame(() => {
      for (let index = 0; index < pageCount; index++) {
        const slide = slideRefs.current[index]
        if (slide) observer.observe(slide)
      }
    })

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [pageCount])

  const goToPage = useCallback(
    (index: number) => {
      const safe = Math.min(Math.max(0, index), Math.max(0, pageCount - 1))
      slideRefs.current[safe]?.scrollIntoView({
        inline: "start",
        block: "nearest",
        behavior: "auto",
      })
      setActivePage(safe)
    },
    [pageCount]
  )

  const handlePrev = useCallback(() => {
    goToPage(activePage - 1)
  }, [activePage, goToPage])

  const handleNext = useCallback(() => {
    goToPage(activePage + 1)
  }, [activePage, goToPage])

  const setSlideRef = useCallback(
    (index: number) => (element: HTMLElement | null) => {
      slideRefs.current[index] = element
    },
    []
  )

  return {
    containerRef,
    setSlideRef,
    activePage: Math.min(activePage, Math.max(0, pageCount - 1)),
    handlePrev,
    handleNext,
  }
}

/**
 * On a shared tile (rail bound heading, bus route header) the controls must
 * never reserve row width next to the label — a pager that "might appear"
 * would otherwise force the label into a narrower tier for every row, paged
 * or not. So outside `ownsTile`, both control shapes are `absolute` overlays
 * on the row's own `relative` box (`ROW_RULE_CLASS` or the group header),
 * not flex items. `ownsTile` (flat bus) keeps the original in-flow layout —
 * nothing else lives in that tile, so reserving space there is free.
 */
const BoundPager = ({
  label,
  page,
  pageCount,
  onPrev,
  onNext,
  ownsTile = false,
}: {
  label: string
  page: number
  pageCount: number
  onPrev: () => void
  onNext: () => void
  /** Dedicated control tile (flat bus) — stay visible on hover-capable pointers. */
  ownsTile?: boolean
}) => {
  if (pageCount <= 1) return null

  const atStart = page <= 0
  const atEnd = page >= pageCount - 1

  const controls = (
    <>
      <button
        type="button"
        aria-label={`Previous ${label} arrivals`}
        disabled={atStart}
        onClick={onPrev}
        className="relative inline-flex h-6 min-w-6 cursor-pointer items-center justify-center pr-1.5 pl-0 text-muted-foreground before:absolute before:inset-y-[-0.5rem] before:inset-x-[-0.25rem] before:content-[''] disabled:pointer-events-none disabled:cursor-default disabled:opacity-25"
      >
        <Play
          className="size-3 -scale-x-100 fill-current stroke-none"
          aria-hidden
        />
      </button>
      <span className="min-w-[2.75ch] text-center text-xs leading-none tabular-nums">
        <span aria-hidden="true">
          {page + 1}/{pageCount}
        </span>
        <span className="sr-only">
          Page {page + 1} of {pageCount}
        </span>
      </span>
      <button
        type="button"
        aria-label={`Next ${label} arrivals`}
        disabled={atEnd}
        onClick={onNext}
        className="relative inline-flex h-6 min-w-6 cursor-pointer items-center justify-center pr-0 pl-1.5 text-muted-foreground before:absolute before:inset-y-[-0.5rem] before:inset-x-[-0.25rem] before:content-[''] disabled:pointer-events-none disabled:cursor-default disabled:opacity-25"
      >
        <Play className="size-3 fill-current stroke-none" aria-hidden />
      </button>
    </>
  )

  const dots = Array.from({ length: pageCount }, (_, index) => (
    <span
      key={index}
      className={cn(
        "size-1.5 rounded-full bg-current",
        index === page ? "opacity-100" : "opacity-40"
      )}
    />
  ))

  if (ownsTile) {
    return (
      <div className="ml-auto flex h-6 shrink-0 items-center text-muted-foreground">
        <div className="hidden items-center p-0 [@media(hover:hover)]:flex">
          {controls}
        </div>
        <div
          className="flex items-center gap-1 opacity-50 [@media(hover:hover)]:hidden"
          aria-hidden="true"
        >
          {dots}
        </div>
        <span className="sr-only [@media(hover:hover)]:hidden">
          Page {page + 1} of {pageCount}
        </span>
      </div>
    )
  }

  return (
    <>
      {/* Hover-capable: revealed on group hover or keyboard focus-visible,
          with a background — overlays the tail of the label. Mouse click
          must not stick the overlay after unhover (`:focus-within` would). */}
      <div
        className={cn(
          "absolute inset-y-0 right-0 hidden items-center bg-linear-to-l from-background from-70% via-background to-transparent pl-6 text-muted-foreground opacity-0 transition-opacity duration-150 [@media(hover:hover)]:flex",
          "pointer-events-none",
          "[@media(hover:hover)]:group-hover/bound:opacity-100 [@media(hover:hover)]:group-hover/bound:pointer-events-auto",
          "[@media(hover:hover)]:group-has-focus-visible/bound:opacity-100 [@media(hover:hover)]:group-has-focus-visible/bound:pointer-events-auto"
        )}
      >
        {controls}
      </div>
      {/* Touch / no-hover: indicators only (swipe the rows track). Wide
          sections keep them vertically centred; below 18rem they sit just
          above the hairline so they don't cover a long bound label. */}
      <div
        className="pointer-events-none absolute inset-y-0 right-0 flex items-center gap-1 text-muted-foreground opacity-50 [@media(hover:hover)]:hidden @max-[18rem]/arrivals-group:inset-y-auto @max-[18rem]/arrivals-group:bottom-1"
        aria-hidden="true"
      >
        {dots}
      </div>
      <span className="sr-only [@media(hover:hover)]:hidden">
        Page {page + 1} of {pageCount}
      </span>
    </>
  )
}

const UnattendedDwellBar = ({
  canAdvance,
  paused,
  started,
  frameKey,
  dwellMs,
  ownsTile = false,
}: {
  canAdvance: boolean
  paused: boolean
  started: boolean
  frameKey: string
  dwellMs: number
  ownsTile?: boolean
}) => {
  const fill = canAdvance && started
  const bar = (
    <div
      className="h-1 w-14 overflow-hidden bg-foreground/15"
      aria-hidden
    >
      {fill ? (
        <div
          key={`${frameKey}-go`}
          className="tfl-unattended-dwell h-full w-full bg-foreground/50"
          data-paused={paused ? "true" : undefined}
          style={{ "--unattended-dwell": `${dwellMs}ms` } as CSSProperties}
        />
      ) : null}
    </div>
  )

  if (ownsTile) {
    return (
      <div className="ml-auto flex h-6 shrink-0 items-center">{bar}</div>
    )
  }

  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center">
      {bar}
    </div>
  )
}

const QuietDashTile = ({ showRule }: { showRule: boolean }) => (
  <li
    data-slot="arrivals-row"
    aria-hidden
    className={cn(
      "flex items-center text-base text-muted-foreground/50",
      TILE_CLASS,
      showRule && ROW_RULE_CLASS
    )}
  >
    —
  </li>
)

const ArrivalsEndMessageTile = ({ showRule }: { showRule: boolean }) => (
  <li
    data-slot="arrivals-row"
    className={cn(
      "@container/arrivals-end flex items-center text-base text-muted-foreground",
      TILE_CLASS,
      showRule && ROW_RULE_CLASS
    )}
    aria-label={ARRIVALS_END_COPY}
  >
    <span
      className="whitespace-nowrap @min-[16rem]/arrivals-end:hidden"
      aria-hidden
    >
      {ARRIVALS_END_COPY_SHORT}
    </span>
    <span
      className="hidden whitespace-nowrap @min-[16rem]/arrivals-end:inline"
      aria-hidden
    >
      {ARRIVALS_END_COPY}
    </span>
  </li>
)

const PagedArrivalRows = ({
  rows,
  dashCount,
  showEndMessage,
  mode,
  isLast,
  emptyLabel,
  showLineChip = false,
  hoistPlatform = false,
  ranks,
}: {
  rows: readonly ArrivalsPreparedRow[]
  dashCount: number
  showEndMessage: boolean
  mode: ArrivalsBoardMode
  isLast: boolean
  emptyLabel: string
  showLineChip?: boolean
  hoistPlatform?: boolean
  ranks?: readonly number[]
}) => {
  const trailingCount = dashCount + (showEndMessage ? 1 : 0)

  return (
    <>
      {rows.length === 0 ? (
        <li
          data-slot="arrivals-row"
          className={cn(
            "flex items-center text-base text-muted-foreground",
            TILE_CLASS,
            !(isLast && trailingCount === 0) && ROW_RULE_CLASS
          )}
          aria-label={emptyLabel}
        >
          {ARRIVALS_LINE_EMPTY_COPY}
        </li>
      ) : (
        rows.map((row, index) => (
          <ArrivalRowItem
            key={row.key}
            row={row}
            mode={mode}
            showRule={
              !(isLast && index === rows.length - 1 && trailingCount === 0)
            }
            showLineChip={showLineChip}
            hoistPlatform={hoistPlatform}
            rank={ranks?.[index]}
          />
        ))
      )}
      {Array.from({ length: dashCount }, (_, index) => (
        <QuietDashTile
          key={`dash-${index}`}
          showRule={
            !(isLast && index === dashCount - 1 && !showEndMessage)
          }
        />
      ))}
      {showEndMessage ? (
        <ArrivalsEndMessageTile showRule={!isLast} />
      ) : null}
    </>
  )
}

const ArrivalsPageTrack = ({
  pages,
  mode,
  isLast,
  emptyLabel,
  containerRef,
  setSlideRef,
  className,
  showLineChip = false,
  hoistPlatform = false,
}: {
  pages: readonly ArrivalsPageFill[]
  mode: ArrivalsBoardMode
  isLast: boolean
  emptyLabel: string
  containerRef: RefObject<HTMLDivElement | null>
  setSlideRef: (index: number) => (element: HTMLElement | null) => void
  className?: string
  showLineChip?: boolean
  hoistPlatform?: boolean
}) => {
  if (pages.length <= 1) {
    const only = pages[0]
    return (
      <ul
        data-slot="arrivals-rows"
        className={cn(LIST_RESET_CLASS, className)}
        role="list"
      >
        <PagedArrivalRows
          rows={only?.rows ?? []}
          dashCount={only?.dashCount ?? 0}
          showEndMessage={only?.showEndMessage ?? false}
          mode={mode}
          isLast={isLast}
          emptyLabel={emptyLabel}
          showLineChip={showLineChip}
          hoistPlatform={hoistPlatform}
        />
      </ul>
    )
  }

  return (
    <div
      ref={containerRef}
      className="flex min-w-0 snap-x snap-mandatory gap-x-6 overflow-x-auto overscroll-x-contain scrollbar-none"
    >
      {pages.map((page, index) => (
        <ul
          key={`page-${index}`}
          ref={setSlideRef(index)}
          data-slot="arrivals-rows"
          className={cn(
            LIST_RESET_CLASS,
            "w-full min-w-full shrink-0 snap-start snap-always",
            className
          )}
          role="list"
        >
          <PagedArrivalRows
            rows={page.rows}
            dashCount={page.dashCount}
            showEndMessage={page.showEndMessage}
            mode={mode}
            isLast={isLast}
            emptyLabel={emptyLabel}
            showLineChip={showLineChip}
            hoistPlatform={hoistPlatform}
          />
        </ul>
      ))}
    </div>
  )
}

type UnattendedArrivalSession = {
  frame: ReturnType<typeof buildPinnedFrames>["frames"][number] | undefined
  canAdvance: boolean
  frameKey: string
  paused: boolean
  started: boolean
  dwellMs: number
  handlePointerEnter: ReturnType<typeof useUnattendedSequence>["handlePointerEnter"]
  handlePointerLeave: ReturnType<typeof useUnattendedSequence>["handlePointerLeave"]
  handleFocus: ReturnType<typeof useUnattendedSequence>["handleFocus"]
  handleBlur: ReturnType<typeof useUnattendedSequence>["handleBlur"]
}

const useUnattendedArrivalSession = ({
  rows,
  pageSize,
  pinFirst = true,
  pinAdvance,
  lockHeight = true,
  dwellMs = UNATTENDED_DEFAULT_DWELL_MS,
  startDelayMs = 0,
  enabled,
}: {
  rows: readonly ArrivalsPreparedRow[]
  pageSize: number
  pinFirst?: boolean
  pinAdvance?: ArrivalsPinAdvance
  lockHeight?: ArrivalsLockHeight
  dwellMs?: number
  startDelayMs?: number
  enabled: boolean
}): UnattendedArrivalSession => {
  const { frames } = useMemo(
    () => buildPinnedFrames(rows, pageSize, { pinFirst, pinAdvance, lockHeight }),
    [lockHeight, pageSize, pinAdvance, pinFirst, rows]
  )
  const itemIds = useMemo(() => frames.map((frame) => frame.id), [frames])
  const sequence = useUnattendedSequence({
    itemIds,
    dwellMs,
    startDelayMs,
    enabled: enabled && itemIds.length > 1,
  })
  const frame = frames[sequence.index] ?? frames[0]
  return {
    frame,
    canAdvance: itemIds.length > 1,
    frameKey: frame?.id ?? "empty",
    paused: sequence.pauseReasons.length > 0,
    started: sequence.started,
    dwellMs,
    handlePointerEnter: sequence.handlePointerEnter,
    handlePointerLeave: sequence.handlePointerLeave,
    handleFocus: sequence.handleFocus,
    handleBlur: sequence.handleBlur,
  }
}

const UnattendedArrivalFrames = ({
  session,
  mode,
  isLast,
  emptyLabel,
  className,
  showLineChip = false,
  hoistPlatform = false,
}: {
  session: UnattendedArrivalSession
  mode: ArrivalsBoardMode
  isLast: boolean
  emptyLabel: string
  className?: string
  showLineChip?: boolean
  hoistPlatform?: boolean
}) => {
  const frame = session.frame
  return (
    <ul
      data-slot="arrivals-rows"
      className={cn(LIST_RESET_CLASS, className)}
      role="list"
    >
      <PagedArrivalRows
        rows={frame?.rows ?? []}
        dashCount={frame?.dashCount ?? 0}
        showEndMessage={frame?.showEndMessage ?? false}
        mode={mode}
        isLast={isLast}
        emptyLabel={emptyLabel}
        showLineChip={showLineChip}
        hoistPlatform={hoistPlatform}
        ranks={frame?.ranks}
      />
    </ul>
  )
}

const boundDataAttr = (bound: ArrivalsPreparedBound): string | undefined => {
  if (bound.boundId) return bound.boundId
  if (bound.platformLabel) return bound.platformLabel.toLowerCase()
  if (bound.kind === "unknown") return "unknown"
  return undefined
}

/** Inner Rail = anticlockwise, Outer Rail = clockwise (LU convention). */
const RAIL_DESIGNATION_ICON: Record<
  ArrivalsRailDesignation,
  typeof RotateCcw
> = {
  inner: RotateCcw,
  outer: RotateCw,
}

/**
 * Bound heading label. When a platform is hoisted, the platform word uses
 * the same CSS-only ladder as PlatformChip (Platform N → Plat N → PN).
 * Inner/Outer Rail bounds add one tighter tier: (icon) "P1".
 * The container is this label's own flex box (`@container/bound-heading`),
 * so 2-up bound columns see their column width, not the line section.
 * Thresholds are each tier's own rendered width at `text-xl leading-7
 * font-semibold` (worst case "Southbound · Platform 12") plus this row's
 * `pr-2` (8px) buffer. Aria keeps the full `bound.label`.
 */
const BoundHeadingLabel = ({ bound }: { bound: ArrivalsPreparedBound }) => {
  if (!bound.label) return null
  if (!bound.platformLabel) {
    return <span className="min-w-0 flex-1 truncate pr-2">{bound.label}</span>
  }

  const prefix = bound.boundId
    ? formatArrivalsBoundLabel(bound.boundId)
    : bound.railDesignation
      ? formatArrivalsRailDesignationLabel(bound.railDesignation)
      : null
  const platform = bound.platformLabel
  const Icon = bound.railDesignation
    ? RAIL_DESIGNATION_ICON[bound.railDesignation]
    : null
  const join = (platformText: string) =>
    prefix ? `${prefix} · ${platformText}` : platformText

  return (
    <span
      className="@container/bound-heading block min-w-0 flex-1 pr-2"
      aria-label={bound.label}
    >
      {Icon ? (
        <span
          className="flex items-center gap-1 @min-[9rem]/bound-heading:hidden"
          aria-hidden
        >
          <Icon className="size-3.5 shrink-0" />
          <span className="tabular-nums">P{platform}</span>
        </span>
      ) : null}
      <span
        className={cn(
          "truncate whitespace-nowrap",
          Icon
            ? "hidden @min-[9rem]/bound-heading:inline @min-[12.5rem]/bound-heading:hidden"
            : "@min-[12.5rem]/bound-heading:hidden",
        )}
        aria-hidden
      >
        {join(`P${platform}`)}
      </span>
      <span
        className="hidden truncate whitespace-nowrap @min-[12.5rem]/bound-heading:inline @min-[15.5rem]/bound-heading:hidden"
        aria-hidden
      >
        {join(`Plat ${platform}`)}
      </span>
      <span
        className="hidden truncate whitespace-nowrap @min-[15.5rem]/bound-heading:inline"
        aria-hidden
      >
        {bound.label}
      </span>
    </span>
  )
}

export const ArrivalsBoundGroup = ({
  bound,
  mode,
  lineName,
  isLastBound,
  pageSize = 0,
  showLineChip = false,
  classNames,
  behaviour = "interactive",
  pinFirst = true,
  pinAdvance,
  dwellMs,
  startDelayMs,
}: {
  bound: ArrivalsPreparedBound
  mode: ArrivalsBoardMode
  lineName: string
  isLastBound: boolean
  pageSize?: number
  showLineChip?: boolean
  classNames?: ArrivalsBoardClassNames
  behaviour?: DisplayBehaviour
  pinFirst?: boolean
  pinAdvance?: ArrivalsPinAdvance
  dwellMs?: number
  startDelayMs?: number
}) => {
  const canPage = Boolean(bound.label) && pageSize > 0
  const unattended = behaviour === "unattended" && canPage
  const chunked = chunkBoundPages(bound.rows, canPage ? pageSize : 0, {
    lockHeight: canPage,
  })
  const { containerRef, setSlideRef, activePage, handlePrev, handleNext } =
    useArrivalsPageTrack(unattended ? 1 : chunked.pageCount)
  const showPager = canPage && !unattended && chunked.pageCount > 1
  const emptyScope = bound.label ? `${lineName} ${bound.label}` : lineName
  const emptyLabel = `${emptyScope}: ${ARRIVALS_LINE_EMPTY_COPY}`
  const session = useUnattendedArrivalSession({
    rows: bound.rows,
    pageSize,
    pinFirst,
    pinAdvance,
    lockHeight: true,
    dwellMs,
    startDelayMs,
    enabled: unattended,
  })

  return (
    <li
      data-slot="arrivals-subgroup"
      data-bound={boundDataAttr(bound)}
      className={cn("group/bound min-w-0", classNames?.subgroup)}
      onPointerEnter={unattended ? session.handlePointerEnter : undefined}
      onPointerLeave={unattended ? session.handlePointerLeave : undefined}
      onFocus={unattended ? session.handleFocus : undefined}
      onBlur={unattended ? session.handleBlur : undefined}
    >
      {bound.label ? (
        <div
          className={cn(
            "flex items-center text-xl leading-7 font-semibold text-muted-foreground",
            TILE_CLASS,
            ROW_RULE_CLASS
          )}
        >
          <BoundHeadingLabel bound={bound} />
          {unattended ? (
            <UnattendedDwellBar
              canAdvance={session.canAdvance}
              paused={session.paused}
              started={session.started}
              frameKey={session.frameKey}
              dwellMs={session.dwellMs}
            />
          ) : showPager ? (
            <BoundPager
              label={bound.label}
              page={activePage}
              pageCount={chunked.pageCount}
              onPrev={handlePrev}
              onNext={handleNext}
            />
          ) : null}
        </div>
      ) : null}
      {unattended ? (
        <UnattendedArrivalFrames
          session={session}
          mode={mode}
          isLast={isLastBound}
          emptyLabel={emptyLabel}
          className={classNames?.rows}
          showLineChip={showLineChip}
          hoistPlatform={bound.platformUniform}
        />
      ) : (
        <ArrivalsPageTrack
          pages={chunked.pages}
          mode={mode}
          isLast={isLastBound}
          emptyLabel={emptyLabel}
          containerRef={containerRef}
          setSlideRef={setSlideRef}
          className={classNames?.rows}
          showLineChip={showLineChip}
          hoistPlatform={bound.platformUniform}
        />
      )}
    </li>
  )
}

export const ArrivalsGroupHeader = ({
  group,
  headingLevel,
  pager,
}: {
  group: ArrivalsPreparedGroup
  headingLevel: 1 | 2
  pager?: ReactNode
}) => {
  const LineHeadingTag = headingLevel === 2 ? "h3" : "h2"
  const lineIds = group.lineIds.length > 0 ? group.lineIds : [group.lineId]
  const isMerged = lineIds.length > 1
  const lineKey = group.kind === "bus-route" ? "buses" : group.lineId
  const isStriped = Boolean(
    group.kind === "rail-line" &&
      group.modeName &&
      STRIPED_MODE_NAMES.has(group.modeName)
  )
  const overlayBar = isMerged || isStriped

  return (
    <header
      data-line={isMerged ? undefined : lineKey || undefined}
      className={cn("relative flex items-center border-b-4", TILE_CLASS)}
      style={{
        borderBottomColor: overlayBar ? "transparent" : "var(--line-color)",
      }}
    >
      <LineHeadingTag
        className={cn(
          "m-0 min-w-0 flex-1 pr-2 text-xl leading-7 font-semibold",
          isMerged
            ? "text-foreground"
            : "text-[var(--line-color)]",
          !isMerged && group.kind === "rail-line" && "tfl-dark-line-text",
          !group.hasInformation && "opacity-70",
          !isMerged && "truncate"
        )}
      >
        {isMerged ? (
          <LineName lineIds={lineIds} group />
        ) : (
          group.lineName
        )}
      </LineHeadingTag>
      {pager}
      {isMerged ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 flex h-1 overflow-hidden"
          aria-hidden
        >
          {lineIds.map((id) => (
            <div
              key={id}
              data-line={id}
              className="min-w-0 flex-1 bg-[var(--line-color)]"
            />
          ))}
        </div>
      ) : isStriped ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0"
          aria-hidden
        >
          <LineColorBar
            lineId={lineKey}
            modeName={group.modeName}
            heightClass="h-1"
          />
        </div>
      ) : null}
    </header>
  )
}

/** Bus grouped-by-route: pager sits on the route header. */
export const ArrivalsPagedGroup = ({
  group,
  mode,
  headingLevel,
  pageSize = 0,
  isLastGroup,
  classNames,
  behaviour = "interactive",
  pinFirst = true,
  pinAdvance,
  dwellMs,
  startDelayMs,
}: {
  group: ArrivalsPreparedGroup
  mode: ArrivalsBoardMode
  headingLevel: 1 | 2
  pageSize?: number
  isLastGroup: boolean
  classNames?: ArrivalsBoardClassNames
  behaviour?: DisplayBehaviour
  pinFirst?: boolean
  pinAdvance?: ArrivalsPinAdvance
  dwellMs?: number
  startDelayMs?: number
}) => {
  const rows = group.bounds.flatMap((bound) => bound.rows)
  const canPage = pageSize > 0
  const unattended = behaviour === "unattended" && canPage
  const chunked = chunkBoundPages(rows, canPage ? pageSize : 0, {
    lockHeight: canPage ? "when-paged" : false,
  })
  const { containerRef, setSlideRef, activePage, handlePrev, handleNext } =
    useArrivalsPageTrack(unattended ? 1 : chunked.pageCount)
  const showPager = canPage && !unattended && chunked.pageCount > 1
  const emptyLabel = `${group.lineName}: ${ARRIVALS_LINE_EMPTY_COPY}`
  const session = useUnattendedArrivalSession({
    rows,
    pageSize,
    pinFirst,
    pinAdvance,
    lockHeight: "when-paged",
    dwellMs,
    startDelayMs,
    enabled: unattended,
  })

  return (
    <section
      data-slot="arrivals-group"
      data-route={group.lineId || group.lineName}
      className={cn(
        "group/bound @container/arrivals-group min-w-0",
        classNames?.group
      )}
      onPointerEnter={unattended ? session.handlePointerEnter : undefined}
      onPointerLeave={unattended ? session.handlePointerLeave : undefined}
      onFocus={unattended ? session.handleFocus : undefined}
      onBlur={unattended ? session.handleBlur : undefined}
    >
      <ArrivalsGroupHeader
        group={group}
        headingLevel={headingLevel}
        pager={
          unattended ? (
            <UnattendedDwellBar
              canAdvance={session.canAdvance}
              paused={session.paused}
              started={session.started}
              frameKey={session.frameKey}
              dwellMs={session.dwellMs}
            />
          ) : showPager ? (
            <BoundPager
              label={group.lineName}
              page={activePage}
              pageCount={chunked.pageCount}
              onPrev={handlePrev}
              onNext={handleNext}
            />
          ) : null
        }
      />
      {unattended ? (
        <UnattendedArrivalFrames
          session={session}
          mode={mode}
          isLast={isLastGroup}
          emptyLabel={emptyLabel}
          className={classNames?.rows}
        />
      ) : (
        <ArrivalsPageTrack
          pages={chunked.pages}
          mode={mode}
          isLast={isLastGroup}
          emptyLabel={emptyLabel}
          containerRef={containerRef}
          setSlideRef={setSlideRef}
          className={classNames?.rows}
        />
      )}
    </section>
  )
}

/** Flat bus list: pager is its own trailing tile, empty on the left. */
export const ArrivalsPagedList = ({
  rows,
  mode,
  pageSize = 0,
  classNames,
  behaviour = "interactive",
  pinFirst = true,
  pinAdvance,
  dwellMs,
  startDelayMs,
}: {
  rows: readonly ArrivalsPreparedRow[]
  mode: ArrivalsBoardMode
  pageSize?: number
  classNames?: ArrivalsBoardClassNames
  behaviour?: DisplayBehaviour
  pinFirst?: boolean
  pinAdvance?: ArrivalsPinAdvance
  dwellMs?: number
  startDelayMs?: number
}) => {
  const canPage = pageSize > 0
  const unattended = behaviour === "unattended" && canPage
  const chunked = chunkBoundPages(rows, canPage ? pageSize : 0, {
    lockHeight: canPage ? "when-paged" : false,
  })
  const { containerRef, setSlideRef, activePage, handlePrev, handleNext } =
    useArrivalsPageTrack(unattended ? 1 : chunked.pageCount)
  const showPager = canPage && !unattended && chunked.pageCount > 1
  const session = useUnattendedArrivalSession({
    rows,
    pageSize,
    pinFirst,
    pinAdvance,
    lockHeight: "when-paged",
    dwellMs,
    startDelayMs,
    enabled: unattended,
  })

  return (
    <div
      className="group/bound min-w-0"
      onPointerEnter={unattended ? session.handlePointerEnter : undefined}
      onPointerLeave={unattended ? session.handlePointerLeave : undefined}
      onFocus={unattended ? session.handleFocus : undefined}
      onBlur={unattended ? session.handleBlur : undefined}
    >
      {unattended ? (
        <UnattendedArrivalFrames
          session={session}
          mode={mode}
          isLast={false}
          emptyLabel={ARRIVALS_LINE_EMPTY_COPY}
          className={classNames?.rows}
        />
      ) : (
        <ArrivalsPageTrack
          pages={chunked.pages}
          mode={mode}
          isLast={!showPager}
          emptyLabel={ARRIVALS_LINE_EMPTY_COPY}
          containerRef={containerRef}
          setSlideRef={setSlideRef}
          className={classNames?.rows}
        />
      )}
      {unattended ? (
        <div className={cn("relative flex items-center", TILE_CLASS)}>
          <UnattendedDwellBar
            canAdvance={session.canAdvance}
            paused={session.paused}
            started={session.started}
            frameKey={session.frameKey}
            dwellMs={session.dwellMs}
            ownsTile
          />
        </div>
      ) : showPager ? (
        <div className={cn("relative flex items-center", TILE_CLASS)}>
          <BoundPager
            label="arrivals"
            page={activePage}
            pageCount={chunked.pageCount}
            onPrev={handlePrev}
            onNext={handleNext}
            ownsTile
          />
        </div>
      ) : null}
    </div>
  )
}
