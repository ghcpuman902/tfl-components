/**
 * Column 1 is the unsimplified star: every arm on one S.
 * Column 3 is a separate drawing graph — stations, unlabelled forks,
 * and walking bonds — laid onto an octilinear grid.
 */

import { useId } from "react"
import {
  EXCESS,
  MoleculeAssembler,
  type MoleculeBond,
  type MoleculeMark,
  type MoleculeTrack,
} from "@/app/drafts/diagram-atoms/atoms"
import { bondedGroupLabelAt } from "@/lib/tfl/diagram-atoms"
import {
  DIAGRAM_BASELINE,
  interchangeOuterRadius,
  interchangeStroke,
} from "@/lib/tfl/line-diagram"
import {
  buildDrawingScene,
  drawingVariants,
  hasMove,
  layoutDrawing,
  type DirectedMatrix,
  type LayoutPolicy,
  type PatternKind,
} from "@/lib/tfl/investigate/vertex-scenarios"
import type { DrawingScene } from "@/lib/tfl/investigate/vertex-scenarios/drawing-graph"
import {
  trackPathBetween,
  type LaidDrawing,
  type LaidNode,
} from "@/lib/tfl/investigate/vertex-scenarios/drawing-layout"
import type { PortId } from "@/lib/tfl/investigate/vertex-scenarios/types"
import {
  Pager,
  PORT_DEMO_NAMES,
  StationLabel,
  labelMaxBesideMarks,
  opacityFor,
  stationLabelBox,
  type ActiveMove,
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
              strokeWidth={1.2}
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

const neighbourOf = (laid: LaidDrawing, id: string) => {
  const edge = laid.tracks.find((track) => track.a === id || track.b === id)
  if (!edge) return null
  const otherId = edge.a === id ? edge.b : edge.a
  return laid.nodes.find((node) => node.id === otherId) ?? null
}

/** Where every boundary port sits relative to the drawing's own centre. */
const portTravelInfo = (laid: LaidDrawing) => {
  const portNodes = laid.nodes.filter(
    (node) => node.kind === "boundary" && node.port
  )
  const portYs = portNodes.map((node) => node.y)
  const portXs = portNodes.map((node) => node.x)
  const midY =
    portYs.length > 0 ? (Math.min(...portYs) + Math.max(...portYs)) / 2 : 0
  const midX =
    portXs.length > 0 ? (Math.min(...portXs) + Math.max(...portXs)) / 2 : 0
  const verticalTravel =
    laid.policy.primary === "up" || laid.policy.primary === "down"
  return { portNodes, midX, midY, verticalTravel }
}

/**
 * Keep names on the outside of the drawing: lower termini go down, left
 * termini go left when travel is vertical — otherwise a 2-line "Cannon
 * Street" climbs into the parallel track above it.
 */
const portAwayFor = (
  node: LaidNode,
  info: ReturnType<typeof portTravelInfo>
): "up" | "down" | "left" | "right" => {
  if (info.verticalTravel) {
    return node.x < info.midX - 1
      ? "left"
      : node.x > info.midX + 1
        ? "right"
        : "left"
  }
  return node.y > info.midY + 1 ? "down" : "up"
}

const stationNameAnchors = (laid: LaidDrawing) => {
  const stations = laid.nodes.filter((node) => node.kind === "station")
  const parent = new Map(stations.map((node) => [node.id, node.id]))
  const find = (id: string): string => {
    const next = parent.get(id) ?? id
    if (next !== id) {
      const root = find(next)
      parent.set(id, root)
      return root
    }
    return id
  }
  for (const bond of laid.bonds) {
    if (!parent.has(bond.a) || !parent.has(bond.b)) continue
    const a = find(bond.a)
    const b = find(bond.b)
    if (a !== b) parent.set(b, a)
  }
  const groups = new Map<string, typeof stations>()
  for (const node of stations) {
    const root = find(node.id)
    const list = groups.get(root) ?? []
    list.push(node)
    groups.set(root, list)
  }
  const away: "left" | "up" =
    laid.policy.primary === "up" || laid.policy.primary === "down"
      ? "left"
      : "up"
  // No collision check, no lift: a station directly next to a boundary
  // gets a grown stroke from `layoutDrawing` (`BOUNDARY_PITCH`) sized for
  // this label and the boundary's own port label to sit side by side, so
  // the name always sits on the mark it names, never pushed off it.
  return [...groups.values()].map((members) => ({
    ...bondedGroupLabelAt(members, away),
    away,
    members,
  }))
}

export const LaidDrawingSvg = ({
  scene,
  active,
  policy,
  overlay = false,
}: {
  scene: DrawingScene
  active: ActiveMove
  policy?: LayoutPolicy
  overlay?: boolean
}) => {
  const laid = layoutDrawing(scene, policy)
  const lit =
    active != null ? trackPathBetween(scene, active.from, active.to) : new Set()
  const byId = new Map(laid.nodes.map((node) => [node.id, node]))
  const nameAnchors = stationNameAnchors(laid)
  const travel = portTravelInfo(laid)
  const portNodes = travel.portNodes
  const portAway = (node: LaidNode) => portAwayFor(node, travel)
  const marks = laid.nodes.map((node) => ({
    x: node.x,
    y: node.y,
    kind: node.kind,
  }))
  const nameBudget = (
    x: number,
    y: number,
    away: "up" | "down" | "left" | "right",
    ignore: readonly { x: number; y: number }[] = []
  ) =>
    labelMaxBesideMarks(
      x,
      y,
      away,
      marks.filter(
        (mark) =>
          !ignore.some(
            (point) => Math.abs(point.x - mark.x) < 1 && Math.abs(point.y - mark.y) < 1
          )
      )
    )
  // Expand the canvas past every name box so terminus strings are never
  // cropped by the viewBox — the pad in layoutDrawing is a floor, this
  // is the measured extent of the actual (possibly wrapped) labels we
  // paint, not a guess.
  const boxes = [
    ...nameAnchors.map((anchor) =>
      stationLabelBox(
        anchor.x,
        anchor.y,
        anchor.away,
        "Station",
        nameBudget(anchor.x, anchor.y, anchor.away, anchor.members)
      )
    ),
    ...portNodes.map((node) => {
      const away = portAway(node)
      return stationLabelBox(
        node.x,
        node.y,
        away,
        PORT_DEMO_NAMES[node.port!] ?? node.port!,
        nameBudget(node.x, node.y, away)
      )
    }),
  ]
  let minX = 0
  let minY = 0
  let maxX = laid.width
  let maxY = laid.height
  for (const box of boxes) {
    minX = Math.min(minX, box.x)
    minY = Math.min(minY, box.y)
    maxX = Math.max(maxX, box.x + box.width)
    maxY = Math.max(maxY, box.y + box.height)
  }
  const shiftX = -minX
  const shiftY = -minY
  const width = Math.ceil(maxX - minX)
  const height = Math.ceil(maxY - minY)

  // Everything below is the same node+edge vocabulary `MoleculeAssembler`
  // paints on `/drafts/diagram-atoms`: this page only reads the matrix,
  // lays it onto a grid, and hands the result over — it does not repaint
  // its own Tick/Ring/Bond/margin.
  // Each edge's own core/excess breakdown (`layoutDrawing`'s `segs`) —
  // the same green/black split `/drafts/diagram-atoms`'s demo cards
  // paint for a growable run, not a single flat-colour chord. `spine`
  // (the clearance band's own path-following geometry) rides on the
  // edge's first sub-track only, so `MoleculeAssembler`'s `flatMap`
  // never sees the same straight run twice.
  const moleculeTracks: MoleculeTrack[] = laid.tracks.flatMap((edge) => {
    const opacity = opacityFor(active, lit.has(edge.id))
    return edge.segs.map((seg, index) => ({
      id: `${edge.id}-${index}`,
      d: seg.d,
      spine: index === 0 ? edge.spine : undefined,
      opacity,
      paint: seg.paint === "excess" ? EXCESS : undefined,
    }))
  })
  const moleculeBonds: MoleculeBond[] = laid.bonds.flatMap((edge) => {
    const a = byId.get(edge.a)
    const b = byId.get(edge.b)
    return a && b
      ? [{ id: edge.id, a: { x: a.x, y: a.y }, b: { x: b.x, y: b.y } }]
      : []
  })
  // Every ring paints; only one virtual, unpainted mark per bonded group
  // (at the label's own anchor) carries the clearance band — the same
  // "first/last ring only" convention `InterchangeAtom` uses for a column,
  // generalised to an arbitrary bonded group.
  const stationMarks: MoleculeMark[] = laid.nodes
    .filter((node) => node.kind === "station")
    .map((node) => ({
      id: node.id,
      x: node.x,
      y: node.y,
      anchor: "ring",
      travel: "right",
      end: "through",
    }))
  const stationClearanceMarks: MoleculeMark[] = nameAnchors.map(
    (anchor, index) => ({
      id: `station-clear-${index}`,
      x: anchor.x,
      y: anchor.y,
      anchor: "ring",
      travel: anchor.away === "up" ? "right" : "down",
      end: "through",
      labelAway: anchor.away,
      paint: false,
    })
  )
  const portMarks: MoleculeMark[] = portNodes.map((node) => {
    const neighbour = neighbourOf(laid, node.id)
    const dx = node.stub
      ? node.stub.x - node.x
      : neighbour
        ? node.x - neighbour.x
        : -1
    const dy = node.stub
      ? node.stub.y - node.y
      : neighbour
        ? node.y - neighbour.y
        : 0
    const axis = Math.abs(dx) >= Math.abs(dy) ? "v" : "h"
    return {
      id: node.id,
      x: node.x,
      y: node.y,
      anchor: "tick",
      travel: axis === "v" ? "right" : "down",
      end: node.stub ? "through" : "terminus",
      labelAway: portAway(node),
    }
  })

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={scene.title}
      className="max-w-none shrink-0 overflow-visible"
    >
      <g transform={`translate(${shiftX} ${shiftY})`}>
        <MoleculeAssembler
          as="g"
          width={laid.width}
          height={laid.height}
          overlay={overlay}
          tracks={moleculeTracks}
          bonds={moleculeBonds}
          marks={[...stationMarks, ...stationClearanceMarks, ...portMarks]}
        >
          {nameAnchors.map((anchor, index) => (
            <StationLabel
              key={`station-name-${index}`}
              x={anchor.x}
              y={anchor.y}
              away={anchor.away}
              overlay={overlay}
              maxWidth={nameBudget(anchor.x, anchor.y, anchor.away, anchor.members)}
            />
          ))}
          {portNodes.map((node) => {
            const away = portAway(node)
            return (
              <StationLabel
                key={node.id}
                x={node.x}
                y={node.y}
                away={away}
                name={PORT_DEMO_NAMES[node.port!] ?? node.port!}
                overlay={overlay}
                maxWidth={nameBudget(node.x, node.y, away)}
              />
            )
          })}
        </MoleculeAssembler>
      </g>
    </svg>
  )
}

export const SimplifiedTopologySvg = ({
  kind,
  variant,
  active,
  policy,
  overlay = false,
}: {
  kind: PatternKind
  variant: string
  active: ActiveMove
  policy?: LayoutPolicy
  overlay?: boolean
}) => {
  const scene = buildDrawingScene(kind, variant)
  if (!scene) {
    return (
      <p className="text-sm text-muted-foreground">
        Not a degree-2 or degree-3 building block.
      </p>
    )
  }
  return (
    <LaidDrawingSvg scene={scene} active={active} policy={policy} overlay={overlay} />
  )
}

export const DrawingVariantSelect = ({
  kind,
  index,
  onChange,
}: {
  kind: PatternKind
  index: number
  onChange: (index: number) => void
}) => {
  const variants = drawingVariants(kind)
  return (
    <Pager
      label="Arrangement"
      index={index}
      count={variants.length}
      onChange={onChange}
    />
  )
}
