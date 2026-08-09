"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  diagramUnitStyle,
  verticalDiagramMetrics,
} from "@/lib/tfl/line-diagram";
import { type DiagramStation } from "@/lib/tfl/diagram-station";
import { Button } from "@/components/ui/button";
import {
  DiagramConnectionFlags,
  DiagramStationMarker,
  resolveJourneyMarkerKind,
  VerticalRouteLine,
} from "@/components/tfl/diagram/diagram-markers";
import { StationName } from "@/components/tfl/station-name";
import { NationalRailPictogram } from "@/components/tfl/national-rail-pictogram";

export type JourneyDiagramProps = {
  from: DiagramStation;
  to: DiagramStation;
  /** Stops between from and to (exclusive). */
  intermediates?: DiagramStation[];
  lineColor: string;
  lineName?: string;
  defaultExpanded?: boolean;
  /**
   * Absolute route line thickness in px.
   * When omitted, uses `DIAGRAM_BASELINE.vertical` × `--tfl-diagram-scale`.
   */
  x?: number;
  className?: string;
};

const StationRow = ({
  station,
  lineColor,
}: {
  station: DiagramStation;
  lineColor: string;
}) => {
  const m = verticalDiagramMetrics();
  const kind = resolveJourneyMarkerKind();
  const connections = (station.connections ?? []).filter(
    (c) => c.id !== "national-rail",
  );

  return (
    <div
      className="relative flex items-center"
      style={{
        columnGap: m.nameGap,
        minHeight: m.rowGap,
      }}
    >
      <DiagramStationMarker
        kind={kind}
        lineColor={lineColor}
        columnWidth={m.markerCol}
        slotHeight={m.markerSlot}
      />
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <div className="relative inline-flex min-w-0 max-w-full items-center">
          <StationName
            name={station.name}
            layout="auto"
            maxLines={2}
            align="left"
            className="min-w-0 font-medium text-foreground"
            style={{ fontSize: m.nameSize }}
          />
          {station.nationalRail ? (
            <span className="ml-1 inline-flex shrink-0 items-center self-end pb-0.5">
              <NationalRailPictogram height="0.75em" />
              <span className="sr-only">National Rail</span>
            </span>
          ) : null}
        </div>
        {connections.length > 0 ? (
          <DiagramConnectionFlags
            stationId={station.id}
            connections={connections}
          />
        ) : null}
      </div>
    </div>
  );
};

/**
 * A→B journey on one line: endpoints always visible; intermediate stops
 * collapse behind an expand control. Journey markers are always circles.
 */
export const JourneyDiagram = ({
  from,
  to,
  intermediates = [],
  lineColor,
  lineName,
  defaultExpanded = false,
  x,
  className,
}: JourneyDiagramProps) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const m = verticalDiagramMetrics();
  const stopCount = intermediates.length;

  const handleToggle = () => setExpanded((v) => !v);

  return (
    <div
      className={cn("w-full", className)}
      style={diagramUnitStyle("vertical", x)}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        {lineName ? (
          <p
            className="font-semibold"
            style={{ color: lineColor, fontSize: m.titleSize }}
          >
            {lineName}
          </p>
        ) : (
          <span />
        )}
        {stopCount > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleToggle}
            aria-expanded={expanded}
            className="gap-1.5"
          >
            {expanded ? (
              <>
                Hide stops
                <ChevronUp className="size-3.5" aria-hidden />
              </>
            ) : (
              <>
                {stopCount} stop{stopCount === 1 ? "" : "s"}
                <ChevronDown className="size-3.5" aria-hidden />
              </>
            )}
          </Button>
        ) : null}
      </div>

      <div className="relative">
        <VerticalRouteLine
          lineColor={lineColor}
          markerCol={m.markerCol}
          rowGap={m.rowGap}
        />

        <div className="relative flex flex-col" style={{ gap: m.stopGap }}>
          <StationRow station={from} lineColor={lineColor} />

          {stopCount > 0 && !expanded ? (
            <button
              type="button"
              onClick={handleToggle}
              className="relative flex w-full items-center rounded-md text-left transition-colors hover:bg-muted/60"
              style={{ columnGap: m.nameGap, minHeight: m.rowGap }}
              aria-label={`Show ${stopCount} intermediate stops`}
            >
              <div
                className="relative z-10 flex shrink-0 items-center justify-center"
                style={{ width: m.markerCol, height: m.markerSlot }}
              >
                <span
                  className="block rounded-full bg-background ring-2 ring-muted-foreground/40"
                  style={{ width: m.lineWidth, height: m.lineWidth }}
                  aria-hidden
                />
              </div>
              <span
                className="text-muted-foreground"
                style={{ fontSize: `calc(${m.nameSize} * 0.75)` }}
              >
                {stopCount} intermediate stop{stopCount === 1 ? "" : "s"}
              </span>
            </button>
          ) : null}

          {expanded
            ? intermediates.map((station) => (
                <StationRow
                  key={station.id}
                  station={station}
                  lineColor={lineColor}
                />
              ))
            : null}

          <StationRow station={to} lineColor={lineColor} />
        </div>
      </div>
    </div>
  );
};
