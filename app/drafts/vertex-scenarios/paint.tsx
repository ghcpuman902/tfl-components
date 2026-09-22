"use client"

import {
  DEBUG_CONTENT,
  DEBUG_PADDING,
} from "@/components/tfl/diagram-anchor-box"
import { StationName } from "@/components/tfl/station-name"
import {
  diagramAtomMetrics,
  diagramLabelPad,
  interchangeBondBox,
  labelAwayFromStroke,
  labelWidthBesideNeighbor,
  travelLabelAnchor,
  type Pt as AtomPt,
} from "@/lib/tfl/diagram-atoms"
import {
  approximateStationMeasure,
  formatStationLabel,
} from "@/lib/tfl/station-typography"
import type { DirectedMove } from "@/lib/tfl/investigate/vertex-scenarios/types"
import { PORT_DEMO_NAMES } from "@/lib/tfl/investigate/vertex-scenarios/types"

export type Pt = AtomPt
export type ActiveMove = DirectedMove | null
export { PORT_DEMO_NAMES }

const metrics = diagramAtomMetrics()
export const LINE_X = metrics.x
const PAINT = "var(--foreground)"

export const opacityFor = (active: ActiveMove, on: boolean) =>
  active && !on ? 0.28 : 1

export const BlockBand = ({
  x,
  y,
  width,
  height,
}: {
  x: number
  y: number
  width: number
  height: number
}) => (
  <rect
    x={x}
    y={y}
    width={width}
    height={height}
    rx="8"
    fill="var(--muted)"
    opacity="0.45"
  />
)

/**
 * @deprecated `LaidDrawingSvg` (`diagrams.tsx`) paints marks through
 * `MoleculeAssembler`/`TickMark` in `/drafts/diagram-atoms/atoms.tsx` —
 * the shared primitive, with the asymmetric terminus/through halves this
 * plain symmetric rect does not have. Kept only for the orphaned
 * `ConstructionDrawing`.
 */
export const Tick = ({
  x,
  y,
  axis,
}: {
  x: number
  y: number
  axis: "h" | "v"
  /** @deprecated Port names are painted via `StationLabel` at the mark. */
  label?: string
  labelAt?: Pt
}) => {
  const width = axis === "h" ? metrics.tickAcross : metrics.tickAlong
  const height = axis === "h" ? metrics.tickAlong : metrics.tickAcross
  return (
    <rect
      x={x - width / 2}
      y={y - height / 2}
      width={width}
      height={height}
      fill={PAINT}
    />
  )
}

/**
 * @deprecated `LaidDrawingSvg` paints rings through `MoleculeAssembler`'s
 * `RingFill`/`RingStroke` in `/drafts/diagram-atoms/atoms.tsx`. Kept only
 * for the orphaned `ConstructionDrawing`.
 */
export const Ring = ({ x, y }: { x: number; y: number }) => (
  <g>
    <circle
      cx={x}
      cy={y}
      r={metrics.ringRadius - metrics.ringStroke / 2}
      fill="var(--background)"
      stroke={PAINT}
      strokeWidth={metrics.ringStroke}
    />
  </g>
)

/**
 * Deliberately not a canvas measure. Canvas text width needs `document`,
 * so it differs between the server's first pass and the client's first
 * pass — and that first pass is what decides `lines`/`width`/`height`
 * here, baked straight into a `<foreignObject>`'s numeric attributes and
 * `StationName`'s `layout="fixed"` lines (no post-mount remeasure to
 * paper over a mismatch, unlike `layout="auto"` elsewhere). A canvas
 * measure hydration-mismatches on every label; the char-count approximate
 * is deterministic everywhere, and `labelMaxBesideMarks` — not text
 * width — is what actually forces the wrap that matters (a name beside a
 * neighbour mark never gets more than its own half of the run).
 */
const stationMeasure = approximateStationMeasure

export type LabelBox = { x: number; y: number; width: number; height: number }

export type MarkForLabel = {
  x: number
  y: number
  kind: "station" | "boundary" | "fork"
}

/**
 * Tightest name-box cap that still keeps this label in its own half of
 * the run to a neighbouring mark — `labelWidthBesideNeighbor` from the
 * atoms. Isolated marks keep the default `labelMaxWidth`.
 */
export const labelMaxBesideMarks = (
  x: number,
  y: number,
  away: "up" | "down" | "left" | "right",
  others: readonly MarkForLabel[]
): number => {
  const along = away === "up" || away === "down" ? "x" : "y"
  const across = along === "x" ? "y" : "x"
  let budget = metrics.labelMaxWidth
  for (const other of others) {
    if (other.kind === "fork") continue
    const run = Math.abs(other[along] - (along === "x" ? x : y))
    if (run < 1) continue
    const off = Math.abs(other[across] - (across === "x" ? x : y))
    if (off > metrics.gappedBond + 1) continue
    const half =
      other.kind === "station" ? metrics.ringRadius : metrics.tickAlong / 2
    budget = Math.min(budget, labelWidthBesideNeighbor(run, half, metrics))
  }
  return budget
}

/**
 * One source of truth for a name box: which lines it wraps to (via the
 * same `formatStationLabel` word-break logic `StationName` itself uses)
 * and where the foreignObject sits relative to the mark. Used by the
 * actual render (`StationLabel`), the canvas-expansion reservation
 * (`stationLabelBox`), and label-collision checks (`stationNameAnchors`)
 * so none of them can independently drift out of sync with what really
 * renders.
 */
export const stationLabelLayout = (
  name: string,
  away: "up" | "down" | "left" | "right",
  x: number,
  y: number,
  maxWidth = metrics.labelMaxWidth
): LabelBox & { lines: string[] } => {
  const at = labelAwayFromStroke(away, x, y)
  const font = metrics.nameSize
  const maxW = Math.max(1, Math.min(metrics.labelMaxWidth, maxWidth))
  const measure = stationMeasure
  const { lines } = formatStationLabel(name, measure, {
    maxWidth: maxW,
    fontSize: font,
    maxLines: 2,
    allowAbbreviation: false,
    allowScaleDown: false,
  })
  const widest = Math.max(...lines.map((line) => measure(line, font)))
  const boxW = Math.ceil(Math.min(maxW, Math.max(font * 2.5, widest)))
  const boxH = Math.ceil(font * 1.35 * lines.length)
  const foX =
    away === "left" ? at.x - boxW : away === "right" ? at.x : at.x - boxW / 2
  const foY =
    away === "up" ? at.y - boxH : away === "down" ? at.y : at.y - boxH / 2
  return { x: foX, y: foY, width: boxW, height: boxH, lines }
}

export const StationLabel = ({
  x,
  y,
  away = "up",
  name = "Station",
  overlay = false,
  maxWidth,
}: {
  x: number
  y: number
  away?: "up" | "down" | "left" | "right"
  name?: string
  /** Paint the same green padding / grey content debug box `AnchoredStationName` does on `/drafts/diagram-atoms`. */
  overlay?: boolean
  /** Neighbour-aware cap from `labelMaxBesideMarks`. Default `labelMaxWidth`. */
  maxWidth?: number
}) => {
  const box = stationLabelLayout(name, away, x, y, maxWidth)
  // Padding on the three sides away from the mark, 0 on the side facing
  // it — same `diagramLabelPad` recipe `AnchoredStationName` uses, so the
  // padded (green) box's near edge lands exactly on `box`'s near edge
  // with no seam, and only grows outward on the far sides.
  const pad = diagramLabelPad(travelLabelAnchor(away))
  const padded = {
    x: box.x - pad.left,
    y: box.y - pad.top,
    width: box.width + pad.left + pad.right,
    height: box.height + pad.top + pad.bottom,
  }
  return (
    <>
      {overlay ? (
        <>
          <rect
            x={padded.x}
            y={padded.y}
            width={padded.width}
            height={padded.height}
            fill={DEBUG_PADDING}
          />
          <rect
            x={box.x}
            y={box.y}
            width={box.width}
            height={box.height}
            fill={DEBUG_CONTENT}
          />
        </>
      ) : null}
      <foreignObject
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        overflow="visible"
      >
        <StationName
          name={name}
          lines={box.lines}
          layout="fixed"
          fontSize={metrics.nameSize}
          maxLines={2}
          allowScaleDown={false}
          allowAbbreviation={false}
          align={away === "left" ? "right" : away === "right" ? "left" : "center"}
          className="w-full font-medium text-foreground"
          style={{ fontSize: metrics.nameSize, lineHeight: 1.15 }}
        />
      </foreignObject>
    </>
  )
}

/**
 * Full name-box reservation for expanding the SVG canvas — same layout
 * `StationLabel` paints, so the canvas grows exactly as far as the real
 * (possibly wrapped) text reaches, never short (a stale "always assume
 * the worst case" reservation) and never tight enough to clip it.
 */
export const stationLabelBox = (
  x: number,
  y: number,
  away: "up" | "down" | "left" | "right",
  name = "Station",
  maxWidth = metrics.labelMaxWidth
): LabelBox => stationLabelLayout(name, away, x, y, maxWidth)

/**
 * @deprecated `LaidDrawingSvg` paints bonds through `MoleculeAssembler`'s
 * `BondMark` in `/drafts/diagram-atoms/atoms.tsx`. Kept only for the
 * orphaned `ConstructionDrawing`.
 */
export const Bond = ({ a, b }: { a: Pt; b: Pt }) => {
  const { neck, lens } = interchangeBondBox(a, b, metrics)
  return (
    <g>
      <title>Walking interchange, no through-run</title>
      <rect
        x={neck.x}
        y={neck.y}
        width={neck.width}
        height={neck.height}
        fill={PAINT}
      />
      <rect
        x={lens.x}
        y={lens.y}
        width={lens.width}
        height={lens.height}
        fill="var(--background)"
      />
    </g>
  )
}

/**
 * Unnamed left/right pager — "i / N" caption, no per-option label. Swaps
 * for a `<select>` wherever the options are only ever "which of N", never
 * a name worth reading on its own (an arrangement, a combination, an S
 * placement).
 */
export const Pager = ({
  label,
  index,
  count,
  onChange,
}: {
  label: string
  index: number
  count: number
  onChange: (index: number) => void
}) => {
  if (count <= 1) return null
  const clamped = Math.min(index, count - 1)
  return (
    <div className="flex flex-col gap-1 text-xs text-muted-foreground">
      <span id={`${label}-pager-label`}>{label}</span>
      <div
        className="flex items-center gap-1"
        role="group"
        aria-labelledby={`${label}-pager-label`}
      >
        <button
          type="button"
          aria-label={`Previous ${label.toLowerCase()}`}
          disabled={clamped === 0}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40"
          onClick={() => onChange(clamped - 1)}
        >
          ←
        </button>
        <span
          className="min-w-12 text-center text-sm tabular-nums text-foreground"
          aria-live="polite"
        >
          {clamped + 1} / {count}
        </span>
        <button
          type="button"
          aria-label={`Next ${label.toLowerCase()}`}
          disabled={clamped === count - 1}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-border bg-background text-sm text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-40"
          onClick={() => onChange(clamped + 1)}
        >
          →
        </button>
      </div>
    </div>
  )
}

/**
 * @deprecated `LaidDrawingSvg` paints tracks through `MoleculeAssembler`'s
 * `Track` in `/drafts/diagram-atoms/atoms.tsx`, with `opacityFor` (still
 * here) supplying the same active-move dimming as a plain prop. Kept
 * only for the orphaned `ConstructionDrawing`.
 */
export const Track = ({
  a,
  b,
  on,
  active,
  d,
}: {
  a?: Pt
  b?: Pt
  on: boolean
  active: ActiveMove
  d?: string
}) => (
  <path
    d={d ?? `M ${a!.x} ${a!.y} L ${b!.x} ${b!.y}`}
    fill="none"
    stroke={PAINT}
    strokeWidth={LINE_X}
    strokeLinecap="butt"
    opacity={opacityFor(active, on)}
  />
)
