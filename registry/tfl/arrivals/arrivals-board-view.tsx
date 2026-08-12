import type { CSSProperties } from "react"
import type { RealtimePrediction } from "tfl-ts"
import { Loader2 } from "lucide-react"
import { TfLRoundel } from "@/components/tfl/brand/tfl-roundel"
import { StationName } from "@/components/tfl/station-name"
import {
  ARRIVALS_EMPTY_COPY,
  ARRIVALS_LINE_EMPTY_COPY,
  type ArrivalsEmptyKind,
} from "@/lib/tfl/arrivals-empty"
import type {
  ArrivalsPreparedBoard,
  ArrivalsPreparedGroup,
} from "@/lib/tfl/arrivals-prepare"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import {
  ArrivalsBoundGroup,
  ArrivalsGroupHeader,
  ArrivalsPagedGroup,
  ArrivalsPagedList,
} from "@/components/tfl/arrivals/arrivals-bound-group"

export type ArrivalsBoardMode = "rail" | "bus"

export {
  formatArrivalsCountdown,
  getArrivalsPlatformNumber,
} from "@/components/tfl/arrivals/arrivals-bound-group"

export type ArrivalsBoardChromeProps = {
  stopName: string
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
  /** Optional poll / refresh label (e.g. "Poll #3 · every 15s"). */
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

/** Line/route brand bar thickness — painted inside the tile via border-box. */
const LINE_BAR_BORDER_CLASS = "border-b-4"
const TITLE_CLASS =
  "[font-synthesis:none] [font-weight:var(--tfl-title-weight,400)] [letter-spacing:var(--tfl-title-tracking,0)]"

const LIST_RESET_CLASS = "m-0 ml-0 list-none space-y-0 p-0 [&>li]:mt-0"

/** Single-letter stop badge from bus `platformName` (e.g. "G"). */
export const getBusStopLetterFromPlatform = (
  platformName?: string
): string | null => {
  if (!platformName) return null
  const letter = platformName.trim()
  if (/^[A-Za-z]$/.test(letter)) return letter.toUpperCase()
  return null
}

export const resolveBusStopLetter = (
  stopLetter: string | undefined,
  rows: readonly RealtimePrediction[]
): string | null => {
  const fromProp = stopLetter?.trim().toUpperCase()
  if (fromProp) return fromProp
  for (const row of rows) {
    const letter = getBusStopLetterFromPlatform(row.platformName)
    if (letter) return letter
  }
  return null
}

const StopLetterBadge = ({ letter }: { letter: string }) => (
  <span
    data-line="buses"
    className="relative -top-px inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--line-color)] align-middle text-[11px] leading-none font-bold text-[var(--line-ink)]"
    aria-label={`Stop ${letter}`}
  >
    {letter}
  </span>
)

export const ArrivalsBoardSkeleton = ({
  mode = "rail",
}: {
  mode?: ArrivalsBoardMode
}) => (
  <div
    className="w-full space-y-2"
    style={ARRIVALS_RHYTHM_VARS}
    aria-busy
    aria-label="Loading arrivals"
  >
    <div className={cn("flex items-center", ARRIVALS_TILE_CLASS)}>
      <Skeleton className="h-8 w-56 max-w-full" />
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
          <div
            className={cn(
              "flex items-end",
              ARRIVALS_TILE_CLASS,
              LINE_BAR_BORDER_CLASS
            )}
          >
            <Skeleton className="mb-2 h-5 w-28" />
          </div>
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
}: {
  group: ArrivalsPreparedGroup
  mode: ArrivalsBoardMode
  pageSize?: number
}) => {
  const labeledBounds = group.bounds.filter((bound) => bound.label)

  if (!group.hasInformation && labeledBounds.length === 0) {
    return (
      <ul className={LIST_RESET_CLASS} role="list">
        <li
          className={cn(
            "flex items-center text-sm text-muted-foreground",
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
    <ul className={LIST_RESET_CLASS} role="list">
      {group.bounds.map((bound, index) => (
        <ArrivalsBoundGroup
          key={bound.key}
          bound={bound}
          mode={mode}
          lineName={group.lineName}
          isLastBound={index === group.bounds.length - 1}
          pageSize={pageSize}
        />
      ))}
    </ul>
  )
}

export type ArrivalsBoardViewProps = ArrivalsBoardChromeProps & {
  mode: ArrivalsBoardMode
  prepared: ArrivalsPreparedBoard
  resolvedStopLetter?: string | null
  /**
   * Visible arrivals per page. Rail: per compass bound. Bus grouped: per
   * route. Bus flat: the whole list, with a trailing pager tile. Omit or `0`
   * to show the prepared rows.
   */
  pageSize?: number
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
  headingLevel = 1,
  loading = false,
  error = null,
  statusLabel,
  emptyKind = "empty",
  emptyMessage,
  pageSize,
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
      className="@container/arrivals w-full space-y-2"
      style={ARRIVALS_RHYTHM_VARS}
    >
      <div
        className={cn("flex min-w-0 items-center gap-x-3", ARRIVALS_TILE_CLASS)}
      >
        <TfLRoundel
          variant={mode === "bus" ? "buses" : "underground"}
          className="size-[var(--arrivals-row)] shrink-0"
          aria-hidden
        />
        <TitleTag
          className={cn("min-w-0 flex-1 text-3xl", TITLE_CLASS)}
          aria-label={stopName}
        >
          <span className="block min-w-0" aria-hidden="true">
            <StationName
              name={stopName}
              layout="auto"
              maxLines={1}
              allowAbbreviation
              allowScaleDown
              className="justify-center leading-8"
            />
          </span>
        </TitleTag>
        {resolvedStopLetter || statusLabel || loading ? (
          <div className="flex shrink-0 items-center gap-x-2">
            {resolvedStopLetter ? (
              <StopLetterBadge letter={resolvedStopLetter} />
            ) : null}
            {statusLabel || loading ? (
              <p className="flex items-center gap-2 text-xs text-muted-foreground">
                {loading ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    Loading…
                  </>
                ) : (
                  statusLabel
                )}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      {error ? (
        <p
          className={cn(
            "flex items-center truncate text-sm text-destructive",
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
            "flex items-center text-sm text-muted-foreground",
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
        />
      ) : mode === "bus" ? (
        <div className="flex flex-col">
          {prepared.groups.map((group, index) => (
            <ArrivalsPagedGroup
              key={group.key}
              group={group}
              mode={mode}
              headingLevel={headingLevel}
              pageSize={pageSize}
              isLastGroup={index === prepared.groups.length - 1}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col">
          {prepared.groups.map((group) => (
            <section key={group.key}>
              <ArrivalsGroupHeader
                group={group}
                headingLevel={headingLevel}
              />
              <GroupBody
                group={group}
                mode={mode}
                pageSize={pageSize}
              />
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
