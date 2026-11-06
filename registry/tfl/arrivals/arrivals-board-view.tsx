import type { CSSProperties } from "react"
import { normalizeLineId, type RealtimePrediction } from "tfl-ts"
import { TfLRoundel } from "@/components/tfl/brand/tfl-roundel"
import { ArrivalsStatusSentence } from "@/components/tfl/arrivals/quiet-chip"
import type { RoundelPreset } from "@/lib/tfl/roundel-presets"
import { StationNameTitle } from "@/components/tfl/station-name"
import {
  BusStopDisruptionBoundary,
  BusStopDisruptionChips,
  BusStopDisruptionCover,
} from "@/components/tfl/arrivals/bus-stop-disruptions"
import type { BusStopDisruption } from "@/lib/tfl/prepare-bus-stop-disruptions"
import { RotateCw } from "lucide-react"
import {
  ARRIVALS_EMPTY_COPY,
  ARRIVALS_ERROR_COPY,
  ARRIVALS_LINE_EMPTY_COPY,
  arrivalsHeldTiles,
  arrivalsLineEmptyCopy,
  resolveArrivalsHold,
  resolveArrivalsLeftoverStatus,
  resolveArrivalsStatusChip,
  resolveHeldBounds,
  resolveLineArrivalsEmptyKind,
  type ArrivalsEmptyKind,
  type ArrivalsHeldTile,
  type ArrivalsHold,
  type ArrivalsStatusSignal,
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
  BoundHeadingLabel,
  ArrivalsPagedGroup,
  ArrivalsPagedList,
  type ArrivalsBoardClassNames,
} from "@/components/tfl/arrivals/arrivals-bound-group"
import type { DisplayBehaviour } from "@/lib/tfl/unattended-sequence"

export type { DisplayBehaviour }

export type ArrivalsBoardMode = "rail" | "bus" | "river"

const arrivalsRoundelVariant = (mode: ArrivalsBoardMode): RoundelPreset => {
  if (mode === "bus") return "buses"
  if (mode === "river") return "river"
  return "underground"
}

const isRouteArrivalsMode = (mode: ArrivalsBoardMode): boolean =>
  mode === "bus" || mode === "river"

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
   * NaPTAN / stop-point id. Not shown in the board UI. Rail leftover tiles
   * and empty-row chips use it to ignore line status that does not affect
   * this station (`getStatus({ detail: true })` geography).
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
   * Resolve in the app (`resolveArrivalsEmptyKind`) from clock / status / domain.
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
 * but borders/bars must never grow the tile (`box-border` + `overflow-clip`).
 * Clip, not `hidden`: tiles must not become scroll containers above the page track.
 */
export const ARRIVALS_TILE_CLASS =
  "box-border h-[var(--arrivals-row)] min-h-[var(--arrivals-row)] max-h-[var(--arrivals-row)] min-w-0 shrink-0 overflow-clip"

const TITLE_CLASS =
  "tfl-title [font-synthesis:none] [font-weight:var(--tfl-title-weight,400)] [letter-spacing:var(--tfl-title-tracking,0)]"

const LIST_RESET_CLASS = "m-0 ml-0 list-none space-y-0 p-0 [&>li]:mt-0"

export {
  getBusStopLetterFromPlatform,
  resolveBusStopLetter,
} from "@/lib/tfl/bus-stop-letter"

/** Explicit `stopName` wins; otherwise the first non-empty `stationName` on `data`. */
export const resolveArrivalsHeading = (
  stopName: string | undefined,
  data?: readonly Pick<RealtimePrediction, "stationName">[]
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

export type ArrivalsRetry = {
  onRetry: () => void
  /** A retry is in flight. The control stays put; only its icon spins. */
  retrying?: boolean
}

const RetryButton = ({ onRetry, retrying = false }: ArrivalsRetry) => (
  <button
    type="button"
    onClick={onRetry}
    disabled={retrying}
    aria-busy={retrying || undefined}
    className="-mr-2 inline-flex min-h-11 min-w-11 shrink-0 [touch-action:manipulation] items-center justify-center gap-1.5 px-2 text-sm text-foreground underline-offset-4 hover:underline disabled:cursor-progress disabled:no-underline"
  >
    <RotateCw
      className={cn("size-4", retrying && "motion-safe:animate-spin")}
      aria-hidden
    />
    Try again
  </button>
)

/** One row tile of a held bound: skeleton bar, failure note, or quiet dash. */
const HeldRowTile = ({
  tile,
  retry,
}: {
  tile: ArrivalsHeldTile
  retry?: ArrivalsRetry
}) => {
  if (tile === "skeleton") {
    return (
      <div className={cn("flex items-center", ARRIVALS_TILE_CLASS)}>
        <Skeleton className="h-5 w-full" />
      </div>
    )
  }
  if (tile === "dash") {
    return (
      <div
        aria-hidden
        className={cn(
          "flex items-center text-base text-muted-foreground/50",
          ARRIVALS_TILE_CLASS
        )}
      >
        —
      </div>
    )
  }
  return (
    <div
      className={cn(
        "flex items-center gap-x-3 text-base text-muted-foreground",
        ARRIVALS_TILE_CLASS
      )}
    >
      <p className="min-w-0 flex-1 truncate">{ARRIVALS_ERROR_COPY}</p>
      {retry ? <RetryButton {...retry} /> : null}
    </div>
  )
}

export const ArrivalsBoardSkeleton = ({
  mode = "rail",
  className,
  stopName,
  stopLetter,
  error,
  retry,
}: {
  mode?: ArrivalsBoardMode
  className?: string
  /** Known stop identity — paint immediately; do not wait on predictions. */
  stopName?: string
  stopLetter?: string
  /** Rail: the first fetch failed. The shell keeps its height around the note. */
  error?: string | null
  retry?: ArrivalsRetry
}) => {
  const failed = mode === "rail" && Boolean(error)
  return (
    <div
      data-slot="arrivals-board"
      className={cn("@container/arrivals w-full min-w-0", className)}
      style={ARRIVALS_RHYTHM_VARS}
      aria-busy={!failed || retry?.retrying || undefined}
      aria-label={failed ? undefined : "Loading arrivals"}
    >
      {failed ? (
        <p className="sr-only" role="alert">
          {error}
        </p>
      ) : null}
      <div
        className={cn(
          "flex min-w-0 items-center gap-x-3 text-3xl",
          ARRIVALS_TILE_CLASS
        )}
      >
        {stopName ? (
          <>
            <TfLRoundel
              variant={arrivalsRoundelVariant(mode)}
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
      {isRouteArrivalsMode(mode) ? (
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
                "flex items-center border-b-4 border-border",
                ARRIVALS_TILE_CLASS
              )}
            >
              {failed ? null : <Skeleton className="h-6 w-28" />}
            </div>
            {arrivalsHeldTiles(failed ? "failed" : "loading", 4).map(
              (tile, rowIndex) => (
                <HeldRowTile
                  key={rowIndex}
                  tile={tile === "note" && sectionIndex > 0 ? "dash" : tile}
                  retry={retry}
                />
              )
            )}
          </div>
        ))
      )}
    </div>
  )
}

/**
 * First fetch in flight, or a fetch failed: the line's loaded footprint
 * (`resolveHeldBounds`), so arrivals land, and failures show, without moving
 * anything below.
 */
const HeldGroupBody = ({
  group,
  hold,
  loaded,
  pageSize,
  classNames,
  retry,
}: {
  group: ArrivalsPreparedGroup
  hold: Exclude<ArrivalsHold, null>
  loaded: boolean
  pageSize?: number
  classNames?: ArrivalsBoardClassNames
  /** Shown once, on the board's first bound. */
  retry?: ArrivalsRetry
}) => {
  const bounds = resolveHeldBounds(group, { loaded, pageSize })
  return (
    <ul
      data-slot="arrivals-subgroups"
      className={cn(
        LIST_RESET_CLASS,
        "grid min-w-0 grid-cols-1",
        classNames?.subgroups
      )}
      role="list"
    >
      {bounds.map(({ heading, rows }, index) => (
        <li
          key={index}
          data-slot="arrivals-subgroup"
          className={cn("min-w-0", classNames?.subgroup)}
        >
          {heading ? (
            <div
              className={cn(
                "flex items-center text-xl leading-7 font-semibold text-muted-foreground",
                ARRIVALS_TILE_CLASS
              )}
            >
              {heading !== "pending" ? (
                <BoundHeadingLabel bound={heading} />
              ) : hold === "loading" ? (
                <Skeleton className="h-5 w-32" />
              ) : null}
            </div>
          ) : null}
          <div className={classNames?.rows}>
            {arrivalsHeldTiles(hold, rows).map((tile, row) => (
              <HeldRowTile
                key={row}
                tile={tile}
                retry={index === 0 ? retry : undefined}
              />
            ))}
          </div>
        </li>
      ))}
    </ul>
  )
}

const GroupBody = ({
  group,
  mode,
  hold = null,
  loaded = false,
  retry,
  pageSize,
  classNames,
  behaviour,
  pinFirst,
  dwellMs,
  startDelayMs,
  idleReturnMs,
  nowMs,
  lineStatus,
  stopPointId,
}: {
  group: ArrivalsPreparedGroup
  mode: ArrivalsBoardMode
  hold?: ArrivalsHold
  loaded?: boolean
  retry?: ArrivalsRetry
  pageSize?: number
  classNames?: ArrivalsBoardClassNames
  behaviour?: DisplayBehaviour
  pinFirst?: boolean
  dwellMs?: number
  startDelayMs?: number
  idleReturnMs?: number
  nowMs?: number
  lineStatus?: readonly ArrivalsStatusSignal[]
  stopPointId?: string
}) => {
  if (hold) {
    return (
      <HeldGroupBody
        group={group}
        hold={hold}
        loaded={loaded}
        pageSize={pageSize}
        classNames={classNames}
        retry={retry}
      />
    )
  }
  const labeledBounds = group.bounds.filter((bound) => bound.label)
  const emptyState =
    mode === "rail"
      ? resolveLineArrivalsEmptyKind({
          lineIds: group.lineIds,
          rowCount: group.hasInformation ? 1 : 0,
          nowMs,
          lineStatus,
          stopPointId,
        })
      : null
  const lineEmptyCopy =
    mode === "rail"
      ? arrivalsLineEmptyCopy(emptyState)
      : ARRIVALS_LINE_EMPTY_COPY
  const emptyChip =
    mode === "rail" && !group.hasInformation
      ? resolveArrivalsStatusChip({
          lineIds: group.lineIds,
          hasTrains: false,
          emptyKind: emptyState?.kind ?? "empty",
          lineStatus,
          nowMs,
          stopPointId,
        })
      : null
  const leftoverStatus =
    mode === "rail" && group.hasInformation
      ? resolveArrivalsLeftoverStatus({
          lineIds: group.lineIds,
          lineStatus,
          nowMs,
          stopPointId,
        })
      : null
  // `grid-cols-1` (not block) so consumer `grid-cols-*` variants merge cleanly.
  const subgroupsClassName = cn(
    LIST_RESET_CLASS,
    "grid min-w-0 grid-cols-1",
    classNames?.subgroups
  )

  if (!group.hasInformation && labeledBounds.length === 0) {
    const lockHeight = (pageSize ?? 0) > 0
    const dashCount = lockHeight ? Math.max(0, (pageSize ?? 1) - 1) : 0
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
          aria-label={`${group.lineName}: ${lineEmptyCopy}`}
        >
          <ArrivalsStatusSentence chip={emptyChip} sentence={lineEmptyCopy} />
        </li>
        {Array.from({ length: dashCount }, (_, index) => (
          <li
            key={`dash-${index}`}
            data-slot="arrivals-row"
            aria-hidden
            className={cn(
              "flex items-center text-base text-muted-foreground/50",
              ARRIVALS_TILE_CLASS
            )}
          >
            —
          </li>
        ))}
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
          behaviour={behaviour}
          pinFirst={pinFirst}
          idleReturnMs={idleReturnMs}
          dwellMs={dwellMs}
          startDelayMs={startDelayMs}
          emptyCopy={lineEmptyCopy}
          statusChip={emptyChip}
          leftoverStatus={leftoverStatus}
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
  lineIds?: readonly string[]
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
   * Bus and river. Per-route disruption warnings — build with
   * `prepareBusStopDisruptions` from `stopPoint.getDisruption` output.
   * Renders a warning chip per route in the header; hover/tap covers the
   * rows below with that route's description.
   */
  disruptions?: readonly BusStopDisruption[]
  /**
   * Visible arrivals per page. Rail: fixed subgroup height — every bound
   * occupies exactly this many arrival tiles (short pages fill with dashes
   * and an end-of-list message). Bus grouped / flat: same lock once there
   * is more than one page; a short unpaged list keeps its natural height.
   * Omit or `0` to show the prepared rows at natural height.
   */
  pageSize?: number
  /**
   * Rail only: ID-keyed rows-per-bound override. Falls back to `pageSize`
   * for lines not listed. Each value applies to every bound on that line.
   */
  pageSizeByLine?: Readonly<Record<string, number>>
  /** Interactive pager vs unattended auto-advance. Default interactive. */
  behaviour?: DisplayBehaviour
  /** Unattended: keep the first arrival visible while later slots rotate. */
  pinFirst?: boolean
  dwellMs?: number
  startDelayMs?: number
  /** Interactive: return to page 1 after this many idle milliseconds. */
  idleReturnMs?: number
  /**
   * Fetch timestamp for overnight empty copy and disruption windows.
   * Omit to refuse `ended`. Successful empty paints “No arrivals right now.”
   * (or ended / a short “No service.” note).
   */
  now?: number
  /**
   * Optional current line status from the app (Board already fetched it).
   * Classification signal; rail leftover tiles and empty-row chips may show
   * the official description when that status affects this stop
   * (`getStatus({ detail: true })` geography). Never pasted as reason text.
   */
  lineStatus?: readonly ArrivalsStatusSignal[]
  /**
   * Rail: refetch after `error`. Shows a Try again control on the first bound;
   * `loading` while `error` is set spins its icon.
   */
  onRetry?: () => void
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
  stopPointId,
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
  behaviour,
  pinFirst,
  dwellMs,
  startDelayMs,
  idleReturnMs,
  now,
  lineStatus,
  onRetry,
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
  // Rail lines keep their loaded footprint while loading and after a failure.
  const railGroups = mode === "rail" && prepared.groups.length > 0
  const loaded = now !== undefined || prepared.rows.length > 0
  const hold = railGroups
    ? resolveArrivalsHold({
        loading,
        failed: Boolean(error),
        rowCount: prepared.rows.length,
        loaded,
      })
    : null
  const retry = onRetry ? { onRetry, retrying: loading } : undefined
  const showStopDisruptions = mode === "bus" || mode === "river"
  const hasStopDisruptionChips = showStopDisruptions && disruptions.length > 0

  return (
    <div
      data-slot="arrivals-board"
      className={cn("@container/arrivals w-full min-w-0", className)}
      style={ARRIVALS_RHYTHM_VARS}
      aria-busy={(hold !== null && loading) || undefined}
    >
      <BusStopDisruptionBoundary
        disruptions={showStopDisruptions ? disruptions : []}
        variant={mode === "river" ? "river" : "bus"}
      >
        <div
          className={cn(
            "flex min-w-0 items-center gap-x-3 text-3xl",
            ARRIVALS_TILE_CLASS,
            hasStopDisruptionChips && "overflow-visible"
          )}
        >
          <TfLRoundel
            variant={arrivalsRoundelVariant(mode)}
            className="size-[var(--arrivals-row)] shrink-0"
            aria-hidden
          />
          {stopName ? (
            <TitleTag
              className={cn(
                "flex h-full min-w-0 flex-1 items-center",
                TITLE_CLASS
              )}
              aria-label={stopName}
            >
              <StationNameTitle
                name={stopName}
                end={
                  hasStopDisruptionChips ? (
                    <BusStopDisruptionChips />
                  ) : undefined
                }
              />
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

        {hold === "failed" ? (
          <p className="sr-only" role="alert">
            {error}
          </p>
        ) : null}
        {error && hold !== "failed" ? (
          <p
            className={cn(
              "flex items-center truncate text-base text-destructive",
              ARRIVALS_TILE_CLASS
            )}
            role="alert"
          >
            {error}
          </p>
        ) : showEmpty ? (
          <p
            className={cn(
              "flex items-center text-base text-muted-foreground",
              ARRIVALS_TILE_CLASS
            )}
            role="status"
          >
            <ArrivalsStatusSentence sentence={emptyCopy} />
          </p>
        ) : prepared.layout === "flat" ? (
          <ArrivalsPagedList
            rows={prepared.rows}
            mode={mode}
            pageSize={pageSize}
            classNames={classNames}
            behaviour={behaviour}
            pinFirst={pinFirst}
            idleReturnMs={idleReturnMs}
            dwellMs={dwellMs}
            startDelayMs={startDelayMs}
          />
        ) : isRouteArrivalsMode(mode) ? (
          <div
            data-slot="arrivals-groups"
            className={cn("grid min-w-0 grid-cols-1", classNames?.groups)}
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
                behaviour={behaviour}
                pinFirst={pinFirst}
                idleReturnMs={idleReturnMs}
                dwellMs={dwellMs}
                startDelayMs={startDelayMs}
              />
            ))}
          </div>
        ) : (
          <div
            data-slot="arrivals-groups"
            className={cn("grid min-w-0 grid-cols-1", classNames?.groups)}
          >
            {prepared.groups.map((group, groupIndex) => (
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
                  hold && "saturate-0",
                  classNames?.group
                )}
              >
                <ArrivalsGroupHeader
                  group={group}
                  mode={mode}
                  headingLevel={headingLevel}
                />
                <GroupBody
                  group={group}
                  mode={mode}
                  hold={hold}
                  loaded={loaded}
                  retry={groupIndex === 0 ? retry : undefined}
                  pageSize={resolveGroupPageSize(
                    group.lineId,
                    pageSize,
                    pageSizeByLine,
                    group.lineIds
                  )}
                  classNames={classNames}
                  behaviour={behaviour}
                  pinFirst={pinFirst}
                  idleReturnMs={idleReturnMs}
                  dwellMs={dwellMs}
                  startDelayMs={startDelayMs}
                  nowMs={now}
                  lineStatus={lineStatus}
                  stopPointId={stopPointId}
                />
              </section>
            ))}
          </div>
        )}
      </BusStopDisruptionBoundary>
    </div>
  )
}
