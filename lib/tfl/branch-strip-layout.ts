import type {
  SchematicLayout,
  SchematicLayoutPoint,
  SchematicOrientation,
} from "@/lib/tfl/schematic-layout";

/**
 * Pure label placement for BranchStrip — shared by the UI and regression tests.
 *
 * After edits, verify visually at http://localhost:3999/components/branch-strip
 * (see checklist on `BranchStrip`).
 */

export type BranchStripLabelSide =
  | "above"
  | "below"
  | "left"
  | "right"
  | "stub-above";

export type BranchStripLabelPlacement = {
  id: string;
  side: BranchStripLabelSide;
  /** Estimated content box in layout coordinates (before SVG/label padding). */
  box: { x: number; y: number; w: number; h: number };
};

export type BranchStripLabelOptions = {
  orientation: SchematicOrientation;
  nameFont: number;
  labelMaxWidth: number;
  verticalLabelWidth: number;
  labelClearance: number;
  labelGap: number;
  /** Estimated lines of wrapped station text (1–2). */
  estimatedLines?: number;
};

const boxesOverlap = (
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
  pad = 0,
): boolean =>
  a.x - pad < b.x + b.w &&
  a.x + a.w + pad > b.x &&
  a.y - pad < b.y + b.h &&
  a.y + a.h + pad > b.y;

export const findOverlappingLabelPairs = (
  placements: readonly BranchStripLabelPlacement[],
  pad = 2,
): Array<[string, string]> => {
  const pairs: Array<[string, string]> = [];
  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      const a = placements[i]!;
      const b = placements[j]!;
      if (boxesOverlap(a.box, b.box, pad)) {
        pairs.push([a.id, b.id]);
      }
    }
  }
  return pairs;
};

/** Local rightmost lane labels right; others left — keeps CX clear of Bank. */
export const verticalLabelOnLeft = (
  point: SchematicLayoutPoint,
  layout: Pick<SchematicLayout, "points" | "minLane" | "maxLane">,
): boolean => {
  const laneMid = (layout.minLane + layout.maxLane) / 2;
  const nearby = layout.points.filter((p) => Math.abs(p.pos - point.pos) <= 1);
  const localMaxLane = Math.max(...nearby.map((p) => p.lane));
  const localMinLane = Math.min(...nearby.map((p) => p.lane));
  if (localMaxLane === localMinLane) {
    return point.lane <= laneMid;
  }
  return point.lane < localMaxLane;
};

/**
 * Place every station label. Cross-axis stubs (short Bezier spurs that still
 * read as mostly cross-track) sit above the stub tip.
 */
export const placeBranchStripLabels = (
  layout: SchematicLayout,
  options: BranchStripLabelOptions,
): BranchStripLabelPlacement[] => {
  const {
    orientation,
    nameFont,
    labelMaxWidth,
    verticalLabelWidth,
    labelClearance,
    labelGap,
    estimatedLines = 2,
  } = options;
  const isHorizontal = orientation === "horizontal";
  const laneMid = (layout.minLane + layout.maxLane) / 2;
  const textH = nameFont * 1.15 * estimatedLines;

  return layout.points.map((point) => {
    if (isHorizontal) {
      const labelAbove = point.lane <= laneMid;
      const w = labelMaxWidth;
      const h = textH;
      const x = point.x - w / 2;
      const y = labelAbove
        ? point.y - labelClearance - h
        : point.y + labelClearance;
      return {
        id: point.id,
        side: labelAbove ? "above" : "below",
        box: { x, y, w, h },
      };
    }

    // Vertical: spur tips with dominant cross-axis track → above.
    if (point.trackAxis === "x") {
      const w = verticalLabelWidth;
      const h = textH;
      return {
        id: point.id,
        side: "stub-above",
        box: {
          x: point.x - w / 2,
          y: point.y - labelClearance - h,
          w,
          h,
        },
      };
    }

    const onLeft = verticalLabelOnLeft(point, layout);
    const w = verticalLabelWidth;
    const h = textH;
    return {
      id: point.id,
      side: onLeft ? "left" : "right",
      box: {
        x: onLeft ? point.x - labelGap - w : point.x + labelGap,
        y: point.y - h / 2,
        w,
        h,
      },
    };
  });
};
