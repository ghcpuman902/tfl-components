"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { StationName } from "@/components/tfl/station-name"
import { TfLRoundel } from "@/components/tfl/brand/tfl-roundel"
import type { CycleHireDock } from "@/lib/tfl/cycle-hire-types"
import {
  buildCycleHireDisplayPages,
  cycleHireDisplayPageId,
  normalizeCycleHireDisplayTiles,
  refreshCycleHireDisplayPage,
} from "@/lib/tfl/cycle-hire-display"
import type { DisplayBehaviour } from "@/lib/tfl/unattended-sequence"
import { INTERACTIVE_IDLE_RETURN_MS } from "@/lib/tfl/interactive-idle-return"
import { useInteractiveIdleReturn } from "@/hooks/use-interactive-idle-return"
import { useUnattendedSequence } from "@/hooks/use-unattended-sequence"
import { useCycleHireDocksData } from "@/components/tfl/cycle-hire/cycle-hire-docks-context"
import { getDockCounts } from "@/components/tfl/cycle-hire/cycle-hire-dock-marker"
import {
  cycleHireBikeFillClass,
  cycleHireBikeTextClass,
  cycleHireBrokenFillClass,
  cycleHireBrokenTextClass,
  cycleHireEbikeFillClass,
  cycleHireEbikeTextClass,
} from "@/components/tfl/cycle-hire/cycle-hire-colours"

const BOARD_RHYTHM_VARS = {
  "--arrivals-unit": "0.5rem",
  "--arrivals-row": "calc(var(--arrivals-unit) * 6)",
} as CSSProperties

const TILE_CLASS =
  "relative box-border h-[var(--arrivals-row)] min-h-[var(--arrivals-row)] max-h-[var(--arrivals-row)] shrink-0 overflow-clip"

const ROW_RULE_CLASS =
  "after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-border/60"

type TileProps = {
  dock: CycleHireDock
  className?: string
  showBroken?: boolean
}

type SlotKind = "standard" | "eBike" | "empty" | "broken"

const buildOccupancySlots = (
  counts: ReturnType<typeof getDockCounts>,
  showBroken: boolean
): SlotKind[] => {
  const slots: SlotKind[] = []
  for (let index = 0; index < counts.standardBikes; index += 1) {
    slots.push("standard")
  }
  for (let index = 0; index < counts.eBikes; index += 1) {
    slots.push("eBike")
  }
  for (let index = 0; index < counts.emptyDocks; index += 1) {
    slots.push("empty")
  }
  if (showBroken) {
    for (let index = 0; index < counts.brokenDocks; index += 1) {
      slots.push("broken")
    }
  }
  return slots
}

const slotFillClass = (kind: SlotKind): string => {
  if (kind === "standard") return cycleHireBikeFillClass
  if (kind === "eBike") return cycleHireEbikeFillClass
  if (kind === "broken") return cycleHireBrokenFillClass
  return "bg-muted-foreground/25"
}

const Count = ({
  value,
  fullLabel,
  shortLabel,
  className,
}: {
  value: number
  fullLabel: string
  shortLabel: string
  className?: string
}) => (
  <span className={cn("whitespace-nowrap tabular-nums", className)}>
    {value}
    <span className="hidden sm:inline"> {fullLabel}</span>
    <span className="sm:hidden">{shortLabel}</span>
  </span>
)

const DockSlotBlocks = ({
  dock,
  showBroken,
  className,
}: {
  dock: CycleHireDock
  showBroken: boolean
  className?: string
}) => {
  const counts = getDockCounts(dock)
  const slots = buildOccupancySlots(counts, showBroken)

  if (slots.length === 0) {
    return (
      <div
        className={cn("bg-muted-foreground/15", className)}
        aria-hidden="true"
      />
    )
  }

  return (
    <div
      className={cn("flex gap-0.5 overflow-hidden", className)}
      aria-hidden="true"
    >
      {slots.map((kind, index) => (
        <span
          key={`${dock.id}-${kind}-${index}`}
          className={cn(
            "min-w-0 flex-1",
            dock.isLocked ? "bg-muted-foreground/20" : slotFillClass(kind)
          )}
        />
      ))}
    </div>
  )
}

export const CycleHireDockTile = ({
  dock,
  className,
  showBroken = false,
}: TileProps) => {
  const counts = getDockCounts(dock)
  const { standardBikes, eBikes, emptyDocks, brokenDocks, totalDocks } = counts
  const showBrokenCount = showBroken && brokenDocks > 0
  const ariaCounts = [
    `${standardBikes} bikes`,
    `${eBikes} e-bikes`,
    `${emptyDocks} spaces`,
    showBrokenCount ? `${brokenDocks} broken` : null,
  ]
    .filter(Boolean)
    .join(", ")
  const ariaStatus = dock.isLocked
    ? "locked"
    : totalDocks === 0
      ? "no docks reported"
      : ariaCounts
  return (
    <div
      className={cn(
        TILE_CLASS,
        "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-2 pb-1 text-sm",
        className
      )}
      aria-label={`${dock.name}: ${ariaStatus}${dock.isTemporary ? ", temporary" : ""}`}
    >
      <div className="flex min-w-0 items-center gap-2" aria-hidden="true">
        <div className="min-w-0 flex-1">
          <StationName
            name={dock.name}
            layout="auto"
            maxLines={1}
            allowAbbreviation
            allowScaleDown
            className="leading-none font-medium"
          />
        </div>
        {dock.isTemporary ? (
          <span className="shrink-0 text-xs font-normal text-muted-foreground">
            <span className="hidden md:inline">Temporary</span>
            <span className="md:hidden">Temp</span>
          </span>
        ) : null}
      </div>

      <div
        className={cn(
          "shrink-0 items-center text-xs font-semibold",
          !dock.isLocked && totalDocks > 0 ? "flex gap-3" : "flex justify-end"
        )}
        aria-hidden="true"
      >
        {dock.isLocked ? (
          <span className="text-destructive">Locked</span>
        ) : totalDocks === 0 ? (
          <span className="font-normal text-muted-foreground">
            No docks reported
          </span>
        ) : (
          <>
            <Count
              value={standardBikes}
              fullLabel={standardBikes === 1 ? "Bike" : "Bikes"}
              shortLabel="B"
              className={cycleHireBikeTextClass}
            />
            <Count
              value={eBikes}
              fullLabel={eBikes === 1 ? "E-bike" : "E-bikes"}
              shortLabel="E"
              className={cycleHireEbikeTextClass}
            />
            <Count
              value={emptyDocks}
              fullLabel={emptyDocks === 1 ? "Space" : "Spaces"}
              shortLabel="S"
              className="text-muted-foreground"
            />
            {showBrokenCount ? (
              <Count
                value={brokenDocks}
                fullLabel="Broken"
                shortLabel="X"
                className={cycleHireBrokenTextClass}
              />
            ) : null}
          </>
        )}
      </div>

      <DockSlotBlocks
        dock={dock}
        showBroken={showBroken}
        className="absolute inset-x-0 bottom-0 h-1"
      />
    </div>
  )
}

const EmptyTile = ({ message, role }: { message?: string; role?: "alert" }) => (
  <div
    className={cn(
      TILE_CLASS,
      ROW_RULE_CLASS,
      "flex items-center truncate px-2 text-sm text-muted-foreground"
    )}
    role={role}
  >
    {message ?? <span aria-hidden="true">—</span>}
  </div>
)

const Page = ({
  docks,
  rows,
  showBroken,
}: {
  docks: readonly CycleHireDock[]
  rows: number
  showBroken: boolean
}) => (
  <div className="h-full">
    {Array.from({ length: rows }, (_, index) => {
      const dock = docks[index]
      if (!dock) return <EmptyTile key={`empty-${index}`} />
      return (
        <CycleHireDockTile key={dock.id} dock={dock} showBroken={showBroken} />
      )
    })}
  </div>
)

const PageDots = ({
  pageIndex,
  pageCount,
}: {
  pageIndex: number
  pageCount: number
}) => {
  if (pageCount <= 1) return null
  return (
    <div
      className="flex min-w-0 items-center justify-end gap-1 text-muted-foreground"
      aria-label={`Page ${pageIndex + 1} of ${pageCount}`}
    >
      {Array.from({ length: pageCount }, (_, index) => (
        <span
          key={index}
          className={cn(
            "size-1.5 shrink-0 rounded-full bg-current",
            index === pageIndex ? "opacity-100" : "opacity-40"
          )}
          aria-hidden="true"
        />
      ))}
    </div>
  )
}

const DisplayHeader = ({
  pageIndex,
  pageCount,
  interactive,
  onPrevious,
  onNext,
}: {
  pageIndex: number
  pageCount: number
  interactive: boolean
  onPrevious?: () => void
  onNext?: () => void
}) => (
  <div
    className={cn(
      TILE_CLASS,
      ROW_RULE_CLASS,
      "flex items-center gap-3 px-2 text-xl leading-7 font-semibold"
    )}
  >
    <TfLRoundel variant="cycles" className="size-8 shrink-0" />
    <p className="m-0 min-w-0 flex-1 truncate">Cycle hire docks</p>
    {pageCount > 1 ? (
      <div className="relative flex min-w-24 shrink-0 items-center justify-end">
        <PageDots pageIndex={pageIndex} pageCount={pageCount} />
        {interactive ? (
          <div className="absolute inset-y-0 right-0 flex items-center gap-1 bg-background opacity-0 group-hover:opacity-100 focus-within:opacity-100">
            <button
              type="button"
              className="flex size-7 items-center justify-center rounded-full border bg-background shadow-sm disabled:opacity-30"
              onClick={onPrevious}
              disabled={pageIndex === 0}
              aria-label="Previous dock page"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <span className="min-w-7 text-center text-xs font-normal text-muted-foreground tabular-nums">
              {pageIndex + 1}/{pageCount}
            </span>
            <button
              type="button"
              className="flex size-7 items-center justify-center rounded-full border bg-background shadow-sm disabled:opacity-30"
              onClick={onNext}
              disabled={pageIndex === pageCount - 1}
              aria-label="Next dock page"
            >
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        ) : null}
      </div>
    ) : null}
  </div>
)

const SingleDockRoundelTile = ({
  dock,
  showBroken,
}: {
  dock: CycleHireDock
  showBroken: boolean
}) => {
  const counts = getDockCounts(dock)
  const { standardBikes, eBikes, emptyDocks, brokenDocks, totalDocks } = counts
  const showBrokenCount = showBroken && brokenDocks > 0

  return (
    <div
      className={cn(
        TILE_CLASS,
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-2 pb-1 text-sm"
      )}
      aria-label={`${dock.name}: ${standardBikes} bikes, ${eBikes} e-bikes, ${emptyDocks} spaces${showBrokenCount ? `, ${brokenDocks} broken` : ""}`}
    >
      <TfLRoundel variant="cycles" className="size-8 shrink-0" />
      <div className="flex min-w-0 items-center gap-2" aria-hidden="true">
        <div className="min-w-0 flex-1">
          <StationName
            name={dock.name}
            layout="auto"
            maxLines={1}
            allowAbbreviation
            allowScaleDown
            className="leading-none font-medium"
          />
        </div>
        {dock.isTemporary ? (
          <span className="shrink-0 text-xs text-muted-foreground">
            Temporary
          </span>
        ) : null}
      </div>
      <div
        className="flex shrink-0 items-center gap-3 text-xs font-semibold"
        aria-hidden="true"
      >
        {dock.isLocked ? (
          <span className="text-destructive">Locked</span>
        ) : totalDocks === 0 ? (
          <span className="font-normal text-muted-foreground">
            No docks reported
          </span>
        ) : (
          <>
            <Count
              value={standardBikes}
              fullLabel={standardBikes === 1 ? "Bike" : "Bikes"}
              shortLabel="B"
              className={cycleHireBikeTextClass}
            />
            <Count
              value={eBikes}
              fullLabel={eBikes === 1 ? "E-bike" : "E-bikes"}
              shortLabel="E"
              className={cycleHireEbikeTextClass}
            />
            <Count
              value={emptyDocks}
              fullLabel={emptyDocks === 1 ? "Space" : "Spaces"}
              shortLabel="S"
              className="text-muted-foreground"
            />
            {showBrokenCount ? (
              <Count
                value={brokenDocks}
                fullLabel="Broken"
                shortLabel="X"
                className={cycleHireBrokenTextClass}
              />
            ) : null}
          </>
        )}
      </div>
      <DockSlotBlocks
        dock={dock}
        showBroken={showBroken}
        className="absolute inset-x-0 bottom-0 h-1"
      />
    </div>
  )
}

const SingleDockStackedTile = ({
  dock,
  showBroken,
}: {
  dock: CycleHireDock
  showBroken: boolean
}) => {
  const counts = getDockCounts(dock)
  const { standardBikes, eBikes, emptyDocks, brokenDocks, totalDocks } = counts
  const showBrokenCount = showBroken && brokenDocks > 0

  return (
    <div
      className={cn(TILE_CLASS, "grid grid-rows-3 text-[0.6875rem]")}
      aria-label={`${dock.name}: ${standardBikes} bikes, ${eBikes} e-bikes, ${emptyDocks} spaces${showBrokenCount ? `, ${brokenDocks} broken` : ""}`}
    >
      <div className="flex min-w-0 items-center px-2" aria-hidden="true">
        <StationName
          name={dock.name}
          layout="auto"
          maxLines={1}
          allowAbbreviation
          allowScaleDown
          className="leading-none font-medium"
        />
      </div>
      <DockSlotBlocks dock={dock} showBroken={showBroken} className="w-full" />
      <div
        className="flex items-center justify-between gap-3 px-2 font-medium tracking-wide uppercase"
        aria-hidden="true"
      >
        {dock.isLocked ? (
          <span className="text-destructive">Locked</span>
        ) : totalDocks === 0 ? (
          <span className="text-muted-foreground">No docks reported</span>
        ) : (
          <>
            <span className="flex items-center gap-3">
              <span className={cn("tabular-nums", cycleHireBikeTextClass)}>
                {standardBikes} {standardBikes === 1 ? "Bike" : "Bikes"}
              </span>
              <span className={cn("tabular-nums", cycleHireEbikeTextClass)}>
                {eBikes} {eBikes === 1 ? "E-bike" : "E-bikes"}
              </span>
            </span>
            <span className="flex items-center gap-3 text-muted-foreground">
              {showBrokenCount ? (
                <span className={cn("tabular-nums", cycleHireBrokenTextClass)}>
                  {brokenDocks} Broken
                </span>
              ) : null}
              <span className="tabular-nums">
                {emptyDocks} {emptyDocks === 1 ? "Space" : "Spaces"}
              </span>
            </span>
          </>
        )}
      </div>
    </div>
  )
}

const scrollTrackToSlide = (
  container: HTMLElement | null,
  slide: HTMLElement | null
) => {
  if (!container || !slide) return
  const left =
    slide.getBoundingClientRect().left -
    container.getBoundingClientRect().left +
    container.scrollLeft
  container.scrollTo({ left, behavior: "auto" })
}

const usePageTrack = (pageCount: number) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const slideRefs = useRef<(HTMLElement | null)[]>([])
  const [activePage, setActivePage] = useState(0)

  useEffect(() => {
    slideRefs.current = slideRefs.current.slice(0, pageCount)
  }, [pageCount])

  const goToPage = useCallback(
    (index: number) => {
      const safe = Math.min(Math.max(0, index), Math.max(0, pageCount - 1))
      scrollTrackToSlide(containerRef.current, slideRefs.current[safe])
      setActivePage(safe)
    },
    [pageCount]
  )

  useEffect(() => {
    if (activePage <= pageCount - 1) return
    const safe = Math.max(0, pageCount - 1)
    const frame = requestAnimationFrame(() => goToPage(safe))
    return () => cancelAnimationFrame(frame)
  }, [activePage, goToPage, pageCount])

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
        for (let index = 0; index < pageCount; index += 1) {
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
      { root: container, threshold: [0.5, 0.75, 1] }
    )

    const frame = requestAnimationFrame(() => {
      slideRefs.current.forEach((slide) => {
        if (slide) observer.observe(slide)
      })
    })
    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
    }
  }, [pageCount])

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
    goToPage,
  }
}

const useUnattendedDockPage = ({
  data,
  rowsPerPage,
  enabled,
  dwellMs,
  startDelayMs,
}: {
  data: readonly CycleHireDock[]
  rowsPerPage: number
  enabled: boolean
  dwellMs?: number
  startDelayMs?: number
}) => {
  const [heldData, setHeldData] = useState(data)
  const heldPages = useMemo(
    () => buildCycleHireDisplayPages(heldData, rowsPerPage),
    [heldData, rowsPerPage]
  )
  const pageIds = useMemo(
    () => heldPages.map(cycleHireDisplayPageId),
    [heldPages]
  )
  const sequence = useUnattendedSequence({
    itemIds: pageIds,
    dwellMs,
    startDelayMs,
    enabled: enabled && heldPages.length > 1,
  })
  const previousIndex = useRef(sequence.index)
  const previousRowsPerPage = useRef(rowsPerPage)
  const wasEnabled = useRef(enabled)
  const liveIdKey = data.map((dock) => dock.id).join("\0")
  const heldIdKey = heldData.map((dock) => dock.id).join("\0")

  useEffect(() => {
    const enabledNow = enabled && !wasEnabled.current
    const tileCountChanged = previousRowsPerPage.current !== rowsPerPage
    const boundaryChanged = previousIndex.current !== sequence.index
    const singlePageChanged = heldPages.length <= 1 && liveIdKey !== heldIdKey

    if (
      enabled &&
      (enabledNow || tileCountChanged || boundaryChanged || singlePageChanged)
    ) {
      setHeldData(data)
    }
    previousIndex.current = sequence.index
    previousRowsPerPage.current = rowsPerPage
    wasEnabled.current = enabled
  }, [
    data,
    enabled,
    heldIdKey,
    heldPages.length,
    liveIdKey,
    sequence.index,
    rowsPerPage,
  ])

  const safeIndex = Math.min(sequence.index, heldPages.length - 1)
  const heldPage = heldPages[safeIndex] ?? []
  return {
    page: refreshCycleHireDisplayPage(heldPage, data),
    pageCount: heldPages.length,
    activePage: safeIndex,
    handleFocus: sequence.handleFocus,
    handleBlur: sequence.handleBlur,
  }
}

export type CycleHireDocksDisplayProps = {
  /** Normalised bike points. Omit when rendered under `CycleHireDocks`. */
  data?: readonly CycleHireDock[]
  /** Total 48px tiles for multiple docks. A single dock always uses one tile. */
  tiles?: number
  singleDockVariant?: "roundel" | "stacked"
  behaviour?: DisplayBehaviour
  dwellMs?: number
  startDelayMs?: number
  idleReturnMs?: number
  showBroken?: boolean
  error?: string | null
  className?: string
}

export const CycleHireDocksDisplay = ({
  data: dataProp,
  tiles: tilesProp,
  singleDockVariant = "roundel",
  behaviour = "interactive",
  dwellMs,
  startDelayMs,
  idleReturnMs = INTERACTIVE_IDLE_RETURN_MS,
  showBroken = false,
  error,
  className,
}: CycleHireDocksDisplayProps) => {
  const data = useCycleHireDocksData(dataProp)
  const tiles =
    data.length === 1 && !error ? 1 : normalizeCycleHireDisplayTiles(tilesProp)
  const bodyRows = Math.max(0, tiles - 1)
  const pages = useMemo(
    () => buildCycleHireDisplayPages(data, bodyRows),
    [bodyRows, data]
  )
  const { containerRef, setSlideRef, activePage, goToPage } = usePageTrack(
    pages.length
  )
  const unattended = useUnattendedDockPage({
    data,
    rowsPerPage: bodyRows,
    enabled: behaviour === "unattended" && !error,
    dwellMs,
    startDelayMs,
  })
  const idleReturn = useInteractiveIdleReturn({
    enabled: behaviour === "interactive" && pages.length > 1,
    idleMs: idleReturnMs,
    onReturnToFirst: () => goToPage(0),
  })
  const style = {
    ...BOARD_RHYTHM_VARS,
    height: `calc(var(--arrivals-row) * ${tiles})`,
  } as CSSProperties

  if (error || data.length === 0) {
    const message = error ?? "No docks to show."
    return (
      <div
        className={cn("flex w-full flex-col overflow-hidden", className)}
        style={style}
        aria-label="Cycle hire docks"
        role={error ? "alert" : undefined}
      >
        <DisplayHeader pageIndex={0} pageCount={1} interactive={false} />
        {bodyRows > 0 ? <EmptyTile message={message} /> : null}
        {Array.from({ length: Math.max(0, bodyRows - 1) }, (_, index) => (
          <EmptyTile key={index} />
        ))}
      </div>
    )
  }

  if (data.length === 1) {
    const dock = data[0]
    return (
      <div className={cn("w-full overflow-hidden", className)} style={style}>
        {singleDockVariant === "stacked" ? (
          <SingleDockStackedTile dock={dock} showBroken={showBroken} />
        ) : (
          <SingleDockRoundelTile dock={dock} showBroken={showBroken} />
        )}
      </div>
    )
  }

  if (behaviour === "unattended") {
    return (
      <div
        className={cn("flex w-full flex-col overflow-hidden", className)}
        style={style}
        aria-label="Cycle hire docks"
        onFocus={unattended.handleFocus}
        onBlur={unattended.handleBlur}
      >
        <DisplayHeader
          pageIndex={unattended.activePage}
          pageCount={unattended.pageCount}
          interactive={false}
        />
        <Page docks={unattended.page} rows={bodyRows} showBroken={showBroken} />
      </div>
    )
  }

  const pageCount = pages.length

  return (
    <div
      className={cn("group flex w-full flex-col overflow-hidden", className)}
      style={style}
      aria-label="Cycle hire docks"
      onPointerEnter={idleReturn.handlePointerEnter}
      onPointerLeave={idleReturn.handlePointerLeave}
      onPointerDown={idleReturn.handlePointerDown}
      onFocus={idleReturn.handleFocus}
      onBlur={idleReturn.handleBlur}
      onKeyDown={idleReturn.handleKeyDown}
    >
      <DisplayHeader
        pageIndex={activePage}
        pageCount={pageCount}
        interactive
        onPrevious={() => goToPage(activePage - 1)}
        onNext={() => goToPage(activePage + 1)}
      />
      <div
        ref={containerRef}
        className="flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden"
        style={{ height: `calc(var(--arrivals-row) * ${bodyRows})` }}
        onScroll={idleReturn.handleScroll}
      >
        {pages.map((page, index) => (
          <section
            key={cycleHireDisplayPageId(page)}
            ref={setSlideRef(index)}
            className="h-full w-full shrink-0 snap-start"
            aria-label={`Dock page ${index + 1} of ${pageCount}`}
          >
            <Page docks={page} rows={bodyRows} showBroken={showBroken} />
          </section>
        ))}
      </div>
    </div>
  )
}

export const CycleHireDocksDisplaySkeleton = ({
  tiles: tilesProp,
  singleDockVariant = "roundel",
  className,
}: Pick<
  CycleHireDocksDisplayProps,
  "tiles" | "singleDockVariant" | "className"
>) => {
  const tiles = normalizeCycleHireDisplayTiles(tilesProp)
  if (tiles === 1) {
    return (
      <div
        className={cn("w-full overflow-hidden", className)}
        style={{
          ...BOARD_RHYTHM_VARS,
          height: "var(--arrivals-row)",
        }}
        aria-busy="true"
        aria-label="Loading cycle hire dock"
      >
        {singleDockVariant === "stacked" ? (
          <div className={cn(TILE_CLASS, "grid grid-rows-3")} aria-hidden>
            <div className="flex items-center px-2">
              <span className="h-2.5 w-2/5 rounded-sm bg-muted" />
            </div>
            <div className="flex gap-0.5">
              {Array.from({ length: 12 }, (_, index) => (
                <span key={index} className="min-w-0 flex-1 bg-muted" />
              ))}
            </div>
            <div className="flex items-center justify-between px-2">
              <span className="h-2 w-1/3 rounded-sm bg-muted" />
              <span className="h-2 w-1/5 rounded-sm bg-muted" />
            </div>
          </div>
        ) : (
          <div
            className={cn(
              TILE_CLASS,
              "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-2 pb-1"
            )}
            aria-hidden
          >
            <TfLRoundel variant="cycles" className="size-8 shrink-0" />
            <span className="h-3 w-2/5 rounded-sm bg-muted" />
            <span className="h-3 w-40 max-w-full rounded-sm bg-muted" />
            <span className="absolute inset-x-0 bottom-0 h-1 bg-muted" />
          </div>
        )}
      </div>
    )
  }

  return (
    <div
      className={cn("w-full overflow-hidden", className)}
      style={{
        ...BOARD_RHYTHM_VARS,
        height: `calc(var(--arrivals-row) * ${tiles})`,
      }}
      aria-busy="true"
      aria-label="Loading cycle hire docks"
    >
      <DisplayHeader pageIndex={0} pageCount={1} interactive={false} />
      {Array.from({ length: Math.max(0, tiles - 1) }, (_, index) => (
        <div
          key={index}
          className={cn(TILE_CLASS, "flex items-center gap-3 px-2 pb-1")}
          aria-hidden="true"
        >
          <span className="h-3 w-2/5 rounded-sm bg-muted" />
          <span className="ml-auto h-3 w-1/3 rounded-sm bg-muted" />
          <span className="absolute inset-x-0 bottom-0 h-1 bg-muted" />
        </div>
      ))}
    </div>
  )
}
