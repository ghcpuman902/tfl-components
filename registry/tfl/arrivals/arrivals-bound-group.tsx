"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
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
import { PlatformChip } from "@/components/tfl/arrivals/platform-chip"
import {
  LineBadge,
  LineBadgeGroup,
  LineColorBar,
} from "@/components/tfl/brand/line-badge"
import { LineName } from "@/components/tfl/brand/line-name"
import { StationName } from "@/components/tfl/station-name"
import { ARRIVALS_LINE_EMPTY_COPY } from "@/lib/tfl/arrivals-empty"
import {
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
  "box-border h-[var(--arrivals-row)] min-h-[var(--arrivals-row)] max-h-[var(--arrivals-row)] shrink-0 overflow-hidden [content-visibility:auto] [contain-intrinsic-size:auto_3rem]"

const ROW_RULE_CLASS =
  "relative after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-border/60"

const LIST_RESET_CLASS = "m-0 ml-0 list-none space-y-0 p-0 [&>li]:mt-0"
/** Pull the brand bar into the tile without shrinking the title box. */
const LINE_BAR_PULL_CLASS = "pointer-events-none -mt-1"

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
}: {
  row: ArrivalsPreparedRow
  mode: ArrivalsBoardMode
  showRule: boolean
  /** Mixed-line section: line identity before the destination. */
  showLineChip?: boolean
  /** Platform already lives in the subgroup heading — omit the row chip. */
  hoistPlatform?: boolean
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

  const leading =
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
      <div className="min-w-0 overflow-hidden" aria-hidden="true">
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

const BoundPager = ({
  label,
  page,
  pageCount,
  onPrev,
  onNext,
}: {
  label: string
  page: number
  pageCount: number
  onPrev: () => void
  onNext: () => void
}) => {
  if (pageCount <= 1) return null

  const atStart = page <= 0
  const atEnd = page >= pageCount - 1

  return (
    <div className="ml-auto flex h-6 shrink-0 items-center text-muted-foreground">
      <div
        className={cn(
          "hidden items-center p-0 transition-opacity duration-150 [@media(hover:hover)]:flex",
          "[@media(hover:hover)]:opacity-0",
          "[@media(hover:hover)]:group-hover/bound:opacity-100",
          "[@media(hover:hover)]:group-focus-within/bound:opacity-100"
        )}
      >
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
      </div>
      <div
        className="flex items-center gap-1 opacity-50 [@media(hover:hover)]:hidden"
        aria-hidden="true"
      >
        {Array.from({ length: pageCount }, (_, index) => (
          <span
            key={index}
            className={cn(
              "size-1.5 rounded-full bg-current",
              index === page ? "opacity-100" : "opacity-40"
            )}
          />
        ))}
      </div>
      <span className="sr-only [@media(hover:hover)]:hidden">
        Page {page + 1} of {pageCount}
      </span>
    </div>
  )
}

const PagedArrivalRows = ({
  rows,
  padCount,
  mode,
  isLast,
  emptyLabel,
  showLineChip = false,
  hoistPlatform = false,
}: {
  rows: readonly ArrivalsPreparedRow[]
  padCount: number
  mode: ArrivalsBoardMode
  isLast: boolean
  emptyLabel: string
  showLineChip?: boolean
  hoistPlatform?: boolean
}) => {
  if (rows.length === 0) {
    return (
      <li
        data-slot="arrivals-row"
        className={cn(
          "flex items-center text-base text-muted-foreground",
          TILE_CLASS,
          !isLast && ROW_RULE_CLASS
        )}
        aria-label={emptyLabel}
      >
        {ARRIVALS_LINE_EMPTY_COPY}
      </li>
    )
  }

  return (
    <>
      {rows.map((row, index) => (
        <ArrivalRowItem
          key={row.key}
          row={row}
          mode={mode}
          showRule={!(isLast && index === rows.length - 1 && padCount === 0)}
          showLineChip={showLineChip}
          hoistPlatform={hoistPlatform}
        />
      ))}
      {Array.from({ length: padCount }, (_, index) => {
        const isLastSlot = index === padCount - 1
        return (
          <li
            key={`pad-${index}`}
            aria-hidden
            className={cn(
              TILE_CLASS,
              !(isLast && isLastSlot) && ROW_RULE_CLASS
            )}
          />
        )
      })}
    </>
  )
}

type ArrivalsPage = {
  rows: ArrivalsPreparedRow[]
  padCount: number
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
  pages: readonly ArrivalsPage[]
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
          padCount={only?.padCount ?? 0}
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
      className="flex touch-pan-x snap-x snap-mandatory gap-x-6 overflow-x-auto overscroll-x-contain scrollbar-none"
    >
      {pages.map((page, index) => (
        <ul
          key={`page-${index}`}
          ref={setSlideRef(index)}
          data-slot="arrivals-rows"
          className={cn(
            LIST_RESET_CLASS,
            "min-w-full shrink-0 snap-start snap-always",
            className
          )}
          role="list"
        >
          <PagedArrivalRows
            rows={page.rows}
            padCount={page.padCount}
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
 * Bound heading label. Plain text normally; Inner/Outer Rail bounds
 * (Paddington / Bayswater / Notting Hill Gate's shared Circle/H&C stretch —
 * see docs/arrivals-shared-platforms.md) step through a width ladder so the
 * qualifier still fits when the line section is narrow:
 * "Inner Rail · Platform 1" → "Inner Rail · P1" → (icon) "P1".
 * Same CSS-only, `@container/arrivals-group`-driven pattern as PlatformChip —
 * aria-label carries the full text; each visual tier is `aria-hidden`.
 */
const BoundHeadingLabel = ({ bound }: { bound: ArrivalsPreparedBound }) => {
  if (!bound.railDesignation || !bound.platformLabel || !bound.label) {
    return <span className="min-w-0 flex-1 truncate pr-2">{bound.label}</span>
  }
  const Icon = RAIL_DESIGNATION_ICON[bound.railDesignation]
  const designationLabel = formatArrivalsRailDesignationLabel(
    bound.railDesignation
  )
  const compactPlatform = `P${bound.platformLabel}`
  return (
    <span
      className="flex min-w-0 flex-1 items-center gap-1 pr-2"
      aria-label={bound.label}
    >
      <span
        className="flex items-center gap-1 @min-[10rem]/arrivals-group:hidden"
        aria-hidden
      >
        <Icon className="size-3.5 shrink-0" />
        <span className="tabular-nums">{compactPlatform}</span>
      </span>
      <span
        className="hidden truncate whitespace-nowrap @min-[10rem]/arrivals-group:inline @min-[16rem]/arrivals-group:hidden"
        aria-hidden
      >
        {designationLabel} · {compactPlatform}
      </span>
      <span
        className="hidden truncate whitespace-nowrap @min-[16rem]/arrivals-group:inline"
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
}: {
  bound: ArrivalsPreparedBound
  mode: ArrivalsBoardMode
  lineName: string
  isLastBound: boolean
  pageSize?: number
  showLineChip?: boolean
  classNames?: ArrivalsBoardClassNames
}) => {
  const canPage = Boolean(bound.label) && pageSize > 0
  const chunked = chunkBoundPages(bound.rows, canPage ? pageSize : 0)
  const { containerRef, setSlideRef, activePage, handlePrev, handleNext } =
    useArrivalsPageTrack(chunked.pageCount)
  const showPager = canPage && chunked.pageCount > 1
  const emptyScope = bound.label ? `${lineName} ${bound.label}` : lineName

  return (
    <li
      data-slot="arrivals-subgroup"
      data-bound={boundDataAttr(bound)}
      className={cn("group/bound min-w-0", classNames?.subgroup)}
    >
      {bound.label ? (
        <div
          className={cn(
            "flex items-center text-base font-semibold text-muted-foreground",
            TILE_CLASS,
            ROW_RULE_CLASS
          )}
        >
          <BoundHeadingLabel bound={bound} />
          {showPager ? (
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
      <ArrivalsPageTrack
        pages={chunked.pages}
        mode={mode}
        isLast={isLastBound}
        emptyLabel={`${emptyScope}: ${ARRIVALS_LINE_EMPTY_COPY}`}
        containerRef={containerRef}
        setSlideRef={setSlideRef}
        className={classNames?.rows}
        showLineChip={showLineChip}
        hoistPlatform={bound.platformUniform}
      />
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

  return (
    <>
      <header
        data-line={isMerged ? undefined : lineKey || undefined}
        className={cn("relative flex items-center", TILE_CLASS)}
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
      </header>
      {isMerged ? (
        <div
          className={cn(LINE_BAR_PULL_CLASS, "flex h-1 overflow-hidden")}
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
      ) : (
        <div className={LINE_BAR_PULL_CLASS} aria-hidden>
          <LineColorBar
            lineId={lineKey}
            modeName={group.kind === "rail-line" ? group.modeName : undefined}
            heightClass="h-1"
          />
        </div>
      )}
    </>
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
}: {
  group: ArrivalsPreparedGroup
  mode: ArrivalsBoardMode
  headingLevel: 1 | 2
  pageSize?: number
  isLastGroup: boolean
  classNames?: ArrivalsBoardClassNames
}) => {
  const rows = group.bounds.flatMap((bound) => bound.rows)
  const canPage = pageSize > 0
  const chunked = chunkBoundPages(rows, canPage ? pageSize : 0)
  const { containerRef, setSlideRef, activePage, handlePrev, handleNext } =
    useArrivalsPageTrack(chunked.pageCount)
  const showPager = canPage && chunked.pageCount > 1

  return (
    <section
      data-slot="arrivals-group"
      data-route={group.lineId || group.lineName}
      className={cn(
        "group/bound @container/arrivals-group min-w-0",
        classNames?.group
      )}
    >
      <ArrivalsGroupHeader
        group={group}
        headingLevel={headingLevel}
        pager={
          showPager ? (
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
      <ArrivalsPageTrack
        pages={chunked.pages}
        mode={mode}
        isLast={isLastGroup}
        emptyLabel={`${group.lineName}: ${ARRIVALS_LINE_EMPTY_COPY}`}
        containerRef={containerRef}
        setSlideRef={setSlideRef}
        className={classNames?.rows}
      />
    </section>
  )
}

/** Flat bus list: pager is its own trailing tile, empty on the left. */
export const ArrivalsPagedList = ({
  rows,
  mode,
  pageSize = 0,
  classNames,
}: {
  rows: readonly ArrivalsPreparedRow[]
  mode: ArrivalsBoardMode
  pageSize?: number
  classNames?: ArrivalsBoardClassNames
}) => {
  const canPage = pageSize > 0
  const chunked = chunkBoundPages(rows, canPage ? pageSize : 0)
  const { containerRef, setSlideRef, activePage, handlePrev, handleNext } =
    useArrivalsPageTrack(chunked.pageCount)
  const showPager = canPage && chunked.pageCount > 1

  return (
    <div className="group/bound min-w-0">
      <ArrivalsPageTrack
        pages={chunked.pages}
        mode={mode}
        isLast={!showPager}
        emptyLabel={ARRIVALS_LINE_EMPTY_COPY}
        containerRef={containerRef}
        setSlideRef={setSlideRef}
        className={classNames?.rows}
      />
      {showPager ? (
        <div className={cn("flex items-center", TILE_CLASS)}>
          <BoundPager
            label="arrivals"
            page={activePage}
            pageCount={chunked.pageCount}
            onPrev={handlePrev}
            onNext={handleNext}
          />
        </div>
      ) : null}
    </div>
  )
}
