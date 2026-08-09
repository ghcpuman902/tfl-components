import { cn } from "@/lib/utils";
import {
  diagramUnitStyle,
  horizontalDiagramMetrics,
} from "@/lib/tfl/line-diagram";
import { type DiagramSegment } from "@/lib/tfl/diagram-station";
import {
  buildSegmentStateMap,
  HorizontalRouteStrip,
  HorizontalStationColumn,
  isStationOutOfUse,
  type HorizontalDiagramStation,
} from "@/components/tfl/diagram/horizontal-line-diagram-parts";
import { HorizontalLineDiagramFitted } from "@/components/tfl/diagram/horizontal-line-diagram-fitted";

export type { HorizontalDiagramStation } from "@/components/tfl/diagram/horizontal-line-diagram-parts";
export type { DiagramSegment, DiagramSegmentState } from "@/lib/tfl/diagram-station";
export {
  buildSegmentStateMap,
  isStationOutOfUse,
  selectFittedLabelIndexes,
  HorizontalRouteStrip,
  HorizontalStationColumn,
  OUT_OF_USE_LINE_COLOR,
} from "@/components/tfl/diagram/horizontal-line-diagram-parts";

export type HorizontalLineDiagramProps = {
  stations: HorizontalDiagramStation[];
  /** Hex route colour. */
  lineColor: string;
  lineName?: string;
  /**
   * Absolute route line thickness in px (= unit x).
   * When omitted, uses `DIAGRAM_BASELINE.horizontal` × inherited
   * `--tfl-diagram-scale` (desktop scale 1 ≈ the Victoria strip reference).
   */
  x?: number;
  className?: string;
  /**
   * Per-adjacent-pair segment state. Missing pairs default to `"normal"`.
   * Out-of-use is a full-thickness muted solid (not dashed).
   */
  segments?: readonly DiagramSegment[];
  /**
   * Fit the full route into the container width with no horizontal scroll.
   * Left-aligned fixed pitch; scales the strip uniformly. Opt-in.
   */
  fit?: boolean;
  /** Station IDs that must keep a visible label when `fit` is on (e.g. closure ends). */
  forceLabelIds?: readonly string[];
  /**
   * Shared fit scale for a group of fitted diagrams so pitch and type match
   * across lines (homepage week-ahead). Ignored unless `fit` is true.
   */
  sharedFitScale?: number;
};

/**
 * Horizontal line diagram: horizontal station names above markers,
 * generous spacing between stops, §9 connection flag boxes stacked under
 * each station (square corners, line name inside).
 *
 * Default: wrap in overflow-x-auto for long routes.
 * Opt-in `fit`: no horizontal scroll; left-aligned fixed pitch + uniform scale.
 */
export const HorizontalLineDiagram = ({
  stations,
  lineColor,
  lineName,
  x,
  className,
  segments,
  fit = false,
  forceLabelIds,
  sharedFitScale,
}: HorizontalLineDiagramProps) => {
  if (stations.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No stations to display.</p>
    );
  }

  if (fit) {
    return (
      <HorizontalLineDiagramFitted
        stations={stations}
        lineColor={lineColor}
        lineName={lineName}
        x={x}
        className={className}
        segments={segments}
        forceLabelIds={forceLabelIds}
        sharedFitScale={sharedFitScale}
      />
    );
  }

  const m = horizontalDiagramMetrics();
  const maxConnections = stations.reduce(
    (n, s) => Math.max(n, s.connections?.length ?? 0),
    0,
  );
  const connectionBand =
    maxConnections > 0
      ? `calc(${m.flagHeight} * ${maxConnections})`
      : undefined;
  const totalWidth = `calc(${m.colWidth} * ${stations.length})`;
  const segmentStates = buildSegmentStateMap(stations, segments);

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
        <HorizontalRouteStrip
          stationCount={stations.length}
          segmentStates={segmentStates}
          lineColor={lineColor}
          lineTop={m.lineTop}
          lineWidth={m.lineWidth}
          colWidthUnits={m.colWidthUnits}
        />

        <ol className="relative m-0 flex list-none items-start p-0">
          {stations.map((station, index) => (
            <HorizontalStationColumn
              key={`${station.id}-${index}`}
              station={station}
              index={index}
              lineColor={lineColor}
              showLabel
              connectionBand={connectionBand}
              colWidth={m.colWidth}
              outOfUse={isStationOutOfUse(index, segmentStates)}
            />
          ))}
        </ol>
      </div>
    </div>
  );
};
