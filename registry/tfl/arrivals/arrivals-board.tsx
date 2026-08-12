import type { CSSProperties } from "react";
import type { RealtimePrediction } from "tfl-ts";
import { Loader2 } from "lucide-react";
import { BusNumberChip } from "@/components/tfl/arrivals/bus-number-chip";
import { PlatformChip } from "@/components/tfl/arrivals/platform-chip";
import { LineColorBar } from "@/components/tfl/brand/line-badge";
import { TfLRoundel } from "@/components/tfl/brand/tfl-roundel";
import { StationName } from "@/components/tfl/station-name";
import {
  ARRIVALS_EMPTY_COPY,
  ARRIVALS_LINE_EMPTY_COPY,
  type ArrivalsEmptyKind,
} from "@/lib/tfl/arrivals-empty";
import {
  COMPASS_BOUND_RE,
  compareArrivalsBounds,
  formatArrivalsBoundLabel,
  normalizeArrivalsBoundId,
  parseCompassBoundId,
  type ArrivalsBoundId,
} from "@/lib/tfl/arrivals-bound-sort";
import { compareArrivalsLines } from "@/lib/tfl/arrivals-line-sort";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * @deprecated Prefer passing `RealtimePrediction[]` from `tfl-ts` directly.
 * Kept for migration / explicit presentation overrides.
 */
export type ArrivalRow = RealtimePrediction & {
  /** When true, use route-number chip styling instead of tube line colours. */
  busStyle?: boolean;
};

export type ArrivalsBoardVariant = "rail" | "bus";

/** Serving line/route identity for empty sections and stable membership. */
export type ArrivalsBoardLine = {
  lineId: string;
  lineName: string;
  modeName?: string;
  /**
   * Station metadata: compass bounds this line serves at the stop.
   * When set, those bound groups still render (with “No information”) even if
   * no arrival currently carries that platform prefix. Arrival-only boards omit
   * missing bounds — that is intentional.
   */
  bounds?: readonly ArrivalsBoundId[];
};

export type ArrivalsBoardProps = {
  /**
   * Normalised arrivals from `tfl.stopPoint.getArrivals` (`RealtimePrediction[]`).
   * Missing/`undefined` treated as an empty list.
   */
  data?: readonly RealtimePrediction[] | readonly ArrivalRow[];
  /**
   * Optional serving lines/routes for this stop. Lines with no predictions still
   * render (empty “No information” row) and sort below lines that have arrivals.
   * Order in this array is ignored — board order uses `LINE_ORDER` / route name.
   */
  lines?: readonly ArrivalsBoardLine[];
  stopName: string;
  /**
   * @deprecated Dev/meta NaPTAN id — not shown in the board UI. Kept for call-site compat.
   */
  stopPointId?: string;
  /**
   * Bus stop letter (e.g. "G"). Prefer this over sniffing `platformName` on rows —
   * it is a stop property, not a per-arrival field.
   */
  stopLetter?: string;
  /**
   * @deprecated Board heading is always `stopName`. Kept for call-site compat; ignored.
   */
  title?: string;
  /** Semantic heading level for the stop name. Prefer `2` when embedded under a page `h1`. */
  headingLevel?: 1 | 2;
  loading?: boolean;
  /**
   * Fetch/render failure. Takes precedence over an empty list.
   * Prefer a short human line — raw API strings read as broken UI.
   */
  error?: string | null;
  /** Optional poll / refresh label (e.g. "Poll #3 · every 15s"). */
  statusLabel?: string;
  /**
   * Why the board has no rows when `error` is unset.
   * Resolve in the app (`resolveArrivalsEmptyKind`) from clock / offline / variant.
   */
  emptyKind?: ArrivalsEmptyKind;
  /** Override copy for `emptyKind`. Prefer setting `emptyKind` instead. */
  emptyMessage?: string;
  maxRows?: number;
  /**
   * Board-level presentation. Prefer this over per-row `busStyle`.
   * Rail uses line colours; bus uses high-contrast route-number chips.
   */
  variant?: ArrivalsBoardVariant;
};

/**
 * Domain-named adapter when you need ArrivalRow extras (e.g. busStyle per row).
 * Prefer passing `RealtimePrediction[]` with `variant="bus"` instead.
 */
export const toArrivalRows = (
  predictions: readonly RealtimePrediction[],
  options?: { busStyle?: boolean },
): ArrivalRow[] =>
  predictions.map((prediction) => ({
    ...prediction,
    busStyle: options?.busStyle,
  }));

/**
 * Baseline grid. Every block is a whole number of `--arrivals-unit` (0.5rem):
 * arrival row, board title, and line header are all 6 units, direction labels 6
 * (same as line names). Two boards side by side land on the same horizontal lines.
 * Override the vars on a wrapper to retune density.
 */
const RHYTHM_VARS = {
  "--arrivals-unit": "0.5rem",
  "--arrivals-row": "calc(var(--arrivals-unit) * 6)",
} as CSSProperties;

/**
 * Fixed tile box. Height is always exactly one rhythm row — content may clip,
 * but borders/bars must never grow the tile (`box-border` + overflow lock).
 */
const TILE_CLASS =
  "box-border h-[var(--arrivals-row)] min-h-[var(--arrivals-row)] max-h-[var(--arrivals-row)] shrink-0 overflow-hidden [content-visibility:auto] [contain-intrinsic-size:auto_3rem]";

/** In-list hairlines: absolute, so they never add to tile height. */
const ROW_RULE_CLASS =
  "relative after:pointer-events-none after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-border/60";

/** Line/route brand bar thickness — painted inside the tile via border-box. */
const LINE_BAR_BORDER_CLASS = "border-b-4";
const TITLE_CLASS =
  "[font-synthesis:none] [font-weight:var(--tfl-title-weight,400)] [letter-spacing:var(--tfl-title-tracking,0)]";

const formatCountdown = (seconds?: number): string => {
  if (seconds === undefined || seconds < 0) return "-";
  if (seconds < 60) return "Due";
  return `${Math.floor(seconds / 60)} min`;
};

const isBusRow = (
  arrival: RealtimePrediction | ArrivalRow,
  variant: ArrivalsBoardVariant,
): boolean => {
  if ("busStyle" in arrival && arrival.busStyle === true) return true;
  if ("busStyle" in arrival && arrival.busStyle === false) return false;
  return variant === "bus";
};

/**
 * Platform number for the rail chip — "Northbound - Platform 4" → "4".
 * Falls back to the stripped label when no digit is present.
 */
const getPlatformNumber = (platformName?: string): string | null => {
  if (!platformName) return null;
  const digit = platformName.match(/(\d+)\s*$/);
  if (digit?.[1]) return digit[1];
  const stripped = platformName
    .replace(COMPASS_BOUND_RE, "")
    .replace(/^\s*[-–—:]\s*/, "")
    .replace(/^platform\s+/i, "")
    .trim();
  return stripped || null;
};

/** Single-letter stop badge from bus `platformName` (e.g. "G"). */
const getBusStopLetter = (platformName?: string): string | null => {
  if (!platformName) return null;
  const letter = platformName.trim();
  if (/^[A-Za-z]$/.test(letter)) return letter.toUpperCase();
  return null;
};

const resolveExpectedBounds = (
  bounds: readonly ArrivalsBoundId[] | undefined,
): ArrivalsBoundId[] => {
  if (!bounds?.length) return [];
  const seen = new Set<ArrivalsBoundId>();
  const resolved: ArrivalsBoundId[] = [];
  for (const value of bounds) {
    const id = normalizeArrivalsBoundId(value);
    if (!id || seen.has(id)) continue;
    seen.add(id);
    resolved.push(id);
  }
  return resolved;
};

type DirectionGroup = {
  label: string | null;
  arrivals: (RealtimePrediction | ArrivalRow)[];
};

type LineGroup = {
  lineId: string;
  lineName: string;
  modeName?: string;
  bus: boolean;
  directions: DirectionGroup[];
};

const lineHasInformation = (line: LineGroup): boolean =>
  line.directions.some((direction) => direction.arrivals.length > 0);

const groupArrivals = (
  rows: readonly (RealtimePrediction | ArrivalRow)[],
  variant: ArrivalsBoardVariant,
  expectedLines: readonly ArrivalsBoardLine[] = [],
): LineGroup[] => {
  const byLine = new Map<
    string,
    {
      lineId: string;
      lineName: string;
      modeName?: string;
      bus: boolean;
      expectedBounds: ArrivalsBoundId[];
      arrivals: (RealtimePrediction | ArrivalRow)[];
    }
  >();

  for (const arrival of rows) {
    const lineId = arrival.lineId ?? "";
    const key = lineId || (arrival.lineName ?? "unknown");
    const existing = byLine.get(key);
    if (existing) {
      existing.arrivals.push(arrival);
      continue;
    }
    byLine.set(key, {
      lineId,
      lineName: (arrival.lineName ?? lineId) || "Unknown",
      modeName: arrival.modeName,
      bus: isBusRow(arrival, variant),
      expectedBounds: [],
      arrivals: [arrival],
    });
  }

  for (const expected of expectedLines) {
    const key = expected.lineId || expected.lineName;
    if (!key) continue;
    const bounds = resolveExpectedBounds(expected.bounds);
    const existing = byLine.get(key);
    if (existing) {
      if (bounds.length > 0) existing.expectedBounds = bounds;
      continue;
    }
    byLine.set(key, {
      lineId: expected.lineId,
      lineName: expected.lineName,
      modeName: expected.modeName,
      bus: variant === "bus",
      expectedBounds: bounds,
      arrivals: [],
    });
  }

  return [...byLine.values()]
    .map((line) => {
      const byBound = new Map<
        string | null,
        (RealtimePrediction | ArrivalRow)[]
      >();

      for (const arrival of line.arrivals) {
        const boundId = line.bus
          ? null
          : parseCompassBoundId(arrival.platformName);
        const label = boundId ? formatArrivalsBoundLabel(boundId) : null;
        const list = byBound.get(label);
        if (list) list.push(arrival);
        else byBound.set(label, [arrival]);
      }

      // Station metadata seeds bound groups even when arrivals omit that side.
      if (!line.bus) {
        for (const boundId of line.expectedBounds) {
          const label = formatArrivalsBoundLabel(boundId);
          if (!byBound.has(label)) byBound.set(label, []);
        }
      }

      if (byBound.size === 0) {
        return {
          lineId: line.lineId,
          lineName: line.lineName,
          modeName: line.modeName,
          bus: line.bus,
          directions: [{ label: null, arrivals: [] }],
        };
      }

      const directions: DirectionGroup[] = [...byBound.entries()]
        .map(([label, arrivals]) => ({
          label,
          arrivals: [...arrivals].sort(
            (a, b) => (a.timeToStation ?? 0) - (b.timeToStation ?? 0),
          ),
        }))
        .sort((a, b) => compareArrivalsBounds(a.label, b.label));

      // Single null bucket → no direction headers (bus / unknown platforms).
      const onlyUngrouped =
        directions.length === 1 && directions[0]?.label === null;

      return {
        lineId: line.lineId,
        lineName: line.lineName,
        modeName: line.modeName,
        bus: line.bus,
        directions: onlyUngrouped
          ? [{ label: null, arrivals: directions[0]!.arrivals }]
          : directions,
      };
    })
    .sort((a, b) =>
      compareArrivalsLines(
        {
          lineId: a.lineId,
          lineName: a.lineName,
          bus: a.bus,
          hasInformation: lineHasInformation(a),
        },
        {
          lineId: b.lineId,
          lineName: b.lineName,
          bus: b.bus,
          hasInformation: lineHasInformation(b),
        },
      ),
    );
};

/** Shared stop letter across bus predictions (TfL stop letter on the stop, not the vehicle). */
const resolveBusStopLetter = (
  rows: readonly (RealtimePrediction | ArrivalRow)[],
): string | null => {
  for (const row of rows) {
    const letter = getBusStopLetter(row.platformName);
    if (letter) return letter;
  }
  return null;
};

export const ArrivalsBoardSkeleton = () => (
  <div
    className="w-full space-y-2"
    style={RHYTHM_VARS}
    aria-busy
    aria-label="Loading arrivals"
  >
    <div className={cn("flex items-center", TILE_CLASS)}>
      <Skeleton className="h-8 w-56 max-w-full" />
    </div>
    {Array.from({ length: 2 }).map((_, sectionIndex) => (
      <div key={sectionIndex}>
        <div className={cn("flex items-end", TILE_CLASS, LINE_BAR_BORDER_CLASS)}>
          <Skeleton className="mb-2 h-5 w-28" />
        </div>
        {Array.from({ length: 4 }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className={cn("flex items-center", TILE_CLASS)}
          >
            <Skeleton className="h-5 w-full" />
          </div>
        ))}
      </div>
    ))}
  </div>
);

const StopLetterBadge = ({ letter }: { letter: string }) => (
  <span
    data-line="buses"
    className="relative -top-px inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-[var(--line-color)] align-middle text-[11px] font-bold leading-none text-[var(--line-ink)]"
    aria-label={`Stop ${letter}`}
  >
    {letter}
  </span>
);

const ArrivalRowItem = ({
  arrival,
  bus,
  showRule,
}: {
  arrival: RealtimePrediction | ArrivalRow;
  bus: boolean;
  showRule: boolean;
}) => {
  const destination =
    arrival.towards ?? arrival.destinationName ?? "Unknown";
  const platformNumber = bus ? null : getPlatformNumber(arrival.platformName);
  const routeLabel = bus
    ? (arrival.lineName ?? arrival.lineId ?? "").trim() || null
    : null;
  const countdown = formatCountdown(arrival.timeToStation);
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
    .join(", ");

  return (
    <li
      aria-label={rowLabel}
      className={cn(
        "grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 text-sm",
        TILE_CLASS,
        showRule && ROW_RULE_CLASS,
      )}
    >
      {bus ? (
        routeLabel ? <BusNumberChip label={routeLabel} /> : <span />
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
  );
};

/**
 * Unified arrivals presentation — pass `tfl-ts` predictions as `data`.
 * Fetching / polling / stop discovery belong outside this component.
 *
 * Rail: group by line (name + colour bar), then by compass bound; platform
 * number chip before destination. Bound order is West→East, North→South.
 * Line sections keep `LINE_ORDER` (info-first), not soonest-train order.
 * Optional `lines[].bounds` seeds empty bound groups from station metadata.
 * Bus: route chip per row; stop letter lives on the board header; routes sort
 * by name, also info-first.
 */
export const ArrivalsBoard = ({
  data,
  lines: expectedLines,
  stopName,
  stopLetter: stopLetterProp,
  headingLevel = 1,
  loading = false,
  error = null,
  statusLabel,
  emptyKind = "empty",
  emptyMessage,
  maxRows = 16,
  variant = "rail",
}: ArrivalsBoardProps) => {
  const rows = data ?? [];
  const TitleTag = headingLevel === 2 ? "h2" : "h1";
  const LineHeadingTag = headingLevel === 2 ? "h3" : "h2";
  const limited = rows.slice(0, maxRows);
  const groups = groupArrivals(limited, variant, expectedLines ?? []);
  const busBoard = variant === "bus" || groups.some((g) => g.bus);
  const stopLetter =
    stopLetterProp?.trim().toUpperCase() ||
    (busBoard ? resolveBusStopLetter(limited) : null);
  const emptyCopy = emptyMessage ?? ARRIVALS_EMPTY_COPY[emptyKind];
  // Board-level empty only when nothing to section — expected `lines` still paint.
  const showEmpty = !error && !loading && groups.length === 0;

  if (loading && rows.length === 0 && !error) {
    return <ArrivalsBoardSkeleton />;
  }

  return (
    <div
      className="@container/arrivals w-full space-y-2"
      style={RHYTHM_VARS}
    >
      <div
        className={cn(
          "flex min-w-0 items-center gap-x-3",
          TILE_CLASS,
        )}
      >
        {/*
          One fixed row for rail + bus alignment. Mode roundel is decorative and
          locked to the tile height so StationName still owns fit (abbr/scale).
          NaPTAN ids are intentionally not rendered (dev meta only).
        */}
        <TfLRoundel
          variant={busBoard ? "buses" : "underground"}
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
        {stopLetter || statusLabel || loading ? (
          <div className="flex shrink-0 items-center gap-x-2">
            {stopLetter ? <StopLetterBadge letter={stopLetter} /> : null}
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
            TILE_CLASS,
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
            TILE_CLASS,
          )}
          role="status"
        >
          {emptyCopy}
        </p>
      ) : null}

      <div className="flex flex-col">
        {groups.map((line) => {
          const lineKey = line.bus ? "buses" : line.lineId;
          const stripedBar =
            !line.bus &&
            (line.modeName === "overground" ||
              line.modeName === "elizabeth-line");
          const hasInfo = lineHasInformation(line);

          // Flat sequence so bound titles and arrival rows share one hairline weight.
          const items: Array<
            | { kind: "bound"; label: string; key: string }
            | {
                kind: "arrival";
                arrival: RealtimePrediction | ArrivalRow;
                key: string;
              }
            | { kind: "empty"; key: string; boundLabel?: string }
          > = [];
          const labeledDirections = line.directions.filter(
            (direction) => direction.label,
          );

          if (!hasInfo && labeledDirections.length === 0) {
            items.push({ kind: "empty", key: "empty" });
          } else {
            for (const direction of line.directions) {
              if (direction.label) {
                items.push({
                  kind: "bound",
                  label: direction.label,
                  key: `bound-${direction.label}`,
                });
              }
              if (direction.arrivals.length === 0) {
                // Metadata-seeded (or empty) labeled bounds keep a row; bare
                // null buckets without arrivals are omitted here.
                if (direction.label) {
                  items.push({
                    kind: "empty",
                    key: `empty-${direction.label}`,
                    boundLabel: direction.label,
                  });
                }
                continue;
              }
              for (const [index, arrival] of direction.arrivals.entries()) {
                items.push({
                  kind: "arrival",
                  arrival,
                  key:
                    arrival.id ??
                    `${arrival.vehicleId ?? arrival.lineId}-${arrival.timeToStation}-${index}`,
                });
              }
            }
          }

          return (
            <section key={line.lineId || line.lineName}>
              {/*
                Brand bar is inside the tile: solid lines use border-bottom +
                box-border; striped modes paint an absolute bar so height stays fixed.
              */}
              <header
                data-line={lineKey || undefined}
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
                <LineHeadingTag
                  className={cn(
                    "min-w-0 truncate text-base font-semibold leading-6 text-[var(--line-color)]",
                    !line.bus && "tfl-dark-line-text",
                    !hasInfo && "opacity-70",
                  )}
                >
                  {line.lineName}
                </LineHeadingTag>
                {stripedBar ? (
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0"
                    aria-hidden
                  >
                    <LineColorBar
                      lineId={line.lineId}
                      modeName={line.modeName}
                      heightClass="h-1"
                    />
                  </div>
                ) : null}
              </header>

              <ul className="list-none space-y-0 p-0" role="list">
                {items.map((item, itemIndex) => {
                  const showRule = itemIndex < items.length - 1;
                  if (item.kind === "bound") {
                    return (
                      <li
                        key={item.key}
                        className={cn(
                          "flex items-center text-base font-semibold text-muted-foreground",
                          TILE_CLASS,
                          showRule && ROW_RULE_CLASS,
                        )}
                      >
                        {item.label}
                      </li>
                    );
                  }
                  if (item.kind === "empty") {
                    const emptyScope = item.boundLabel
                      ? `${line.lineName} ${item.boundLabel}`
                      : line.lineName;
                    return (
                      <li
                        key={item.key}
                        className={cn(
                          "flex items-center text-sm text-muted-foreground",
                          TILE_CLASS,
                          showRule && ROW_RULE_CLASS,
                        )}
                        aria-label={`${emptyScope}: ${ARRIVALS_LINE_EMPTY_COPY}`}
                      >
                        {ARRIVALS_LINE_EMPTY_COPY}
                      </li>
                    );
                  }
                  return (
                    <ArrivalRowItem
                      key={item.key}
                      arrival={item.arrival}
                      bus={line.bus}
                      showRule={showRule}
                    />
                  );
                })}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
};
