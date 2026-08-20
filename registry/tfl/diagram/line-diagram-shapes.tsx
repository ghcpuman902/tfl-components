import { cn } from "@/lib/utils"
import {
  bend90Path,
  continuationArrowPoints,
  interchangeOuterRadius,
  interchangeStroke,
  LINE_DIAGRAM,
  scale,
  stationTickRect,
} from "@/lib/tfl/line-diagram"

type ShapeProps = {
  /** Route line thickness in CSS pixels (= unit x). Default 12. */
  x?: number
  className?: string
  /** Line / fill colour for the route. */
  color?: string
}

const DEFAULT_X = 12

/** Solid route segment with a 0.66x station tick. */
export const DiagramStationTick = ({
  x = DEFAULT_X,
  className,
  color = "#DC241F",
}: ShapeProps) => {
  const w = scale(x, 6)
  const h = scale(x, 3)
  const cy = h / 2
  const tick = stationTickRect(w * 0.45, cy, x)
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn("overflow-visible", className)}
      role="img"
      aria-label="Station tick"
    >
      <rect y={cy - x / 2} width={w} height={x} fill={color} />
      <rect
        x={tick.x}
        y={cy - x / 2 - tick.height}
        width={tick.width}
        height={tick.height}
        fill={color}
      />
    </svg>
  )
}

/** Parallel (non-Underground) double line as used on the Tube map. */
export const DiagramParallelLines = ({
  x = DEFAULT_X,
  className,
  color = "#00AFAD",
}: ShapeProps) => {
  const stroke = scale(x, LINE_DIAGRAM.parallel.stroke)
  const gap = scale(x, LINE_DIAGRAM.parallel.gap)
  const total = stroke * 2 + gap
  const w = scale(x, 8)
  return (
    <svg
      viewBox={`0 0 ${w} ${total}`}
      className={cn("overflow-visible", className)}
      role="img"
      aria-label="Parallel route lines"
    >
      <rect y={0} width={w} height={stroke} fill={color} />
      <rect y={stroke + gap} width={w} height={stroke} fill={color} />
    </svg>
  )
}

/** 90° bend with innermost radius R3x. */
export const DiagramBend90 = ({
  x = DEFAULT_X,
  className,
  color = "#F589A6",
}: ShapeProps) => {
  const pad = scale(x, 1)
  const r = scale(x, LINE_DIAGRAM.innerCurveRadius + 0.5)
  const size = r + pad * 2 + x
  const startX = pad
  const startY = pad + x / 2
  const d = bend90Path(startX, startY, x, "down-right")
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={cn("overflow-visible", className)}
      role="img"
      aria-label="90 degree bend radius 3x"
    >
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={x}
        strokeLinecap="butt"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Continuation arrow head (§7). */
export const DiagramArrowHead = ({
  x = DEFAULT_X,
  className,
  color = "#B26300",
}: ShapeProps) => {
  const tipX = scale(x, 5)
  const cy = scale(x, 2)
  const w = tipX + scale(x, 0.5)
  const h = scale(x, 4)
  const points = continuationArrowPoints(tipX, cy, x, 1)
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn("overflow-visible", className)}
      role="img"
      aria-label="Continuation arrow head"
    >
      <rect
        x={0}
        y={cy - x / 2}
        width={Math.max(0, tipX - scale(x, 2))}
        height={x}
        fill={color}
      />
      <polygon points={points} fill={color} />
    </svg>
  )
}

/** Single interchange ring on a route line (§8). */
export const DiagramInterchangeCircle = ({
  x = DEFAULT_X,
  className,
  color = "#DC241F",
}: ShapeProps) => {
  const outer = interchangeOuterRadius(x)
  const stroke = interchangeStroke(x)
  const size = outer * 2 + scale(x, 2)
  const cx = size / 2
  const cy = size / 2
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className={cn("overflow-visible", className)}
      role="img"
      aria-label="Interchange circle"
    >
      <rect y={cy - x / 2} width={size} height={x} fill={color} />
      <circle
        cx={cx}
        cy={cy}
        r={outer - stroke / 2}
        className="fill-white stroke-black dark:fill-black dark:stroke-white"
        strokeWidth={stroke}
      />
    </svg>
  )
}

/** Dumbbell / bridged double interchange (§8). */
export const DiagramInterchangeDumbbell = ({
  x = DEFAULT_X,
  className,
}: ShapeProps) => {
  const outer = interchangeOuterRadius(x)
  const stroke = interchangeStroke(x)
  const neckW = scale(x, LINE_DIAGRAM.interchange.neckWidth)
  const gap = scale(x, LINE_DIAGRAM.interchange.bridgeWhite)
  const sizeW = outer * 2 + scale(x, 1)
  const cy1 = outer + scale(x, 0.25)
  // Centre distance = outer + inner = 1.5x + 1x = 2.5x
  const cy2 = cy1 + scale(x, 2.5)
  const cx = sizeW / 2
  const h = cy2 + outer + scale(x, 0.25)
  return (
    <svg
      viewBox={`0 0 ${sizeW} ${h}`}
      className={cn("overflow-visible", className)}
      role="img"
      aria-label="Dumbbell interchange"
    >
      <circle
        cx={cx}
        cy={cy1}
        r={outer - stroke / 2}
        className="fill-white stroke-black dark:fill-black dark:stroke-white"
        strokeWidth={stroke}
      />
      <circle
        cx={cx}
        cy={cy2}
        r={outer - stroke / 2}
        className="fill-white stroke-black dark:fill-black dark:stroke-white"
        strokeWidth={stroke}
      />
      <rect
        x={cx - neckW / 2}
        y={cy1}
        width={neckW}
        height={cy2 - cy1}
        className="fill-black dark:fill-white"
      />
      <rect
        x={cx - gap / 2}
        y={cy1 - 1}
        width={gap}
        height={cy2 - cy1 + 2}
        className="fill-white dark:fill-black"
      />
    </svg>
  )
}
