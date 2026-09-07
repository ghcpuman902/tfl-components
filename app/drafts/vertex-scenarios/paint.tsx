import {
  DIAGRAM_BASELINE,
  LINE_DIAGRAM,
  interchangeOuterRadius,
  interchangeStroke,
  scale,
} from "@/lib/tfl/line-diagram"
import type { DirectedMove } from "@/lib/tfl/investigate/vertex-scenarios/types"

export type Pt = { x: number; y: number }
export type ActiveMove = DirectedMove | null

export const LINE_X = DIAGRAM_BASELINE.horizontal
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

export const Tick = ({
  x,
  y,
  axis,
  label,
  labelAt,
}: {
  x: number
  y: number
  axis: "h" | "v"
  label: string
  labelAt: Pt
}) => {
  const stroke = LINE_X
  return (
    <g>
      <rect
        x={axis === "h" ? x - stroke : x - stroke * 0.45}
        y={axis === "h" ? y - stroke * 0.45 : y - stroke}
        width={axis === "h" ? stroke * 2 : stroke * 0.9}
        height={axis === "h" ? stroke * 0.9 : stroke * 2}
        fill={PAINT}
      />
      <text
        x={labelAt.x}
        y={labelAt.y}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-foreground font-medium"
        fontSize={12}
      >
        {label}
      </text>
    </g>
  )
}

export const Ring = ({ x, y }: { x: number; y: number }) => {
  const ring = interchangeOuterRadius(LINE_X)
  const ringStroke = interchangeStroke(LINE_X)
  return (
    <g>
      <circle
        cx={x}
        cy={y}
        r={ring - ringStroke / 2}
        fill="var(--background)"
        stroke="var(--foreground)"
        strokeWidth={ringStroke}
      />
      <text
        x={x}
        y={y + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-foreground font-medium"
        fontSize={11}
      >
        S
      </text>
    </g>
  )
}

export const Bond = ({ a, b }: { a: Pt; b: Pt }) => (
  <g>
    <title>Walking interchange, no through-run</title>
    <line
      x1={a.x}
      y1={a.y}
      x2={b.x}
      y2={b.y}
      stroke={PAINT}
      strokeWidth={scale(LINE_X, LINE_DIAGRAM.interchange.neckWidth)}
    />
    <line
      x1={a.x}
      y1={a.y}
      x2={b.x}
      y2={b.y}
      stroke="var(--background)"
      strokeWidth={scale(LINE_X, LINE_DIAGRAM.interchange.bridgeWhite)}
    />
  </g>
)

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
    strokeWidth={on ? LINE_X * 1.7 : LINE_X}
    strokeLinecap="butt"
    opacity={opacityFor(active, on)}
  />
)
