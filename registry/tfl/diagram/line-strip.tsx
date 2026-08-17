import { BranchStrip } from "@/components/tfl/diagram/branch-strip";
import { StraightStrip } from "@/components/tfl/diagram/straight-strip";
import { LineRouteDiagram } from "@/components/tfl/diagram/line-route-diagram";
import {
  sliceLineSpineStations,
  type LineSpine,
} from "@/lib/tfl/line-spine-model";
import type { DiagramSegment, DiagramStation } from "@/lib/tfl/diagram-station";
import type { LineSchematic } from "@/lib/tfl/line-schematic";
import {
  resolveDiagramLineColor,
  resolveDiagramLineCssColor,
  resolveRouteTrackStyle,
  type RouteTrackStyle,
} from "@/lib/tfl/route-track";
import {
  prepareBranchStrip,
  prepareStraightStrip,
  type StripLabelPlacement,
  type StripSegmentState,
} from "@/lib/tfl/strip-model";
import { cn } from "@/lib/utils";

export type LineStripOrientation = "horizontal" | "vertical";

export type LineStripProps = {
  lineId: string;
  /** Preloaded stations (week-ahead / demos). When omitted, pass via `spine`. */
  stations?: readonly DiagramStation[];
  lineName?: string;
  /** Hex fallback when `lineId` has no theme token (e.g. cable-car map red). */
  lineColor?: string;
  /** Full spine payload — alternative to stations + meta. */
  spine?: Pick<LineSpine, "stations" | "lineName" | "lineColor" | "routeError">;
  /**
   * When set, renders `BranchStrip` instead of a linear strip.
   * Orientation defaults to the schematic’s authored hint.
   */
  schematic?: LineSchematic;
  orientation?: LineStripOrientation;
  segments?: readonly DiagramSegment[];
  /** Stations whose markers use the out-of-use colour. */
  stationOutOfUseIds?: readonly string[];
  /** Branch edge overrides keyed `"fromId→toId"`. */
  branchSegmentStates?: Readonly<Record<string, StripSegmentState>>;
  fit?: boolean;
  forceLabelIds?: readonly string[];
  sharedFitScale?: number;
  labelPlacement?: StripLabelPlacement;
  /** Absolute diagram unit (horizontal). */
  x?: number;
  /** Inclusive partial spine by station id. */
  fromStationId?: string;
  toStationId?: string;
  className?: string;
  /** Scroll region wrapper for horizontal (default true). */
  scroll?: boolean;
  /**
   * Apply editorial strip label recipes (default true).
   * Set false when stations already carry `labelLines`.
   */
  applyLabelRecipes?: boolean;
  /**
   * Override route paint. Default resolves from `lineId`
   * (solid / Overground·Elizabeth parallel / cable-car triple).
   */
  trackStyle?: RouteTrackStyle;
  /**
   * Paint B&W Tube-map stroke motifs on the strip graph.
   * Scales through `x`, not `--tfl-diagram-scale`.
   */
  mono?: boolean;
};

/**
 * Molecular strip: TfL-aware compose layer.
 * Resolves colour, spine slicing, adjacency/closure presentation, and
 * editorial label breaks, then renders `StraightStrip` or `BranchStrip`.
 * Fetching stays in Server Component / data-loader parents.
 */
export const LineStrip = ({
  lineId,
  stations: stationsProp,
  lineName: lineNameProp,
  lineColor: lineColorProp,
  spine,
  schematic,
  orientation: orientationProp,
  segments,
  stationOutOfUseIds,
  branchSegmentStates,
  fit = false,
  forceLabelIds,
  sharedFitScale,
  x,
  fromStationId,
  toStationId,
  className,
  scroll = true,
  labelPlacement = "above",
  applyLabelRecipes = true,
  trackStyle: trackStyleProp,
  mono = false,
}: LineStripProps) => {
  const color =
    resolveDiagramLineCssColor(lineId) ??
    lineColorProp ??
    spine?.lineColor ??
    resolveDiagramLineColor(lineId);
  const name = lineNameProp ?? spine?.lineName ?? lineId;
  const trackStyle = trackStyleProp ?? resolveRouteTrackStyle(lineId);
  const orientation: LineStripOrientation =
    orientationProp ?? schematic?.orientation ?? "horizontal";

  if (schematic) {
    const prepared = prepareBranchStrip(schematic, {
      segmentStates: branchSegmentStates,
      applyLabelRecipes,
    });
    return (
      <BranchStrip
        schematic={prepared.schematic}
        lineColor={color}
        orientation={orientation}
        x={x}
        className={className}
        nodeLabelLines={prepared.nodeLabelLines}
        segmentStates={prepared.segmentStates}
        mono={mono}
      />
    );
  }

  const rawStations = stationsProp ?? spine?.stations ?? [];
  const stations =
    fromStationId && toStationId
      ? sliceLineSpineStations(rawStations, fromStationId, toStationId)
      : [...rawStations];

  if (stations.length === 0) {
    return (
      <p className={cn("text-sm text-muted-foreground", className)}>
        {spine?.routeError ?? "No stations to display."}
      </p>
    );
  }

  if (orientation === "vertical") {
    return (
      <LineRouteDiagram
        stations={stations}
        lineColor={color}
        lineName={name}
        x={x}
        className={className}
      />
    );
  }

  const prepared = prepareStraightStrip(stations, {
    segments,
    stationOutOfUseIds,
    applyLabelRecipes,
  });

  const diagram = (
    <StraightStrip
      stations={prepared.stations}
      lineColor={color}
      lineName={name}
      segmentStates={prepared.segmentStates}
      stationOutOfUse={prepared.stationOutOfUse}
      fit={fit}
      forceLabelIds={forceLabelIds}
      sharedFitScale={sharedFitScale}
      labelPlacement={labelPlacement}
      trackStyle={trackStyle}
      x={x}
      className={scroll ? undefined : className}
      mono={mono}
      lineId={lineId}
    />
  );

  if (!scroll || fit) {
    return <div className={className}>{diagram}</div>;
  }

  return (
    <div
      className={cn(
        "overflow-x-auto overscroll-x-contain pb-2 [-webkit-overflow-scrolling:touch]",
        className,
      )}
      tabIndex={0}
      role="region"
      aria-label={`${name} line strip`}
    >
      {diagram}
    </div>
  );
};
