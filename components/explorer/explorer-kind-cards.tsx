"use client"

import { useId } from "react"
import { BusNumberChip } from "@/components/tfl/arrivals/bus-number-chip"
import { UNDERGROUND_LINE_COLOURS } from "@/lib/tfl/brand-colours"
import { applyBrandNightMethod } from "@/lib/tfl/dark-line-colours"
import { LINE_DIAGRAM } from "@/lib/tfl/line-diagram"

const U = UNDERGROUND_LINE_COLOURS

const LINE_COLOR = {
  bakerloo: U.bakerloo.hex,
  central: U.central.hex,
  victoria: U.victoria.hex,
  district: U.district.hex,
  circle: U.circle.hex,
}

/** Core Underground dark-map fills — one each, no repeats. */
const POINT_DOT_COLORS = [
  applyBrandNightMethod(U.bakerloo.hex),
  applyBrandNightMethod(U.central.hex),
  applyBrandNightMethod(U.victoria.hex),
  applyBrandNightMethod(U.district.hex),
  applyBrandNightMethod(U.piccadilly.hex),
  applyBrandNightMethod(U.hammersmithCity.hex),
  applyBrandNightMethod(U.metropolitan.hex),
] as const

/** Uniform satellite station-dot radius */
const SATELLITE_R = 10
const K45 = Math.SQRT1_2
const SHADOW_D = 180

const shadowPath = (cx: number, cy: number, r: number) => {
  const k = r * K45
  return `M ${cx - k} ${cy + k} L ${cx - k + SHADOW_D} ${cy + k + SHADOW_D} L ${cx + k + SHADOW_D} ${cy - k + SHADOW_D} L ${cx + k} ${cy - k} Z`
}

/** Perpendicular tick on a 45° line (slope = −1) centred at (cx, cy). */
const perpTick = (cx: number, cy: number, half: number) => ({
  x1: cx - half,
  y1: cy + half,
  x2: cx + half,
  y2: cy - half,
})

/**
 * Issue 4 §5: tick thickness = line (1x); each side protrudes 0.66x.
 * Total length = 1x + 0.66x × 2 = 2.32x → half from centre = 1.16x.
 */
const tickHalfLength = (lineX: number) =>
  lineX / 2 + LINE_DIAGRAM.stationTick * lineX

const leftTerminal = (offset: number, pad = 28) => {
  const xAtTop = pad - offset
  if (xAtTop >= pad && xAtTop <= 372) {
    return { x: xAtTop, y: pad }
  }
  return { x: pad, y: pad + offset }
}

const SATELLITES = [
  { cx: 140, cy: 40 },
  { cx: 90, cy: 50 },
  { cx: 310, cy: 45 },
  { cx: 280, cy: 100 },
  { cx: 70, cy: 150 },
  { cx: 130, cy: 165 },
  { cx: 320, cy: 160 },
] as const

const GrainFilter = ({ id }: { id: string }) => (
  <filter id={id} x="0%" y="0%" width="100%" height="100%">
    <feTurbulence
      type="fractalNoise"
      baseFrequency="0.65"
      numOctaves="3"
      result="noise"
    />
    <feColorMatrix
      type="matrix"
      values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.12 0"
    />
    <feBlend mode="overlay" in="SourceGraphic" in2="noise" />
  </filter>
)

export const PointsSvgArt = () => {
  const rawId = useId()
  const id = rawId.replace(/:/g, "")
  const bgGradId = `points-bg-${id}`
  const grainFilterId = `points-grain-${id}`

  return (
    <svg
      viewBox="0 0 400 225"
      preserveAspectRatio="xMidYMid slice"
      className="size-full h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={bgGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="50%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <GrainFilter id={grainFilterId} />
      </defs>

      <rect width="400" height="225" fill={`url(#${bgGradId})`} />
      <rect
        width="400"
        height="225"
        filter={`url(#${grainFilterId})`}
        opacity="0.4"
        style={{ mixBlendMode: "overlay" }}
      />

      <g
        stroke="#CBD5E1"
        strokeWidth="1.2"
        strokeDasharray="4 4"
        opacity="0.35"
      >
        {SATELLITES.map((d) => (
          <line
            key={`link-${d.cx}-${d.cy}`}
            x1={d.cx}
            y1={d.cy}
            x2="200"
            y2="112"
          />
        ))}
      </g>

      <g fill="#020617" opacity="0.45">
        {SATELLITES.map((d) => (
          <path
            key={`sh-${d.cx}-${d.cy}`}
            d={shadowPath(d.cx, d.cy, SATELLITE_R)}
          />
        ))}
      </g>
      <path d={shadowPath(200, 112, 32)} fill="#000000" opacity="0.45" />

      {SATELLITES.map((d, i) => (
        <circle
          key={`dot-${d.cx}-${d.cy}`}
          cx={d.cx}
          cy={d.cy}
          r={SATELLITE_R}
          fill="#FFFFFF"
          stroke={POINT_DOT_COLORS[i]}
          strokeWidth="3.5"
        />
      ))}

      <circle
        cx="200"
        cy="112"
        r="32"
        fill="#FFFFFF"
        stroke="#000000"
        strokeWidth="10"
      />
    </svg>
  )
}

type Route45 = {
  id: string
  offset: number
  color: string
  strokeWidth: number
  /** Hub in the middle of the card — line runs from here to bottom-right. */
  fromHub?: { x: number; y: number }
  stops: number[]
}

const SATELLITE_STROKE = 7

const RouteStroke = ({
  route,
  left,
}: {
  route: Route45
  left: { x: number; y: number }
}) => {
  const far = { x: 520, y: 520 + route.offset }
  const start = route.fromHub ?? left
  const end = far
  const x = route.strokeWidth
  const half = tickHalfLength(x)
  const startTick = perpTick(start.x, start.y, half)

  return (
    <g stroke={route.color} strokeLinecap="butt">
      <line x1={start.x} y1={start.y} x2={end.x} y2={end.y} strokeWidth={x} />
      <line {...startTick} strokeWidth={x} />
      {route.stops.map((t) => {
        const cx = start.x + (end.x - start.x) * t
        const cy = start.y + (end.y - start.y) * t
        if (cx < 8 || cx > 392 || cy < 8 || cy > 217) return null
        return (
          <line
            key={t}
            {...perpTick(cx, cy, half)}
            strokeWidth={LINE_DIAGRAM.stationTick * x}
          />
        )
      })}
    </g>
  )
}

const BUS_CHIPS = [
  { label: "12", x: 26, y: 34 },
  { label: "73", x: 64, y: 43 },
  { label: "N9", x: 84, y: 38 },
  { label: "38", x: 18, y: 81 },
] as const

export const LinesKindArt = () => {
  const rawId = useId()
  const id = rawId.replace(/:/g, "")
  const bgGradId = `lines-bg-${id}`
  const grainFilterId = `lines-grain-${id}`

  const hub = { x: 200, y: 112 }

  const routes: Route45[] = [
    {
      id: "bakerloo",
      offset: -188,
      color: LINE_COLOR.bakerloo,
      strokeWidth: SATELLITE_STROKE,
      stops: [0.12, 0.28],
    },
    {
      id: "victoria",
      offset: -128,
      color: LINE_COLOR.victoria,
      strokeWidth: SATELLITE_STROKE,
      stops: [0.18, 0.4],
    },
    {
      id: "central",
      offset: hub.y - hub.x,
      color: LINE_COLOR.central,
      strokeWidth: 16,
      fromHub: hub,
      stops: [0.18, 0.38, 0.58],
    },
    {
      id: "district",
      offset: -18,
      color: LINE_COLOR.district,
      strokeWidth: SATELLITE_STROKE,
      stops: [0.2, 0.45],
    },
    {
      id: "circle",
      offset: 58,
      color: LINE_COLOR.circle,
      strokeWidth: SATELLITE_STROKE,
      stops: [0.16, 0.38],
    },
  ]

  return (
    <div className="relative size-full overflow-hidden transition-transform duration-500 group-hover:scale-105">
      <svg
        viewBox="0 0 400 225"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full object-cover"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={bgGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#31124D" />
            <stop offset="50%" stopColor="#4A1D6B" />
            <stop offset="100%" stopColor="#1E0A36" />
          </linearGradient>
          <GrainFilter id={grainFilterId} />
        </defs>

        <rect width="400" height="225" fill={`url(#${bgGradId})`} />
        <rect
          width="400"
          height="225"
          filter={`url(#${grainFilterId})`}
          opacity="0.35"
          style={{ mixBlendMode: "overlay" }}
        />

        {routes.map((route) => (
          <RouteStroke
            key={route.id}
            route={route}
            left={leftTerminal(route.offset)}
          />
        ))}
      </svg>

      {BUS_CHIPS.map((chip) => (
        <div
          key={chip.label}
          className="pointer-events-none absolute z-1 -translate-x-1/2 -translate-y-1/2 rotate-45"
          style={{ left: `${chip.x}%`, top: `${chip.y}%` }}
        >
          <BusNumberChip label={chip.label} />
        </div>
      ))}
    </div>
  )
}
