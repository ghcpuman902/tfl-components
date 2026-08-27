import {
  DIAGRAM_BASELINE,
  HORIZONTAL_NAME_SIZE_UNITS,
  LINE_DIAGRAM,
  VERTICAL_NAME_SIZE_UNITS,
  horizontalStationFontSize,
  scale,
  verticalStationFontSize,
} from "@/lib/tfl/line-diagram"
import type {
  SchematicLayout,
  SchematicLayoutPoint,
  SchematicOrientation,
} from "@/lib/tfl/schematic-layout"

/**
 * Pure label placement for BranchStrip — shared by the UI and regression tests.
 *
 * After edits, verify visually at http://localhost:3999/docs/branch-strip-horizontal
 * (see checklist on `BranchStrip`).
 */

/** Station-name line-height used for label boxes and pitch multiples. */
export const BRANCH_STRIP_LABEL_LINE_HEIGHT = 1.15

/**
 * Station pitch / lane pitch as multiples of the station-name em.
 * Chosen so default `DIAGRAM_BASELINE` matches the previous `scale(x, N)` look:
 * horizontal 12x/10x with font 2x → 6em/5em; vertical 14x/20x with font ≈4.286x.
 */
const PITCH_EM = {
  horizontal: { main: 6, lane: 5, padding: 2 },
  vertical: {
    main: 14 / VERTICAL_NAME_SIZE_UNITS,
    lane: 20 / VERTICAL_NAME_SIZE_UNITS,
    padding: 6 / VERTICAL_NAME_SIZE_UNITS,
    /** Was `scale(x, 16)` — same em at vertical name size. */
    labelWidth: 16 / VERTICAL_NAME_SIZE_UNITS,
  },
} as const

export type BranchStripMetrics = {
  x: number
  orientation: SchematicOrientation
  nameFont: number
  labelLineHeight: number
  /** One line of station text: `nameFont × labelLineHeight`. */
  lineBox: number
  mainPitch: number
  lanePitch: number
  padding: number
  verticalLabelWidth: number
  labelClearance: number
  labelMaxWidth: number
  labelGap: number
  labelBandTop: number
  labelBandBottom: number
  labelSideLeft: number
  labelSideRight: number
  endPad: number
  strokeWidth: number
  tickProtrude: number
  ringOuter: number
  ringStroke: number
}

/**
 * BranchStrip layout lengths derived from diagram `x` → station font → em pitches.
 * Tests and the component must share this so geometry tracks base type size.
 */
export const branchStripMetrics = (
  orientation: SchematicOrientation,
  xProp?: number
): BranchStripMetrics => {
  const isHorizontal = orientation === "horizontal"
  const x = xProp ?? DIAGRAM_BASELINE[orientation]
  const nameFont = isHorizontal
    ? horizontalStationFontSize(x)
    : verticalStationFontSize(x)
  const labelLineHeight = BRANCH_STRIP_LABEL_LINE_HEIGHT
  const lineBox = nameFont * labelLineHeight

  const pitch = isHorizontal ? PITCH_EM.horizontal : PITCH_EM.vertical
  const mainPitch = nameFont * pitch.main
  const lanePitch = nameFont * pitch.lane
  const padding = nameFont * pitch.padding

  const strokeWidth = scale(x, LINE_DIAGRAM.lineThickness)
  const tickProtrude = scale(x, LINE_DIAGRAM.stationTick)
  const ringOuter = scale(x, LINE_DIAGRAM.interchange.outerDiameter / 2)
  const ringStroke = scale(x, LINE_DIAGRAM.interchange.stroke)
  const labelClearance = ringOuter + scale(x, 1.1)

  const verticalLabelWidth = Math.round(
    Math.min(
      isHorizontal
        ? nameFont * (16 / HORIZONTAL_NAME_SIZE_UNITS)
        : nameFont * PITCH_EM.vertical.labelWidth,
      lanePitch * 0.65
    )
  )

  const labelBand = Math.max(
    scale(x, LINE_DIAGRAM.layout.nameBelowLine) + lineBox,
    lineBox * 2
  )
  const labelBandTop = isHorizontal
    ? labelBand + labelClearance
    : lineBox * 2 + nameFont * 0.1 + labelClearance
  const labelBandBottom = isHorizontal
    ? labelBand + labelClearance
    : nameFont * (4 / VERTICAL_NAME_SIZE_UNITS)

  const labelSide = isHorizontal ? 0 : verticalLabelWidth + padding
  // Narrower than station pitch so neighbours on the same corridor don’t collide.
  const labelMaxWidth = Math.max(
    isHorizontal ? nameFont * 3.5 : nameFont * 2,
    mainPitch * 0.7
  )
  const endPad = isHorizontal ? labelMaxWidth / 2 + nameFont * 0.5 : 0
  const labelGap =
    ringOuter +
    nameFont * (isHorizontal ? 1.25 : 2.5 / VERTICAL_NAME_SIZE_UNITS)

  return {
    x,
    orientation,
    nameFont,
    labelLineHeight,
    lineBox,
    mainPitch,
    lanePitch,
    padding,
    verticalLabelWidth,
    labelClearance,
    labelMaxWidth,
    labelGap,
    labelBandTop,
    labelBandBottom,
    labelSideLeft: labelSide,
    labelSideRight: labelSide,
    endPad,
    strokeWidth,
    tickProtrude,
    ringOuter,
    ringStroke,
  }
}

export type BranchStripLabelSide =
  "above" | "below" | "left" | "right" | "stub-above"

export type BranchStripLabelPlacement = {
  id: string
  side: BranchStripLabelSide
  /** Estimated content box in layout coordinates (before SVG/label padding). */
  box: { x: number; y: number; w: number; h: number }
}

export type BranchStripLabelOptions = {
  orientation: SchematicOrientation
  nameFont: number
  labelMaxWidth: number
  verticalLabelWidth: number
  labelClearance: number
  labelGap: number
  /** Estimated lines of wrapped station text (1–2). */
  estimatedLines?: number
  /** Defaults to `BRANCH_STRIP_LABEL_LINE_HEIGHT`. */
  labelLineHeight?: number
}

const boxesOverlap = (
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
  pad = 0
): boolean =>
  a.x - pad < b.x + b.w &&
  a.x + a.w + pad > b.x &&
  a.y - pad < b.y + b.h &&
  a.y + a.h + pad > b.y

export const findOverlappingLabelPairs = (
  placements: readonly BranchStripLabelPlacement[],
  pad = 2
): Array<[string, string]> => {
  const pairs: Array<[string, string]> = []
  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      const a = placements[i]!
      const b = placements[j]!
      if (boxesOverlap(a.box, b.box, pad)) {
        pairs.push([a.id, b.id])
      }
    }
  }
  return pairs
}

/** Local rightmost lane labels right; others left — keeps CX clear of Bank. */
export const verticalLabelOnLeft = (
  point: SchematicLayoutPoint,
  layout: Pick<SchematicLayout, "points" | "minLane" | "maxLane">
): boolean => {
  const laneMid = (layout.minLane + layout.maxLane) / 2
  const nearby = layout.points.filter((p) => Math.abs(p.pos - point.pos) <= 1)
  const localMaxLane = Math.max(...nearby.map((p) => p.lane))
  const localMinLane = Math.min(...nearby.map((p) => p.lane))
  if (localMaxLane === localMinLane) {
    return point.lane <= laneMid
  }
  return point.lane < localMaxLane
}

/**
 * Place every station label. Cross-axis stubs (short arc spurs that still
 * read as mostly cross-track) sit above the stub tip.
 */
export const placeBranchStripLabels = (
  layout: SchematicLayout,
  options: BranchStripLabelOptions
): BranchStripLabelPlacement[] => {
  const {
    orientation,
    nameFont,
    labelMaxWidth,
    verticalLabelWidth,
    labelClearance,
    labelGap,
    estimatedLines = 2,
    labelLineHeight = BRANCH_STRIP_LABEL_LINE_HEIGHT,
  } = options
  const isHorizontal = orientation === "horizontal"
  const laneMid = (layout.minLane + layout.maxLane) / 2
  const textH = nameFont * labelLineHeight * estimatedLines

  return layout.points.flatMap((point): BranchStripLabelPlacement[] => {
    if (point.kind === "virtual") return []
    if (isHorizontal) {
      const labelAbove = point.lane <= laneMid
      const w = labelMaxWidth
      const h = textH
      const x = point.x - w / 2
      const y = labelAbove
        ? point.y - labelClearance - h
        : point.y + labelClearance
      return [
        {
          id: point.id,
          side: labelAbove ? "above" : "below",
          box: { x, y, w, h },
        },
      ]
    }

    // Vertical: spur tips with dominant cross-axis track → above.
    if (point.trackAxis === "x") {
      const w = verticalLabelWidth
      const h = textH
      return [
        {
          id: point.id,
          side: "stub-above",
          box: {
            x: point.x - w / 2,
            y: point.y - labelClearance - h,
            w,
            h,
          },
        },
      ]
    }

    const onLeft = verticalLabelOnLeft(point, layout)
    const w = verticalLabelWidth
    const h = textH
    return [
      {
        id: point.id,
        side: onLeft ? "left" : "right",
        box: {
          x: onLeft ? point.x - labelGap - w : point.x + labelGap,
          y: point.y - h / 2,
          w,
          h,
        },
      },
    ]
  })
}
