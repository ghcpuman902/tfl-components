"use client"

import type { CSSProperties, ReactNode } from "react"
import { AnchoredStationName } from "@/components/tfl/anchored-station-name"
import { LineFlagStack, type LineFlag } from "@/components/tfl/line-flag-stack"
import {
  connectingStrokeLength,
  diagramAtomMetrics,
  diagramLabelBoxAlong,
  envelopesIntersect,
  interchangeBondBox,
  joinRingFromStem,
  layoutUBend,
  uBendBetween,
  uBendPitch,
  triangleApexAlong,
  triangleApexFromBase,
  triangleInterchangeCentres,
  bondedGroupLabelAt,
  labelClearanceLayout,
  labelShiftFromMark,
  laneEdgeGap,
  layoutStem,
  markClearanceRect,
  markerAlongHalf,
  markerLane,
  markHalfForSide,
  minimumBranchGap,
  octilinearBendClearsMark,
  octilinearBendEnvelope,
  paintSegmentParts,
  safeForkRadius,
  shapeEnvelope,
  stationAlongHalf,
  stationInwardAlong,
  stationSvgAlong,
  STEM_RECIPES,
  stemExitGap,
  strokeClearanceBand,
  tflBendRadius,
  throughJoinAlong,
  tickCrossHalves,
  travelLabelAnchor,
  type DiagramAtomMetrics,
  type Envelope,
  type Pt,
  type Shape,
  type StemRecipe,
} from "@/lib/tfl/diagram-atoms"
import { octilinearLanePath } from "@/lib/tfl/schematic-layout"
import { cn } from "@/lib/utils"

export type Travel = "right" | "left" | "up" | "down"
export type EndMark = "terminus" | "through"
export type Anchor = "tick" | "ring"

export type { LineFlag }

export const PAINT = "var(--foreground)"
export const EXCESS =
  "color-mix(in oklch, var(--muted-foreground) 45%, oklch(0.62 0.13 150))"
/**
 * A shape's own clearance — around a stroke, a tick, or a ring — paints
 * pink/red. A label's own gap (in `DiagramAnchorBox`) stays orange. Two
 * tones, one vocabulary: orange is "space I reserved for a label," pink is
 * "space this shape itself needs before anything else may start."
 */
export const DEBUG_MARK = "rgb(224 94 110 / 0.55)"
/** A constraint the geometry itself violates — a mark on its own bend, a gap too tight. */
const UNSAFE = "var(--destructive)"
const m = (): DiagramAtomMetrics => diagramAtomMetrics()

export const isHorizontal = (travel: Travel) =>
  travel === "right" || travel === "left"

const travelFlip = (travel: Travel): CSSProperties | undefined => {
  if (travel === "left") return { transform: "scaleX(-1)" }
  if (travel === "up") return { transform: "scaleY(-1)" }
  return undefined
}

/** Negative margin that closes the rest of `lineClearance` when the SVG lane is shallow. */
const pullMargin = (
  horizontal: boolean,
  towardMark: boolean,
  pull: number
): CSSProperties => {
  if (pull <= 0) return {}
  if (horizontal) {
    return towardMark ? { marginBottom: -pull } : { marginTop: -pull }
  }
  return towardMark ? { marginRight: -pull } : { marginLeft: -pull }
}

/**
 * The mark's own clearance band, drawn *inside* the mark's own `<svg>` —
 * from its rim out to `lineClearance` — so it shares one coordinate space
 * with the mark. There is no HTML/SVG seam to drift apart by a pixel.
 */
export const MarkClearanceBand = ({
  cx,
  cy,
  horizontal,
  side,
  markHalf,
  svgEdge,
  width,
}: {
  cx: number
  cy: number
  horizontal: boolean
  side: "near" | "far"
  markHalf: number
  /** SVG's own local-frame boundary on this side: 0 for "near", height/width for "far". */
  svgEdge: number
  width: number
}) => {
  const rect = markClearanceRect(cx, cy, horizontal, side, markHalf, svgEdge, width)
  if (rect.width <= 0 || rect.height <= 0) return null
  return (
    <rect
      x={rect.x}
      y={rect.y}
      width={rect.width}
      height={rect.height}
      fill={DEBUG_MARK}
    />
  )
}

export const TickMark = ({
  x,
  y,
  travel,
  end,
}: {
  x: number
  y: number
  travel: Travel
  end: EndMark
}) => {
  const metrics = m()
  const horizontal = isHorizontal(travel)
  const alongHalf = metrics.tickAlong / 2
  const { name: crossName, flag: crossFlag } = tickCrossHalves(end, metrics)
  if (horizontal) {
    return (
      <rect
        x={x - alongHalf}
        y={y - crossName}
        width={metrics.tickAlong}
        height={crossName + crossFlag}
        fill={PAINT}
      />
    )
  }
  return (
    <rect
      x={x - crossName}
      y={y - alongHalf}
      width={crossName + crossFlag}
      height={metrics.tickAlong}
      fill={PAINT}
    />
  )
}

export const RingFill = ({ x, y }: { x: number; y: number }) => {
  const metrics = m()
  return (
    <circle
      cx={x}
      cy={y}
      r={metrics.ringRadius - metrics.ringStroke / 2}
      fill="var(--background)"
    />
  )
}

export const RingStroke = ({
  x,
  y,
  paint = PAINT,
}: {
  x: number
  y: number
  paint?: string
}) => {
  const metrics = m()
  return (
    <circle
      cx={x}
      cy={y}
      r={metrics.ringRadius - metrics.ringStroke / 2}
      fill="none"
      stroke={paint}
      strokeWidth={metrics.ringStroke}
    />
  )
}

/** Official §8 neck (0.5x walls) in the gap; ends tuck under the rings. */
export const BondMark = ({
  a,
  b,
  overlay = false,
}: {
  a: { x: number; y: number }
  b: { x: number; y: number }
  /** Outlines the neck's own bounds — proves a shared middle ring's two
   * bridges tuck fully under it without their necks ever touching. */
  overlay?: boolean
}) => {
  const { neck, lens, vertical, angle, origin } = interchangeBondBox(a, b)
  const marks = (
    <g>
      {overlay ? (
        <>
          <line
            x1={vertical ? neck.x - 2 : neck.x}
            y1={vertical ? neck.y : neck.y - 2}
            x2={vertical ? neck.x + neck.width + 2 : neck.x}
            y2={vertical ? neck.y : neck.y + neck.height + 2}
            stroke={DEBUG_MARK}
            strokeWidth={1.5}
          />
          <line
            x1={vertical ? neck.x - 2 : neck.x + neck.width}
            y1={vertical ? neck.y + neck.height : neck.y - 2}
            x2={vertical ? neck.x + neck.width + 2 : neck.x + neck.width}
            y2={vertical ? neck.y + neck.height : neck.y + neck.height + 2}
            stroke={DEBUG_MARK}
            strokeWidth={1.5}
          />
        </>
      ) : null}
      <rect x={neck.x} y={neck.y} width={neck.width} height={neck.height} fill={PAINT} />
      <rect
        x={lens.x}
        y={lens.y}
        width={lens.width}
        height={lens.height}
        fill="var(--background)"
      />
    </g>
  )
  if (angle == null || !origin) return marks
  return (
    <g
      transform={`rotate(${(angle * 180) / Math.PI} ${origin.x} ${origin.y})`}
    >
      {marks}
    </g>
  )
}

export const Track = ({
  d,
  paint = PAINT,
  cap = "butt",
  join = "round",
}: {
  d: string
  paint?: string
  cap?: "butt" | "round"
  join?: "round" | "miter"
}) => (
  <path
    d={d}
    fill="none"
    stroke={paint}
    strokeWidth={m().x}
    strokeLinecap={cap}
    strokeLinejoin={join}
  />
)

const strokeFor = (
  end: EndMark,
  travel: Travel,
  cx: number,
  cy: number,
  stub: number
) => {
  if (travel === "right") {
    return end === "through"
      ? `M ${cx - stub} ${cy} L ${cx + stub} ${cy}`
      : `M ${cx - stub} ${cy} L ${cx} ${cy}`
  }
  if (travel === "left") {
    return end === "through"
      ? `M ${cx + stub} ${cy} L ${cx - stub} ${cy}`
      : `M ${cx + stub} ${cy} L ${cx} ${cy}`
  }
  if (travel === "up") {
    return end === "through"
      ? `M ${cx} ${cy + stub} L ${cx} ${cy - stub}`
      : `M ${cx} ${cy + stub} L ${cx} ${cy}`
  }
  return end === "through"
    ? `M ${cx} ${cy - stub} L ${cx} ${cy + stub}`
    : `M ${cx} ${cy - stub} L ${cx} ${cy}`
}

export function StationAtom({
  anchor,
  end,
  travel = "right",
  labeled = false,
  name,
  nameLines,
  connections,
  stubs = true,
  pairSlot,
  overlay = false,
  maxWidth,
}: {
  anchor: Anchor
  end: EndMark
  travel?: Travel
  labeled?: boolean
  name?: string
  nameLines?: readonly string[]
  connections?: readonly LineFlag[]
  stubs?: boolean
  pairSlot?: "start" | "end"
  overlay?: boolean
  maxWidth?: number
}) {
  const metrics = m()
  const horizontal = isHorizontal(travel)
  const flags = connections ?? []
  const nameAway = horizontal ? "up" : "left"
  const flagAway = horizontal ? "down" : "right"
  const pairLane = markerLane(anchor, Boolean(pairSlot))
  const svgAlong = stubs
    ? stationSvgAlong(anchor, end, metrics)
    : pairLane * 2
  const svgW = Math.round(horizontal ? svgAlong : pairLane * 2)
  const svgH = Math.round(horizontal ? pairLane * 2 : svgAlong)
  const cx = Math.round(
    !stubs
      ? svgW / 2
      : horizontal
        ? end === "through"
          ? svgW / 2
          : travel === "right"
            ? metrics.stub
            : svgW - metrics.stub
        : svgW / 2
  )
  const cy = Math.round(
    !stubs
      ? svgH / 2
      : horizontal
        ? svgH / 2
        : end === "through"
          ? svgH / 2
          : travel === "down"
            ? metrics.stub
            : svgH - metrics.stub
  )
  const labelShift = horizontal
    ? labelShiftFromMark(cx, svgW)
    : labelShiftFromMark(cy, svgH)
  const labelShiftStyle: CSSProperties | undefined =
    labelShift === 0
      ? undefined
      : horizontal
        ? { transform: `translateX(${labelShift}px)` }
        : { transform: `translateY(${labelShift}px)` }
  const nameFromEdge = horizontal ? cy : cx
  const flagFromEdge = horizontal ? svgH - cy : svgW - cx
  const markHalfName = markHalfForSide(anchor, end, "name", metrics)
  const markHalfFlag = markHalfForSide(anchor, end, "flag", metrics)
  const nameClear = labelClearanceLayout(nameFromEdge, markHalfName, metrics)
  const flagClear = labelClearanceLayout(flagFromEdge, markHalfFlag, metrics)

  const col = pairSlot === "start" ? "col-start-1" : "col-start-3"
  const row = pairSlot === "start" ? "row-start-1" : "row-start-3"
  const nameNode = (
    <div
      className={cn(
        "flex w-fit leading-none",
        pairSlot && "min-w-0 min-h-0",
        pairSlot && horizontal && `${col} row-start-1 self-end justify-self-center`,
        pairSlot && !horizontal && `${row} col-start-1 self-end justify-self-center`
      )}
      style={{
        ...labelShiftStyle,
        ...pullMargin(horizontal, true, nameClear.pull),
      }}
    >
      {labeled && name ? (
        <AnchoredStationName
          name={name}
          lines={nameLines}
          anchor={travelLabelAnchor(nameAway)}
          debug={overlay}
          gap={nameClear.gap}
          maxWidth={maxWidth}
        />
      ) : null}
    </div>
  )
  const markerNode = (
    <div
      className={cn(
        pairSlot && "min-w-0 min-h-0",
        pairSlot && horizontal && `${col} row-start-2 self-start justify-self-center`,
        pairSlot && !horizontal && `${row} col-start-2 self-start justify-self-center`
      )}
    >
      <svg width={svgW} height={svgH} aria-hidden className="overflow-visible">
        {stubs ? <Track d={strokeFor(end, travel, cx, cy, metrics.stub)} /> : null}
        {overlay ? (
          <>
            <MarkClearanceBand
              cx={cx}
              cy={cy}
              horizontal={horizontal}
              side="near"
              markHalf={markHalfName}
              svgEdge={0}
              width={markHalfName + markHalfFlag}
            />
            <MarkClearanceBand
              cx={cx}
              cy={cy}
              horizontal={horizontal}
              side="far"
              markHalf={markHalfFlag}
              svgEdge={horizontal ? svgH : svgW}
              width={markHalfName + markHalfFlag}
            />
          </>
        ) : null}
        {anchor === "ring" ? (
          <>
            <RingFill x={cx} y={cy} />
            <RingStroke x={cx} y={cy} />
          </>
        ) : (
          <TickMark x={cx} y={cy} travel={travel} end={end} />
        )}
      </svg>
    </div>
  )
  const flagNode = (
    <div
      className={cn(
        "flex w-fit leading-none",
        pairSlot && "min-w-0 min-h-0",
        pairSlot && horizontal && `${col} row-start-3 self-start justify-self-center`,
        pairSlot && !horizontal && `${row} col-start-3 self-start justify-self-center`
      )}
      style={{
        ...labelShiftStyle,
        ...pullMargin(horizontal, false, flagClear.pull),
      }}
    >
      {labeled && flags.length > 0 ? (
        <LineFlagStack
          lines={flags}
          anchor={travelLabelAnchor(flagAway)}
          debug={overlay}
          gap={flagClear.gap}
        />
      ) : null}
    </div>
  )

  if (pairSlot) {
    return (
      <>
        {nameNode}
        {markerNode}
        {flagNode}
      </>
    )
  }

  return (
    <div
      className={cn(
        "inline-flex items-center",
        horizontal ? "flex-col" : "flex-row"
      )}
    >
      {nameNode}
      {markerNode}
      {flagNode}
    </div>
  )
}

const ringColumn = (
  count: number,
  travel: Travel,
  pitch: number,
  ends: readonly EndMark[]
) => {
  const metrics = m()
  const horizontal = isHorizontal(travel)
  const stub = metrics.stub
  const span = (count - 1) * pitch
  const pad = metrics.ringRadius + 2
  const anyThrough = ends.some((end) => end === "through")
  const trailing = anyThrough ? stub : metrics.ringRadius
  const along = stub + trailing
  const cross = span + pad * 2
  const width = horizontal ? along : cross
  const height = horizontal ? cross : along
  const origin = pad
  const alongCentre =
    travel === "left" || travel === "up" ? along - stub : stub
  const centres = Array.from({ length: count }, (_, index) => {
    const offset = origin + index * pitch
    return horizontal
      ? { x: alongCentre, y: offset }
      : { x: offset, y: alongCentre }
  })
  return { width, height, centres, stub, alongCentre }
}

export function InterchangeAtom({
  count,
  ends,
  travel = "right",
  labeled = false,
  name,
  connections,
  overlay = false,
  pitch,
  maxWidth,
}: {
  count: 2 | 3
  ends: EndMark[]
  travel?: Travel
  labeled?: boolean
  name?: string
  connections?: readonly LineFlag[]
  overlay?: boolean
  /** Centre-to-centre of adjacent rings. Default leaves a gap for the bridge. */
  pitch?: number
  maxWidth?: number
}) {
  const metrics = m()
  const horizontal = isHorizontal(travel)
  const lane = pitch ?? metrics.gappedBond
  const { width, height, centres, stub, alongCentre } = ringColumn(
    count,
    travel,
    lane,
    ends
  )
  const nameAway = horizontal ? "up" : "left"
  const flagAway = horizontal ? "down" : "right"
  const first = centres[0]!
  const last = centres.at(-1)!
  const nameFromEdge = horizontal ? first.y : first.x
  const flagFromEdge = horizontal ? height - last.y : width - last.x
  const nameClear = labelClearanceLayout(nameFromEdge, metrics.ringRadius, metrics)
  const flagClear = labelClearanceLayout(flagFromEdge, metrics.ringRadius, metrics)
  const flags = connections ?? []
  const labelShift = labelShiftFromMark(alongCentre, horizontal ? width : height)
  const labelShiftStyle: CSSProperties | undefined =
    labelShift === 0
      ? undefined
      : horizontal
        ? { transform: `translateX(${labelShift}px)` }
        : { transform: `translateY(${labelShift}px)` }
  return (
    <div
      className={cn(
        "inline-flex items-center",
        horizontal ? "flex-col" : "flex-row"
      )}
    >
      {labeled && name ? (
        <div
          className="flex w-fit leading-none"
          style={{
            ...labelShiftStyle,
            ...pullMargin(horizontal, true, nameClear.pull),
          }}
        >
          <AnchoredStationName
            name={name}
            anchor={travelLabelAnchor(nameAway)}
            debug={overlay}
            gap={nameClear.gap}
            maxWidth={maxWidth}
          />
        </div>
      ) : null}
      <svg width={width} height={height} aria-hidden className="overflow-visible">
        {centres.map((point, index) => (
          <Track
            key={`t-${index}`}
            d={strokeFor(ends[index] ?? "through", travel, point.x, point.y, stub)}
          />
        ))}
        {overlay ? (
          <>
            <MarkClearanceBand
              cx={first.x}
              cy={first.y}
              horizontal={horizontal}
              side="near"
              markHalf={metrics.ringRadius}
              svgEdge={0}
              width={metrics.ringRadius * 2}
            />
            <MarkClearanceBand
              cx={last.x}
              cy={last.y}
              horizontal={horizontal}
              side="far"
              markHalf={metrics.ringRadius}
              svgEdge={horizontal ? height : width}
              width={metrics.ringRadius * 2}
            />
          </>
        ) : null}
        {centres.slice(1).map((point, index) => (
          <BondMark
            key={`b-${index}`}
            a={centres[index]!}
            b={point}
            overlay={overlay}
          />
        ))}
        {centres.map((point, index) => (
          <g key={`r-${index}`}>
            <RingFill x={point.x} y={point.y} />
            <RingStroke x={point.x} y={point.y} />
          </g>
        ))}
      </svg>
      {labeled && flags.length > 0 ? (
        <div
          className="flex w-fit leading-none"
          style={{
            ...labelShiftStyle,
            ...pullMargin(horizontal, false, flagClear.pull),
          }}
        >
          <LineFlagStack
            lines={flags}
            anchor={travelLabelAnchor(flagAway)}
            debug={overlay}
            gap={flagClear.gap}
          />
        </div>
      ) : null}
    </div>
  )
}

/**
 * Three rings at `gappedBond` from each other. The base pair faces the
 * incoming Y; the apex sits along travel so every pair of platforms is
 * a walking bond — not a stacked column that hides the third passage.
 */
export function TriangleInterchangeAtom({
  travel = "right",
  labeled = false,
  name,
  connections,
  overlay = false,
  maxWidth,
}: {
  travel?: Travel
  labeled?: boolean
  name?: string
  connections?: readonly LineFlag[]
  overlay?: boolean
  maxWidth?: number
}) {
  const metrics = m()
  const horizontal = isHorizontal(travel)
  const pad = metrics.ringRadius + 2
  const apexAlong = triangleApexAlong(metrics)
  const width = Math.round(
    horizontal ? pad * 2 + apexAlong : pad * 2 + metrics.gappedBond
  )
  const height = Math.round(
    horizontal ? pad * 2 + metrics.gappedBond : pad * 2 + apexAlong
  )
  const origin = horizontal
    ? { x: pad, y: height / 2 }
    : { x: width / 2, y: pad }
  const { a, b, apex } = triangleInterchangeCentres(origin, horizontal, metrics)
  const nameAway = horizontal ? "up" : "left"
  const flagAway = horizontal ? "down" : "right"
  const near = horizontal
    ? a.y <= b.y
      ? a
      : b
    : a.x <= b.x
      ? a
      : b
  const far = near === a ? b : a
  const nameFromEdge = horizontal ? near.y : near.x
  const flagFromEdge = horizontal ? height - far.y : width - far.x
  const nameClear = labelClearanceLayout(nameFromEdge, metrics.ringRadius, metrics)
  const flagClear = labelClearanceLayout(flagFromEdge, metrics.ringRadius, metrics)
  const flags = connections ?? []
  const labelAt = bondedGroupLabelAt([a, b, apex], nameAway)
  const markAlong = horizontal ? labelAt.x : labelAt.y
  const alongSize = horizontal ? width : height
  const flipped = travel === "left" || travel === "up"
  const visualMark = flipped ? alongSize - markAlong : markAlong
  const labelShift = labelShiftFromMark(visualMark, alongSize)
  const labelShiftStyle: CSSProperties | undefined =
    labelShift === 0
      ? undefined
      : horizontal
        ? { transform: `translateX(${labelShift}px)` }
        : { transform: `translateY(${labelShift}px)` }
  return (
    <div
      className={cn(
        "inline-flex items-center",
        horizontal ? "flex-col" : "flex-row"
      )}
    >
      {labeled && name ? (
        <div
          className="flex w-fit leading-none"
          style={{
            ...labelShiftStyle,
            ...pullMargin(horizontal, true, nameClear.pull),
          }}
        >
          <AnchoredStationName
            name={name}
            anchor={travelLabelAnchor(nameAway)}
            debug={overlay}
            gap={nameClear.gap}
            maxWidth={maxWidth}
          />
        </div>
      ) : null}
      <svg
        width={width}
        height={height}
        aria-hidden
        className="overflow-visible"
        style={travelFlip(travel)}
      >
        <BondMark a={a} b={b} overlay={overlay} />
        <BondMark a={a} b={apex} overlay={overlay} />
        <BondMark a={b} b={apex} overlay={overlay} />
        {[a, b, apex].map((point, index) => (
          <g key={index}>
            <RingFill x={point.x} y={point.y} />
            <RingStroke x={point.x} y={point.y} />
          </g>
        ))}
      </svg>
      {labeled && flags.length > 0 ? (
        <div
          className="flex w-fit leading-none"
          style={{
            ...labelShiftStyle,
            ...pullMargin(horizontal, false, flagClear.pull),
          }}
        >
          <LineFlagStack
            lines={flags}
            anchor={travelLabelAnchor(flagAway)}
            debug={overlay}
            gap={flagClear.gap}
          />
        </div>
      ) : null}
    </div>
  )
}

const axisLine = (
  horizontal: boolean,
  a0: number,
  a1: number,
  cross: number
) =>
  horizontal
    ? `M ${a0} ${cross} L ${a1} ${cross}`
    : `M ${cross} ${a0} L ${cross} ${a1}`

const stemLayout = (
  travel: Travel,
  recipe: StemRecipe,
  tipClearance?: number,
  tipPitch?: number
) => ({
  travel,
  ...layoutStem(recipe, isHorizontal(travel), m(), tipClearance, tipPitch),
})

/**
 * Path-following pink band, painted *inside* the stroke's own SVG: one
 * rotated rectangle per straight sub-run of the stroke's spine, offset by
 * the same `lineClearance - x/2` thickness the old flat band used, and
 * extended across bends so neighbouring runs meet with no seam. A
 * composite of axis-aligned and 45°-rotated rectangles only — never a
 * curve — so it hugs a 45° bend instead of boxing around it.
 */
export const ClearanceBand = ({
  spine,
  overlay,
  extend,
}: {
  spine: readonly { a: Pt; b: Pt }[]
  overlay: boolean
  /** Along-run extension at each end; 0 for a run with no bend to meet. */
  extend?: number
}) => {
  if (!overlay) return null
  const rects = strokeClearanceBand(spine, m(), extend)
  if (rects.length === 0) return null
  // One `<path>` with one subpath per rect, not one `<polygon>` each: every
  // rect is wound the same way (`laneClearanceRect`'s fixed corner order),
  // so the default nonzero fill rule unions overlapping corners at a bend
  // into a single flat fill — two adjacent rects never double up alpha.
  const d = rects
    .map((rect) => {
      const [p0, p1, p2, p3] = rect.points
      return `M ${p0.x} ${p0.y} L ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y} Z`
    })
    .join(" ")
  return <path d={d} fill={DEBUG_MARK} />
}

export function StemYAtom({
  travel = "right",
  recipe = STEM_RECIPES[1],
  overlay = false,
}: {
  travel?: Travel
  recipe?: StemRecipe
  overlay?: boolean
}) {
  const layout = stemLayout(travel, recipe)
  return (
    <svg
      width={layout.w}
      height={layout.h}
      aria-hidden
      className="overflow-visible"
      style={travelFlip(layout.travel)}
    >
      <ClearanceBand spine={layout.spine} overlay={overlay} />
      {layout.segs.map((seg, index) => (
        <Track
          key={index}
          paint={seg.paint === "excess" ? EXCESS : PAINT}
          join="miter"
          d={seg.d}
        />
      ))}
      {overlay ? (
        <GapAnnotation
          a={layout.exitA}
          b={layout.exitB}
          travel={layout.travel}
          metrics={m()}
        />
      ) : null}
    </svg>
  )
}

/** Two parallel tracks that through-run via a smooth 180° — not a Y. */
export function UBendAtom({
  travel = "right",
  overlay = false,
}: {
  travel?: Travel
  overlay?: boolean
}) {
  const metrics = m()
  const layout = layoutUBend(isHorizontal(travel), metrics)
  return (
    <svg
      width={layout.w}
      height={layout.h}
      aria-hidden
      className="overflow-visible"
      style={travelFlip(travel)}
    >
      <ClearanceBand spine={layout.spine} overlay={overlay} />
      {layout.segs.map((seg, index) => (
        <Track
          key={index}
          paint={seg.paint === "excess" ? EXCESS : PAINT}
          join="round"
          d={seg.d}
        />
      ))}
      {overlay ? (
        <GapAnnotation
          a={layout.tipA}
          b={layout.tipB}
          travel={travel}
          metrics={metrics}
        />
      ) : null}
    </svg>
  )
}

/**
 * Proves the test oracle in `diagram-atoms.test.ts` ("never joins a ring
 * where it would sit on its own bend") with a picture instead of an
 * assertion: `safe=false` squeezes a ring right onto the return bend
 * itself; `safe=true` uses the real `joinRingFromStem` distance. Both
 * variants check the same `envelopesIntersect` the tests use, so the ring
 * only turns red when the geometry actually overlaps.
 */
export function BendSafetyAtom({
  travel = "right",
  safe,
  overlay = false,
}: {
  travel?: Travel
  safe: boolean
  overlay?: boolean
}) {
  const metrics = m()
  const recipe = STEM_RECIPES[0]! // y-return — the recipe ConnectedYInterchange joins.
  const layout = stemLayout(travel, recipe, metrics.ringRadius)
  const horizontal = layout.horizontal
  const stub = metrics.stub
  const extra = throughJoinAlong(metrics) + stub
  const width = horizontal ? layout.w + extra : layout.w
  const height = horizontal ? layout.h : layout.h + extra
  const safeRing = joinRingFromStem(layout.exitA, horizontal, metrics)
  // A ring squeezed onto the return bend itself, instead of the
  // `throughJoinAlong` distance a real join leaves.
  const unsafeRing = layout.flatA?.start ?? layout.exitA
  const ring = safe ? safeRing : unsafeRing
  const ringShape: Shape = { kind: "circle", cx: ring.x, cy: ring.y, r: metrics.ringRadius }
  const onBend =
    layout.lastBendA != null &&
    envelopesIntersect(shapeEnvelope(layout.lastBendA), shapeEnvelope(ringShape))
  const ringPaint = onBend ? UNSAFE : PAINT
  const trackTravel: Travel = horizontal ? "right" : "down"
  return (
    <svg
      width={width}
      height={height}
      aria-hidden
      className="overflow-visible"
      style={travelFlip(travel)}
    >
      <ClearanceBand spine={layout.spine} overlay={overlay} />
      {layout.segs.map((seg, index) => (
        <Track
          key={index}
          paint={seg.paint === "excess" ? EXCESS : PAINT}
          join="miter"
          d={seg.d}
        />
      ))}
      <Track d={strokeFor("through", trackTravel, ring.x, ring.y, stub)} />
      <RingFill x={ring.x} y={ring.y} />
      <RingStroke x={ring.x} y={ring.y} paint={ringPaint} />
      {onBend && layout.lastBendA ? (
        <BendEnvelopeOutline envelope={shapeEnvelope(layout.lastBendA)} />
      ) : null}
    </svg>
  )
}

/** Cancels `travelFlip`'s mirroring for text so a callout label stays upright. */
const counterFlip = (travel: Travel): string | undefined => {
  if (travel === "left") return "scale(-1,1)"
  if (travel === "up") return "scale(1,-1)"
  return undefined
}

/**
 * Ruler + numeric callout for `stemExitGap`, expressed in the same `x`
 * units `minimumBranchGap` is defined in — the plan's "dimension
 * annotation between diverged tips" for Peel/Y fork cards. Turns
 * destructive the moment the two arms would sit closer than one line
 * width apart, edge to edge.
 */
const GapAnnotation = ({
  a,
  b,
  travel,
  metrics,
}: {
  a: Pt
  b: Pt
  travel: Travel
  metrics: DiagramAtomMetrics
}) => {
  const gap = stemExitGap(a, b, metrics)
  const minimum = minimumBranchGap(metrics)
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const nx = -uy
  const ny = ux
  const tick = metrics.x / 2
  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
  const labelPos = { x: mid.x + nx * 10, y: mid.y + ny * 10 }
  const color = gap >= minimum ? "var(--muted-foreground)" : UNSAFE
  const flip = counterFlip(travel)
  const upright = flip
    ? `translate(${labelPos.x} ${labelPos.y}) ${flip} translate(${-labelPos.x} ${-labelPos.y})`
    : undefined
  return (
    <g stroke={color} fill="none">
      <line
        x1={a.x}
        y1={a.y}
        x2={b.x}
        y2={b.y}
        strokeDasharray="3 3"
        strokeWidth={1}
      />
      <line
        x1={a.x - nx * tick}
        y1={a.y - ny * tick}
        x2={a.x + nx * tick}
        y2={a.y + ny * tick}
        strokeWidth={1}
      />
      <line
        x1={b.x - nx * tick}
        y1={b.y - ny * tick}
        x2={b.x + nx * tick}
        y2={b.y + ny * tick}
        strokeWidth={1}
      />
      <g transform={upright}>
        <text
          x={labelPos.x}
          y={labelPos.y}
          fill={color}
          stroke="none"
          fontSize={10}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {(gap / metrics.x).toFixed(1)}x
        </text>
      </g>
    </g>
  )
}

/** Dashed outline of a bend's own envelope — the zone a mark must clear. */
const BendEnvelopeOutline = ({ envelope }: { envelope: Envelope }) => (
  <rect
    x={envelope.minX}
    y={envelope.minY}
    width={envelope.maxX - envelope.minX}
    height={envelope.maxY - envelope.minY}
    fill="none"
    stroke={UNSAFE}
    strokeDasharray="4 3"
    strokeWidth={1.5}
  />
)

/**
 * `BendSafetyAtom`'s decision proved again, but for the arc-based S-curve
 * `octilinearLanePath` draws — the renderer `drawing-layout.ts` and
 * `composition.tsx` actually call, at their own grid scale (`MAIN_PITCH`
 * 72 / `LANE_PITCH` 48) rather than a fixed demo-card size. There are no
 * cubic control points here, so the safety check is
 * `octilinearBendClearsMark`/`octilinearBendEnvelope` instead of
 * `envelopesIntersect` against `layout.lastBendA` directly — this card is
 * the proof that generalisation holds before either file is wired to it.
 */
export function ArcForkAtom({
  safe,
  overlay = false,
}: {
  safe: boolean
  overlay?: boolean
}) {
  const metrics = m()
  const pitch = 48 // drawing-layout.ts's LANE_PITCH
  const mainRun = 72 // drawing-layout.ts's MAIN_PITCH
  const radius = safeForkRadius(tflBendRadius(metrics), metrics, mainRun / 2)
  const pad = metrics.ringRadius + 8
  const start = { x: pad, y: pitch / 2 + pad }
  const upperBend = { x: start.x + mainRun, y: start.y - pitch / 2 }
  const lowerBend = { x: start.x + mainRun, y: start.y + pitch / 2 }
  // "Safe" continues straight past the bend by a real join distance
  // before landing a ring, exactly like `throughJoinAlong` does for the
  // cubic recipes; "unsafe" lands the ring right where the arc ends.
  const stub = metrics.stub
  const ring = safe ? { x: upperBend.x + stub, y: upperBend.y } : upperBend
  const clears = octilinearBendClearsMark(
    start,
    upperBend,
    radius,
    ring,
    metrics.ringRadius,
    metrics
  )
  const ringPaint = clears ? PAINT : UNSAFE
  const width = Math.max(ring.x, lowerBend.x) + pad
  const height = lowerBend.y + pad
  const gap = laneEdgeGap(pitch, metrics)
  return (
    <svg width={width} height={height} aria-hidden className="overflow-visible">
      <Track d={octilinearLanePath(start.x, start.y, upperBend.x, upperBend.y, radius, "x", "start")} />
      <Track d={octilinearLanePath(start.x, start.y, lowerBend.x, lowerBend.y, radius, "x", "start")} />
      {safe ? (
        <Track d={`M ${upperBend.x} ${upperBend.y} L ${ring.x} ${ring.y}`} />
      ) : null}
      <RingFill x={ring.x} y={ring.y} />
      <RingStroke x={ring.x} y={ring.y} paint={ringPaint} />
      {overlay ? (
        <>
          <GapAnnotation a={upperBend} b={lowerBend} travel="right" metrics={metrics} />
          {!clears ? (
            <BendEnvelopeOutline
              envelope={octilinearBendEnvelope(start, upperBend, radius, metrics)}
            />
          ) : null}
          <text
            x={width / 2}
            y={height - 4}
            fill="var(--muted-foreground)"
            fontSize={10}
            textAnchor="middle"
          >
            lane gap {(gap / metrics.x).toFixed(1)}x, radius {radius}
          </text>
        </>
      ) : null}
    </svg>
  )
}

export function ConnectedYInterchange({
  travel = "right",
  labeled = false,
  overlay = false,
  name,
  connections,
  maxWidth,
}: {
  travel?: Travel
  labeled?: boolean
  overlay?: boolean
  name?: string
  connections?: readonly LineFlag[]
  maxWidth?: number
}) {
  const metrics = m()
  const recipe = STEM_RECIPES[0]!
  // The stem's own box must have room for the ring that lands at each exit,
  // not just a plain stroke — otherwise the ring pokes past the SVG's own
  // declared edge and visually overlaps the clearance meant to sit above it.
  const layout = stemLayout(travel, recipe, metrics.ringRadius)
  const stub = metrics.stub
  const horizontal = layout.horizontal
  const join = throughJoinAlong(metrics)
  const ringA = joinRingFromStem(layout.exitA, horizontal, metrics)
  const ringB = joinRingFromStem(layout.exitB, horizontal, metrics)
  const extra = join + stub
  const width = horizontal ? layout.w + extra : layout.w
  const height = horizontal ? layout.h : layout.h + extra
  const nameAway = horizontal ? "up" : "left"
  const flagAway = horizontal ? "down" : "right"
  const flipped = travel === "left" || travel === "up"
  const markAlong = horizontal ? ringA.x : ringA.y
  const alongSize = horizontal ? width : height
  const visualMark = flipped ? alongSize - markAlong : markAlong
  const labelShift = labelShiftFromMark(visualMark, alongSize)
  const labelShiftStyle: CSSProperties | undefined =
    labelShift === 0
      ? undefined
      : horizontal
        ? { transform: `translateX(${labelShift}px)` }
        : { transform: `translateY(${labelShift}px)` }
  const nearIsA = horizontal ? ringA.y <= ringB.y : ringA.x <= ringB.x
  const nearRing = nearIsA ? ringA : ringB
  const farRing = nearIsA ? ringB : ringA
  const nameFromEdge = horizontal
    ? Math.min(ringA.y, ringB.y)
    : Math.min(ringA.x, ringB.x)
  const flagFromEdge = horizontal
    ? height - Math.max(ringA.y, ringB.y)
    : width - Math.max(ringA.x, ringB.x)
  const nameClear = labelClearanceLayout(nameFromEdge, metrics.ringRadius, metrics)
  const flagClear = labelClearanceLayout(flagFromEdge, metrics.ringRadius, metrics)
  const flags = connections ?? []
  const trackTravel: Travel = horizontal ? "right" : "down"
  return (
    <div
      className={cn(
        "inline-flex items-center",
        horizontal ? "flex-col" : "flex-row"
      )}
    >
      {labeled && name ? (
        <div
          className="flex w-fit leading-none"
          style={{
            ...labelShiftStyle,
            ...pullMargin(horizontal, true, nameClear.pull),
          }}
        >
          <AnchoredStationName
            name={name}
            anchor={travelLabelAnchor(nameAway)}
            debug={overlay}
            gap={nameClear.gap}
            maxWidth={maxWidth}
          />
        </div>
      ) : null}
      <svg
        width={width}
        height={height}
        aria-hidden
        className="overflow-visible"
        style={travelFlip(travel)}
      >
        <MoleculeAssembler
          as="g"
          width={width}
          height={height}
          overlay={overlay}
          tracks={[
            ...layout.segs.map((seg, index) => ({
              id: `arm-${index}`,
              d: seg.d,
              spine: index === 0 ? layout.spine : undefined,
              paint: seg.paint === "excess" ? EXCESS : PAINT,
              join: "miter" as const,
            })),
            {
              id: "through-a",
              d: strokeFor("through", trackTravel, ringA.x, ringA.y, stub),
            },
            {
              id: "through-b",
              d: strokeFor("through", trackTravel, ringB.x, ringB.y, stub),
            },
          ]}
          bonds={[{ id: "bond", a: ringA, b: ringB }]}
          marks={[
            {
              id: "ring-near",
              x: nearRing.x,
              y: nearRing.y,
              anchor: "ring",
              travel: trackTravel,
              end: "through",
              labelAway: nameAway,
            },
            {
              id: "ring-far",
              x: farRing.x,
              y: farRing.y,
              anchor: "ring",
              travel: trackTravel,
              end: "through",
              labelAway: flagAway,
            },
          ]}
        />
      </svg>
      {labeled && flags.length > 0 ? (
        <div
          className="flex w-fit leading-none"
          style={{
            ...labelShiftStyle,
            ...pullMargin(horizontal, false, flagClear.pull),
          }}
        >
          <LineFlagStack
            lines={flags}
            anchor={travelLabelAnchor(flagAway)}
            debug={overlay}
            gap={flagClear.gap}
          />
        </div>
      ) : null}
    </div>
  )
}

/**
 * The every-pair passage: incoming Y onto a triangular interchange, then
 * a U-bend so the two branch termini still through-run. Vertex's triangle
 * scene is this molecule on a permission matrix.
 */
export function ConnectedTriangleU({
  travel = "right",
  labeled = false,
  overlay = false,
  name,
  connections,
  maxWidth,
}: {
  travel?: Travel
  labeled?: boolean
  overlay?: boolean
  name?: string
  connections?: readonly LineFlag[]
  maxWidth?: number
}) {
  const metrics = m()
  const recipe = STEM_RECIPES[0]!
  const layout = stemLayout(
    travel,
    recipe,
    metrics.ringRadius,
    uBendPitch(metrics)
  )
  const stub = metrics.stub
  const horizontal = layout.horizontal
  const ringA = joinRingFromStem(layout.exitA, horizontal, metrics)
  const ringB = joinRingFromStem(layout.exitB, horizontal, metrics)
  const toward = horizontal
    ? { x: ringA.x + 100, y: ringA.y }
    : { x: ringA.x, y: ringA.y + 100 }
  const apex = triangleApexFromBase(ringA, ringB, toward)
  const joinAlong =
    (horizontal ? apex.x : apex.y) + metrics.ringRadius + metrics.x
  const joinA = horizontal
    ? { x: joinAlong, y: ringA.y }
    : { x: ringA.x, y: joinAlong }
  const joinB = horizontal
    ? { x: joinAlong, y: ringB.y }
    : { x: ringB.x, y: joinAlong }
  const u = uBendBetween(joinA, joinB, toward)
  const tipAlong = (horizontal ? u.nose.x : u.nose.y) + stub
  const tipA = horizontal
    ? { x: tipAlong, y: ringA.y }
    : { x: ringA.x, y: tipAlong }
  const tipB = horizontal
    ? { x: tipAlong, y: ringB.y }
    : { x: ringB.x, y: tipAlong }
  const width = horizontal
    ? Math.max(layout.w, u.nose.x, tipA.x) + stub
    : Math.max(layout.w, u.nose.x + metrics.ringRadius + 2)
  const height = horizontal
    ? Math.max(layout.h, u.nose.y + metrics.ringRadius + 2)
    : Math.max(layout.h, u.nose.y, tipA.y) + stub
  const nameAway = horizontal ? "up" : "left"
  const flagAway = horizontal ? "down" : "right"
  const flipped = travel === "left" || travel === "up"
  const labelAt = bondedGroupLabelAt([ringA, ringB, apex], nameAway)
  const markAlong = horizontal ? labelAt.x : labelAt.y
  const alongSize = horizontal ? width : height
  const visualMark = flipped ? alongSize - markAlong : markAlong
  const labelShift = labelShiftFromMark(visualMark, alongSize)
  const labelShiftStyle: CSSProperties | undefined =
    labelShift === 0
      ? undefined
      : horizontal
        ? { transform: `translateX(${labelShift}px)` }
        : { transform: `translateY(${labelShift}px)` }
  const nearIsA = horizontal ? ringA.y <= ringB.y : ringA.x <= ringB.x
  const nearRing = nearIsA ? ringA : ringB
  const farRing = nearIsA ? ringB : ringA
  const nameFromEdge = horizontal
    ? Math.min(ringA.y, ringB.y)
    : Math.min(ringA.x, ringB.x)
  const flagFromEdge = horizontal
    ? height - Math.max(ringA.y, ringB.y)
    : width - Math.max(ringA.x, ringB.x)
  const nameClear = labelClearanceLayout(nameFromEdge, metrics.ringRadius, metrics)
  const flagClear = labelClearanceLayout(flagFromEdge, metrics.ringRadius, metrics)
  const flags = connections ?? []
  const trackTravel: Travel = horizontal ? "right" : "down"
  return (
    <div
      className={cn(
        "inline-flex items-center",
        horizontal ? "flex-col" : "flex-row"
      )}
    >
      {labeled && name ? (
        <div
          className="flex w-fit leading-none"
          style={{
            ...labelShiftStyle,
            ...pullMargin(horizontal, true, nameClear.pull),
          }}
        >
          <AnchoredStationName
            name={name}
            anchor={travelLabelAnchor(nameAway)}
            debug={overlay}
            gap={nameClear.gap}
            maxWidth={maxWidth}
          />
        </div>
      ) : null}
      <svg
        width={width}
        height={height}
        aria-hidden
        className="overflow-visible"
        style={travelFlip(travel)}
      >
        <MoleculeAssembler
          as="g"
          width={width}
          height={height}
          overlay={overlay}
          tracks={[
            ...layout.segs.map((seg, index) => ({
              id: `arm-${index}`,
              d: seg.d,
              spine: index === 0 ? layout.spine : undefined,
              paint: seg.paint === "excess" ? EXCESS : PAINT,
              join: "miter" as const,
            })),
            {
              id: "through-a",
              d: strokeFor("through", trackTravel, ringA.x, ringA.y, stub),
            },
            {
              id: "through-b",
              d: strokeFor("through", trackTravel, ringB.x, ringB.y, stub),
            },
            {
              id: "run-a",
              d: axisLine(
                horizontal,
                horizontal ? ringA.x : ringA.y,
                horizontal ? tipA.x : tipA.y,
                horizontal ? ringA.y : ringA.x
              ),
            },
            {
              id: "run-b",
              d: axisLine(
                horizontal,
                horizontal ? ringB.x : ringB.y,
                horizontal ? tipB.x : tipB.y,
                horizontal ? ringB.y : ringB.x
              ),
            },
            {
              id: "out-a",
              d: strokeFor("terminus", trackTravel, tipA.x, tipA.y, stub),
            },
            {
              id: "out-b",
              d: strokeFor("terminus", trackTravel, tipB.x, tipB.y, stub),
            },
            {
              id: "u-bend",
              d: u.d,
              join: "round" as const,
            },
          ]}
          bonds={[
            { id: "base", a: ringA, b: ringB },
            { id: "apex-a", a: ringA, b: apex },
            { id: "apex-b", a: ringB, b: apex },
          ]}
          marks={[
            {
              id: "ring-near",
              x: nearRing.x,
              y: nearRing.y,
              anchor: "ring",
              travel: trackTravel,
              end: "through",
              labelAway: nameAway,
            },
            {
              id: "ring-far",
              x: farRing.x,
              y: farRing.y,
              anchor: "ring",
              travel: trackTravel,
              end: "through",
              labelAway: flagAway,
            },
            {
              id: "ring-apex",
              x: apex.x,
              y: apex.y,
              anchor: "ring",
              travel: trackTravel,
              end: "through",
            },
            {
              id: "tick-a",
              x: tipA.x,
              y: tipA.y,
              anchor: "tick",
              travel: trackTravel,
              end: "terminus",
            },
            {
              id: "tick-b",
              x: tipB.x,
              y: tipB.y,
              anchor: "tick",
              travel: trackTravel,
              end: "terminus",
            },
          ]}
        />
      </svg>
      {labeled && flags.length > 0 ? (
        <div
          className="flex w-fit leading-none"
          style={{
            ...labelShiftStyle,
            ...pullMargin(horizontal, false, flagClear.pull),
          }}
        >
          <LineFlagStack
            lines={flags}
            anchor={travelLabelAnchor(flagAway)}
            debug={overlay}
            gap={flagClear.gap}
          />
        </div>
      ) : null}
    </div>
  )
}

export function SegmentAtom({
  travel = "right",
  total,
  overlay = false,
}: {
  travel?: Travel
  /** Centre-to-centre length. Isolated atoms use min + hint excess. */
  total?: number
  overlay?: boolean
}) {
  const metrics = m()
  const horizontal = isHorizontal(travel)
  const length = total ?? metrics.minSegment + metrics.excessHint * 2
  const { core, excessEach } = paintSegmentParts(length)
  const mid = metrics.x / 2
  const width = horizontal ? length : metrics.x
  const height = horizontal ? metrics.x : length
  const a1 = excessEach
  const a2 = excessEach + core
  const join = 1
  const spine: { a: Pt; b: Pt }[] = [
    horizontal
      ? { a: { x: 0, y: mid }, b: { x: length, y: mid } }
      : { a: { x: mid, y: 0 }, b: { x: mid, y: length } },
  ]
  const tracks: MoleculeTrack[] = [
    ...(excessEach > 0
      ? [
          {
            id: "lead",
            d: axisLine(horizontal, 0, a1 + join, mid),
            paint: EXCESS,
          },
        ]
      : []),
    { id: "core", d: axisLine(horizontal, a1, a2, mid), spine },
    ...(excessEach > 0
      ? [
          {
            id: "tail",
            d: axisLine(horizontal, a2 - join, length, mid),
            paint: EXCESS,
          },
        ]
      : []),
  ]
  return (
    <MoleculeAssembler
      width={width}
      height={height}
      tracks={tracks}
      overlay={overlay}
      extend={0}
    />
  )
}

type PairStation = {
  anchor: Anchor
  end: EndMark
  name?: string
  nameLines?: readonly string[]
  connections?: readonly LineFlag[]
}

/**
 * Two stations sharing one connecting segment. The middle grid lane is
 * fixed to the paired marker lane (`markerLane("ring", true) * 2`) and the
 * segment renders directly inside it — centred by the grid cell itself, the
 * same analytic model as the marks either side. No DOM measurement: a
 * second, independently-rounded source of truth is exactly what let the
 * segment drift a pixel from the marks it connects.
 */
export function ConnectedPair({
  left,
  right,
  travel = "right",
  labeled,
  overlay = false,
}: {
  left: PairStation
  right: PairStation
  travel?: Travel
  labeled: boolean
  overlay?: boolean
}) {
  const metrics = m()
  const horizontal = isHorizontal(travel)
  const lane = markerLane("ring", true) * 2
  const boxAlong = labeled ? diagramLabelBoxAlong(metrics) : 0
  const leftSvg = stationSvgAlong(left.anchor, left.end, metrics)
  const rightSvg = stationSvgAlong(right.anchor, right.end, metrics)
  const gap = connectingStrokeLength(
    stationAlongHalf(markerAlongHalf(left.anchor, metrics), boxAlong),
    stationAlongHalf(markerAlongHalf(right.anchor, metrics), boxAlong),
    stationInwardAlong(left.anchor, left.end, metrics),
    stationInwardAlong(right.anchor, right.end, metrics),
    metrics
  )

  return (
    <div
      className={cn(
        "inline-grid justify-items-center overflow-visible",
        "grid-cols-[auto_auto_auto] grid-rows-[auto_auto_auto]"
      )}
      style={
        horizontal
          ? {
              gridTemplateColumns: `minmax(0, ${leftSvg}px) ${gap}px minmax(0, ${rightSvg}px)`,
              gridTemplateRows: `auto ${lane}px auto`,
            }
          : {
              gridTemplateColumns: `auto ${lane}px auto`,
              gridTemplateRows: `minmax(0, ${leftSvg}px) ${gap}px minmax(0, ${rightSvg}px)`,
            }
      }
    >
      <StationAtom
        {...left}
        travel={travel}
        labeled={labeled}
        overlay={overlay}
        stubs
        pairSlot="start"
      />
      <div className="col-start-2 row-start-2 flex h-full w-full min-w-0 min-h-0 items-center justify-center">
        <SegmentAtom travel={travel} total={gap} overlay={overlay} />
      </div>
      <StationAtom
        {...right}
        travel={travel}
        labeled={labeled}
        overlay={overlay}
        stubs
        pairSlot="end"
      />
    </div>
  )
}

export type MoleculeTrack = {
  id: string
  d: string
  spine?: readonly { a: Pt; b: Pt }[]
  /** Dims a track that isn't part of the currently previewed move. */
  opacity?: number
  /** `EXCESS` for a growable leftover run, default `PAINT` (foreground). */
  paint?: string
  join?: "round" | "miter"
  cap?: "butt" | "round"
}

export type MoleculeBond = { id: string; a: Pt; b: Pt }

export type MoleculeMark = {
  id: string
  x: number
  y: number
  anchor: Anchor
  /** Heading of the stroke through this mark. Only `isHorizontal` is
   * read (tick orientation, which axis is "cross"); left vs right and up
   * vs down make no difference to the mark itself. */
  travel: Travel
  end: EndMark
  /** Side the label sits on. Omit for a mark with no label (its own
   * clearance band is then skipped, same as `overlay` off). "up"/"left"
   * are the canvas's near (0) edge; "down"/"right" are its far edge —
   * `markClearanceRect`'s own near/far convention, generalised from one
   * mark's local SVG to one shared canvas. */
  labelAway?: "up" | "down" | "left" | "right"
  /** False for a virtual entry that only reserves a clearance band —
   * e.g. one shared label anchor for a bonded column of rings that are
   * each already painted by their own `MoleculeMark`. Default true. */
  paint?: boolean
}

/**
 * The one node+edge renderer every drawing on this page — fixed demo card
 * or matrix-driven `vertex-scenarios` layout alike — paints through.
 * Built only from the primitives above (`Track`, `TickMark`,
 * `RingFill`/`RingStroke`, `BondMark`, `MarkClearanceBand`,
 * `ClearanceBand`): there is no separate Tick/Ring/Bond/margin here, so a
 * fix to one of those primitives reaches every consumer at once.
 *
 * `vertex-scenarios` reads a permission matrix, lays the result onto a
 * grid (`layoutDrawing`), and hands the laid-out nodes/edges straight to
 * this component — it does not repaint its own copy of any mark. Labels
 * are not a structured prop: they stay caller-supplied `children`, each
 * its own `<foreignObject>`, because a shared canvas with dozens of
 * independently positioned marks cannot let every label auto-measure
 * itself via the DOM without a server/client hydration mismatch. A
 * many-node caller (vertex's own `StationLabel`) measures
 * deterministically and renders its own foreignObject; a few-node demo
 * card can render `AnchoredStationName` the same way — either way the
 * label paints on top of every mark here, never underneath.
 */
export function MoleculeAssembler({
  width,
  height,
  tracks,
  bonds = [],
  marks = [],
  overlay = false,
  ariaLabel,
  as = "svg",
  extend,
  children,
}: {
  /** The drawing's own full canvas extent — used as the far `svgEdge`
   * clamp for every mark's clearance band, whether this renders its own
   * `<svg>` or sits as a `<g>` inside a caller's already-padded one. */
  width: number
  height: number
  tracks: readonly MoleculeTrack[]
  bonds?: readonly MoleculeBond[]
  marks?: readonly MoleculeMark[]
  overlay?: boolean
  /** A drawing's own title. Omit for a demo card whose caption already
   * names it — the svg then stays `aria-hidden`, matching every other
   * atom card on this page. Ignored when `as="g"`. */
  ariaLabel?: string
  /** "g" for a caller that already owns the outer `<svg>` (e.g. one
   * padded past every label's own extent, which this component has no
   * way to measure) and just wants tracks/marks/bonds positioned inside
   * its own coordinate space. Default "svg". */
  as?: "svg" | "g"
  /** `ClearanceBand`'s own along-run extension at each spine end. Default
   * (omitted) is `strokeClearanceBand`'s own bend-radius default — right
   * for a multi-run spine whose runs must meet edge-to-edge at a bend.
   * Pass `0` for a single isolated run with no neighbouring bend to meet
   * (e.g. one bare connecting segment), so the band never overshoots the
   * run's own ends. */
  extend?: number
  /** Labels and any other per-drawing overlay, painted after every mark. */
  children?: ReactNode
}) {
  const metrics = m()
  const content = (
    <>
      <ClearanceBand
        spine={tracks.flatMap((track) => track.spine ?? [])}
        overlay={overlay}
        extend={extend}
      />
      {tracks.map((track) => (
        <g key={track.id} opacity={track.opacity ?? 1}>
          <Track
            d={track.d}
            paint={track.paint ?? PAINT}
            join={track.join}
            cap={track.cap}
          />
        </g>
      ))}
      {bonds.map((bond) => (
        <BondMark key={bond.id} a={bond.a} b={bond.b} overlay={overlay} />
      ))}
      {marks.map((mark) => {
        const horizontal = isHorizontal(mark.travel)
        const markHalf = markHalfForSide(mark.anchor, mark.end, "name", metrics)
        const side: "near" | "far" =
          mark.labelAway === "up" || mark.labelAway === "left" ? "near" : "far"
        const svgEdge = side === "near" ? 0 : horizontal ? height : width
        return (
          <g key={mark.id}>
            {overlay && mark.labelAway ? (
              <MarkClearanceBand
                cx={mark.x}
                cy={mark.y}
                horizontal={horizontal}
                side={side}
                markHalf={markHalf}
                svgEdge={svgEdge}
                width={markHalf * 2}
              />
            ) : null}
            {mark.paint === false ? null : mark.anchor === "ring" ? (
              <>
                <RingFill x={mark.x} y={mark.y} />
                <RingStroke x={mark.x} y={mark.y} />
              </>
            ) : (
              <TickMark x={mark.x} y={mark.y} travel={mark.travel} end={mark.end} />
            )}
          </g>
        )
      })}
      {children}
    </>
  )
  if (as === "g") return <g>{content}</g>
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role={ariaLabel ? "img" : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      className="max-w-none overflow-visible"
    >
      {content}
    </svg>
  )
}

export const AtomCard = ({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) => (
  <figure className="min-w-0 space-y-2 rounded-lg border border-border p-3">
    <figcaption className="text-xs text-muted-foreground">{title}</figcaption>
    <div className="flex min-h-28 items-center justify-center overflow-visible p-2">
      {children}
    </div>
  </figure>
)
