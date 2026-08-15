import { type CSSProperties, type ReactNode } from "react"
import Link from "next/link"
import { LINE_ORDER } from "tfl-ts"
import { ExternalLink, Package } from "lucide-react"
import { cn } from "@/lib/utils"
import { CHIP_CAP_TEXT_BOX_CLASS } from "@/components/tfl/arrivals/chip-text"
import { LineColorBar } from "@/components/tfl/brand/line-badge"
import { LineName } from "@/components/tfl/brand/line-name"
import { TfLRoundel } from "@/components/tfl/brand/tfl-roundel"
import { getLineNameTiers } from "@/lib/tfl/line-names"
import { partitionStatusBoardLines } from "@/lib/tfl/status-board"
import type { StatusLine } from "@/lib/tfl/status-types"
import { type LineAnnouncement } from "@/lib/tfl/status-reason"

export type { StatusLine } from "@/lib/tfl/status-types"
export {
  isCurrentAnnouncement,
  isScheduledEngineeringWork,
  prepareLineAnnouncements,
  stripStatusReason,
} from "@/lib/tfl/status-reason"
export type {
  DisruptionStatus,
  LineAnnouncement,
} from "@/lib/tfl/status-reason"

type Props = {
  /** Normalised line status rows from `tfl-ts` (or fixtures). Missing/`undefined` renders empty. */
  data?: readonly StatusLine[]
  children?: ReactNode
  /** When true, omit the page header (useful inside a layout that already has one). */
  hideHeader?: boolean
  /** One column — for a narrow side slot. */
  compact?: boolean
  /**
   * Clock for validity windows and tfl-ts current-row helpers.
   * Pass cache `fetchedAt`. Do not call `Date.now()` in the RSC shell.
   */
  now?: number
  /**
   * Keep operative announcements (`getCurrentLineStatuses`), not `isNow`.
   * Rows with no validity window are live and always kept. Default true.
   * Set `currentOnly={false} dedupe={false} rawReason` for TfL's array verbatim.
   */
  currentOnly?: boolean
  /**
   * Collapse equal or fully contained announcement paragraphs into one,
   * painted at the worse severity. Default true.
   */
  dedupe?: boolean
  /**
   * Keep TfL's raw `reason` string, including mode prefixes such as
   * `LONDON TRAMS:`. Default strips those prefixes.
   */
  rawReason?: boolean
}

/**
 * Modes on TfL’s Tube & Rail status surface (Cable Car is listed separately).
 * Prefer `getCachedLineStatuses()` with no IDs so the client fetches by mode.
 */
export const DEFAULT_STATUS_MODES = [
  "tube",
  "elizabeth-line",
  "dlr",
  "tram",
  "overground",
] as const

/**
 * Tube & Rail lines in `tfl-ts` `LINE_ORDER` (default board sort, no severity).
 * Matches TfL’s Tube / Overground / Elizabeth / DLR / Tram set.
 */
export const DEFAULT_STATUS_BOARD_LINE_IDS = LINE_ORDER

export const DEFAULT_STATUS_LINE_COUNT = DEFAULT_STATUS_BOARD_LINE_IDS.length

/**
 * Curated Underground + Elizabeth subset for demos / Blocks.
 * Fetch with `getCachedLineStatuses(DEFAULT_STATUS_LINE_IDS)` in the app layer
 * and pass `data` plus `now={fetchedAt}`.
 */
export const DEFAULT_STATUS_LINE_IDS = [
  "bakerloo",
  "central",
  "circle",
  "district",
  "elizabeth",
  "hammersmith-city",
  "jubilee",
  "metropolitan",
  "northern",
  "piccadilly",
  "victoria",
  "waterloo-city",
] as const

const OVERGROUND_LINE_IDS = new Set([
  "liberty",
  "lioness",
  "mildmay",
  "suffragette",
  "weaver",
  "windrush",
])

const statusLineModeName = (lineId: string) => {
  if (lineId === "elizabeth") return "elizabeth-line"
  if (OVERGROUND_LINE_IDS.has(lineId)) return "overground"
  if (lineId === "dlr") return "dlr"
  if (lineId === "tram") return "tram"
  return "tube"
}

/** Same tile rhythm as arrivals boards — heights are N × `--arrivals-row`. */
const BOARD_RHYTHM_VARS = {
  "--arrivals-unit": "0.5rem",
  "--arrivals-row": "calc(var(--arrivals-unit) * 6)",
} as CSSProperties

const TILE_CLASS =
  "box-border h-[var(--arrivals-row)] min-h-[var(--arrivals-row)] max-h-[var(--arrivals-row)] shrink-0 overflow-hidden"

/** Pull the brand bar into the tile without shrinking the title box. */
const LINE_BAR_PULL_CLASS = "pointer-events-none -mt-1"

/** Resolves via `data-line` → `--line-color` from tfl-colours tokens. */
const lineTitleClass = "tfl-dark-line-text text-[var(--line-color)]"

/** Platform-chip geometry; neutral fill so severity is read as text, not colour. */
const SeverityChip = ({ label }: { label: string }) => (
  <span
    className={cn(
      "mr-[0.35em] inline-flex h-5 max-w-full shrink-0 items-center justify-center bg-foreground/5 px-1.5 align-middle text-xs font-semibold text-foreground/60",
      CHIP_CAP_TEXT_BOX_CLASS
    )}
  >
    <span className="truncate">{label}</span>
  </span>
)

/** Half a tile so wrapping copy lands on the arrivals baseline. */
const DISRUPTION_LEADING_CLASS = "leading-[calc(var(--arrivals-row)/2)]"

const DISRUPTION_COPY_CLASS = cn(
  "text-base text-pretty text-foreground/80",
  DISRUPTION_LEADING_CLASS
)

/**
 * Ceil copy to a whole `--arrivals-row` so the next line header stays on
 * the arrivals tile grid. Leading is half a tile, so leftover is 0–2lh —
 * enough gap without a separate min padding.
 */
const DISRUPTION_SNAP_STYLE = {
  height: "calc-size(auto, round(up, size, var(--arrivals-row)))",
} as CSSProperties

const StatusDisruptionBlock = ({
  announcements,
  quiet = false,
}: {
  announcements: readonly LineAnnouncement[]
  quiet?: boolean
}) => (
  <div
    className={cn("box-border", DISRUPTION_LEADING_CLASS)}
    style={DISRUPTION_SNAP_STYLE}
  >
    {announcements.map((announcement, index) => (
      <StatusDisruptionCopy
        key={index}
        announcement={announcement}
        quiet={quiet}
      />
    ))}
  </div>
)

const StatusDisruptionCopy = ({
  announcement,
  quiet = false,
}: {
  announcement: LineAnnouncement
  quiet?: boolean
}) => {
  const severityLabel = announcement.statusSeverityDescription?.trim()
  const body = announcement.text
  const bodyIsOnlyLabel = severityLabel
    ? body.toLowerCase() === severityLabel.toLowerCase()
    : false

  return (
    <p className={cn(DISRUPTION_COPY_CLASS, quiet && "text-muted-foreground")}>
      {severityLabel ? <SeverityChip label={severityLabel} /> : null}
      {bodyIsOnlyLabel ? null : body}
    </p>
  )
}

const StatusLineHeader = ({
  lineId,
  modeName,
  name,
  trailing,
}: {
  lineId?: string
  modeName?: string
  name: string
  trailing?: ReactNode
}) => (
  <>
    <header
      data-line={lineId}
      className={cn("relative flex items-center", TILE_CLASS)}
    >
      <h3
        className={cn(
          "m-0 min-w-0 flex-1 pr-2 text-xl leading-7 font-semibold",
          lineTitleClass
        )}
      >
        <LineName lineId={lineId} name={name} />
      </h3>
      {trailing}
    </header>
    <div className={LINE_BAR_PULL_CLASS} aria-hidden>
      <LineColorBar lineId={lineId} modeName={modeName} heightClass="h-1" />
    </div>
  </>
)

const StatusSectionTitle = ({ children }: { children: ReactNode }) => (
  <h2
    className={cn(
      "m-0 flex items-center text-xl leading-7 font-semibold",
      TILE_CLASS
    )}
  >
    {children}
  </h2>
)

/** Static board chrome — no status data required. */
export const TubeStatusBoardHeader = () => (
  <div className="flex flex-wrap items-center justify-between gap-2">
    <div className="flex items-center gap-3">
      <TfLRoundel className="size-10 lg:size-12" />
      <div>
        <h1 className="scroll-m-20 text-4xl font-extrabold text-balance lg:text-5xl">
          Live TfL Status
        </h1>
        <p className="mt-1 text-base text-muted-foreground">
          Built with{" "}
          <code className="rounded bg-muted px-1 py-0.5 text-xs">tfl-ts</code> +
          open React components
        </p>
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-2">
      <Link
        href="https://www.npmjs.com/package/tfl-ts"
        className="flex items-center gap-1 text-blue-500 hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Package className="size-4" aria-hidden />
        npm package
        <ExternalLink className="size-4" aria-hidden />
      </Link>
      <Link
        href="https://github.com/ghcpuman902/tfl-ts"
        className="flex items-center gap-1 text-blue-500 hover:underline"
        target="_blank"
        rel="noopener noreferrer"
      >
        GitHub
        <ExternalLink className="size-4" aria-hidden />
      </Link>
    </div>
  </div>
)

type SkeletonProps = {
  /** Line IDs to paint (defaults to `LINE_ORDER` Tube & Rail set). */
  lineIds?: readonly string[]
  /** One column — for a narrow side slot. */
  compact?: boolean
}

const goodServiceGridClass = (compact: boolean) =>
  compact
    ? "mt-2 grid grid-cols-1 justify-items-stretch gap-x-4 gap-y-0"
    : "mt-2 grid grid-cols-2 justify-items-stretch gap-x-4 gap-y-0 md:grid-cols-3 lg:grid-cols-5"

const disruptionGridClass = (compact: boolean) =>
  compact
    ? "mt-2 grid grid-cols-1 gap-x-4"
    : "mt-2 grid grid-cols-1 gap-x-4 md:grid-cols-2 lg:grid-cols-3"

/**
 * Calm loading placeholder — every line in default `LINE_ORDER`,
 * brand bars/titles present but fully desaturated until live data arrives.
 */
export const TubeStatusBoardSkeleton = ({
  lineIds = DEFAULT_STATUS_BOARD_LINE_IDS,
  compact = false,
}: SkeletonProps) => (
  <div
    className="flex w-full flex-col text-base"
    style={BOARD_RHYTHM_VARS}
    aria-busy
    aria-label="Loading line status"
  >
    <div>
      <StatusSectionTitle>Checking the lines...</StatusSectionTitle>
      <div className={goodServiceGridClass(compact)}>
        {lineIds.map((lineId) => {
          const label = getLineNameTiers(lineId).full

          return (
            <div key={lineId} className="saturate-0">
              <StatusLineHeader
                lineId={lineId}
                modeName={statusLineModeName(lineId)}
                name={label}
              />
            </div>
          )
        })}
      </div>
    </div>

    <div
      className={cn(
        "flex items-center border-t text-center text-base text-muted-foreground",
        TILE_CLASS
      )}
    >
      <p className="w-full text-balance">
        Data from Transport for London via{" "}
        <span className="text-blue-500">tfl-ts</span>. Pass normalised rows as{" "}
        <code className="text-xs">data</code>.
      </p>
    </div>
  </div>
)

/**
 * Data-aware status board — pass normalised `tfl-ts` line status rows as `data`.
 * Fetching belongs in the app / docs / Block layer (see `getCachedLineStatuses`).
 * Live layout: disruptions (closed sorted last) then good service.
 */
export const TubeStatusBoard = ({
  data,
  hideHeader = false,
  compact = false,
  now,
  currentOnly = true,
  dedupe = true,
  rawReason = false,
  children,
}: Props) => {
  const { disruptions, goodService } = partitionStatusBoardLines(data ?? [], {
    currentOnly,
    dedupe,
    rawReason,
    now,
  })

  return (
    <div className="flex w-full flex-col text-base" style={BOARD_RHYTHM_VARS}>
      {!hideHeader && (
        <div className="mb-[var(--arrivals-row)]">
          <TubeStatusBoardHeader />
        </div>
      )}

      {disruptions.length > 0 && (
        <div>
          <StatusSectionTitle>Service Disruptions</StatusSectionTitle>
          <div className={disruptionGridClass(compact)}>
            {disruptions.map(({ line, announcements, kind }) => {
              return (
                <div key={line.id ?? line.name} className="flex flex-col">
                  <StatusLineHeader
                    lineId={line.id}
                    modeName={line.modeName}
                    name={line.name ?? line.id ?? "Line"}
                  />

                  <StatusDisruptionBlock
                    announcements={announcements}
                    quiet={kind === "closed"}
                  />
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div>
        <StatusSectionTitle>
          Good Service
          {disruptions.length > 0 && (
            <span className="ml-2 text-base font-normal text-muted-foreground">
              ({goodService.length} lines)
            </span>
          )}
        </StatusSectionTitle>
        <div className={goodServiceGridClass(compact)}>
          {goodService.map(({ line, announcements }) => {
            const infoLabel =
              announcements[0]?.statusSeverityDescription?.trim()
            return (
              <StatusLineHeader
                key={line.id ?? line.name}
                lineId={line.id}
                modeName={line.modeName}
                name={line.name ?? line.id ?? "Line"}
                trailing={
                  infoLabel ? (
                    <span className="max-w-[40%] truncate text-base text-muted-foreground">
                      {infoLabel}
                    </span>
                  ) : null
                }
              />
            )
          })}
        </div>
      </div>

      <div
        className={cn(
          "flex items-center border-t text-center text-base text-muted-foreground",
          TILE_CLASS
        )}
      >
        <p className="w-full text-balance">
          Data from Transport for London via{" "}
          <Link
            href="https://www.npmjs.com/package/tfl-ts"
            className="text-blue-500 hover:underline"
          >
            tfl-ts
          </Link>
          . Pass normalised rows as <code className="text-xs">data</code>.
        </p>
      </div>

      {children}
    </div>
  )
}
