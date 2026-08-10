"use client";

import { cn } from "@/lib/utils";
import {
  diagramUnitStyle,
  horizontalDiagramMetrics,
} from "@/lib/tfl/line-diagram";
import {
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
      />
    );
  }

  const m = horizontalDiagramMetrics(labelPlacement);
  const maxConnections = stations.reduce(
    (n, s) =>
      Math.max(
        n,
        (s.connections ?? []).filter((c) => c.id !== "national-rail").length,
      ),
    0,
  );
  const connectionBand =
    maxConnections > 0
      ? `calc(${m.flagHeight} * ${maxConnections})`
      : undefined;
  const totalWidth = `calc(${m.colWidth} * ${stations.length})`;

  return (
    <div
      className={cn("w-max min-w-0", className)}
      style={diagramUnitStyle("horizontal", x)}
    >
      {lineName ? (
        <div className="mb-3">
          <span
            className="inline-block px-2.5 py-1 font-semibold text-white"
            style={{ backgroundColor: lineColor, fontSize: m.titleSize }}
          >
            {lineName}
          </span>
        </div>
      ) : null}

      <div className="relative" style={{ width: totalWidth }}>
        <StraightRouteTrack
          stationCount={stations.length}
          segmentStates={segmentStates}
          lineColor={lineColor}
          lineTop={m.lineTop}
          lineWidth={m.lineWidth}
          colWidthUnits={m.colWidthUnits}
          trackStyle={trackStyle}
        />

        <ol className="relative m-0 flex list-none items-start p-0">
          {stations.map((station, index) => (
            <StraightStripStationColumn
              key={`${station.id}-${index}`}
              station={station}
              index={index}
              lineColor={lineColor}
              showLabel
              connectionBand={connectionBand}
              colWidth={m.colWidth}
              outOfUse={stationOutOfUse[index] ?? false}
              labelPlacement={labelPlacement}
            />
          ))}
        </ol>
      </div>
    </div>
  );
};
