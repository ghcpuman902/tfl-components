import { cn } from "@/lib/utils";
import { horizontalDiagramMetrics, ux } from "@/lib/tfl/line-diagram";
import { formatStationName } from "@/lib/tfl/diagram-station";
import { StationName } from "@/components/tfl/station-name";
import { NationalRailPictogram } from "@/components/tfl/national-rail-pictogram";
import {
  routeTrackHeightUnits,
  routeTrackRailCount,
  type RouteTrackStyle,
} from "@/lib/tfl/route-track";
import {
  buildSegmentStateMap,
  isStationOutOfUse,
  stationOutOfUseFromSegments,
  type StraightStripStation,
  type StripLabelPlacement,
  type StripSegmentState,
} from "@/lib/tfl/strip-model";

type DiagramMetrics = ReturnType<typeof horizontalDiagramMetrics>;

export type {
  StraightStripStation,
  StripLabelPlacement,
  StripSegmentState,
} from "@/lib/tfl/strip-model";

/** @deprecated Prefer `StraightStripStation`. */
export type HorizontalDiagramStation = StraightStripStation;
/** @deprecated Prefer `StripLabelPlacement`. */
export type HorizontalLabelPlacement = StripLabelPlacement;

export {
  buildSegmentStateMap,
  isStationOutOfUse,
  stationOutOfUseFromSegments,
};

/**
 * Closed / out-of-use solid — lighter than Jubilee (#838D93).
 * Uses theme `--muted` (≈ Tailwind zinc-100 / oklch 0.97 in light mode).
 */
export const OUT_OF_USE_LINE_COLOR = "var(--muted)";

export const resolveLabelSide = (
  index: number,
  placement: StripLabelPlacement,
): "above" | "below" => {
  if (placement === "above") return "above";
  if (placement === "below") return "below";
  return index % 2 === 0 ? "above" : "below";
};

type RouteStripProps = {
  stationCount: number;
  segmentStates: readonly StripSegmentState[];
  lineColor: string;
  /** Top of a 1× solid route (centreline − 0.5×). Multi-rail stacks re-centre. */
  lineTop: string;
  /** Solid-route height (1×). Ignored for parallel / cable-car stacks. */
  lineWidth: string;
  colWidthUnits: number;
  /** Explicit paint style — primitives never infer from TfL ids. */
  trackStyle?: RouteTrackStyle;
};

const SegmentPaint = ({
  color,
  trackStyle,
}: {
  color: string;
  trackStyle: RouteTrackStyle;
}) => {
  if (trackStyle === "solid") {
    return <div className="h-full w-full" style={{ backgroundColor: color }} />;
  }

  const rails = routeTrackRailCount(trackStyle);
  // stroke === gap === 0.33× — equal flex bands keep §5 proportions.
  const bands: { key: string; fill?: string }[] = [];
  for (let i = 0; i < rails; i += 1) {
    bands.push({ key: `rail-${i}`, fill: color });
    if (i < rails - 1) {
      bands.push({ key: `gap-${i}` });
    }
  }

  return (
    <div className="flex h-full w-full flex-col">
      {bands.map((band) => (
        <div
          key={band.key}
          className="min-h-0 w-full flex-1"
          style={{ backgroundColor: band.fill }}
        />
      ))}
    </div>
  );
};

/** Solid / parallel / cable-car / out-of-use segments on the route centreline. */
export const StraightRouteTrack = ({
  stationCount,
  segmentStates,
  lineColor,
  lineTop,
  lineWidth,
  colWidthUnits,
  trackStyle = "solid",
}: RouteStripProps) => {
  if (stationCount < 2) return null;

  const heightUnits = routeTrackHeightUnits(trackStyle);
  // Solid metrics pass top = centre − 0.5×; re-centre taller / shorter stacks.
  const top =
    trackStyle === "solid"
      ? lineTop
      : `calc(${lineTop} + ${ux(0.5)} - ${ux(heightUnits / 2)})`;
  const height = trackStyle === "solid" ? lineWidth : ux(heightUnits);

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0"
      style={{ top, height }}
    >
      {segmentStates.map((state, index) => {
        const left = `calc(${ux(colWidthUnits)} * ${index + 0.5})`;
        const width = ux(colWidthUnits);
        const color =
          state === "out-of-use" ? OUT_OF_USE_LINE_COLOR : lineColor;

        return (
          <div
            key={`seg-${index}`}
            className="absolute top-0"
            style={{ left, width, height }}
          >
            <SegmentPaint color={color} trackStyle={trackStyle} />
          </div>
        );
      })}
    </div>
  );
};

/** @deprecated Prefer `StraightRouteTrack`. */
export const HorizontalRouteStrip = StraightRouteTrack;

type StationColumnProps = {
  station: StraightStripStation;
  index: number;
  lineColor: string;
  showLabel: boolean;
  connectionBand?: string;
  /** Fixed column width (CSS length). */
  colWidth: string;
  /** Closed for this line — tick/ring use the out-of-use colour. */
  outOfUse?: boolean;
  /** Where station names sit relative to the route. */
  labelPlacement?: StripLabelPlacement;
  /** Hoisted metrics from the parent strip (avoids per-column rebuild). */
  metrics?: DiagramMetrics;
};

export const StraightStripStationColumn = ({
  station,
  index,
  lineColor,
  showLabel,
  connectionBand,
  colWidth,
  outOfUse = false,
  labelPlacement = "above",
  metrics,
}: StationColumnProps) => {
  const m = metrics ?? horizontalDiagramMetrics(labelPlacement);
  const isInterchange = Boolean(station.interchange);
  const connections = (station.connections ?? []).filter(
    (c) => c.id !== "national-rail",
  );
  const markerColor = outOfUse ? OUT_OF_USE_LINE_COLOR : lineColor;
  const accessibleName = formatStationName(station.name);
  const labelSide = resolveLabelSide(index, labelPlacement);
  const reserveAbove =
    labelPlacement === "above" || labelPlacement === "alternate";
  const reserveBelow =
    labelPlacement === "below" || labelPlacement === "alternate";
  const showAbove = showLabel && labelSide === "above";
  const showBelow = showLabel && labelSide === "below";
  const hasLabelLines = Boolean(station.labelLines?.length);

  const nameBand = (visible: boolean, alignEnd: boolean) => (
    <div
      className={cn(
        "relative flex w-full justify-center px-0.5 text-center",
        alignEnd ? "items-end" : "items-start",
      )}
      style={{ height: m.nameBand }}
      aria-hidden={visible ? undefined : true}
    >
      {visible ? (
        <div className="relative inline-flex max-w-full flex-col items-center">
          <StationName
            name={station.name}
            lines={station.labelLines}
            layout={hasLabelLines ? "fixed" : "auto"}
            accessibleName={accessibleName}
            maxLines={2}
            allowScaleDown={false}
            align="center"
            className="font-medium text-foreground"
            style={{
              fontSize: m.nameSize,
              lineHeight: 1.15,
            }}
          />
          {station.nationalRail ? (
            <span
              className="pointer-events-none absolute bottom-0 left-full ml-0.5 flex items-end"
              title="National Rail"
            >
              <NationalRailPictogram height="0.7em" />
            </span>
          ) : null}
          {station.nationalRail ? (
            <span className="sr-only">National Rail</span>
          ) : null}
        </div>
      ) : null}
    </div>
  );

  const marker = (
    <div
      className="relative z-10 flex items-center justify-center"
      style={{
        marginTop: reserveAbove ? m.nameGap : 0,
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
          className="block"
          style={{
            width: m.tickWidth,
            height: m.tickHeight,
            backgroundColor: markerColor,
          }}
          aria-hidden
        />
      )}
    </div>
  );

  const flags =
    connections.length > 0 && showLabel ? (
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
              backgroundColor: c.color ?? "#64748b",
              color: c.darkText ? "#0019A8" : "#fff",
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
    );

  return (
    <li
      className="relative flex shrink-0 flex-col items-center"
      style={{ width: colWidth }}
    >
      {!showLabel ? <span className="sr-only">{accessibleName}</span> : null}
      {reserveAbove ? nameBand(showAbove, true) : null}
      {marker}
      {reserveBelow ? (
        <div style={{ marginTop: m.nameGap }}>{nameBand(showBelow, false)}</div>
      ) : null}
      {flags}
    </li>
  );
};

/** @deprecated Prefer `StraightStripStationColumn`. */
export const HorizontalStationColumn = StraightStripStationColumn;

/**
 * Choose which station indexes show a visible label in fitted mode.
 * Always terminals + forced IDs; prefer interchanges when space allows.
 */
export const selectFittedLabelIndexes = (
  stations: readonly StraightStripStation[],
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

  const pitch = colWidthPx && colWidthPx > 0 ? colWidthPx : 56;
  const budget = Math.max(2, Math.floor(availableWidthPx / pitch));
  if (show.size >= budget) return show;

  const interchangeIndexes: number[] = [];
  for (let index = 1; index < n - 1; index += 1) {
    if (stations[index]?.interchange) interchangeIndexes.push(index);
  }

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
