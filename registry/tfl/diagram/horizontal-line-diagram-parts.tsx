import { cn } from "@/lib/utils";
import {
  horizontalDiagramMetrics,
  ux,
} from "@/lib/tfl/line-diagram";
import {
  type DiagramSegment,
  type DiagramStation,
} from "@/lib/tfl/diagram-station";
import { StationNameLabel } from "@/components/tfl/station-name-label";

export type HorizontalDiagramStation = DiagramStation;

/**
 * Closed / out-of-use solid — lighter than Jubilee (#838D93).
 * Uses theme `--muted` (≈ Tailwind zinc-100 / oklch 0.97 in light mode).
 */
export const OUT_OF_USE_LINE_COLOR = "var(--muted)";

const segmentKey = (fromId: string, toId: string) => `${fromId}→${toId}`;

export const buildSegmentStateMap = (
  stations: readonly HorizontalDiagramStation[],
  segments: readonly DiagramSegment[] | undefined,
): ("normal" | "out-of-use")[] => {
  const override = new Map<string, "normal" | "out-of-use">();
  for (const segment of segments ?? []) {
    override.set(
      segmentKey(segment.fromStationId, segment.toStationId),
      segment.state,
    );
  }
  const states: ("normal" | "out-of-use")[] = [];
  for (let i = 0; i < stations.length - 1; i += 1) {
    const from = stations[i]!;
    const to = stations[i + 1]!;
    states.push(override.get(segmentKey(from.id, to.id)) ?? "normal");
  }
  return states;
};

/** True when station index touches an out-of-use segment (closed for this line). */
export const isStationOutOfUse = (
  index: number,
  segmentStates: readonly ("normal" | "out-of-use")[],
): boolean => {
  const leftClosed =
    index > 0 && segmentStates[index - 1] === "out-of-use";
  const rightClosed =
    index < segmentStates.length && segmentStates[index] === "out-of-use";
  return leftClosed || rightClosed;
};

type RouteStripProps = {
  stationCount: number;
  segmentStates: readonly ("normal" | "out-of-use")[];
  lineColor: string;
  lineTop: string;
  lineWidth: string;
  colWidthUnits: number;
};

/** Solid / out-of-use adjacent segments along the route centreline. */
export const HorizontalRouteStrip = ({
  stationCount,
  segmentStates,
  lineColor,
  lineTop,
  lineWidth,
  colWidthUnits,
}: RouteStripProps) => {
  if (stationCount < 2) return null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0"
      style={{ top: lineTop, height: lineWidth }}
    >
      {segmentStates.map((state, index) => {
        const left = `calc(${ux(colWidthUnits)} * ${index + 0.5})`;
        const width = ux(colWidthUnits);

        return (
          <div
            key={`seg-${index}`}
            className="absolute top-0"
            style={{
              left,
              width,
              height: lineWidth,
              // Full-thickness solid: official colour, or muted gray when closed.
              backgroundColor:
                state === "out-of-use" ? OUT_OF_USE_LINE_COLOR : lineColor,
            }}
          />
        );
      })}
    </div>
  );
};

type StationColumnProps = {
  station: HorizontalDiagramStation;
  index: number;
  lineColor: string;
  showLabel: boolean;
  connectionBand?: string;
  /** Fixed column width (CSS length). */
  colWidth: string;
  /** Closed for this line — tick/ring use the out-of-use colour. */
  outOfUse?: boolean;
};

export const HorizontalStationColumn = ({
  station,
  index,
  lineColor,
  showLabel,
  connectionBand,
  colWidth,
  outOfUse = false,
}: StationColumnProps) => {
  const m = horizontalDiagramMetrics();
  const isInterchange = Boolean(station.interchange);
  const connections = station.connections;
  const markerColor = outOfUse ? OUT_OF_USE_LINE_COLOR : lineColor;

  return (
    <li
      key={`${station.id}-${index}`}
      className="relative flex shrink-0 flex-col items-center"
      style={{ width: colWidth }}
    >
      <div
        className="flex w-full items-end justify-center px-0.5 text-center"
        style={{ height: m.nameBand }}
      >
        {showLabel ? (
          <StationNameLabel
            name={station.name}
            maxLines={2}
            align="center"
            // Same type size across every stop / every line — never shrink to fit.
            allowScaleDown={false}
            className="font-medium text-foreground"
            style={{
              fontSize: m.nameSize,
              lineHeight: 1.15,
            }}
          />
        ) : (
          <span className="sr-only">{station.name}</span>
        )}
      </div>

      <div
        className="relative z-10 flex items-center justify-center"
        style={{
          marginTop: m.nameGap,
          width: colWidth,
          height: m.markerBand,
        }}
      >
        {isInterchange ? (
          <span
            className={cn(
              "box-border block rounded-full",
              !outOfUse && "bg-white",
            )}
            style={{
              width: m.ringOuter,
              height: m.ringOuter,
              borderWidth: m.ringStroke,
              borderStyle: "solid",
              borderColor: outOfUse ? OUT_OF_USE_LINE_COLOR : "#000",
              backgroundColor: outOfUse ? OUT_OF_USE_LINE_COLOR : undefined,
            }}
            aria-hidden
          />
        ) : (
          <span
            className={cn("block")}
            style={{
              width: m.tickWidth,
              height: m.tickHeight,
              backgroundColor: markerColor,
            }}
            aria-hidden
          />
        )}
      </div>

      {connections && connections.length > 0 && showLabel ? (
        <div
          className="inline-flex max-w-full flex-col overflow-hidden"
          style={{
            marginTop: m.flagClearance,
            minHeight: connectionBand,
          }}
          aria-label={`Connections: ${connections.map((c) => c.name).join(", ")}`}
        >
          {connections.map((c) => (
            <span
              key={`${station.id}-${c.id}`}
              className="flex w-full items-center justify-center px-1.5 leading-none font-medium whitespace-nowrap"
              style={{
                backgroundColor:
                  c.id === "national-rail"
                    ? "var(--foreground)"
                    : (c.color ?? "#64748b"),
                color:
                  c.id === "national-rail"
                    ? "var(--background)"
                    : c.darkText
                      ? "#0019A8"
                      : "#fff",
                height: m.flagHeight,
                minWidth: m.flagMinWidth,
                fontSize: m.flagFont,
              }}
            >
              {c.name}
            </span>
          ))}
        </div>
      ) : (
        <div
          aria-hidden
          style={{
            marginTop: m.flagClearance,
            minHeight: connectionBand,
          }}
        />
      )}
    </li>
  );
};

/**
 * Choose which station indexes show a visible label in fitted mode.
 * Always terminals + forced IDs; prefer interchanges when space allows.
 */
export const selectFittedLabelIndexes = (
  stations: readonly HorizontalDiagramStation[],
  availableWidthPx: number,
  forceLabelIds: readonly string[] = [],
  colWidthPx?: number,
): Set<number> => {
  const n = stations.length;
  const show = new Set<number>();
  if (n === 0) return show;

  show.add(0);
  show.add(n - 1);

  const forced = new Set(forceLabelIds);
  stations.forEach((station, index) => {
    if (forced.has(station.id)) show.add(index);
  });

  // Budget from how many label columns fit at the shared pitch (~1.1 cols each).
  const pitch = colWidthPx && colWidthPx > 0 ? colWidthPx : 56;
  const budget = Math.max(2, Math.floor(availableWidthPx / pitch));
  if (show.size >= budget) return show;

  const interchangeIndexes = stations
    .map((station, index) => (station.interchange ? index : -1))
    .filter((index) => index > 0 && index < n - 1);

  for (const index of interchangeIndexes) {
    if (show.size >= budget) break;
    show.add(index);
  }

  if (show.size >= budget) return show;

  const remaining = budget - show.size;
  if (remaining > 0 && n > 2) {
    const step = n / (remaining + 1);
    for (let i = 1; i <= remaining; i += 1) {
      const index = Math.min(n - 2, Math.max(1, Math.round(step * i)));
      show.add(index);
      if (show.size >= budget) break;
    }
  }

  return show;
};
