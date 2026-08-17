import { StationName } from "@/components/tfl/station-name";
import { OUT_OF_USE_LINE_COLOR } from "@/components/tfl/diagram/straight-strip-parts";
import {
  resolveMonoLineStyle,
  scaleMonoLayers,
} from "@/lib/tfl/bw-line-styles";
import {
  branchStripMetrics,
  placeBranchStripLabels,
  verticalLabelOnLeft,
} from "@/lib/tfl/branch-strip-layout";
import type { LineSchematic } from "@/lib/tfl/line-schematic";
import {
  layoutLineSchematic,
  type SchematicLayoutPoint,
  type SchematicOrientation,
} from "@/lib/tfl/schematic-layout";
import {
  branchSegmentKey,
  type BranchStripLabelMap,
  type StripSegmentState,
} from "@/lib/tfl/strip-model";
import { cn } from "@/lib/utils";

/**
 * Atomic branched strip: SVG paths + markers, HTML StationName overlay.
 *
 * ## Visual regression checklist (run after every edit)
 * Open http://localhost:3999/docs/branch-strip and confirm:
 * 1. **Mill Hill East** joins Finchley with a single 45° diagonal + one fillet — never a 90° stub
 *    (same `pos` as Finchley is forbidden; see `schematic-layout.test.ts`)
 * 2. **Camden → Mornington Crescent** is a §6 join (45° S or 90° R) — never a freeform Bezier
 * 3. **No station labels overlap** each other; prefer labels clear of the track
 * 4. **Every tick/dash is ⊥ to the local track** — never parallel (esp. Mill Hill)
 *
 * Automated guards: `pnpm test` → `lib/tfl/schematic-layout.test.ts`
 */
export type BranchStripProps = {
  schematic: LineSchematic;
  lineColor: string;
  orientation?: SchematicOrientation;
  /**
   * Absolute diagram unit (= route line thickness).
   * Defaults to `DIAGRAM_BASELINE` for the orientation — same as straight strips.
   * Station font, pitches, and label widths all derive from this via
   * `branchStripMetrics` (em multiples of the station-name size).
   */
  x?: number;
  className?: string;
  /**
   * Editorial visual lines keyed by schematic node id.
   * Prepared by `LineStrip` / `prepareBranchStrip` — never looked up here.
   */
  nodeLabelLines?: BranchStripLabelMap;
  /**
   * Optional segment overrides keyed `"fromId→toId"`.
   * Lets closures paint without redesigning the schematic.
   */
  segmentStates?: Readonly<Record<string, StripSegmentState>>;
  /**
   * Paint B&W Tube-map stroke motifs instead of a single colour stroke.
   * Scales through `x` (defaults to the orientation baseline).
   */
  mono?: boolean;
};

export const BranchStrip = ({
  schematic,
  lineColor,
  orientation: orientationProp,
  x: xProp,
  className,
  nodeLabelLines,
  segmentStates,
  mono = false,
}: BranchStripProps) => {
  const orientation = orientationProp ?? schematic.orientation;
  const isHorizontal = orientation === "horizontal";
  const m = branchStripMetrics(orientation, xProp);
  const monoLayers = mono
    ? scaleMonoLayers(resolveMonoLineStyle(schematic.lineId), m.x)
    : null;
  const markerColor = mono ? "var(--tfl-mono-ink)" : lineColor;
  const {
    nameFont,
    labelLineHeight,
    strokeWidth,
    tickProtrude,
    ringOuter,
    ringStroke,
    labelClearance,
    verticalLabelWidth,
    labelMaxWidth,
    labelGap,
    labelBandTop,
    labelBandBottom,
    labelSideLeft,
    labelSideRight,
    endPad,
  } = m;

  const layout = layoutLineSchematic(schematic, {
    orientation,
    x: m.x,
    mainPitch: m.mainPitch,
    lanePitch: m.lanePitch,
    padding: m.padding,
  });

  const placements = placeBranchStripLabels(layout, {
    orientation,
    nameFont,
    labelMaxWidth,
    verticalLabelWidth,
    labelClearance,
    labelGap,
    labelLineHeight,
  });
  const placementById = new Map(placements.map((p) => [p.id, p]));

  const canvasWidth = layout.width + labelSideLeft + labelSideRight + endPad * 2;
  const canvasHeight = layout.height + labelBandTop + labelBandBottom;
  const svgOffsetX = labelSideLeft + endPad;
  const svgOffsetY = labelBandTop;

  return (
    <div
      className={cn("relative w-full min-w-0 overflow-auto", className)}
      role="region"
      aria-label={`${schematic.lineName} branch strip`}
      tabIndex={0}
    >
      <div
        className="relative"
        style={{ width: canvasWidth, height: canvasHeight }}
      >
        <svg
          width={canvasWidth}
          height={canvasHeight}
          className="absolute inset-0"
          aria-hidden
        >
          <g transform={`translate(${svgOffsetX} ${svgOffsetY})`}>
            {layout.edges.map((edge) => {
              const override =
                segmentStates?.[branchSegmentKey(edge.from, edge.to)] ??
                segmentStates?.[branchSegmentKey(edge.to, edge.from)];
              const state = override ?? edge.state;
              const edgeKey = `${edge.branchId ?? "edge"}:${edge.from}→${edge.to}`;
              if (state === "out-of-use") {
                return (
                  <path
                    key={edgeKey}
                    d={edge.path}
                    fill="none"
                    stroke={OUT_OF_USE_LINE_COLOR}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                );
              }
              if (monoLayers) {
                return monoLayers.map((layer, index) => (
                  <path
                    key={`${edgeKey}-${index}`}
                    d={edge.path}
                    fill="none"
                    stroke={layer.stroke}
                    strokeWidth={layer.width}
                    strokeDasharray={layer.dash}
                    strokeDashoffset={layer.dashoffset}
                    strokeLinecap={layer.linecap ?? "round"}
                    strokeLinejoin="round"
                  />
                ));
              }
              return (
                <path
                  key={edgeKey}
                  d={edge.path}
                  fill="none"
                  stroke={lineColor}
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}

            {layout.points.map((point) => (
              <BranchStripMarker
                key={`m-${point.id}`}
                point={point}
                lineColor={markerColor}
                strokeWidth={strokeWidth}
                tickProtrude={tickProtrude}
                ringOuter={ringOuter}
                ringStroke={ringStroke}
                routeAlongMain={point.trackAxis === "x"}
                trackAngle={point.trackAngle}
                mono={mono}
              />
            ))}
          </g>
        </svg>

        {layout.points.map((point) => {
          const nodeX = point.x + svgOffsetX;
          const nodeY = point.y + svgOffsetY;
          const labelLines = nodeLabelLines?.[point.id];
          const placement = placementById.get(point.id);
          const labelStyle = {
            fontSize: nameFont,
            lineHeight: labelLineHeight,
            textShadow:
              "0 0 3px var(--background), 0 0 3px var(--background), 0 0 6px var(--background)",
          } as const;

          if (isHorizontal) {
            const labelAbove = (placement?.side ?? "above") === "above";

            return (
              <div
                key={`label-${point.id}`}
                className="pointer-events-auto absolute z-10"
                style={{
                  left: nodeX,
                  top: labelAbove
                    ? nodeY - labelClearance
                    : nodeY + labelClearance,
                  width: labelMaxWidth,
                  transform: labelAbove
                    ? "translate(-50%, -100%)"
                    : "translate(-50%, 0)",
                }}
              >
                <StationName
                  name={point.name}
                  lines={labelLines}
                  layout={labelLines?.length ? "fixed" : "auto"}
                  maxWidth={labelMaxWidth}
                  maxLines={2}
                  allowScaleDown={false}
                  align="center"
                  className="font-medium text-foreground"
                  style={labelStyle}
                />
              </div>
            );
          }

          if (placement?.side === "stub-above") {
            return (
              <div
                key={`label-${point.id}`}
                className="pointer-events-auto absolute z-10"
                style={{
                  left: nodeX,
                  top: nodeY - labelClearance,
                  width: verticalLabelWidth,
                  transform: "translate(-50%, -100%)",
                }}
              >
                <StationName
                  name={point.name}
                  lines={labelLines}
                  layout={labelLines?.length ? "fixed" : "auto"}
                  maxWidth={verticalLabelWidth}
                  maxLines={2}
                  allowScaleDown={false}
                  allowAbbreviation={false}
                  align="center"
                  className="font-medium text-foreground"
                  style={labelStyle}
                />
              </div>
            );
          }

          const labelOnLeft =
            placement?.side === "left" ||
            (placement?.side !== "right" &&
              verticalLabelOnLeft(point, layout));

          return (
            <div
              key={`label-${point.id}`}
              className="pointer-events-auto absolute z-10"
              style={{
                left: labelOnLeft
                  ? nodeX - labelGap - verticalLabelWidth
                  : nodeX + labelGap,
                top: nodeY,
                width: verticalLabelWidth,
                transform: "translateY(-50%)",
              }}
            >
              <StationName
                name={point.name}
                lines={labelLines}
                layout={labelLines?.length ? "fixed" : "auto"}
                maxWidth={verticalLabelWidth}
                maxLines={2}
                allowScaleDown={false}
                allowAbbreviation={false}
                align={labelOnLeft ? "right" : "left"}
                className="font-medium text-foreground"
                style={labelStyle}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

type BranchStripMarkerProps = {
  point: SchematicLayoutPoint;
  lineColor: string;
  strokeWidth: number;
  tickProtrude: number;
  ringOuter: number;
  ringStroke: number;
  /** True when local track runs along the main (horizontal) axis. */
  routeAlongMain: boolean;
  /** Local track heading in degrees from +x. Tick/bar rotate to stay ⊥. */
  trackAngle?: number;
  mono?: boolean;
};

/**
 * Markers match StraightStrip / DiagramStationMarker:
 * - interchange → ring (Ø 3x; white/black, inverted in dark)
 * - terminus → filled end bar (perpendicular to local track)
 * - stop → cross-tick or tick-right
 */
const BranchStripMarker = ({
  point,
  lineColor,
  strokeWidth,
  tickProtrude,
  ringOuter,
  ringStroke,
  routeAlongMain,
  trackAngle = 0,
  mono = false,
}: BranchStripMarkerProps) => {
  if (point.kind === "interchange") {
    return (
      <circle
        cx={point.x}
        cy={point.y}
        r={ringOuter}
        className={
          mono
            ? undefined
            : "fill-white stroke-black dark:fill-black dark:stroke-white"
        }
        fill={mono ? "var(--tfl-mono-paper)" : undefined}
        stroke={mono ? "var(--tfl-mono-ink)" : undefined}
        strokeWidth={ringStroke}
      />
    );
  }

  const isDiagonal = Math.abs(Math.round(trackAngle) % 90) !== 0;
  const rotate = isDiagonal
    ? `rotate(${trackAngle} ${point.x} ${point.y})`
    : undefined;

  const halfLen = strokeWidth / 2 + tickProtrude;

  if (point.kind === "terminus") {
    const half = strokeWidth / 2 + tickProtrude * 3.5;
    if (routeAlongMain || isDiagonal) {
      return (
        <rect
          x={point.x - strokeWidth / 2}
          y={point.y - half}
          width={strokeWidth}
          height={half * 2}
          fill={lineColor}
          transform={rotate}
        />
      );
    }
    return (
      <rect
        x={point.x - half}
        y={point.y - strokeWidth / 2}
        width={half * 2}
        height={strokeWidth}
        fill={lineColor}
      />
    );
  }

  if (routeAlongMain || isDiagonal) {
    return (
      <rect
        x={point.x - strokeWidth / 2}
        y={point.y - halfLen}
        width={strokeWidth}
        height={strokeWidth + tickProtrude * 2}
        fill={lineColor}
        transform={rotate}
      />
    );
  }

  return (
    <rect
      x={point.x - strokeWidth / 2}
      y={point.y - strokeWidth / 2}
      width={strokeWidth + tickProtrude}
      height={strokeWidth}
      fill={lineColor}
    />
  );
};
