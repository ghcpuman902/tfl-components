import {
  DIAGRAM_BASELINE,
  LINE_DIAGRAM,
  belowLineClearance,
  flagBoxFontSize,
  flagBoxHeight,
  horizontalStationFontSize,
  interchangeOuterRadius,
  interchangeStroke,
  scale,
  stationCapHeight,
} from "@/lib/tfl/line-diagram"
import type { StationNameLineAnchor } from "@/lib/tfl/diagram-station"

/**
 * Geometry for line-diagram atoms (marks, labels, Y stems, interchange bonds).
 *
 * Invariants the drafts rely on — keep these in the tests:
 * - Names sit `lineClearance` from the *stroke centre*, not the tick/ring rim.
 * - A connected tick+circle pair shares one integer marker lane.
 * - Labels sit on the mark (ring column), not the SVG box.
 * - A return Y is fully horizontal before a through-stroke may start;
 *   the through-stroke overlaps that flat by `STROKE_JOIN` only.
 * - Interchange rings use `gappedBond` so the bridge shows in the gap.
 * - A bonded triangle is equilateral at its pitch; the far vertex sits
 *   `triangleApexAlong` past the base pair, not in the same column.
 *   A U-hosting triangle grows to `uBendPitch` so the 180° still reads.
 * - A U-bend is one 180° circular arc joining two parallel tracks — a
 *   through-run that cannot be a straight line. It is not a Y: two
 *   returns meeting at a nose is another fork (or two termini). The
 *   parallels sit at least `uBendPitch` apart (`minimumUBendRadius` each
 *   side) so the bowl is not a halo around a ring.
 */
export const ATOM_X = DIAGRAM_BASELINE.horizontal

export type DiagramAtomMetrics = {
  x: number
  tickAlong: number
  tickAcross: number
  ringRadius: number
  ringStroke: number
  bondCentre: number
  nameSize: number
  /**
   * Default name-box cap. Long enough for one unbreakable token
   * (Bermondsey, Kensington); short enough that South Kensington wraps.
   */
  labelMaxWidth: number
  /** Line centre → near edge of a name or flag box. */
  lineClearance: number
  flagHeight: number
  flagFont: number
  flagMinWidth: number
  minSegment: number
  safeGap: number
  boxPadX: number
  boxPadFar: number
  stub: number
  /** Hint of growable excess shown on an isolated segment or Y arm. */
  excessHint: number
  /**
   * Centre-to-centre so outer rings do not overlap: the bridge sits in the
   * gap and the circles paint on top of its ends.
   */
  gappedBond: number
}

export const diagramAtomMetrics = (): DiagramAtomMetrics => {
  const x = ATOM_X
  const nameSize = horizontalStationFontSize(x)
  const cap = stationCapHeight(nameSize)
  return {
    x,
    tickAlong: scale(x, LINE_DIAGRAM.stationTick),
    tickAcross: x + scale(x, LINE_DIAGRAM.stationTick) * 2,
    ringRadius: interchangeOuterRadius(x),
    ringStroke: interchangeStroke(x),
    bondCentre: scale(x, 2.5),
    nameSize,
    labelMaxWidth: nameSize * 7,
    lineClearance: x / 2 + belowLineClearance(x),
    flagHeight: flagBoxHeight(cap),
    flagFont: flagBoxFontSize(cap),
    flagMinWidth: Math.max(8, cap * 4),
    minSegment: scale(x, 4),
    safeGap: scale(x, 1),
    boxPadX: scale(x, 0.6),
    boxPadFar: scale(x, 0.4),
    stub: scale(x, 3),
    excessHint: scale(x, 1.6),
    gappedBond: interchangeOuterRadius(x) * 2 + scale(x, 0.8),
  }
}

export const markerAlongHalf = (
  anchor: "tick" | "ring",
  metrics: DiagramAtomMetrics = diagramAtomMetrics()
): number =>
  anchor === "ring" ? metrics.ringRadius : metrics.tickAlong / 2

export const markerCrossHalf = (
  anchor: "tick" | "ring",
  metrics: DiagramAtomMetrics = diagramAtomMetrics()
): number =>
  anchor === "ring" ? metrics.ringRadius : metrics.tickAcross / 2

export type MarkEnd = "terminus" | "through"

/**
 * Cross-axis half-extents of a station tick, one per side of the stroke
 * centre. A terminus tick is symmetric (§5 full crossbar, both sides =
 * tickAcross/2). A through tick only protrudes on the side that faces the
 * station name — the far side sits flush with the route line (x/2).
 */
export const tickCrossHalves = (
  end: MarkEnd,
  metrics: DiagramAtomMetrics = diagramAtomMetrics()
): { name: number; flag: number } => ({
  name: metrics.tickAcross / 2,
  flag: end === "through" ? metrics.x / 2 : metrics.tickAcross / 2,
})

/**
 * Cross-axis half-extent of a mark (tick or ring) on the side facing a
 * name or flag label box. Rings are circular (isotropic, same both sides);
 * ticks are rectangular and can be asymmetric for a through station.
 * Feed this into `labelClearanceGap` (line-clearance side) AND `markInset`
 * (SVG-buffer side) so the larger requirement wins per side.
 */
export const markHalfForSide = (
  anchor: "tick" | "ring",
  end: MarkEnd,
  side: "name" | "flag",
  metrics: DiagramAtomMetrics = diagramAtomMetrics()
): number => {
  if (anchor === "ring") return metrics.ringRadius
  return tickCrossHalves(end, metrics)[side]
}

/** Half-extent of a station along the travel axis. */
export const stationAlongHalf = (
  markerHalf: number,
  boxAlong: number
): number => Math.max(markerHalf, boxAlong / 2)

/** Name box along the travel axis, including side padding. */
export const diagramLabelBoxAlong = (
  metrics: DiagramAtomMetrics = diagramAtomMetrics()
): number => metrics.labelMaxWidth + metrics.boxPadX * 2

/** Along-axis size of a station SVG (stubs + mark). */
export const stationSvgAlong = (
  anchor: "tick" | "ring",
  end: MarkEnd,
  metrics: DiagramAtomMetrics = diagramAtomMetrics()
): number =>
  end === "through"
    ? metrics.stub * 2
    : Math.round(metrics.stub + markerAlongHalf(anchor, metrics))

/** Inward stub from the mark to the SVG edge that faces a neighbour. */
export const stationInwardAlong = (
  anchor: "tick" | "ring",
  end: MarkEnd,
  metrics: DiagramAtomMetrics = diagramAtomMetrics()
): number =>
  end === "through"
    ? metrics.stub
    : markerAlongHalf(anchor, metrics)

/** Centre-to-centre stroke between two stations. */
export const grownSegmentLength = (
  leftHalf: number,
  rightHalf: number,
  metrics: DiagramAtomMetrics = diagramAtomMetrics()
): number =>
  Math.max(metrics.minSegment, leftHalf + metrics.safeGap + rightHalf)

/**
 * How wide a name centred on its own mark may be before it must wrap
 * (or the stroke must grow). It may use its half of the run to a
 * neighbour, minus that neighbour's mark and half a safe gap — it must
 * not occupy the neighbour's half of the segment. Never move the name
 * off the mark.
 */
export const labelWidthBesideNeighbor = (
  centreToCentre: number,
  neighborHalf: number,
  metrics: DiagramAtomMetrics = diagramAtomMetrics()
): number => {
  const usable =
    centreToCentre / 2 - neighborHalf - metrics.safeGap / 2
  return Math.max(1, Math.min(metrics.labelMaxWidth, Math.floor(usable * 2)))
}

/**
 * Stroke between two station SVG boxes. `grownSegmentLength` is
 * centre-to-centre; the inward stubs already cover mark → box edge, so
 * this leftover is what the connecting atom actually paints. Growing the
 * middle (not the station columns) is how excess meets both marks.
 */
export const connectingStrokeLength = (
  leftHalf: number,
  rightHalf: number,
  leftInward: number,
  rightInward: number,
  metrics: DiagramAtomMetrics = diagramAtomMetrics()
): number =>
  Math.max(
    metrics.minSegment,
    grownSegmentLength(leftHalf, rightHalf, metrics) - leftInward - rightInward
  )

/** Shift a label so it sits on the mark, not the SVG box, when stubs are asymmetric. */
export const labelShiftFromMark = (markAlong: number, alongSize: number): number =>
  markAlong - alongSize / 2

/**
 * Where a bonded group's name sits: on the away-side extreme of the
 * marks (so it clears every ring) and at the bounding-box centre on the
 * other axis (so a triangle is named above its middle, not the base
 * column the mean of two stacked rings would pull toward).
 */
export const bondedGroupLabelAt = (
  members: readonly Pt[],
  away: "up" | "down" | "left" | "right"
): Pt => {
  const xs = members.map((member) => member.x)
  const ys = members.map((member) => member.y)
  const midX = (Math.min(...xs) + Math.max(...xs)) / 2
  const midY = (Math.min(...ys) + Math.max(...ys)) / 2
  if (away === "up") return { x: midX, y: Math.min(...ys) }
  if (away === "down") return { x: midX, y: Math.max(...ys) }
  if (away === "left") return { x: Math.min(...xs), y: midY }
  return { x: Math.max(...xs), y: midY }
}

/**
 * Spacer from the SVG edge to a name/flag box so the box sits
 * `lineClearance` from the stroke centre — same for a tick or a ring.
 *
 * Pass the SVG-edge distance (`fromEdge`), not the mark half-extent: a
 * shared pair lane is taller than a tick, and the spacer must shrink so
 * tick and ring labels still share one baseline.
 */
export const labelClearanceGap = (
  strokeFromEdge: number,
  metrics: DiagramAtomMetrics = diagramAtomMetrics()
): number => Math.max(0, metrics.lineClearance - strokeFromEdge)

/**
 * Layout for a label facing a mark.
 *
 * - `gap` — real flex spacer from the padding box to the SVG edge (0 when
 *   the SVG lane already reaches past `lineClearance`)
 * - `pull` — negative margin that closes the rest of the distance when the
 *   SVG lane is *shallower* than the mark's own clearance requirement
 * - `paintGap` — `lineClearance - markHalf`, the *shape's own* clearance
 *   band (bigger under a tick than a circle). This is painted separately,
 *   inside the mark's own SVG (see `markClearanceRect`) — not here — so
 *   there is exactly one coordinate space between the mark rim and the
 *   padding edge and the two can never drift apart by a rounded pixel.
 *
 * `gap + fromEdge - pull` always equals `lineClearance` by construction:
 * the padding edge lands on the mark's own clearance band with no seam.
 */
export const labelClearanceLayout = (
  fromEdge: number,
  markHalf: number,
  metrics: DiagramAtomMetrics = diagramAtomMetrics()
): { gap: number; pull: number; paintGap: number } => {
  const paintGap = Math.max(0, metrics.lineClearance - markHalf)
  const layoutGap = metrics.lineClearance - fromEdge
  if (layoutGap >= 0) return { gap: layoutGap, pull: 0, paintGap }
  return { gap: 0, pull: -layoutGap, paintGap }
}

/**
 * Rect for the shape's own clearance band — from the mark rim out toward
 * `lineClearance` — in the mark's own SVG-local coordinates. `side` is
 * "near" toward the name (up/left) or "far" toward the flag (down/right).
 * Drawing this inside the same `<svg>` as the mark means the band's edge
 * and the mark's rim share one coordinate space: no HTML/SVG paint seam.
 *
 * `svgEdge` is the SVG's own local-frame boundary on this side (always 0
 * for "near"; the SVG's height/width for "far"). The band never paints
 * past it — that space is already the real (orange) flex gap reserved
 * outside the SVG, not this shape's own clearance. Painting both there
 * would double-paint the same pixels.
 */
export const markClearanceRect = (
  cx: number,
  cy: number,
  horizontal: boolean,
  side: "near" | "far",
  markHalf: number,
  svgEdge: number,
  width: number,
  metrics: DiagramAtomMetrics = diagramAtomMetrics()
): BondRect => {
  // The cross-axis coordinate the rim/clear distances measure from: `cy`
  // when the stroke runs horizontally (cross axis is vertical), `cx` when
  // it runs vertically (cross axis is horizontal). Existing callers with
  // `cx === cy` (every current demo card) never exposed using the wrong
  // one of the pair here.
  const centre = horizontal ? cy : cx
  const rim = side === "near" ? centre - markHalf : centre + markHalf
  const clear = side === "near" ? centre - metrics.lineClearance : centre + metrics.lineClearance
  const start = side === "near" ? Math.max(svgEdge, clear) : rim
  const end = side === "near" ? rim : Math.min(svgEdge, clear)
  const size = Math.max(0, end - start)
  if (horizontal) return { x: cx - width / 2, y: start, width, height: size }
  return { x: start, y: cy - width / 2, width: size, height: width }
}

/**
 * Half the cross-axis room a name box needs beside its own mark:
 * `lineClearance` out to the box's near edge, plus up to `maxLines` rows
 * of text past that. Two marks in adjacent bonded lanes each carrying
 * their own label need at least this much lane pitch, or their two name
 * boxes overlap regardless of how far apart the marks themselves sit —
 * the same box `stationLabelLayout`/`StationLabel` actually paints, sized
 * without a real name yet (worst case, both lines at `maxLines`).
 */
export const nameCrossHalf = (
  maxLines: 1 | 2 = 2,
  metrics: DiagramAtomMetrics = diagramAtomMetrics()
): number => metrics.lineClearance + metrics.nameSize * 1.35 * maxLines

/** SVG half-extent so a pair’s tick and ring share one stroke centre. */
export const markerLane = (
  anchor: "tick" | "ring",
  pair = false,
  metrics: DiagramAtomMetrics = diagramAtomMetrics()
): number =>
  Math.round(pair ? metrics.ringRadius : markerCrossHalf(anchor, metrics)) + 2

/** Place a name/flag perpendicular to the stroke, not along the stub. */
export const labelAwayFromStroke = (
  away: "up" | "down" | "left" | "right",
  x: number,
  y: number,
  metrics: DiagramAtomMetrics = diagramAtomMetrics()
): Pt => {
  const d = metrics.lineClearance
  if (away === "up") return { x, y: y - d }
  if (away === "down") return { x, y: y + d }
  if (away === "left") return { x: x - d, y }
  return { x: x + d, y }
}

/** Where the mark sits relative to a name/flag box (`away` is the opposite). */
export const travelLabelAnchor = (
  away: "up" | "down" | "left" | "right"
): StationNameLineAnchor => {
  if (away === "up") return "below"
  if (away === "down") return "above"
  if (away === "left") return "right"
  return "left"
}

/** Padding on the three sides away from the mark; 0 on the open (anchor) side. */
export const diagramLabelPad = (
  anchor: StationNameLineAnchor,
  metrics: DiagramAtomMetrics = diagramAtomMetrics()
): { top: number; right: number; bottom: number; left: number } => {
  const side = metrics.boxPadX
  const far = metrics.boxPadFar
  return {
    top: anchor === "above" ? 0 : anchor === "below" ? far : side,
    right: anchor === "right" ? 0 : anchor === "left" ? far : side,
    bottom: anchor === "below" ? 0 : anchor === "above" ? far : side,
    left: anchor === "left" ? 0 : anchor === "right" ? far : side,
  }
}

/** 1px overlap of butt-capped strokes on the integer grid. */
export const STROKE_JOIN = 1

/** Horizontal run after a return cubic, before a through-stroke may start. */
export const returnFlatRun = (
  metrics: DiagramAtomMetrics = diagramAtomMetrics()
): number => metrics.x * 2

/**
 * Along offset from a stem tip to the ring centre. The through-stroke is
 * `stub` either side of the ring, so it only overlaps `STROKE_JOIN` of the
 * already-horizontal run — never the return cubic.
 */
export const throughJoinAlong = (
  metrics: DiagramAtomMetrics = diagramAtomMetrics()
): number => metrics.stub - STROKE_JOIN

export const joinRingFromStem = (
  exit: Pt,
  horizontal: boolean,
  metrics: DiagramAtomMetrics = diagramAtomMetrics()
): Pt => {
  const join = throughJoinAlong(metrics)
  return horizontal
    ? { x: Math.round(exit.x + join), y: Math.round(exit.y) }
    : { x: Math.round(exit.x), y: Math.round(exit.y + join) }
}

export type BondRect = { x: number; y: number; width: number; height: number }

export type InterchangeBondBox = {
  vertical: boolean
  neck: BondRect
  lens: BondRect
  /**
   * Set when the bond is not axis-aligned. `neck`/`lens` then live in a
   * frame whose +x is a→b, centred on `origin` — BondMark rotates them.
   */
  angle?: number
  origin?: Pt
}

/** Official §8 neck in the ring gap; ends tuck under the circles. */
export const interchangeBondBox = (
  a: Pt,
  b: Pt,
  metrics: DiagramAtomMetrics = diagramAtomMetrics()
): InterchangeBondBox => {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const dist = Math.hypot(dx, dy)
  const { neck, lens } = interchangeLens(dist, metrics)
  const span = Math.max(
    lens,
    dist - 2 * metrics.ringRadius + 2 * metrics.ringStroke
  )
  const vertical = Math.abs(dy) >= Math.abs(dx)
  const axisAligned = Math.abs(dx) < 0.5 || Math.abs(dy) < 0.5
  if (!axisAligned) {
    const origin = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    return {
      vertical,
      angle: Math.atan2(dy, dx),
      origin,
      neck: {
        x: origin.x - span / 2,
        y: origin.y - neck / 2,
        width: span,
        height: neck,
      },
      lens: {
        x: origin.x - span / 2,
        y: origin.y - lens / 2,
        width: span,
        height: lens,
      },
    }
  }
  if (vertical) {
    const cx = (a.x + b.x) / 2
    const mid = (a.y + b.y) / 2
    return {
      vertical,
      neck: { x: cx - neck / 2, y: mid - span / 2, width: neck, height: span },
      lens: { x: cx - lens / 2, y: mid - span / 2, width: lens, height: span },
    }
  }
  const cy = (a.y + b.y) / 2
  const mid = (a.x + b.x) / 2
  return {
    vertical,
    neck: { x: mid - span / 2, y: cy - neck / 2, width: span, height: neck },
    lens: { x: mid - span / 2, y: cy - lens / 2, width: span, height: lens },
  }
}

/** Height of an equilateral triangle whose sides are `pitch`. */
export const triangleApexAlong = (
  metrics: DiagramAtomMetrics = diagramAtomMetrics(),
  pitch: number = metrics.gappedBond
): number => Math.round((pitch * Math.sqrt(3)) / 2)

export type TriangleCentres = {
  /** Base pair — the two rings that face the incoming Y. */
  a: Pt
  b: Pt
  /** Far vertex, along travel from the base midpoint. */
  apex: Pt
}

/**
 * Far vertex of an equilateral interchange on base `a`–`b`. `toward`
 * picks which perpendicular (the side the U-bend / travel continues).
 */
export const triangleApexFromBase = (a: Pt, b: Pt, toward: Pt): Pt => {
  const mx = (a.x + b.x) / 2
  const my = (a.y + b.y) / 2
  const dx = b.x - a.x
  const dy = b.y - a.y
  const base = Math.hypot(dx, dy) || 1
  let nx = -dy / base
  let ny = dx / base
  if (nx * (toward.x - mx) + ny * (toward.y - my) < 0) {
    nx = -nx
    ny = -ny
  }
  const height = Math.round((base * Math.sqrt(3)) / 2)
  return { x: Math.round(mx + nx * height), y: Math.round(my + ny * height) }
}

/**
 * Three ring centres at `gappedBond` from each other. `origin` is the
 * midpoint of the base; travel-right puts `a` above, `b` below, apex right.
 */
export const triangleInterchangeCentres = (
  origin: Pt,
  horizontal = true,
  metrics: DiagramAtomMetrics = diagramAtomMetrics(),
  pitch: number = metrics.gappedBond
): TriangleCentres => {
  const half = pitch / 2
  const along = triangleApexAlong(metrics, pitch)
  const pt = (alongOff: number, crossOff: number): Pt => {
    const raw = horizontal
      ? { x: origin.x + alongOff, y: origin.y + crossOff }
      : { x: origin.x + crossOff, y: origin.y + alongOff }
    return { x: Math.round(raw.x), y: Math.round(raw.y) }
  }
  return {
    a: pt(0, -half),
    b: pt(0, half),
    apex: pt(along, 0),
  }
}

/** Solid core plus leftover excess on each end of a connecting stroke. */
export const paintSegmentParts = (
  total: number,
  metrics: DiagramAtomMetrics = diagramAtomMetrics()
): { core: number; excessEach: number } => {
  const core = Math.min(metrics.minSegment, Math.max(0, total))
  const leftover = Math.max(0, total - metrics.minSegment)
  return { core, excessEach: leftover / 2 }
}

/**
 * Interchange bridge (§8): 0.5x walls + 0.5x white = 1.5x neck.
 * Wall thickness matches the circle stroke.
 */
export const interchangeLens = (
  _centreDistance: number,
  metrics: DiagramAtomMetrics = diagramAtomMetrics()
): { neck: number; lens: number } => ({
  neck: scale(metrics.x, LINE_DIAGRAM.interchange.neckWidth),
  lens: scale(metrics.x, LINE_DIAGRAM.interchange.bridgeWhite),
})

export type Pt = { x: number; y: number }

/**
 * Rectilinear collision geometry shared by every atom. A `Shape` is
 * whatever a primitive actually paints; `shapeEnvelope` turns it into an
 * axis-aligned bounding box other code can union or test for overlap —
 * the same "how close can this get" question a graphic designer asks by
 * eye, made into a reusable function instead of a per-atom guess.
 *
 * Cubic bends use the control-point bbox, inflated by half the stroke
 * width. A cubic Bézier curve always lies within the convex hull of its
 * control points, so this is an exact bound for a straight run and a safe
 * (never too small) bound for a curve — no sampling required.
 */
export type Envelope = { minX: number; maxX: number; minY: number; maxY: number }

export type Shape =
  | { kind: "circle"; cx: number; cy: number; r: number }
  | { kind: "rect"; x: number; y: number; w: number; h: number }
  | { kind: "segment"; a: Pt; b: Pt; halfWidth: number }
  | { kind: "cubic"; p0: Pt; p1: Pt; p2: Pt; p3: Pt; halfWidth: number }

export const shapeEnvelope = (shape: Shape): Envelope => {
  if (shape.kind === "circle") {
    return {
      minX: shape.cx - shape.r,
      maxX: shape.cx + shape.r,
      minY: shape.cy - shape.r,
      maxY: shape.cy + shape.r,
    }
  }
  if (shape.kind === "rect") {
    return {
      minX: shape.x,
      maxX: shape.x + shape.w,
      minY: shape.y,
      maxY: shape.y + shape.h,
    }
  }
  const points =
    shape.kind === "segment"
      ? [shape.a, shape.b]
      : [shape.p0, shape.p1, shape.p2, shape.p3]
  const xs = points.map((p) => p.x)
  const ys = points.map((p) => p.y)
  return {
    minX: Math.min(...xs) - shape.halfWidth,
    maxX: Math.max(...xs) + shape.halfWidth,
    minY: Math.min(...ys) - shape.halfWidth,
    maxY: Math.max(...ys) + shape.halfWidth,
  }
}

export const unionEnvelope = (a: Envelope, b: Envelope): Envelope => ({
  minX: Math.min(a.minX, b.minX),
  maxX: Math.max(a.maxX, b.maxX),
  minY: Math.min(a.minY, b.minY),
  maxY: Math.max(a.maxY, b.maxY),
})

export const envelopeOf = (shapes: readonly Shape[]): Envelope => {
  const boxes = shapes.map(shapeEnvelope)
  const first = boxes[0]
  if (!first) return { minX: 0, maxX: 0, minY: 0, maxY: 0 }
  return boxes.slice(1).reduce(unionEnvelope, first)
}

export const envelopesIntersect = (a: Envelope, b: Envelope): boolean =>
  a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY

/**
 * One line-width of clear space between two diverging branches (a fork or
 * peel) once they've separated — the graphic-design minimum, not zero.
 */
export const minimumBranchGap = (
  metrics: DiagramAtomMetrics = diagramAtomMetrics()
): number => metrics.x

/** Edge-to-edge gap between two stroke centres (each of width `x`). */
export const stemExitGap = (
  a: Pt,
  b: Pt,
  metrics: DiagramAtomMetrics = diagramAtomMetrics()
): number => Math.hypot(b.x - a.x, b.y - a.y) - metrics.x

/**
 * Edge-to-edge gap between two parallel tracks (each stroke width `x`) at
 * a given centre-to-centre pitch — `stemExitGap` for any lane spacing, not
 * just a fixed demo-card layout, so a grid renderer at any scale (a
 * `LANE_PITCH` in `drawing-layout.ts`, a hop in `composition.tsx`'s tree)
 * can check the same `minimumBranchGap` invariant `layoutStem` enforces.
 */
export const laneEdgeGap = (
  pitch: number,
  metrics: DiagramAtomMetrics = diagramAtomMetrics()
): number => pitch - metrics.x

/**
 * Largest corner radius a fork's fan-out may use without breaking two
 * rules at once, at *any* scale: (1) never rounder than the official
 * curve (`tflBendRadius`); (2) never so wide it eats into the straight
 * run either side of the bend (`maxRun`, e.g. half the distance to the
 * next node along the same track). Feed the official radius in as
 * `desired` from a fixed demo card, or a grid pitch computed on the fly
 * from `octilinearLanePath`'s own `maxOctilinearRadius` — either way, the
 * cap keeps a fork's own bend from being able to violate `minimumBranchGap`
 * once `laneEdgeGap` confirms the fan-out's target pitch is wide enough.
 */
export const safeForkRadius = (
  desired: number,
  metrics: DiagramAtomMetrics = diagramAtomMetrics(),
  maxRun: number = Number.POSITIVE_INFINITY
): number => Math.max(0, Math.min(desired, tflBendRadius(metrics), maxRun))

/**
 * Conservative envelope for an octilinear S-bend drawn as two circular
 * arcs (`octilinearLanePath`'s join, used by `drawing-layout.ts` and
 * `composition.tsx` — arcs, never the cubic `octilinearCubic` builds for
 * the fixed-size demo cards). There are no control points to hull, so
 * bound it the same way the "keeps the clearance band offset…" test
 * proves a straight run's own extension already covers a cubic bend:
 * take the straight chord between the two points and inflate it by the
 * bend's own worst-case bulge off that chord (`headingBendCross` at the
 * full 45°) plus half the stroke width. This over-covers slightly — an
 * S-curve's two arcs bulge less than one bend of the same radius would —
 * so a mark that clears this envelope clears the real curve too.
 */
export const octilinearBendEnvelope = (
  a: Pt,
  b: Pt,
  radius: number,
  metrics: DiagramAtomMetrics = diagramAtomMetrics()
): Envelope => {
  const bulge = headingBendCross(radius, Math.PI / 4)
  return shapeEnvelope({ kind: "segment", a, b, halfWidth: metrics.x / 2 + bulge })
}

/** Decides whether a mark of half-extent `markHalf` at `at` clears an S-bend's own envelope — the arc-renderer counterpart to the cubic check `layoutStem`'s tests run against `lastBendA`/`lastBendB`. */
export const octilinearBendClearsMark = (
  a: Pt,
  b: Pt,
  radius: number,
  at: Pt,
  markHalf: number,
  metrics: DiagramAtomMetrics = diagramAtomMetrics()
): boolean =>
  !envelopesIntersect(
    octilinearBendEnvelope(a, b, radius, metrics),
    shapeEnvelope({ kind: "circle", cx: at.x, cy: at.y, r: markHalf })
  )

const addPt = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y })

const OCT_STEP = Math.PI / 4

/** Integer step along an octilinear heading (axis or 45°). */
export const octilinearDelta = (heading: number, length: number): Pt => {
  const oct = (((Math.round(heading / OCT_STEP) % 8) + 8) % 8)
  const diagonal = oct % 2 === 1
  const k = Math.max(1, Math.round(diagonal ? length / Math.SQRT2 : length))
  const cos = [1, 1, 0, -1, -1, -1, 0, 1][oct]!
  const sin = [0, 1, 1, 1, 0, -1, -1, -1][oct]!
  return { x: cos * k, y: sin * k }
}

const snapPt = (point: Pt): Pt => ({
  x: Math.round(point.x),
  y: Math.round(point.y),
})

/** Cross displacement of a 45° circular arc of radius r. */
export const headingBendCross = (radius: number, deltaRad: number): number =>
  Math.abs(radius * (1 - Math.cos(deltaRad)))

/**
 * Cubic 0°/45° bend on the integer octilinear grid. Handles stay on the
 * start/end headings; endpoints snap so strokes meet on whole pixels.
 */
export const octilinearCubic = (
  start: Pt,
  heading0: number,
  heading1: number,
  radius: number
): { p0: Pt; p1: Pt; p2: Pt; p3: Pt } => {
  const left0 = { x: -Math.sin(heading0), y: Math.cos(heading0) }
  const left1 = { x: -Math.sin(heading1), y: Math.cos(heading1) }
  const signed = heading1 >= heading0 ? radius : -radius
  const p0 = snapPt(start)
  const p3 = snapPt({
    x: start.x + signed * (left0.x - left1.x),
    y: start.y + signed * (left0.y - left1.y),
  })
  const delta = Math.abs(heading1 - heading0)
  const handle = radius * (4 / 3) * Math.tan(Math.max(delta, 1e-6) / 4)
  return {
    p0,
    p1: addPt(p0, octilinearDelta(heading0, handle)),
    p2: addPt(p3, octilinearDelta(heading1 + Math.PI, handle)),
    p3,
  }
}

/**
 * Along-axis stagger so two parallel 45° strokes clear `minimumBranchGap`
 * edge-to-edge. A 45° line offset by `stagger` along one axis moves
 * `stagger / √2` perpendicular to itself; round up so the centre distance
 * never lands a fraction of a pixel short of the minimum.
 */
export const parallelStemStagger = (
  metrics: DiagramAtomMetrics = diagramAtomMetrics()
): number => Math.ceil((metrics.x + minimumBranchGap(metrics)) * Math.SQRT2)

/**
 * A rectangle rotated to a straight or 45°-diagonal run's own heading,
 * offset `clearance` perpendicular on both sides of the run's centre-line
 * and extended along the run by `extend` at each end. Composing one of
 * these per straight sub-run — never a curve — is how the pink clearance
 * band hugs a bend: the run before a bend and the run after it both
 * extend toward the bend by at least its radius, so their two rotated
 * rects overlap enough to cover the bend's (convex, bounded) curve.
 */
export type LaneRect = { readonly points: readonly [Pt, Pt, Pt, Pt] }

export const laneClearanceRect = (
  a: Pt,
  b: Pt,
  clearance: number,
  extend = 0
): LaneRect => {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const nx = -uy
  const ny = ux
  const start = { x: a.x - ux * extend, y: a.y - uy * extend }
  const end = { x: b.x + ux * extend, y: b.y + uy * extend }
  return {
    points: [
      { x: start.x - nx * clearance, y: start.y - ny * clearance },
      { x: end.x - nx * clearance, y: end.y - ny * clearance },
      { x: end.x + nx * clearance, y: end.y + ny * clearance },
      { x: start.x + nx * clearance, y: start.y + ny * clearance },
    ],
  }
}

/**
 * Path-following clearance band for a whole stroke spine (a sequence of
 * straight sub-runs, e.g. `LaidStem.spine`): one `LaneRect` per run,
 * offset by `lineClearance - x/2` (the same pink thickness the flat band
 * used) and extended by the official bend radius so neighbouring runs
 * meet across a bend with no seam and no gap.
 */
export const strokeClearanceBand = (
  spine: readonly { a: Pt; b: Pt }[],
  metrics: DiagramAtomMetrics = diagramAtomMetrics(),
  extend: number = tflBendRadius(metrics)
): LaneRect[] => {
  const clearance = Math.max(0, metrics.lineClearance - metrics.x / 2)
  if (clearance <= 0) return []
  return spine.map((run) => laneClearanceRect(run.a, run.b, clearance, extend))
}

export const cubicPath = (
  p0: Pt,
  p1: Pt,
  p2: Pt,
  p3: Pt
): string =>
  `M ${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`

export const linePath = (a: Pt, b: Pt): string =>
  `M ${a.x} ${a.y} L ${b.x} ${b.y}`

/** 45° grid heading from the travel axis, in degrees. */
export type StemLeave = 0 | 45 | -45

export type StemArm = {
  leave: StemLeave
  /** Second cubic back onto the travel axis (for joining horizontal atoms). */
  returnToAlong: boolean
}

/** Outbound heading at an arm’s tip. */
export const stemTipHeading = (arm: StemArm): StemLeave =>
  arm.returnToAlong || arm.leave === 0 ? 0 : arm.leave

/**
 * Scalar of the cap plane: the tip’s projection along the stroke heading.
 * Parallel tips share a plane when this matches.
 */
export const stemTipPlane = (
  along: number,
  cross: number,
  heading: StemLeave
): number => {
  if (heading === 45) return along - cross
  if (heading === -45) return along + cross
  return along
}

/** How much one octilinear step along `heading` changes the cap plane. */
export const stemTipPlaneStep = (heading: StemLeave): number =>
  heading === 0 ? 1 : 2

/**
 * Incoming is always along the travel axis (horizontal in the usual map).
 * Outgoing arms are 0° / ±45° on the octilinear grid. `returnToAlong` is the
 * extra cubic used when an arm must meet another horizontal shape.
 */
export type StemRecipe = {
  id: string
  title: string
  upper: StemArm
  lower: StemArm
}

export const tflBendRadius = (
  metrics: DiagramAtomMetrics = diagramAtomMetrics()
): number => scale(metrics.x, LINE_DIAGRAM.innerCurveRadius)

export const stemReturnRadius = (
  targetCross: number,
  metrics: DiagramAtomMetrics = diagramAtomMetrics()
): number => {
  const tfl = tflBendRadius(metrics)
  const k = 1 - Math.cos(Math.PI / 4)
  const usable = Math.max(metrics.x, Math.abs(targetCross) - metrics.x * 0.45)
  return Math.min(tfl, Math.max(metrics.x * 1.3, usable / (2 * k)))
}

export const STEM_RECIPES: readonly StemRecipe[] = [
  {
    id: "y-return",
    title: "Y · both return to travel",
    upper: { leave: 45, returnToAlong: true },
    lower: { leave: -45, returnToAlong: true },
  },
  {
    id: "y-diagonal",
    title: "Y · both stay 45°",
    upper: { leave: 45, returnToAlong: false },
    lower: { leave: -45, returnToAlong: false },
  },
  {
    id: "peel-up",
    title: "Peel · along + up, return",
    upper: { leave: 45, returnToAlong: true },
    lower: { leave: 0, returnToAlong: false },
  },
  {
    id: "peel-down",
    title: "Peel · along + down, return",
    upper: { leave: 0, returnToAlong: false },
    lower: { leave: -45, returnToAlong: true },
  },
  {
    id: "peel-up-stay",
    title: "Peel · along + up 45°",
    upper: { leave: 45, returnToAlong: false },
    lower: { leave: 0, returnToAlong: false },
  },
  {
    id: "both-down",
    title: "Both down 45° (rare)",
    upper: { leave: -45, returnToAlong: false },
    lower: { leave: -45, returnToAlong: false },
  },
] as const

const alongPoint = (
  horizontal: boolean,
  along: number,
  cross: number,
  midCross: number
): Pt =>
  horizontal
    ? { x: along, y: midCross + cross }
    : { x: midCross + cross, y: along }

type StemRaw =
  | { paint: "core" | "excess"; kind: "line"; a: Pt; b: Pt }
  | {
      paint: "core" | "excess"
      kind: "cubic"
      p0: Pt
      p1: Pt
      p2: Pt
      p3: Pt
    }

type StemBuilt = {
  raw: StemRaw[]
  along: number
  cross: number
  flat: { start: Pt; end: Pt } | null
}

const stemPath = (segs: StemRaw[], mapPt: (point: Pt) => Pt): string => {
  const bits: string[] = []
  segs.forEach((seg, index) => {
    if (seg.kind === "line") {
      const a = mapPt(seg.a)
      const b = mapPt(seg.b)
      if (index === 0) bits.push(`M ${a.x} ${a.y}`)
      bits.push(`L ${b.x} ${b.y}`)
      return
    }
    const p0 = mapPt(seg.p0)
    const p1 = mapPt(seg.p1)
    const p2 = mapPt(seg.p2)
    const p3 = mapPt(seg.p3)
    if (index === 0) bits.push(`M ${p0.x} ${p0.y}`)
    bits.push(`C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`)
  })
  return bits.join(" ")
}

const paintRuns = (
  segs: StemRaw[]
): { paint: "core" | "excess"; segs: StemRaw[] }[] => {
  const runs: { paint: "core" | "excess"; segs: StemRaw[] }[] = []
  for (const seg of segs) {
    const last = runs.at(-1)
    if (last && last.paint === seg.paint) last.segs.push(seg)
    else runs.push({ paint: seg.paint, segs: [seg] })
  }
  return runs
}

export type LaidStem = {
  horizontal: boolean
  w: number
  h: number
  segs: { d: string; paint: "core" | "excess" }[]
  exitA: Pt
  exitB: Pt
  /** Last already-horizontal run on a return arm; null if the arm stays 45°. */
  flatA: { start: Pt; end: Pt } | null
  flatB: { start: Pt; end: Pt } | null
  /** The bend nearest each exit — check a joined mark's envelope against this. */
  lastBendA: Shape | null
  lastBendB: Shape | null
  /** Straight sub-runs of the whole stem, in SVG coords — feed `strokeClearanceBand`. */
  spine: { a: Pt; b: Pt }[]
}

/**
 * @param tipClearance Half-extent of whatever gets joined at each exit
 *   (a plain stroke by default; pass `ringRadius` when a ring will land
 *   there) so the returned box always fully contains it — no poking past
 *   the SVG's own declared edge.
 */
export const layoutStem = (
  recipe: StemRecipe,
  horizontal = true,
  metrics: DiagramAtomMetrics = diagramAtomMetrics(),
  tipClearance: number = metrics.x,
  tipPitch?: number
): LaidStem => {
  const pad = 4
  const excess = metrics.x
  const peel = recipe.upper.leave === 0 || recipe.lower.leave === 0
  const stemCore = peel ? metrics.x * 3 : metrics.x * 2
  // Floor so a fully-returned fork clears `minimumBranchGap` edge-to-edge
  // even when the ring pitch (`gappedBond`) alone would fall short.
  const targetCross = Math.max(
    (tipPitch ?? metrics.gappedBond) / 2,
    metrics.x + minimumBranchGap(metrics)
  )
  const sameLeave =
    recipe.upper.leave === recipe.lower.leave && recipe.upper.leave !== 0
  const stemTip = pad
  const stemCoreAt = pad + excess
  const forkAlong = stemCoreAt + stemCore
  const seam = STROKE_JOIN
  const flatRun = returnFlatRun(metrics)
  const line = (paint: StemRaw["paint"], a: Pt, b: Pt): StemRaw => ({
    paint,
    kind: "line",
    a,
    b,
  })
  const cubic = (
    paint: StemRaw["paint"],
    c: { p0: Pt; p1: Pt; p2: Pt; p3: Pt }
  ): StemRaw => ({ paint, kind: "cubic", ...c })
  const build = (arm: StemArm, stagger: number): StemBuilt => {
    const raw: StemRaw[] = []
    let along = forkAlong
    let cross = 0
    let flat: StemBuilt["flat"] = null
    if (stagger > 0) {
      raw.push(line("core", { x: forkAlong, y: 0 }, { x: forkAlong + stagger, y: 0 }))
      along += stagger
    }
    const leaveRad = (-arm.leave * Math.PI) / 180
    if (arm.leave === 0) {
      const coreEnd = along + metrics.x * 2
      raw.push(line("core", { x: along, y: 0 }, { x: coreEnd, y: 0 }))
      along = coreEnd + excess
      raw.push(line("excess", { x: coreEnd - seam, y: 0 }, { x: along, y: 0 }))
      return { raw, along, cross: 0, flat: null }
    }
    const r = arm.returnToAlong
      ? stemReturnRadius(targetCross, metrics)
      : tflBendRadius(metrics)
    const bend = octilinearCubic({ x: along, y: cross }, 0, leaveRad, r)
    raw.push(cubic("core", bend))
    along = bend.p3.x
    cross = bend.p3.y
    const stepX = Math.sign(Math.cos(leaveRad)) || 1
    const stepY = Math.sign(Math.sin(leaveRad)) || 0
    const remain = arm.returnToAlong
      ? targetCross - Math.abs(cross) * 2
      : metrics.x
    const run = Math.max(1, Math.round(remain))
    const diagEnd = { x: along + stepX * run, y: cross + stepY * run }
    raw.push(line("excess", { x: along - stepX, y: cross - stepY }, diagEnd))
    along = diagEnd.x
    cross = diagEnd.y
    if (arm.returnToAlong) {
      // The return bend's own curvature is fixed (same radius as the
      // leave bend) — never flexible — so it paints "core" like the
      // leave bend, even though it sits between two excess runs.
      const ret = octilinearCubic({ x: along, y: cross }, leaveRad, 0, r)
      raw.push(cubic("core", ret))
      along = ret.p3.x
      cross = ret.p3.y
      const endAlong = along + flatRun
      const start = { x: along, y: cross }
      const end = { x: endAlong, y: cross }
      raw.push(line("excess", start, end))
      along = endAlong
      flat = { start, end }
    } else {
      const endAlong = along + stepX * excess
      const endCross = cross + stepY * excess
      raw.push(
        line("excess", { x: along, y: cross }, { x: endAlong, y: endCross })
      )
      along = endAlong
      cross = endCross
    }
    return { raw, along, cross, flat }
  }
  const headU = stemTipHeading(recipe.upper)
  const headL = stemTipHeading(recipe.lower)
  const extendTip = (built: StemBuilt, heading: StemLeave, delta: number) => {
    if (delta <= 0) return built
    const stepY = heading === 0 ? 0 : heading === 45 ? -1 : 1
    const last = built.raw.at(-1)
    if (!last || last.kind !== "line") return built
    last.b = { x: last.b.x + delta, y: last.b.y + stepY * delta }
    return {
      raw: built.raw,
      along: last.b.x,
      cross: last.b.y,
      flat: built.flat
        ? { start: built.flat.start, end: last.b }
        : null,
    }
  }
  let upper = build(recipe.upper, 0)
  let lower = build(
    recipe.lower,
    sameLeave ? parallelStemStagger(metrics) : 0
  )
  if (headU === headL) {
    const plane = Math.max(
      stemTipPlane(upper.along, upper.cross, headU),
      stemTipPlane(lower.along, lower.cross, headL)
    )
    const step = stemTipPlaneStep(headU)
    upper = extendTip(
      upper,
      headU,
      Math.round((plane - stemTipPlane(upper.along, upper.cross, headU)) / step)
    )
    lower = extendTip(
      lower,
      headL,
      Math.round((plane - stemTipPlane(lower.along, lower.cross, headL)) / step)
    )
  }
  const stemCoreSeg = line("core", { x: stemCoreAt, y: 0 }, { x: forkAlong, y: 0 })
  const maxAlong = Math.max(upper.along, lower.along) + pad
  const maxCross =
    Math.max(Math.abs(upper.cross), Math.abs(lower.cross), metrics.x) +
    tipClearance +
    pad
  const w = Math.round(horizontal ? maxAlong : maxCross * 2)
  const h = Math.round(horizontal ? maxCross * 2 : maxAlong)
  const mid = Math.round(horizontal ? h / 2 : w / 2)
  const mapPt = (point: Pt) => {
    const mapped = alongPoint(horizontal, point.x, point.y, mid)
    return { x: Math.round(mapped.x), y: Math.round(mapped.y) }
  }
  const lastBend = (built: StemBuilt): Shape | null => {
    const bend = built.raw.filter((seg): seg is Extract<StemRaw, { kind: "cubic" }> =>
      seg.kind === "cubic"
    ).at(-1)
    if (!bend) return null
    return {
      kind: "cubic",
      p0: mapPt(bend.p0),
      p1: mapPt(bend.p1),
      p2: mapPt(bend.p2),
      p3: mapPt(bend.p3),
      halfWidth: metrics.x / 2,
    }
  }
  const leadIn = line("excess", { x: stemTip, y: 0 }, { x: stemCoreAt + seam, y: 0 })
  const segs: LaidStem["segs"] = [
    { paint: "excess", d: stemPath([leadIn], mapPt) },
  ]
  for (const arm of [upper, lower]) {
    for (const run of paintRuns(arm.raw)) {
      const pieces =
        run.paint === "core" ? [stemCoreSeg, ...run.segs] : run.segs
      segs.push({ paint: run.paint, d: stemPath(pieces, mapPt) })
    }
  }
  const mapFlat = (flat: StemBuilt["flat"]) =>
    flat ? { start: mapPt(flat.start), end: mapPt(flat.end) } : null
  const isLine = (seg: StemRaw): seg is Extract<StemRaw, { kind: "line" }> =>
    seg.kind === "line"
  const spine: LaidStem["spine"] = [leadIn, stemCoreSeg, ...upper.raw, ...lower.raw]
    .filter(isLine)
    .map((seg) => ({ a: mapPt(seg.a), b: mapPt(seg.b) }))
  return {
    horizontal,
    w,
    h,
    segs,
    exitA: mapPt({ x: upper.along, y: upper.cross }),
    exitB: mapPt({ x: lower.along, y: lower.cross }),
    flatA: mapFlat(upper.flat),
    flatB: mapFlat(lower.flat),
    lastBendA: lastBend(upper),
    lastBendB: lastBend(lower),
    spine,
  }
}

/** A fork arm's required span, local to the fork (`along`/`cross` axes, fork at 0/0). */
export type StemArmSpan = {
  /** Signed distance the arm's own bend begins at (>0, past the mark's own half-width). */
  forkAlong: number
  /** Exact along-position the arm's stroke must land on — its tip. */
  tipAlong: number
  /** Exact signed cross-position the arm's stroke must land on — its tip. */
  tipCross: number
}

export type StemArmPath = {
  /** Absolute-space SVG path `d`, already run through `mapPt`. */
  d: string
  /** Straight sub-runs only, already run through `mapPt` — feed `strokeClearanceBand`. */
  spine: { a: Pt; b: Pt }[]
  /**
   * `d` broken into the same core/excess runs `layoutStem`'s `segs`
   * paints — a bend's own curvature never flexes, so only the straight
   * runs between bends carry `"excess"`. Paint `"excess"` with `EXCESS`
   * (`/drafts/diagram-atoms/atoms.tsx`), same as the demo cards.
   */
  segs: { d: string; paint: "core" | "excess" }[]
}

/**
 * One fork arm's leave-then-return-to-travel geometry — the same recipe
 * `layoutStem`'s per-arm `build` composes for a `returnToAlong` arm (a
 * leaving cubic, a 45° diagonal run, a returning cubic, then a flat run
 * back onto the travel axis) — generalized to land on an *exact* required
 * (`tipAlong`, `tipCross`) instead of the fixed demo-card `stemCore`/
 * `targetCross`. `layoutStem` stays the six canned `STEM_RECIPES` cards;
 * any caller laying out a fork at an arbitrary grid scale (vertex-
 * scenarios' fork nodes) builds its arms with this directly, so both
 * pages share one bend recipe instead of a look-alike arc-based one.
 *
 * `mapPt` carries the result from this function's local horizontal frame
 * (along = x, cross = y, fork at the origin) into the caller's real SVG
 * space — the same job `layoutStem`'s own `mapPt`/`alongPoint` do,
 * generalised past a fixed `mid`/`horizontal` demo-card box.
 */
export const buildStemArmPath = (
  span: StemArmSpan,
  mapPt: (point: Pt) => Pt,
  metrics: DiagramAtomMetrics = diagramAtomMetrics()
): StemArmPath => {
  const { forkAlong, tipAlong, tipCross } = span
  const lead: { a: Pt; b: Pt } = {
    a: { x: 0, y: 0 },
    b: { x: forkAlong, y: 0 },
  }
  const mp = mapPt
  if (Math.abs(tipCross) < 0.5) {
    const straight = { a: lead.b, b: { x: tipAlong, y: 0 } }
    // Mirrors `layoutStem`'s non-diverging arm: a fixed-length core run
    // out of the fork, then whatever's left is the flexible tail that
    // actually reaches the tip — never more "excess" than the arm is
    // long, so a short stub-to-mark hop stays all core.
    const core: Pt = { x: Math.min(tipAlong, forkAlong + metrics.x * 2), y: 0 }
    const segs: StemArmPath["segs"] = [
      { d: linePath(mp(lead.a), mp(core)), paint: "core" },
      ...(core.x < tipAlong - 0.5
        ? [{ d: linePath(mp(core), mp(straight.b)), paint: "excess" as const }]
        : []),
    ]
    return {
      d: `${linePath(mp(lead.a), mp(lead.b))} L ${mp(straight.b).x} ${mp(straight.b).y}`,
      spine: [lead, straight].map((run) => ({ a: mp(run.a), b: mp(run.b) })),
      segs,
    }
  }
  const leaveRad = (Math.sign(tipCross) * Math.PI) / 4
  const r = stemReturnRadius(Math.abs(tipCross) * 2, metrics)
  const bend0 = octilinearCubic({ x: forkAlong, y: 0 }, 0, leaveRad, r)
  const stepX = Math.sign(Math.cos(leaveRad)) || 1
  const stepY = Math.sign(Math.sin(leaveRad)) || 0
  // Cross still owed once both bends (mirror-symmetric, so each
  // contributes the same `bend0.p3.y`) are accounted for — exact, not
  // `layoutStem`'s rounded demo-card approximation, so the arm's flat
  // run lands precisely on the caller's real tip instead of a pixel off.
  const run = Math.max(0, Math.abs(tipCross) - Math.abs(bend0.p3.y) * 2)
  const diagEnd = { x: bend0.p3.x + stepX * run, y: bend0.p3.y + stepY * run }
  const bend1 = octilinearCubic(diagEnd, leaveRad, 0, r)
  const flatEnd = { x: tipAlong, y: bend1.p3.y }
  const d = [
    linePath(mp(lead.a), mp(lead.b)),
    `C ${mp(bend0.p1).x} ${mp(bend0.p1).y}, ${mp(bend0.p2).x} ${mp(bend0.p2).y}, ${mp(bend0.p3).x} ${mp(bend0.p3).y}`,
    `L ${mp(diagEnd).x} ${mp(diagEnd).y}`,
    `C ${mp(bend1.p1).x} ${mp(bend1.p1).y}, ${mp(bend1.p2).x} ${mp(bend1.p2).y}, ${mp(bend1.p3).x} ${mp(bend1.p3).y}`,
    `L ${mp(flatEnd).x} ${mp(flatEnd).y}`,
  ].join(" ")
  // The bends' own curvature is fixed (same radius, always required for
  // octilinearity) — never flexible — so only the straight diagonal run
  // and the flat run before the tip paint "excess": the parts that
  // actually stretch or shrink to land on wherever `tipCross`/`tipAlong`
  // require, matching `layoutStem`'s corrected core/excess split.
  const segs: StemArmPath["segs"] = [
    {
      d: `${linePath(mp(lead.a), mp(lead.b))} C ${mp(bend0.p1).x} ${mp(bend0.p1).y}, ${mp(bend0.p2).x} ${mp(bend0.p2).y}, ${mp(bend0.p3).x} ${mp(bend0.p3).y}`,
      paint: "core",
    },
    { d: linePath(mp(bend0.p3), mp(diagEnd)), paint: "excess" },
    {
      d: cubicPath(mp(bend1.p0), mp(bend1.p1), mp(bend1.p2), mp(bend1.p3)),
      paint: "core",
    },
    { d: linePath(mp(bend1.p3), mp(flatEnd)), paint: "excess" },
  ]
  return {
    d,
    spine: [
      { a: mp(lead.a), b: mp(lead.b) },
      { a: mp(bend0.p3), b: mp(diagEnd) },
      { a: mp(bend1.p3), b: mp(flatEnd) },
    ],
    segs,
  }
}

/**
 * One stem arm from `from` to `to` in a caller's SVG space — the same
 * leave / diagonal / return recipe `buildStemArmPath` uses. `axis` is
 * the travel axis the arm returns onto.
 */
export const stemArmFromTo = (
  from: Pt,
  to: Pt,
  axis: "x" | "y",
  metrics: DiagramAtomMetrics = diagramAtomMetrics()
): StemArmPath => {
  const alongOf = (point: Pt) => (axis === "x" ? point.x : point.y)
  const crossOf = (point: Pt) => (axis === "x" ? point.y : point.x)
  const alongDelta = alongOf(to) - alongOf(from)
  const sign = alongDelta === 0 ? 1 : Math.sign(alongDelta)
  const tipAlong = Math.abs(alongDelta)
  const tipCross = crossOf(to) - crossOf(from)
  const mapPt = (local: Pt): Pt => {
    const absAlong = alongOf(from) + sign * local.x
    const absCross = crossOf(from) + local.y
    return axis === "x"
      ? { x: absAlong, y: absCross }
      : { x: absCross, y: absAlong }
  }
  return buildStemArmPath(
    {
      forkAlong: Math.min(metrics.x * 2, tipAlong / 3),
      tipAlong,
      tipCross,
    },
    mapPt,
    metrics
  )
}

/**
 * Smallest 180° radius that still reads as a through-run, not a halo
 * around an interchange ring. Official curve first; never tighter than
 * a ring plus one stroke.
 */
export const minimumUBendRadius = (
  metrics: DiagramAtomMetrics = diagramAtomMetrics()
): number => Math.max(tflBendRadius(metrics), metrics.ringRadius + metrics.x)

/** Centre-to-centre of the two parallels a U-bend joins. */
export const uBendPitch = (
  metrics: DiagramAtomMetrics = diagramAtomMetrics()
): number =>
  Math.max(metrics.gappedBond, 2 * minimumUBendRadius(metrics))

export type UBendArc = {
  d: string
  radius: number
  nose: Pt
  tipA: Pt
  tipB: Pt
}

/**
 * Smooth 180° through-run between two parallel tracks. The arc is a
 * single circular semicircle — no 45° corners, no nose where two arms
 * meet (that would be a Y, and would read as two termini). `toward`
 * picks which side of the pair the bowl sits on; the constraint that
 * blocked a straight join lives on the other side.
 */
export const uBendBetween = (tipA: Pt, tipB: Pt, toward: Pt): UBendArc => {
  const mx = (tipA.x + tipB.x) / 2
  const my = (tipA.y + tipB.y) / 2
  const dx = tipB.x - tipA.x
  const dy = tipB.y - tipA.y
  const pitch = Math.hypot(dx, dy) || 1
  const radius = pitch / 2
  let nx = -dy / pitch
  let ny = dx / pitch
  if (nx * (toward.x - mx) + ny * (toward.y - my) < 0) {
    nx = -nx
    ny = -ny
  }
  const nose = { x: Math.round(mx + nx * radius), y: Math.round(my + ny * radius) }
  const cross =
    (tipB.x - tipA.x) * (nose.y - tipA.y) - (tipB.y - tipA.y) * (nose.x - tipA.x)
  const sweep = cross > 0 ? 1 : 0
  return {
    d: `M ${tipA.x} ${tipA.y} A ${radius} ${radius} 0 0 ${sweep} ${tipB.x} ${tipB.y}`,
    radius,
    nose,
    tipA,
    tipB,
  }
}

export type LaidUBend = {
  horizontal: boolean
  w: number
  h: number
  segs: { d: string; paint: "core" | "excess" }[]
  tipA: Pt
  tipB: Pt
  nose: Pt
  spine: { a: Pt; b: Pt }[]
}

/**
 * Isolated U-bend card: two parallel stubs (the tracks that cannot go
 * straight) and one 180° arc joining them on the far side.
 */
export const layoutUBend = (
  horizontal = true,
  metrics: DiagramAtomMetrics = diagramAtomMetrics(),
  tipClearance: number = metrics.x,
  pitch?: number
): LaidUBend => {
  const span = Math.max(
    pitch ?? uBendPitch(metrics),
    metrics.x + minimumBranchGap(metrics)
  )
  const radius = span / 2
  const stub = metrics.minSegment + metrics.excessHint
  const pad = 4
  const alongSpan = pad + stub + radius + pad + tipClearance
  const crossSpan = span + tipClearance * 2 + pad * 2
  const w = Math.round(horizontal ? alongSpan : crossSpan)
  const h = Math.round(horizontal ? crossSpan : alongSpan)
  const mid = Math.round(horizontal ? h / 2 : w / 2)
  const tipAlong = pad + stub
  const tipA: Pt = horizontal
    ? { x: Math.round(tipAlong), y: Math.round(mid - radius) }
    : { x: Math.round(mid - radius), y: Math.round(tipAlong) }
  const tipB: Pt = horizontal
    ? { x: Math.round(tipAlong), y: Math.round(mid + radius) }
    : { x: Math.round(mid + radius), y: Math.round(tipAlong) }
  const toward: Pt = horizontal
    ? { x: tipAlong + radius, y: mid }
    : { x: mid, y: tipAlong + radius }
  const arc = uBendBetween(tipA, tipB, toward)
  const stubStartA: Pt = horizontal
    ? { x: pad, y: tipA.y }
    : { x: tipA.x, y: pad }
  const stubStartB: Pt = horizontal
    ? { x: pad, y: tipB.y }
    : { x: tipB.x, y: pad }
  return {
    horizontal,
    w,
    h,
    segs: [
      { d: linePath(stubStartA, tipA), paint: "excess" },
      { d: linePath(stubStartB, tipB), paint: "excess" },
      { d: arc.d, paint: "core" },
    ],
    tipA,
    tipB,
    nose: arc.nose,
    spine: [
      { a: stubStartA, b: tipA },
      { a: stubStartB, b: tipB },
    ],
  }
}
