import type { CSSProperties } from "react"
import { normalizeLineId, type RealtimePrediction } from "tfl-ts"
import { TfLRoundel } from "@/components/tfl/brand/tfl-roundel"
import { StationNameTitle } from "@/components/tfl/station-name"
import {
  BusStopDisruptionBoundary,
  BusStopDisruptionChips,
  BusStopDisruptionCover,
} from "@/components/tfl/arrivals/bus-stop-disruptions"
import type { BusStopDisruption } from "@/lib/tfl/prepare-bus-stop-disruptions"
import {
  ARRIVALS_EMPTY_COPY,
  ARRIVALS_LINE_EMPTY_COPY,
  type ArrivalsEmptyKind,
} from "@/lib/tfl/arrivals-empty"
import type {
  ArrivalsPreparedBoard,
  ArrivalsPreparedGroup,
} from "@/lib/tfl/arrivals-prepare"
import { StopLetterBadge } from "@/components/tfl/arrivals/stop-letter-badge"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrivalsBoundGroup,
  ArrivalsGroupHeader,
  ArrivalsPagedGroup,
  ArrivalsPagedList,
  type ArrivalsBoardClassNames,
} from "@/components/tfl/arrivals/arrivals-bound-group"

export type ArrivalsBoardMode = "rail" | "bus"

export type { ArrivalsBoardClassNames }
export {
  formatArrivalsCountdown,
  getArrivalsPlatformNumber,
} from "@/components/tfl/arrivals/arrivals-bound-group"

export type ArrivalsBoardChromeProps = {
  /**
   * Board heading. Omit to use `data[].stationName` from the predictions.
   * Fits via abbr/scale, same policy as destinations.
   */
  stopName?: string
  /**
   * @deprecated Dev/meta NaPTAN id — not shown in the board UI. Kept for call-site compat.
   */
  stopPointId?: string
  /**
   * Bus stop letter (e.g. "G"). Prefer this over sniffing `platformName` on rows —
   * it is a stop property, not a per-arrival field.
   */
  stopLetter?: string
  /**
   * @deprecated Board heading is always `stopName`. Kept for call-site compat; ignored.
   */
  title?: string
  /** Semantic heading level for the stop name. Prefer `2` when embedded under a page `h1`. */
  headingLevel?: 1 | 2
  loading?: boolean
  /**
   * Fetch/render failure. Takes precedence over an empty list.
   * Prefer a short human line — raw API strings read as broken UI.
   */
  error?: string | null
  /** Optional short caption in the title row. Prefer app-chrome freshness over poll counts. */
  statusLabel?: string
  /**
   * Why the board has no rows when `error` is unset.
   * Resolve in the app (`resolveArrivalsEmptyKind`) from clock / offline / domain.
   */
  emptyKind?: ArrivalsEmptyKind
  /** Override copy for `emptyKind`. Prefer setting `emptyKind` instead. */
  emptyMessage?: string
}

/**
 * Baseline grid. Every block is a whole number of `--arrivals-unit` (0.5rem):
 * arrival row, board title, and line header are all 6 units, direction labels 6
 * (same as line names). Two boards side by side land on the same horizontal lines.
 * Override the vars on a wrapper to retune density.
 */
export const ARRIVALS_RHYTHM_VARS = {
  "--arrivals-unit": "0.5rem",
  "--arrivals-row": "calc(var(--arrivals-unit) * 6)",
} as CSSProperties

/**
 * Fixed tile box. Height is always exactly one rhythm row — content may clip,
 * but borders/bars must never grow the tile (`box-border` + overflow lock).
 */
export const ARRIVALS_TILE_CLASS =
  "box-border h-[var(--arrivals-row)] min-h-[var(--arrivals-row)] max-h-[var(--arrivals-row)] shrink-0 overflow-hidden [content-visibility:auto] [contain-intrinsic-size:auto_3rem]"

const TITLE_CLASS =
  "tfl-title [font-synthesis:none] [font-weight:var(--tfl-title-weight,400)] [letter-spacing:var(--tfl-title-tracking,0)]"

const LIST_RESET_CLASS = "m-0 ml-0 list-none space-y-0 p-0 [&>li]:mt-0"

export { getBusStopLetterFromPlatform, resolveBusStopLetter } from "@/lib/tfl/bus-stop-letter"

/** Explicit `stopName` wins; otherwise the first non-empty `stationName` on `data`. */
export const resolveArrivalsHeading = (
  stopName: string | undefined,
  data?: readonly Pick<RealtimePrediction, "stationName">[],
): string | undefined => {
  const override = stopName?.trim()
  if (override) return override
  for (const row of data ?? []) {
    const name = row.stationName?.trim()
    if (name) return name
  }
  return undefined
}

export { StopLetterBadge } from "@/components/tfl/arrivals/stop-letter-badge"

export const ArrivalsBoardSkeleton = ({
  mode = "rail",
  className,
  stopName,
  stopLetter,
}: {
  mode?: ArrivalsBoardMode
  className?: string
  /** Known stop identity — paint immediately; do not wait on predictions. */
  stopName?: string
  stopLetter?: string
}) => (
  <div
    data-slot="arrivals-board"
    className={cn("@container/arrivals w-full", className)}
    style={ARRIVALS_RHYTHM_VARS}
    aria-busy
    aria-label="Loading arrivals"
  >
    <div
      className={cn("flex min-w-0 items-center gap-x-3 text-3xl", ARRIVALS_TILE_CLASS)}
    >
      {stopName ? (
        <>
          <TfLRoundel
            variant={mode === "bus" ? "buses" : "underground"}
            className="size-[var(--arrivals-row)] shrink-0"
            aria-hidden
          />
          <p
            className={cn(
              "flex h-full min-w-0 flex-1 items-center text-3xl",
              TITLE_CLASS
            )}
          >
            <StationNameTitle name={stopName} />
          </p>
          {stopLetter ? <StopLetterBadge letter={stopLetter} /> : null}
        </>
      ) : (
        <Skeleton className="h-8 w-56 max-w-full" />
      )}
    </div>
    {mode === "bus" ? (
      <div>
        {Array.from({ length: 6 }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className={cn("flex items-center", ARRIVALS_TILE_CLASS)}
          >
            <Skeleton className="h-5 w-full" />
          </div>
        ))}
      </div>
    ) : (
      Array.from({ length: 2 }).map((_, sectionIndex) => (
        <div key={sectionIndex}>
          <div className={cn("flex items-center", ARRIVALS_TILE_CLASS)}>
            <Skeleton className="h-6 w-28" />
          </div>
          <div className="h-1 -mt-1 bg-border" aria-hidden />
          {Array.from({ length: 4 }).map((_, rowIndex) => (
            <div
              key={rowIndex}
              className={cn("flex items-center", ARRIVALS_TILE_CLASS)}
            >
              <Skeleton className="h-5 w-full" />
            </div>
          ))}
        </div>
      ))
    )}
  </div>
)

const GroupBody = ({
  group,
  mode,
  pageSize,
  classNames,
}: {
  group: ArrivalsPreparedGroup
  mode: ArrivalsBoardMode
  pageSize?: number
  classNames?: ArrivalsBoardClassNames
}) => {
  const labeledBounds = group.bounds.filter((bound) => bound.label)
  // `grid-cols-1` (not block) so consumer `grid-cols-*` variants merge cleanly.
  const subgroupsClassName = cn(
    LIST_RESET_CLASS,
    "grid grid-cols-1",
    classNames?.subgroups
  )

  if (!group.hasInformation && labeledBounds.length === 0) {
    return (
      <ul
        data-slot="arrivals-subgroups"
        className={subgroupsClassName}
        role="list"
      >
        <li
          data-slot="arrivals-row"
          className={cn(
            "flex items-center text-base text-muted-foreground",
            ARRIVALS_TILE_CLASS
          )}
          aria-label={`${group.lineName}: ${ARRIVALS_LINE_EMPTY_COPY}`}
        >
          {ARRIVALS_LINE_EMPTY_COPY}
        </li>
      </ul>
    )
  }

  return (
    <ul
      data-slot="arrivals-subgroups"
      className={subgroupsClassName}
      role="list"
    >
      {group.bounds.map((bound, index) => (
        <ArrivalsBoundGroup
          key={bound.key}
          bound={bound}
          mode={mode}
          lineName={group.lineName}
          isLastBound={index === group.bounds.length - 1}
          pageSize={pageSize}
          showLineChip={group.lineIds.length > 1}
          classNames={classNames}
        />
      ))}
    </ul>
  )
}

/** Resolve per-line page size; falls back to the board-wide scalar. */
export const resolveGroupPageSize = (
  lineId: string,
  pageSize: number | undefined,
  pageSizeByLine: Readonly<Record<string, number>> | undefined,
  lineIds?: readonly string[],
): number | undefined => {
  if (!pageSizeByLine) return pageSize
  const ids = lineIds?.length ? lineIds : [lineId]
  for (const id of ids) {
    const keyed = pageSizeByLine[normalizeLineId(id)]
    if (typeof keyed === "number") return keyed
    const raw = pageSizeByLine[id]
    if (typeof raw === "number") return raw
  }
  return pageSize
}

export type ArrivalsBoardViewProps = ArrivalsBoardChromeProps & {
  mode: ArrivalsBoardMode
  prepared: ArrivalsPreparedBoard
  resolvedStopLetter?: string | null
  /**
   * Bus only. Per-route disruption warnings — build with
   * `prepareBusStopDisruptions` from `stopPoint.getDisruption` output.
   * Renders a warning chip per route in the header; hover/tap covers the
   * rows below with that route's description.
   */
  disruptions?: readonly BusStopDisruption[]
  /**
   * Visible arrivals per page. Rail: per compass bound. Bus grouped: per
   * route. Bus flat: the whole list, with a trailing pager tile. Omit or `0`
   * to show the prepared rows.
   */
  pageSize?: number
  /**
   * Rail only: ID-keyed rows-per-bound override. Falls back to `pageSize`
   * for lines not listed. Each value applies to every bound on that line.
   */
  pageSizeByLine?: Readonly<Record<string, number>>
  /**
   * Root classes, merged over the board container (`data-slot="arrivals-board"`).
   * The root *is* the `arrivals` container, so container-query variants here
   * query an outer context — put board-width arrangements on `classNames.groups`
   * instead.
   */
  className?: string
  /**
   * Layout-level class overrides for generated parts (`data-slot` per level).
   * CSS-first: arrange line sections via `groups`, bound columns via
   * `subgroups` — no JavaScript layout config.
   */
  classNames?: ArrivalsBoardClassNames
}

/**
 * Shared arrivals presentation. Domain boards prepare grouping and order;
 * this paints the already-resolved structure.
 */
export const ArrivalsBoardView = ({
  mode,
  prepared,
  stopName,
  resolvedStopLetter,
  disruptions = [],
  headingLevel = 1,
  loading = false,
  error = null,
  statusLabel,
  emptyKind = "empty",
  emptyMessage,
  pageSize,
  pageSizeByLine,
  className,
  classNames,
}: ArrivalsBoardViewProps) => {
  const TitleTag = headingLevel === 2 ? "h2" : "h1"
  const emptyCopy = emptyMessage ?? ARRIVALS_EMPTY_COPY[emptyKind]
  const showEmpty =
    !error &&
    !loading &&
    prepared.rows.length === 0 &&
    prepared.groups.length === 0

  return (
    <div
      data-slot="arrivals-board"
      className={cn("@container/arrivals w-full", className)}
      style={ARRIVALS_RHYTHM_VARS}
    >
      <BusStopDisruptionBoundary disruptions={mode === "bus" ? disruptions : []}>
      <div
        className={cn(
          "flex min-w-0 items-center gap-x-3 text-3xl",
          ARRIVALS_TILE_CLASS
        )}
      >
        <TfLRoundel
          variant={mode === "bus" ? "buses" : "underground"}
          className="size-[var(--arrivals-row)] shrink-0"
          aria-hidden
        />
        {stopName ? (
          <TitleTag
            className={cn(
              "flex h-full min-w-0 flex-1 items-center gap-x-1.5",
              TITLE_CLASS
            )}
            aria-label={stopName}
          >
            <StationNameTitle name={stopName} />
            {mode === "bus" ? <BusStopDisruptionChips /> : null}
          </TitleTag>
        ) : loading ? (
          <Skeleton className="h-8 w-56 max-w-full" />
        ) : (
          <TitleTag className={cn("min-w-0 flex-1", TITLE_CLASS)}>
            <span className="sr-only">Arrivals</span>
          </TitleTag>
        )}
        {resolvedStopLetter ? (
          <StopLetterBadge letter={resolvedStopLetter} />
        ) : null}
        {statusLabel ? (
          <p className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
            {statusLabel}
          </p>
        ) : null}
      </div>
      <BusStopDisruptionCover />

      {error ? (
        <p
          className={cn(
            "flex items-center truncate text-base text-destructive",
            ARRIVALS_TILE_CLASS
          )}
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {showEmpty ? (
        <p
          className={cn(
            "flex items-center text-base text-muted-foreground",
            ARRIVALS_TILE_CLASS
          )}
          role="status"
        >
          {emptyCopy}
        </p>
      ) : null}

      {prepared.layout === "flat" ? (
        <ArrivalsPagedList
          rows={prepared.rows}
          mode={mode}
          pageSize={pageSize}
          classNames={classNames}
        />
      ) : mode === "bus" ? (
        <div
          data-slot="arrivals-groups"
          className={cn("grid grid-cols-1", classNames?.groups)}
        >
          {prepared.groups.map((group, index) => (
            <ArrivalsPagedGroup
              key={group.key}
              group={group}
              mode={mode}
              headingLevel={headingLevel}
              pageSize={pageSize}
              isLastGroup={index === prepared.groups.length - 1}
              classNames={classNames}
            />
          ))}
        </div>
      ) : (
        <div
          data-slot="arrivals-groups"
          className={cn("grid grid-cols-1", classNames?.groups)}
        >
          {prepared.groups.map((group) => (
            <section
              key={group.key}
              data-slot="arrivals-group"
              data-line={
                group.lineIds.length > 1
                  ? undefined
                  : group.lineId || undefined
              }
              className={cn(
                "@container/arrivals-group min-w-0",
                classNames?.group
              )}
            >
              <ArrivalsGroupHeader group={group} headingLevel={headingLevel} />
              <GroupBody
                group={group}
                mode={mode}
                pageSize={resolveGroupPageSize(
                  group.lineId,
                  pageSize,
                  pageSizeByLine,
                  group.lineIds
                )}
                classNames={classNames}
              />
            </section>
          ))}
        </div>
      )}
      </BusStopDisruptionBoundary>
    </div>
  )
}
