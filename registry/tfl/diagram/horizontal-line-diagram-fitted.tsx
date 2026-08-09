"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { cn } from "@/lib/utils";
import {
  DIAGRAM_BASELINE,
  DIAGRAM_SCALE_VAR,
  DIAGRAM_X_VAR,
  horizontalDiagramMetrics,
} from "@/lib/tfl/line-diagram";
import type { DiagramSegment } from "@/lib/tfl/diagram-station";
import {
  buildSegmentStateMap,
  HorizontalRouteStrip,
  HorizontalStationColumn,
  isStationOutOfUse,
  selectFittedLabelIndexes,
  type HorizontalDiagramStation,
} from "@/components/tfl/diagram/horizontal-line-diagram-parts";

type FittedProps = {
  stations: HorizontalDiagramStation[];
  lineColor: string;
  lineName?: string;
  x?: number;
  className?: string;
  segments?: readonly DiagramSegment[];
  forceLabelIds?: readonly string[];
  /**
   * Shared fit scale for a group of diagrams (e.g. homepage week-ahead).
   * When set, every line uses the same pitch and type size, left-aligned.
   * When omitted, this diagram scales itself to its container.
   */
  sharedFitScale?: number;
};

/**
 * Fitted horizontal diagram — left-aligned fixed pitch, no horizontal scroll.
 * Scales diagram unit `x` uniformly so station spacing and type stay consistent.
 */
export const HorizontalLineDiagramFitted = ({
  stations,
  lineColor,
  lineName,
  x,
  className,
  segments,
  forceLabelIds,
  sharedFitScale,
}: FittedProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    const update = () => setWidth(el.clientWidth);
    update();

    const observer = new ResizeObserver(() => update());
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Approximate px pitch at the page's mid breakpoint scale (label budget only).
  const colWidthUnits = horizontalDiagramMetrics().colWidthUnits;
  const colWidthPxApprox = DIAGRAM_BASELINE.horizontal * 0.85 * colWidthUnits;

  const selfScale =
    width > 0 && stations.length > 0
      ? Math.min(1, width / Math.max(colWidthPxApprox * stations.length, 1))
      : 1;
  const fitScale = sharedFitScale ?? selfScale;

  const unitStyle = (
    x != null
      ? { [DIAGRAM_X_VAR]: `${x * fitScale}px` }
      : {
          [DIAGRAM_X_VAR]: `calc(${DIAGRAM_BASELINE.horizontal}px * var(${DIAGRAM_SCALE_VAR}, 1) * ${fitScale})`,
        }
  ) as CSSProperties;

  const m = horizontalDiagramMetrics();
  const maxConnections = stations.reduce(
    (n, s) => Math.max(n, s.connections?.length ?? 0),
    0,
  );
  const connectionBand =
    maxConnections > 0
      ? `calc(${m.flagHeight} * ${maxConnections})`
      : undefined;
  const segmentStates = buildSegmentStateMap(stations, segments);
  const totalWidth = `calc(${m.colWidth} * ${stations.length})`;

  const labelIndexes =
    width > 0
      ? selectFittedLabelIndexes(
          stations,
          width,
          forceLabelIds,
          colWidthPxApprox * fitScale,
        )
      : new Set([
          0,
          stations.length - 1,
          ...(forceLabelIds
            ? stations.flatMap((s, i) =>
                forceLabelIds.includes(s.id) ? [i] : [],
              )
            : []),
        ]);

  return (
    <div
      ref={rootRef}
      className={cn("w-full min-w-0 overflow-x-hidden", className)}
      style={unitStyle}
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
              showLabel={labelIndexes.has(index)}
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
