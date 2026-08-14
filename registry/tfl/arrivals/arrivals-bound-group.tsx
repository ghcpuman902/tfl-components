"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react"
import { Play } from "lucide-react"
import { BusNumberChip } from "@/components/tfl/arrivals/bus-number-chip"
import { PlatformChip } from "@/components/tfl/arrivals/platform-chip"
import { LineColorBar } from "@/components/tfl/brand/line-badge"
import { StationName } from "@/components/tfl/station-name"
import { ARRIVALS_LINE_EMPTY_COPY } from "@/lib/tfl/arrivals-empty"
import { COMPASS_BOUND_RE } from "@/lib/tfl/arrivals-bound-sort"
import {
  chunkBoundPages,
  type ArrivalsPreparedBound,
  type ArrivalsPreparedGroup,
  type ArrivalsPreparedRow,
} from "@/lib/tfl/arrivals-prepare"
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
/** Half of `text-base` Johnston-like x-height (~4px). */
const LINE_BAR_BORDER_CLASS = "border-b-4"

export const formatArrivalsCountdown = (seconds?: number): string => {
  if (seconds === undefined || seconds < 0) return "-"
  if (seconds < 60) return "Due"
  return `${Math.floor(seconds / 60)} min`
}

export const getArrivalsPlatformNumber = (
  platformName?: string
): string | null => {
  if (!platformName) return null
  const digit = platformName.match(/(\d+)\s*$/)
  if (digit?.[1]) return digit[1]
  const stripped = platformName
    .replace(COMPASS_BOUND_RE, "")
    .replace(/^\s*[-–—:]\s*/, "")
    .replace(/^platform\s+/i, "")
    .trim()
  return stripped || null
}

export const ArrivalRowItem = ({
  row,
  mode,
  showRule,
}: {
  row: ArrivalsPreparedRow
  mode: ArrivalsBoardMode
  showRule: boolean
}) => {
  const destination =
    row.arrival.towards ?? row.arrival.destinationName ?? "Unknown"
  const platformNumber =
    mode === "rail" ? getArrivalsPlatformNumber(row.arrival.platformName) : null
  const routeLabel =
    mode === "bus"
      ? (row.arrival.lineName ?? row.arrival.lineId ?? "").trim() || null
      : null
  const countdown = formatArrivalsCountdown(row.arrival.timeToStation)
  const rowLabel = [
    platformNumber
      ? `Platform ${platformNumber}`
      : routeLabel
        ? `Route ${routeLabel}`
        : null,
    destination,
    countdown,
  ]
    .filter(Boolean)
    .join(", ")

  return (
    <li
      data-slot="arrivals-row"
      aria-label={rowLabel}
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 text-base",
        TILE_CLASS,
        showRule && ROW_RULE_CLASS
      )}
    >
      {mode === "bus" ? (
        routeLabel ? (
          <BusNumberChip label={routeLabel} />
        ) : (
          <span />
        )
      ) : platformNumber ? (
        <PlatformChip number={platformNumber} />
      ) : (
        <span />
      )}
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
    setActivePage((current) => {
      const safe = Math.min(current, Math.max(0, pageCount - 1))
      if (safe !== current) {
        requestAnimationFrame(() => {
          slideRefs.current[safe]?.scrollIntoView({
            inline: "start",
            block: "nearest",
            behavior: "auto",
          })
        })
      }
      return safe
    })
  }, [pageCount])

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
}: {
  rows: readonly ArrivalsPreparedRow[]
  padCount: number
  mode: ArrivalsBoardMode
  isLast: boolean
  emptyLabel: string
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
}: {
  pages: readonly ArrivalsPage[]
  mode: ArrivalsBoardMode
  isLast: boolean
  emptyLabel: string
  containerRef: RefObject<HTMLDivElement | null>
  setSlideRef: (index: number) => (element: HTMLElement | null) => void
  className?: string
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
          />
        </ul>
      ))}
    </div>
  )
}

export const ArrivalsBoundGroup = ({
  bound,
  mode,
  lineName,
  isLastBound,
  pageSize = 0,
  classNames,
}: {
  bound: ArrivalsPreparedBound
  mode: ArrivalsBoardMode
  lineName: string
  isLastBound: boolean
  pageSize?: number
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
      data-bound={bound.label?.toLowerCase()}
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
          <span className="min-w-0 flex-1 truncate pr-2">{bound.label}</span>
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
  const lineKey = group.kind === "bus-route" ? "buses" : group.lineId
  const stripedBar =
    group.kind === "rail-line" &&
    (group.modeName === "overground" || group.modeName === "elizabeth-line")

  return (
    <header
      data-line={lineKey || undefined}
      className={cn(
        "relative flex items-end pb-2",
        TILE_CLASS,
        !stripedBar && LINE_BAR_BORDER_CLASS
      )}
      style={
        stripedBar
          ? undefined
          : ({
              borderBottomColor: "var(--line-color)",
            } as CSSProperties)
      }
    >
      <LineHeadingTag
        className={cn(
          "m-0 min-w-0 flex-1 truncate pr-2 text-xl leading-7 font-semibold text-[var(--line-color)]",
          group.kind === "rail-line" && "tfl-dark-line-text",
          !group.hasInformation && "opacity-70"
        )}
      >
        {group.lineName}
      </LineHeadingTag>
      {pager}
      {stripedBar ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0"
          aria-hidden
        >
          <LineColorBar
            lineId={group.lineId}
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
