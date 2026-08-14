import { type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import {
  getSeverityClasses,
  isNormalService,
  hasNightService,
  LINE_ORDER,
} from "tfl-ts";
import {
  Ban,
  Bus,
  CalendarClock,
  CircleCheck,
  CircleOff,
  CirclePause,
  CircleX,
  Clock,
  ExternalLink,
  Gauge,
  Info,
  LogOut,
  Moon,
  OctagonPause,
  Package,
  PersonStanding,
  RouteOff,
  Split,
  TrainFrontTunnel,
  TriangleAlert,
  TrendingDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { LineColorBar } from "@/components/tfl/brand/line-badge";
import { TfLRoundel } from "@/components/tfl/brand/tfl-roundel";
import type { StatusLine } from "@/lib/tfl/status-types";
import {
  getDisruptionStatusIconName,
  stripStatusReason,
  type DisruptionStatus,
} from "@/lib/tfl/status-reason";

export type { StatusLine } from "@/lib/tfl/status-types";
export {
  getDisruptionStatusIconName,
  isScheduledEngineeringWork,
  stripStatusReason,
} from "@/lib/tfl/status-reason";
export type {
  DisruptionStatus,
  DisruptionStatusIconName,
} from "@/lib/tfl/status-reason";

type Props = {
  /** Normalised line status rows from `tfl-ts` (or fixtures). Missing/`undefined` renders empty. */
  data?: readonly StatusLine[];
  children?: ReactNode;
  /** When true, omit the page header (useful inside a layout that already has one). */
  hideHeader?: boolean;
  /** One column — for a narrow side slot. */
  compact?: boolean;
  /**
   * Keep TfL's raw `reason` string, including mode prefixes such as
   * `LONDON TRAMS:`. Default strips those prefixes.
   */
  rawReason?: boolean;
};

const DISRUPTION_STATUS_ICONS = {
  Ban,
  Bus,
  CalendarClock,
  CircleCheck,
  CircleOff,
  CirclePause,
  CircleX,
  Clock,
  Gauge,
  Info,
  LogOut,
  Moon,
  OctagonPause,
  PersonStanding,
  RouteOff,
  Split,
  TriangleAlert,
  TrendingDown,
} as const;

export const getDisruptionStatusIcon = (status: DisruptionStatus) =>
  DISRUPTION_STATUS_ICONS[getDisruptionStatusIconName(status)];

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
] as const;

/**
 * Tube & Rail lines in `tfl-ts` `LINE_ORDER` (default board sort, no severity).
 * Matches TfL’s Tube / Overground / Elizabeth / DLR / Tram set.
 */
export const DEFAULT_STATUS_BOARD_LINE_IDS = LINE_ORDER;

export const DEFAULT_STATUS_LINE_COUNT = DEFAULT_STATUS_BOARD_LINE_IDS.length;

/**
 * Curated Underground + Elizabeth subset for demos / Blocks.
 * Fetch with `getCachedLineStatuses(DEFAULT_STATUS_LINE_IDS)` in the app layer.
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
] as const;

const STATUS_LINE_LABELS: Record<string, string> = {
  bakerloo: "Bakerloo",
  central: "Central",
  circle: "Circle",
  district: "District",
  elizabeth: "Elizabeth line",
  "hammersmith-city": "Hammersmith & City",
  jubilee: "Jubilee",
  metropolitan: "Metropolitan",
  northern: "Northern",
  piccadilly: "Piccadilly",
  victoria: "Victoria",
  "waterloo-city": "Waterloo & City",
  dlr: "DLR",
  tram: "Tram",
  liberty: "Liberty",
  lioness: "Lioness",
  mildmay: "Mildmay",
  suffragette: "Suffragette",
  weaver: "Weaver",
  windrush: "Windrush",
};

const OVERGROUND_LINE_IDS = new Set([
  "liberty",
  "lioness",
  "mildmay",
  "suffragette",
  "weaver",
  "windrush",
]);

const statusLineModeName = (lineId: string) => {
  if (lineId === "elizabeth") return "elizabeth-line";
  if (OVERGROUND_LINE_IDS.has(lineId)) return "overground";
  if (lineId === "dlr") return "dlr";
  if (lineId === "tram") return "tram";
  return "tube";
};

/** Same tile rhythm as arrivals boards — heights are N × `--arrivals-row`. */
const BOARD_RHYTHM_VARS = {
  "--arrivals-unit": "0.5rem",
  "--arrivals-row": "calc(var(--arrivals-unit) * 6)",
} as CSSProperties;

const TILE_CLASS =
  "box-border h-[var(--arrivals-row)] min-h-[var(--arrivals-row)] max-h-[var(--arrivals-row)] shrink-0 overflow-hidden";

/** Half of `text-base` Johnston-like x-height (~4px). */
const LINE_BAR_BORDER_CLASS = "border-b-4";

/** Resolves via `data-line` → `--line-color` from tfl-colours tokens. */
const lineTitleClass = "tfl-dark-line-text text-[var(--line-color)]";

const isStripedBar = (modeName?: string) =>
  modeName === "overground" || modeName === "elizabeth-line";

const StatusDisruptionCopy = ({
  status,
  lineName,
  modeName,
  rawReason,
}: {
  status: DisruptionStatus;
  lineName?: string;
  modeName?: string;
  rawReason: boolean;
}) => {
  const severityClasses = getSeverityClasses(status.statusSeverity ?? 10, true);
  const Icon = getDisruptionStatusIcon(status);
  const severityLabel = status.statusSeverityDescription?.trim();
  const reason = status.reason?.trim();
  const text =
    reason && !rawReason
      ? stripStatusReason(reason, { name: lineName, modeName })
      : reason;
  const body = text || severityLabel || "Status update";
  const repeatsSeverity =
    Boolean(severityLabel) &&
    body.toLowerCase().startsWith(severityLabel.toLowerCase());

  return (
    <p className="min-h-(--arrivals-row) text-pretty text-base text-foreground/80">
      {repeatsSeverity || !severityLabel ? null : (
        <span className="sr-only">{severityLabel}</span>
      )}
      <span
        title={severityLabel}
        className="mr-[0.35em] inline-block size-[1cap] align-baseline"
      >
        <Icon
          className={cn(
            "block size-full",
            severityClasses.text,
            severityClasses.animation,
          )}
          aria-hidden
        />
      </span>
      {body}
    </p>
  );
};

const StatusLineHeader = ({
  lineId,
  modeName,
  name,
  trailing,
}: {
  lineId?: string;
  modeName?: string;
  name: string;
  trailing?: ReactNode;
}) => {
  const stripedBar = isStripedBar(modeName);

  return (
    <header
      data-line={lineId}
      className={cn(
        "relative flex items-end pb-2",
        TILE_CLASS,
        !stripedBar && LINE_BAR_BORDER_CLASS,
      )}
      style={
        stripedBar
          ? undefined
          : ({
              borderBottomColor: "var(--line-color)",
            } as CSSProperties)
      }
    >
      <h3
        className={cn(
          "m-0 min-w-0 flex-1 truncate pr-2 text-xl leading-7 font-semibold",
          lineTitleClass,
        )}
      >
        {name}
      </h3>
      {trailing}
      {stripedBar ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0"
          aria-hidden
        >
          <LineColorBar
            lineId={lineId}
            modeName={modeName}
            heightClass="h-1"
          />
        </div>
      ) : null}
    </header>
  );
};

const StatusSectionTitle = ({ children }: { children: ReactNode }) => (
  <h2
    className={cn(
      "m-0 flex items-end text-xl leading-7 font-semibold",
      TILE_CLASS,
    )}
  >
    {children}
  </h2>
);

/** Static board chrome — no status data required. */
export const TubeStatusBoardHeader = () => (
  <div className="flex flex-wrap items-center justify-between gap-2">
    <div className="flex items-center gap-3">
      <TfLRoundel className="size-10 lg:size-12" />
      <div>
        <h1 className="scroll-m-20 text-balance text-4xl font-extrabold lg:text-5xl">
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
);

type SkeletonProps = {
  /** Line IDs to paint (defaults to `LINE_ORDER` Tube & Rail set). */
  lineIds?: readonly string[];
  /** One column — for a narrow side slot. */
  compact?: boolean;
};

const goodServiceGridClass = (compact: boolean) =>
  compact
    ? "mt-2 grid grid-cols-1 justify-items-stretch gap-x-4 gap-y-0"
    : "mt-2 grid grid-cols-2 justify-items-stretch gap-x-4 gap-y-0 md:grid-cols-3 lg:grid-cols-5";

const disruptionGridClass = (compact: boolean) =>
  compact
    ? "mt-2 grid grid-cols-1 gap-x-4 gap-y-(--arrivals-row)"
    : "mt-2 grid grid-cols-1 gap-x-4 gap-y-(--arrivals-row) md:grid-cols-2 lg:grid-cols-3";

/**
 * Calm Good Service placeholder — every line in default `LINE_ORDER`,
 * brand bars/titles present but fully desaturated until live data arrives.
 */
export const TubeStatusBoardSkeleton = ({
  lineIds = DEFAULT_STATUS_BOARD_LINE_IDS,
  compact = false,
}: SkeletonProps) => (
  <div
    className="flex w-full flex-col gap-(--arrivals-row) text-base"
    style={BOARD_RHYTHM_VARS}
    aria-busy
    aria-label="Loading line status"
  >
    <div>
      <StatusSectionTitle>Good Service</StatusSectionTitle>
      <div className={goodServiceGridClass(compact)}>
        {lineIds.map((lineId) => {
          const label = STATUS_LINE_LABELS[lineId] ?? lineId;

          return (
            <div key={lineId} className="saturate-0">
              <StatusLineHeader
                lineId={lineId}
                modeName={statusLineModeName(lineId)}
                name={label}
              />
            </div>
          );
        })}
      </div>
    </div>

    <div
      className={cn(
        "flex items-center border-t text-center text-base text-muted-foreground",
        TILE_CLASS,
      )}
    >
      <p className="w-full text-balance">
        Data from Transport for London via{" "}
        <span className="text-blue-500">tfl-ts</span>. Pass normalised rows as{" "}
        <code className="text-xs">data</code>.
      </p>
    </div>
  </div>
);

/**
 * Data-aware status board — pass normalised `tfl-ts` line status rows as `data`.
 * Fetching belongs in the app / docs / Block layer (see `getCachedLineStatuses`).
 */
export const TubeStatusBoard = ({
  data,
  hideHeader = false,
  compact = false,
  rawReason = false,
  children,
}: Props) => {
  const lines = data ?? [];
  const disruptedLines: StatusLine[] = [];
  const goodServiceLines: StatusLine[] = [];
  for (const line of lines) {
    if (isNormalService(line.lineStatuses ?? [])) {
      goodServiceLines.push(line);
    } else {
      disruptedLines.push(line);
    }
  }

  return (
    <div
      className="flex w-full flex-col gap-(--arrivals-row) text-base"
      style={BOARD_RHYTHM_VARS}
    >
      {!hideHeader && <TubeStatusBoardHeader />}

      {disruptedLines.length > 0 && (
        <div>
          <StatusSectionTitle>Service Disruptions</StatusSectionTitle>
          <div className={disruptionGridClass(compact)}>
            {disruptedLines.map((line) => {
              return (
                <div
                  key={line.id ?? line.name}
                  className="flex flex-col"
                >
                  <StatusLineHeader
                    lineId={line.id}
                    modeName={line.modeName}
                    name={line.name ?? line.id ?? "Line"}
                  />

                  {(line.lineStatuses ?? [])
                    .filter((status) => !isNormalService([status]))
                    .map((status, index) => (
                      <StatusDisruptionCopy
                        key={index}
                        status={status}
                        lineName={line.name}
                        modeName={line.modeName}
                        rawReason={rawReason}
                      />
                    ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div>
        <StatusSectionTitle>
          Good Service
          {disruptedLines.length > 0 && (
            <span className="ml-2 text-base font-normal text-muted-foreground">
              ({goodServiceLines.length} lines)
            </span>
          )}
        </StatusSectionTitle>
        <div className={goodServiceGridClass(compact)}>
          {goodServiceLines.map((line) => {
            return (
              <StatusLineHeader
                key={line.id ?? line.name}
                lineId={line.id}
                modeName={line.modeName}
                name={line.name ?? line.id ?? "Line"}
                trailing={
                  hasNightService(line.lineStatuses ?? []) ? (
                    <div className="flex shrink-0 items-center gap-1 text-base text-muted-foreground">
                      <TrainFrontTunnel
                        data-line={line.id ?? undefined}
                        className={cn("size-4", lineTitleClass)}
                        aria-hidden
                      />
                      <span className="truncate">
                        {
                          line.lineStatuses?.find(
                            (status) => status.statusSeverity === 20,
                          )?.statusSeverityDescription
                        }
                      </span>
                    </div>
                  ) : null
                }
              />
            );
          })}
        </div>
      </div>

      <div
        className={cn(
          "flex items-center border-t text-center text-base text-muted-foreground",
          TILE_CLASS,
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
  );
};
