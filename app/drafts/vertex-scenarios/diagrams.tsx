/**
 * Column 1 is the unsimplified star: every arm on one S.
 * Column 3 is a separate drawing graph — stations, unlabelled forks,
 * and walking bonds — laid onto an octilinear grid.
 */

import { useId } from "react"
import {
  DIAGRAM_BASELINE,
  interchangeOuterRadius,
  interchangeStroke,
} from "@/lib/tfl/line-diagram"
import {
  buildDrawingScene,
  hasMove,
  layoutDrawing,
  pairState,
  type DirectedMatrix,
  type LayoutPolicy,
  type PatternKind,
} from "@/lib/tfl/investigate/vertex-scenarios"
import type { DrawingScene } from "@/lib/tfl/investigate/vertex-scenarios/drawing-graph"
import {
  trackPathBetween,
  type LaidDrawing,
} from "@/lib/tfl/investigate/vertex-scenarios/drawing-layout"
import type { PortId } from "@/lib/tfl/investigate/vertex-scenarios/types"
import { octilinearLanePath } from "@/lib/tfl/schematic-layout"
import { cn } from "@/lib/utils"
import {
  Bond,
  Ring,
  Tick,
  Track,
  type ActiveMove,
  type Pt,
} from "./paint"

export type { ActiveMove }

const SIZE = 320
const PAINT = "var(--foreground)"

type Pt = { x: number; y: number }

const unit = (dx: number, dy: number): Pt => {
  const length = Math.hypot(dx, dy) || 1
  return {
    x: Number((dx / length).toFixed(6)),
    y: Number((dy / length).toFixed(6)),
  }
}

const add = (a: Pt, b: Pt): Pt => ({ x: a.x + b.x, y: a.y + b.y })
const scalePt = (p: Pt, s: number): Pt => ({ x: p.x * s, y: p.y * s })
const dot = (a: Pt, b: Pt): number => a.x * b.x + a.y * b.y

const portPoint = (
  index: number,
  count: number,
  radius: number,
  centre: Pt
): Pt => {
  const angle = (index / Math.max(1, count)) * Math.PI * 2 - Math.PI / 2
  return {
    x: Number((centre.x + radius * Math.cos(angle)).toFixed(4)),
    y: Number((centre.y + radius * Math.sin(angle)).toFixed(4)),
  }
}

const inwardNormal = (outward: Pt, toward: Pt): Pt => {
  const clockwise = { x: -outward.y, y: outward.x }
  return dot(clockwise, toward) > 0
    ? clockwise
    : { x: -clockwise.x, y: -clockwise.y }
}

const curve = (from: Pt, to: Pt, centre: Pt, side: 1 | -1): string => {
  const ua = unit(from.x - centre.x, from.y - centre.y)
  const ub = unit(to.x - centre.x, to.y - centre.y)
  if (dot(ua, ub) < -0.99) {
    const normal = { x: -ua.y * 36, y: ua.x * 36 }
    const start = add(centre, scalePt(ua, 72))
    const end = add(centre, scalePt(ub, 72))
    return `M ${start.x} ${start.y} C ${start.x + normal.x} ${start.y + normal.y}, ${end.x + normal.x} ${end.y + normal.y}, ${end.x} ${end.y}`
  }
  const nA = inwardNormal(ua, ub)
  const far = Math.hypot(from.x - centre.x, from.y - centre.y) * 0.72
  const p0 = add(add(centre, scalePt(ua, far)), scalePt(nA, 4 * side))
  const p3 = add(
    add(centre, scalePt(ub, far)),
    scalePt(inwardNormal(ub, ua), 4 * side)
  )
  const handle = far * 0.55
  const p1 = add(p0, scalePt(ua, -handle))
  const p2 = add(p3, scalePt(ub, -handle))
  return `M ${p0.x.toFixed(1)} ${p0.y.toFixed(1)} C ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} ${p3.x.toFixed(1)} ${p3.y.toFixed(1)}`
}

const isActive = (active: ActiveMove, from: string, to: string) =>
  active != null && active.from === from && active.to === to

export const RawVertexSvg = ({
  matrix,
  active,
}: {
  matrix: DirectedMatrix
  active: ActiveMove
}) => {
  const x = DIAGRAM_BASELINE.horizontal
  const centre: Pt = { x: SIZE / 2, y: SIZE / 2 }
  const arm = SIZE * 0.36
  const ring = interchangeOuterRadius(x)
  const ringStroke = interchangeStroke(x)
  const ports = matrix.ports
  const points = new Map(
    ports.map((port, index) => [
      port,
      portPoint(index, ports.length, arm, centre),
    ])
  )
  const markerId = useId().replace(/:/g, "")
  const pairs = ports.flatMap((from, i) =>
    ports.slice(i + 1).map((to) => [from, to] as const)
  )

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role="img"
      aria-label="Raw single vertex"
      className="h-auto w-full overflow-visible"
    >
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="5"
          markerHeight="5"
          orient="auto"
        >
          <path d="M 0 1.5 L 9 5 L 0 8.5 z" fill={PAINT} />
        </marker>
      </defs>
      {ports.map((port) => {
        const point = points.get(port)!
        const onArm =
          active != null && (active.from === port || active.to === port)
        return (
          <line
            key={`arm-${port}`}
            x1={centre.x}
            y1={centre.y}
            x2={point.x}
            y2={point.y}
            stroke={PAINT}
            strokeWidth={x}
            opacity={active && !onArm ? 0.28 : 1}
          />
        )
      })}
      {pairs.flatMap(([a, b]) => {
        const from = points.get(a)
        const to = points.get(b)
        if (!from || !to) return []
        const ab = hasMove(matrix, a, b)
        const ba = hasMove(matrix, b, a)
        const marks: {
          from: PortId
          to: PortId
          allowed: boolean
          side: 1 | -1
        }[] = []
        if (ab && ba) {
          marks.push({ from: a, to: b, allowed: true, side: 1 })
          marks.push({ from: b, to: a, allowed: true, side: -1 })
        } else if (ab) {
          marks.push({ from: a, to: b, allowed: true, side: 1 })
        } else if (ba) {
          marks.push({ from: b, to: a, allowed: true, side: 1 })
        } else {
          marks.push({ from: a, to: b, allowed: false, side: 1 })
        }
        return marks.map((mark) => {
          const on = isActive(active, mark.from, mark.to)
          return (
            <path
              key={`${mark.from}>${mark.to}`}
              d={curve(
                points.get(mark.from)!,
                points.get(mark.to)!,
                centre,
                mark.side
              )}
              fill="none"
              stroke={mark.allowed ? PAINT : "var(--muted-foreground)"}
              strokeWidth={on ? 2.4 : 1.2}
              strokeDasharray={mark.allowed ? undefined : "5 4"}
              markerEnd={mark.allowed ? `url(#${markerId})` : undefined}
              opacity={active && !on ? 0.2 : mark.allowed ? 1 : 0.7}
            >
              <title>
                {mark.allowed
                  ? `${mark.from} → ${mark.to} via S`
                  : `No through-move ${a}–${b} via S`}
              </title>
            </path>
          )
        })
      })}
      {ports.map((port) => {
        const point = points.get(port)!
        const outward = unit(point.x - centre.x, point.y - centre.y)
        return (
          <g key={`port-${port}`}>
            <rect
              x={point.x - x * 0.45}
              y={point.y - x}
              width={x * 0.9}
              height={x * 2}
              fill={PAINT}
              transform={`rotate(${((Math.atan2(outward.y, outward.x) * 180) / Math.PI).toFixed(3)} ${point.x} ${point.y})`}
            />
            <text
              x={point.x + outward.x * 16}
              y={point.y + outward.y * 16}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-foreground font-medium"
              fontSize={12}
            >
              {port}
            </text>
          </g>
        )
      })}
      <circle
        cx={centre.x}
        cy={centre.y}
        r={ring - ringStroke / 2}
        fill="var(--background)"
        stroke="var(--foreground)"
        strokeWidth={ringStroke}
      />
      <text
        x={centre.x}
        y={centre.y + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-foreground font-medium"
        fontSize={11}
      >
        S
      </text>
    </svg>
  )
}

const pairOn = (active: ActiveMove, a: string, b: string) =>
  active != null &&
  ((active.from === a && active.to === b) ||
    (active.from === b && active.to === a))

const neighbourOf = (laid: LaidDrawing, id: string) => {
  const edge = laid.tracks.find((track) => track.a === id || track.b === id)
  if (!edge) return null
  const otherId = edge.a === id ? edge.b : edge.a
  return laid.nodes.find((node) => node.id === otherId) ?? null
}

const LaidDrawingSvg = ({
  scene,
  active,
  policy,
}: {
  scene: DrawingScene
  active: ActiveMove
  policy?: LayoutPolicy
}) => {
  const laid = layoutDrawing(scene, policy)
  const lit =
    active != null ? trackPathBetween(scene, active.from, active.to) : new Set()
  const byId = new Map(laid.nodes.map((node) => [node.id, node]))
  return (
    <svg
      viewBox={`0 0 ${laid.width} ${laid.height}`}
      role="img"
      aria-label={scene.title}
      className="h-auto w-full overflow-visible"
    >
      {laid.tracks.map((edge) => (
        <Track key={edge.id} d={edge.d} on={lit.has(edge.id)} active={active} />
      ))}
      {laid.bonds.map((edge) => {
        const a = byId.get(edge.a)
        const b = byId.get(edge.b)
        if (!a || !b) return null
        return <Bond key={edge.id} a={a} b={b} />
      })}
      {laid.nodes
        .filter((node) => node.kind === "station")
        .map((node) => (
          <Ring key={node.id} x={node.x} y={node.y} />
        ))}
      {laid.nodes
        .filter((node) => node.kind === "boundary" && node.port)
        .map((node) => {
          const neighbour = neighbourOf(laid, node.id)
          const dx = neighbour ? node.x - neighbour.x : -1
          const dy = neighbour ? node.y - neighbour.y : 0
          const length = Math.hypot(dx, dy) || 1
          const axis = Math.abs(dx) >= Math.abs(dy) ? "v" : "h"
          return (
            <Tick
              key={node.id}
              x={node.x}
              y={node.y}
              axis={axis}
              label={node.port!}
              labelAt={{
                x: node.x + (dx / length) * 16,
                y: node.y + (dy / length) * 16,
              }}
            />
          )
        })}
    </svg>
  )
}

const TriangleDrawing = ({
  active,
  mirror,
}: {
  active: ActiveMove
  mirror: boolean
}) => {
  const ab = pairOn(active, "A", "B"),
    ac = pairOn(active, "A", "C"),
    bc = pairOn(active, "B", "C")
  const px = (x: number) => (mirror ? 320 - x : x)
  return (
    <div>
      <svg
        viewBox="0 0 320 200"
        role="img"
        aria-label={
          mirror
            ? "All three pairs, A on the right"
            : "All three pairs, A on the left"
        }
        className="h-auto w-full"
      >
        <g transform={mirror ? "translate(320 0) scale(-1 1)" : undefined}>
          <Track
            a={{ x: 32, y: 100 }}
            b={{ x: 72, y: 100 }}
            on={ab || ac}
            active={active}
          />
          <Track
            d={`${octilinearLanePath(72, 100, 136, 60, 18)} L 248 60`}
            on={ab}
            active={active}
          />
          <Track
            d={`${octilinearLanePath(72, 100, 136, 140, 18)} L 248 140`}
            on={ac}
            active={active}
          />
          <Track
            d="M 248 60 L 232 60 A 24 24 0 0 0 208 84 L 208 116 A 24 24 0 0 0 232 140 L 248 140"
            on={bc}
            active={active}
          />
          <Track
            a={{ x: 248, y: 60 }}
            b={{ x: 288, y: 60 }}
            on={ab || bc}
            active={active}
          />
          <Track
            a={{ x: 248, y: 140 }}
            b={{ x: 288, y: 140 }}
            on={ac || bc}
            active={active}
          />
          <Bond a={{ x: 150, y: 60 }} b={{ x: 150, y: 140 }} />
          <Bond a={{ x: 150, y: 100 }} b={{ x: 208, y: 100 }} />
        </g>
        <Ring x={px(150)} y={60} />
        <Ring x={px(150)} y={140} />
        <Ring x={px(208)} y={100} />
        <Tick
          x={px(32)}
          y={100}
          axis="v"
          label="A"
          labelAt={{ x: px(16), y: 100 }}
        />
        <Tick
          x={px(288)}
          y={60}
          axis="v"
          label="B"
          labelAt={{ x: px(304), y: 60 }}
        />
        <Tick
          x={px(288)}
          y={140}
          axis="v"
          label="C"
          labelAt={{ x: px(304), y: 140 }}
        />
      </svg>
    </div>
  )
}

export const SimplifiedTopologySvg = ({
  kind,
  variant,
  active,
  policy,
}: {
  kind: PatternKind
  variant: string
  active: ActiveMove
  policy?: LayoutPolicy
}) => {
  if (kind === "triangle") {
    return (
      <TriangleDrawing
        active={active}
        mirror={policy?.primary === "left"}
      />
    )
  }
  const scene = buildDrawingScene(kind, variant)
  if (!scene) {
    return (
      <p className="text-sm text-muted-foreground">
        Not a degree-2 or degree-3 building block.
      </p>
    )
  }
  return <LaidDrawingSvg scene={scene} active={active} policy={policy} />
}

export const DirectedMatrixTable = ({
  matrix,
  active,
  onActivate,
}: {
  matrix: DirectedMatrix
  active: ActiveMove
  onActivate: (move: ActiveMove) => void
}) => {
  const ports = matrix.ports
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-max border-collapse text-xs">
        <caption className="sr-only">
          From row through S to column.
        </caption>
        <thead>
          <tr>
            <th className="border border-border bg-muted/40 p-1.5 text-left font-medium text-muted-foreground">
              from \ to
            </th>
            {ports.map((port) => (
              <th
                key={port}
                className="border border-border bg-muted/40 p-1.5 text-center font-medium text-muted-foreground"
              >
                {port}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {ports.map((from) => (
            <tr key={from}>
              <th className="border border-border bg-muted/40 p-1.5 text-left font-medium text-muted-foreground">
                {from}
              </th>
              {ports.map((to) => {
                if (from === to) {
                  return (
                    <td
                      key={to}
                      className="border border-border bg-muted/20 p-1.5 text-center text-muted-foreground"
                    >
                      —
                    </td>
                  )
                }
                const allowed = hasMove(matrix, from, to)
                const state = pairState(matrix, from, to)
                const on = isActive(active, from, to)
                const mark = !allowed ? "·" : state === "both" ? "↔" : "→"
                return (
                  <td key={to} className="border border-border p-0">
                    <button
                      type="button"
                      aria-pressed={on}
                      aria-label={`${from} through S to ${to}${allowed ? "" : ", not permitted"}`}
                      onClick={() => onActivate(on ? null : { from, to })}
                      className={cn(
                        "flex h-8 w-full min-w-8 cursor-pointer items-center justify-center",
                        !allowed && "bg-muted/40 text-muted-foreground",
                        allowed &&
                          state === "both" &&
                          "bg-emerald-500/15 text-foreground",
                        allowed &&
                          state !== "both" &&
                          "bg-foreground/10 text-foreground",
                        on && "outline-2 -outline-offset-2 outline-foreground"
                      )}
                    >
                      {mark}
                    </button>
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        <li>↔ both ways through S</li>
        <li>→ one way through S</li>
        <li>· cannot through S</li>
        <li>— same arm</li>
      </ul>
    </div>
  )
}
