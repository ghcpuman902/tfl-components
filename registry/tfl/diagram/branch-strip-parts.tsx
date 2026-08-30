import { OUT_OF_USE_LINE_COLOR } from "@/components/tfl/diagram/straight-strip-parts"
import { resolveMonoLineStyle, scaleMonoLayers } from "@/lib/tfl/bw-line-styles"
import {
  branchStripMetrics,
  bondedStationGroups,
  placeBranchStripLabels,
  type BranchStripLabelPlacement,
  type BranchStripMetrics,
} from "@/lib/tfl/branch-strip-layout"
import type { LineSchematic } from "@/lib/tfl/line-schematic"
import {
  layoutLineSchematic,
  type SchematicLayout,
  type SchematicLayoutPoint,
  type SchematicOrientation,
} from "@/lib/tfl/schematic-layout"
import {
  branchSegmentKey,
  type BranchStripLabelMap,
  type StripSegmentState,
} from "@/lib/tfl/strip-model"

/**
 * Shared BranchStrip contract. Horizontal and vertical atoms take this shape
 * and pass their orientation into `prepareBranchStripView`.
 */
export type BranchStripSharedProps = {
  schematic: LineSchematic
  lineColor: string
  /**
   * Absolute diagram unit (= route line thickness).
   * Defaults to `DIAGRAM_BASELINE` for the orientation.
   */
  x?: number
  className?: string
  /**
   * Editorial visual lines keyed by schematic node id.
   * Prepared by `LineStrip` / `prepareBranchStrip` — never looked up here.
   */
  nodeLabelLines?: BranchStripLabelMap
  /**
   * Optional segment overrides keyed `"fromId→toId"`.
   */
  segmentStates?: Readonly<Record<string, StripSegmentState>>
  /**
   * Paint B&W Tube-map stroke motifs instead of a single colour stroke.
   */
  mono?: boolean
}

export type BranchStripView = {
  schematic: LineSchematic
  lineColor: string
  mono: boolean
  markerColor: string
  metrics: BranchStripMetrics
  layout: SchematicLayout
  placements: BranchStripLabelPlacement[]
  placementById: Map<string, BranchStripLabelPlacement>
  canvasWidth: number
  canvasHeight: number
  svgOffsetX: number
  svgOffsetY: number
  nodeLabelLines?: BranchStripLabelMap
  segmentStates?: Readonly<Record<string, StripSegmentState>>
  monoLayers: ReturnType<typeof scaleMonoLayers> | null
}

export const prepareBranchStripView = (
  props: BranchStripSharedProps,
  orientation: SchematicOrientation
): BranchStripView => {
  const {
    schematic,
    lineColor,
    x: xProp,
    nodeLabelLines,
    segmentStates,
    mono = false,
  } = props
  const metrics = branchStripMetrics(orientation, xProp)
  const monoLayers = mono
    ? scaleMonoLayers(resolveMonoLineStyle(schematic.lineId), metrics.x)
    : null
  const layout = layoutLineSchematic(schematic, {
    orientation,
    x: metrics.x,
    mainPitch: metrics.mainPitch,
    lanePitch: metrics.lanePitch,
    padding: metrics.padding,
  })
  const placements = placeBranchStripLabels(layout, {
    orientation,
    nameFont: metrics.nameFont,
    labelMaxWidth: metrics.labelMaxWidth,
    verticalLabelWidth: metrics.verticalLabelWidth,
    labelClearance: metrics.labelClearance,
    labelGap: metrics.labelGap,
    labelLineHeight: metrics.labelLineHeight,
  })

  return {
    schematic,
    lineColor,
    mono,
    markerColor: mono ? "var(--tfl-mono-ink)" : lineColor,
    metrics,
    layout,
    placements,
    placementById: new Map(
      placements.map((placement) => [placement.id, placement])
    ),
    canvasWidth:
      layout.width +
      metrics.labelSideLeft +
      metrics.labelSideRight +
      metrics.endPad * 2,
    canvasHeight:
      layout.height + metrics.labelBandTop + metrics.labelBandBottom,
    svgOffsetX: metrics.labelSideLeft + metrics.endPad,
    svgOffsetY: metrics.labelBandTop,
    nodeLabelLines,
    segmentStates,
    monoLayers,
  }
}

export const BranchStripTrack = ({ view }: { view: BranchStripView }) => {
  const {
    layout,
    segmentStates,
    monoLayers,
    lineColor,
    markerColor,
    mono,
    metrics,
    canvasWidth,
    canvasHeight,
    svgOffsetX,
    svgOffsetY,
  } = view
  const { strokeWidth, tickProtrude, ringOuter, ringStroke } = metrics
  const bondedGroups = bondedStationGroups(layout.points)
  const bondedIds = new Set(
    bondedGroups.flatMap((group) => group.map((point) => point.id))
  )

  return (
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
            segmentStates?.[branchSegmentKey(edge.to, edge.from)]
          const state = override ?? edge.state
          const edgeKey = `${edge.branchId ?? "edge"}:${edge.from}→${edge.to}`
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
            )
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
            ))
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
          )
        })}

        {bondedGroups.map((group) => {
          const sorted = [...group].sort((a, b) => a.lane - b.lane)
          const from = sorted[0]!
          const to = sorted[sorted.length - 1]!
          return (
            <BondedStationBridge
              key={`bond:${from.stationKey}:${from.pos}`}
              from={from}
              to={to}
              neckWidth={metrics.bondNeckWidth}
              gap={metrics.bondGap}
              mono={mono}
            />
          )
        })}

        {layout.points
          .filter((point) => point.kind !== "virtual")
          .map((point) => (
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
              asInterchange={bondedIds.has(point.id)}
            />
          ))}
      </g>
    </svg>
  )
}

type BondedStationBridgeProps = {
  from: SchematicLayoutPoint
  to: SchematicLayoutPoint
  neckWidth: number
  gap: number
  mono: boolean
}

/**
 * TfL dumbbell neck: black walls, white core — same paint as the rings,
 * thicker than the route stroke. Circles paint on top and cover the ends.
 */
const BondedStationBridge = ({
  from,
  to,
  neckWidth,
  gap,
  mono,
}: BondedStationBridgeProps) => {
  const wallClass = mono ? undefined : "fill-black dark:fill-white"
  const coreClass = mono ? undefined : "fill-white dark:fill-black"
  const wallFill = mono ? "var(--tfl-mono-ink)" : undefined
  const coreFill = mono ? "var(--tfl-mono-paper)" : undefined
  const overlap = 1
  const vertical = Math.abs(to.y - from.y) >= Math.abs(to.x - from.x)

  if (vertical) {
    const cx = (from.x + to.x) / 2
    const y1 = Math.min(from.y, to.y)
    const y2 = Math.max(from.y, to.y)
    const height = y2 - y1
    return (
      <g>
        <rect
          x={cx - neckWidth / 2}
          y={y1}
          width={neckWidth}
          height={height}
          className={wallClass}
          fill={wallFill}
        />
        <rect
          x={cx - gap / 2}
          y={y1 - overlap}
          width={gap}
          height={height + overlap * 2}
          className={coreClass}
          fill={coreFill}
        />
      </g>
    )
  }

  const cy = (from.y + to.y) / 2
  const x1 = Math.min(from.x, to.x)
  const x2 = Math.max(from.x, to.x)
  const width = x2 - x1
  return (
    <g>
      <rect
        x={x1}
        y={cy - neckWidth / 2}
        width={width}
        height={neckWidth}
        className={wallClass}
        fill={wallFill}
      />
      <rect
        x={x1 - overlap}
        y={cy - gap / 2}
        width={width + overlap * 2}
        height={gap}
        className={coreClass}
        fill={coreFill}
      />
    </g>
  )
}

type BranchStripMarkerProps = {
  point: SchematicLayoutPoint
  lineColor: string
  strokeWidth: number
  tickProtrude: number
  ringOuter: number
  ringStroke: number
  routeAlongMain: boolean
  trackAngle?: number
  mono?: boolean
  asInterchange?: boolean
}

/**
 * Markers match StraightStrip / DiagramStationMarker:
 * - interchange → ring (Ø 3x; white/black, inverted in dark)
 * - terminus → filled end bar (perpendicular to local track)
 * - stop → cross-tick or tick-right
 */
export const BranchStripMarker = ({
  point,
  lineColor,
  strokeWidth,
  tickProtrude,
  ringOuter,
  ringStroke,
  routeAlongMain,
  trackAngle = 0,
  mono = false,
  asInterchange = false,
}: BranchStripMarkerProps) => {
  if (point.kind === "interchange" || asInterchange) {
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
    )
  }

  const isDiagonal = Math.abs(Math.round(trackAngle) % 90) !== 0
  const rotate = isDiagonal
    ? `rotate(${trackAngle} ${point.x} ${point.y})`
    : undefined

  const halfLen = strokeWidth / 2 + tickProtrude

  if (point.kind === "terminus") {
    const half = strokeWidth / 2 + tickProtrude * 3.5
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
      )
    }
    return (
      <rect
        x={point.x - half}
        y={point.y - strokeWidth / 2}
        width={half * 2}
        height={strokeWidth}
        fill={lineColor}
      />
    )
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
    )
  }

  return (
    <rect
      x={point.x - strokeWidth / 2}
      y={point.y - strokeWidth / 2}
      width={strokeWidth + tickProtrude}
      height={strokeWidth}
      fill={lineColor}
    />
  )
}
