import { cn } from "@/lib/utils";
import {
  DIAGRAM_BASELINE,
  diagramUnitStyle,
  horizontalDiagramMetrics,
} from "@/lib/tfl/line-diagram";
import {
  MonoRouteTrack,
  StraightRouteTrack,
  StraightStripStationColumn,
  type StraightStripStation,
  type StripLabelPlacement,
  type StripSegmentState,
} from "@/components/tfl/diagram/straight-strip-parts";
import { StraightStripFitted } from "@/components/tfl/diagram/straight-strip-fitted";
import type { RouteTrackStyle } from "@/lib/tfl/route-track";

export type { StraightStripStation, StripLabelPlacement, StripSegmentState };
export type { DiagramSegment, DiagramSegmentState } from "@/lib/tfl/diagram-station";

export {
  buildSegmentStateMap,
  isStationOutOfUse,
  stationOutOfUseFromSegments,
  selectFittedLabelIndexes,
  StraightRouteTrack,
  StraightStripStationColumn,
  HorizontalRouteStrip,
  HorizontalStationColumn,
  OUT_OF_USE_LINE_COLOR,
  resolveLabelSide,
} from "@/components/tfl/diagram/straight-strip-parts";

/** @deprecated Prefer `StraightStripStation`. */
export type { HorizontalDiagramStation } from "@/components/tfl/diagram/straight-strip-parts";
/** @deprecated Prefer `StripLabelPlacement`. */
export type { HorizontalLabelPlacement } from "@/components/tfl/diagram/straight-strip-parts";

export type StraightStripProps = {
  stations: readonly StraightStripStation[];
  /** Hex route colour. */
  lineColor: string;
  lineName?: string;
  /**
   * Absolute route line thickness in px (= unit x).
   * When omitted, uses `DIAGRAM_BASELINE.horizontal` × inherited
   * `--tfl-diagram-scale`.
   */
  x?: number;
  className?: string;
  /** Prepared adjacent segment states (length = stations.length - 1). */
  segmentStates?: readonly StripSegmentState[];
  /** Prepared per-station out-of-use flags. */
  stationOutOfUse?: readonly boolean[];
  /**
   * Fit the full route into the container width with no horizontal scroll.
   * Left-aligned fixed pitch; scales the strip uniformly. Opt-in.
   */
  fit?: boolean;
  /** Station IDs that must keep a visible label when `fit` is on. */
  forceLabelIds?: readonly string[];
  /**
   * Shared fit scale for a group of fitted strips so pitch and type match
   * across lines (homepage week-ahead). Ignored unless `fit` is true.
   */
  sharedFitScale?: number;
  /**
   * Station name position relative to the route.
   * `alternate` reserves both bands so markers stay aligned.
   */
  labelPlacement?: StripLabelPlacement;
  /**
   * Route paint: solid (default), Overground/Elizabeth parallel, or cable-car
   * triple. Pass explicitly — this atom does not look up TfL ids.
   */
  trackStyle?: RouteTrackStyle;
  /**
   * Paint B&W Tube-map stroke motifs instead of colour rails.
   * Scales through `x` (defaults to the horizontal baseline), not
   * `--tfl-diagram-scale`. Requires `lineId`.
   */
  mono?: boolean;
  /** TfL line id — used when `mono` is set. */
  lineId?: string;
};

/**
 * Atomic straight strip: render prepared stations / segment states only.
 * No TfL colour lookup, adjacency inference, or label recipes —
 * pass a prepared model from `LineStrip` / `prepareStraightStrip`.
 */
export const StraightStrip = ({
  stations,
  lineColor,
  lineName,
  x,
  className,
  segmentStates: segmentStatesProp,
  stationOutOfUse: stationOutOfUseProp,
  fit = false,
  forceLabelIds,
  sharedFitScale,
  labelPlacement = "above",
  trackStyle = "solid",
  mono = false,
  lineId,
}: StraightStripProps) => {
  if (stations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No stations to display.</p>
    );
  }

  const segmentStates =
    segmentStatesProp ??
    Array.from({ length: Math.max(0, stations.length - 1) }, () => "normal" as const);
  const stationOutOfUse =
    stationOutOfUseProp ?? stations.map(() => false);

  if (fit) {
    return (
      <StraightStripFitted
        stations={stations}
        lineColor={lineColor}
        lineName={lineName}
        x={x}
        className={className}
        segmentStates={segmentStates}
        stationOutOfUse={stationOutOfUse}
        forceLabelIds={forceLabelIds}
        sharedFitScale={sharedFitScale}
        labelPlacement={labelPlacement}
        trackStyle={trackStyle}
        mono={mono}
        lineId={lineId}
      />
    );
  }

  const monoX = x ?? DIAGRAM_BASELINE.horizontal;
  const markerColor = mono ? "var(--tfl-mono-ink)" : lineColor;
  const m = horizontalDiagramMetrics(labelPlacement);
  const maxConnections = stations.reduce((n, s) => {
    let count = 0;
    for (const c of s.connections ?? []) {
      if (c.id !== "national-rail") count += 1;
    }
    return Math.max(n, count);
  }, 0);
  const connectionBand =
    maxConnections > 0
      ? `calc(${m.flagHeight} * ${maxConnections})`
      : undefined;
  const totalWidth = `calc(${m.colWidth} * ${stations.length})`;

  return (
    <div
      className={cn("w-max min-w-0", className)}
      style={diagramUnitStyle("horizontal", mono ? monoX : x)}
    >
      {lineName ? (
        <div className="sticky left-0 z-10 mb-3 w-fit bg-background pr-2">
          <span
            className="inline-block px-2.5 py-1 font-semibold text-white"
            style={{ backgroundColor: lineColor, fontSize: m.titleSize }}
          >
            {lineName}
          </span>
        </div>
      ) : null}

      <div className="relative" style={{ width: totalWidth }}>
        {mono && lineId ? (
          <MonoRouteTrack
            stationCount={stations.length}
            segmentStates={segmentStates}
            lineId={lineId}
            x={monoX}
            lineTop={m.lineTop}
            colWidthUnits={m.colWidthUnits}
          />
        ) : (
          <StraightRouteTrack
            stationCount={stations.length}
            segmentStates={segmentStates}
            lineColor={lineColor}
            lineTop={m.lineTop}
            lineWidth={m.lineWidth}
            colWidthUnits={m.colWidthUnits}
            trackStyle={trackStyle}
          />
        )}

        <ol className="relative m-0 flex list-none items-start p-0">
          {stations.map((station, index) => (
            <StraightStripStationColumn
              key={`${station.id}-${index}`}
              station={station}
              index={index}
              lineColor={markerColor}
              showLabel
              connectionBand={connectionBand}
              colWidth={m.colWidth}
              outOfUse={stationOutOfUse[index] ?? false}
              labelPlacement={labelPlacement}
              metrics={m}
            />
          ))}
        </ol>
      </div>
    </div>
  );
};
