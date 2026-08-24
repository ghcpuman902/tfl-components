"use client"

/**
 * Real junction windows: geographic dual-track zoom, contracted dual graph,
 * and schematic gestalt after permitted-route constraints.
 */
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react"
import { TflGeographicMap } from "@/registry/tfl/geography/tfl-geographic-map"
import { JUNCTION_CASES } from "@/lib/tfl/geometry/junction-cases"
import {
  buildJunctionWindow,
  type BundlesByMode,
  type JunctionWindow,
} from "@/lib/tfl/geometry/junction-window"
import type {
  ContractedEdge,
  ContractedNode,
  ContractedTopology,
} from "@/lib/tfl/geometry/contract-track-topology"
import {
  STRESS_MIN_SEP,
  createStressState,
  finishStressLayout,
  orientToGeo,
  stepStress,
  stressGraphFromLngLats,
  type StressState,
} from "@/lib/tfl/geometry/stress-layout"
import type { TopologyMovementPair } from "@/lib/tfl/geometry/topology-movements"
import { stationGraphScales, useSvgViewport } from "./station-graph-scale"

type JunctionCasesViewProps = {
  variants: BundlesByMode
  centreline: BundlesByMode
  dual: BundlesByMode
}

type LaidOutNode = ContractedNode & {
  x: number
  y: number
  labelX: number
  labelY: number
  labelAnchor: "start" | "end" | "middle"
}

type Simulation = {
  nodes: ContractedNode[]
  edges: ContractedEdge[]
  state: StressState
}

const WIDTH = 640
const HEIGHT = 420
const LABEL_W = 108
const LABEL_H = 16
const STEPS_PER_FRAME = 4
const SETTLE_MOVE = 0.08
const MIN_ZOOM = 0.75
const MAX_ZOOM = 8

type ZoomState = { scale: number; x: number; y: number }
type DragState = {
  pointerId: number
  clientX: number
  clientY: number
  x: number
  y: number
}

/** The second half of a split flying junction (see `splitFlyingJunctions`) skips its own label — the bonded pair reads as one place, not two. */
const isSecondSplitHalf = (node: ContractedNode): boolean =>
  node.splitFrom != null && node.id.endsWith("~b")

const nodeLabel = (node: ContractedNode): string => {
  if (node.kind === "station") return node.stationName ?? "station"
  if (node.kind === "junction") {
    if (isSecondSplitHalf(node)) return ""
    return node.nearStationName ? `junc · ${node.nearStationName}` : "junction"
  }
  return node.stationName ?? "terminus"
}

const seedSimulation = (
  nodes: readonly ContractedNode[],
  edges: readonly ContractedEdge[],
  movements: readonly TopologyMovementPair[]
): Simulation | null => {
  if (nodes.length === 0) return null
  return {
    nodes: [...nodes],
    edges: [...edges],
    state: createStressState(
      stressGraphFromLngLats(
        nodes,
        edges,
        movements.map((movement) => ({
          from: movement.a,
          via: movement.via,
          to: movement.b,
        })),
        edges
          .filter((edge) => edge.kind === "bond")
          .map((edge) => ({ a: edge.from, b: edge.to }))
      )
    ),
  }
}

const LABEL_SLOTS: {
  x: number
  y: number
  anchor: "start" | "end" | "middle"
}[] = [
  { x: 10, y: 4, anchor: "start" },
  { x: -10, y: 4, anchor: "end" },
  { x: 10, y: -8, anchor: "start" },
  { x: -10, y: -8, anchor: "end" },
  { x: 0, y: -16, anchor: "middle" },
  { x: 0, y: 18, anchor: "middle" },
]

const labelBox = (
  node: { x: number; y: number },
  slot: (typeof LABEL_SLOTS)[number]
) => {
  const left =
    slot.anchor === "end"
      ? node.x + slot.x - LABEL_W
      : slot.anchor === "middle"
        ? node.x + slot.x - LABEL_W / 2
        : node.x + slot.x
  return {
    left,
    top: node.y + slot.y - LABEL_H + 4,
    right: left + LABEL_W,
    bottom: node.y + slot.y + 4,
  }
}

const boxesOverlap = (
  a: { left: number; top: number; right: number; bottom: number },
  b: { left: number; top: number; right: number; bottom: number }
) =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top

const snapshotLayout = (sim: Simulation): LaidOutNode[] => {
  const nodes = sim.nodes.map((node, index) => ({
    ...node,
    x: sim.state.x[index]!,
    y: sim.state.y[index]!,
  }))
  const chosen = new Map<string, (typeof LABEL_SLOTS)[number]>()
  for (const node of nodes) {
    let best = LABEL_SLOTS[0]!
    let bestHits = Number.POSITIVE_INFINITY
    for (const slot of LABEL_SLOTS) {
      const box = labelBox(node, slot)
      let hits = 0
      for (const other of nodes) {
        if (other.id === node.id) continue
        if (
          other.x > box.left - 6 &&
          other.x < box.right + 6 &&
          other.y > box.top - 6 &&
          other.y < box.bottom + 6
        ) {
          hits += 3
        }
        const otherSlot = chosen.get(other.id) ?? LABEL_SLOTS[0]!
        if (boxesOverlap(box, labelBox(other, otherSlot))) hits += 1
      }
      if (hits < bestHits) {
        bestHits = hits
        best = slot
      }
    }
    chosen.set(node.id, best)
  }
  return nodes.map((node) => {
    const slot = chosen.get(node.id) ?? LABEL_SLOTS[0]!
    return {
      ...node,
      labelX: slot.x,
      labelY: slot.y,
      labelAnchor: slot.anchor,
    }
  })
}

const fitViewBox = (nodes: readonly LaidOutNode[]) => {
  if (nodes.length === 0) return { x: 0, y: 0, w: WIDTH, h: HEIGHT }
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const node of nodes) {
    const box = labelBox(node, {
      x: node.labelX,
      y: node.labelY,
      anchor: node.labelAnchor,
    })
    minX = Math.min(minX, node.x - 14, box.left)
    minY = Math.min(minY, node.y - 14, box.top)
    maxX = Math.max(maxX, node.x + 14, box.right)
    maxY = Math.max(maxY, node.y + 14, box.bottom)
  }
  const pad = 36
  return {
    x: minX - pad,
    y: minY - pad,
    w: Math.max(maxX - minX + pad * 2, 200),
    h: Math.max(maxY - minY + pad * 2, 200),
  }
}

const offsetEdge = (
  from: LaidOutNode,
  to: LaidOutNode,
  trackGroup: 0 | 1 | undefined
): { x1: number; y1: number; x2: number; y2: number } => {
  if (trackGroup == null) {
    return { x1: from.x, y1: from.y, x2: to.x, y2: to.y }
  }
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.hypot(dx, dy) || 1
  const side = trackGroup === 1 ? 1 : -1
  const ox = (-dy / length) * 5 * side
  const oy = (dx / length) * 5 * side
  return {
    x1: from.x + ox,
    y1: from.y + oy,
    x2: to.x + ox,
    y2: to.y + oy,
  }
}

const movementCurve = (
  from: LaidOutNode,
  via: LaidOutNode,
  to: LaidOutNode
): string => {
  const fromDx = from.x - via.x
  const fromDy = from.y - via.y
  const toDx = to.x - via.x
  const toDy = to.y - via.y
  const fromLength = Math.hypot(fromDx, fromDy) || 1
  const toLength = Math.hypot(toDx, toDy) || 1
  const fromUnit = { x: fromDx / fromLength, y: fromDy / fromLength }
  const toUnit = { x: toDx / toLength, y: toDy / toLength }
  const radius = Math.max(18, Math.min(38, fromLength * 0.4, toLength * 0.4))
  const normalOffset = Math.max(6, Math.min(9, radius * 0.28))
  const bisectorX = fromUnit.x + toUnit.x
  const bisectorY = fromUnit.y + toUnit.y
  const bisectorLength = Math.hypot(bisectorX, bisectorY)
  const wedge =
    bisectorLength > 0.05
      ? { x: bisectorX / bisectorLength, y: bisectorY / bisectorLength }
      : { x: -fromUnit.y, y: fromUnit.x }
  const normalTowardWedge = (unit: { x: number; y: number }) => {
    const left = { x: -unit.y, y: unit.x }
    const side = left.x * wedge.x + left.y * wedge.y >= 0 ? 1 : -1
    return { x: left.x * side, y: left.y * side }
  }
  const fromNormal = normalTowardWedge(fromUnit)
  const toNormal = normalTowardWedge(toUnit)
  const startX = via.x + fromUnit.x * radius + fromNormal.x * normalOffset
  const startY = via.y + fromUnit.y * radius + fromNormal.y * normalOffset
  const endX = via.x + toUnit.x * radius + toNormal.x * normalOffset
  const endY = via.y + toUnit.y * radius + toNormal.y * normalOffset
  return `M ${startX} ${startY} Q ${via.x + wedge.x * normalOffset * 1.7} ${via.y + wedge.y * normalOffset * 1.7} ${endX} ${endY}`
}

const zoomAround = (
  current: ZoomState,
  scale: number,
  anchor: { x: number; y: number }
): ZoomState => {
  const nextScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale))
  const ratio = nextScale / current.scale
  return {
    scale: nextScale,
    x: anchor.x - (anchor.x - current.x) * ratio,
    y: anchor.y - (anchor.y - current.y) * ratio,
  }
}

const useLaidOut = (
  topology: ContractedTopology,
  movements: readonly TopologyMovementPair[],
  layout: "geo" | "schematic"
) => {
  const seeded = useMemo(
    () => seedSimulation(topology.nodes, topology.edges, movements),
    [topology, movements]
  )
  const [laidNodes, setLaidNodes] = useState<LaidOutNode[]>([])
  const simRef = useRef<Simulation | null>(null)

  useEffect(() => {
    if (!seeded) {
      setLaidNodes([])
      return
    }
    if (layout === "geo") {
      setLaidNodes(
        snapshotLayout({
          ...seeded,
          state: {
            ...seeded.state,
            x: seeded.state.geoX.slice(),
            y: seeded.state.geoY.slice(),
          },
        })
      )
      return
    }
    simRef.current = seeded
    let frame = 0
    let raf = 0
    const tick = () => {
      const current = simRef.current
      if (!current) return
      let move = 0
      for (let step = 0; step < STEPS_PER_FRAME; step += 1) {
        move = stepStress(current.state)
      }
      orientToGeo(
        current.state.x,
        current.state.y,
        current.state.geoX,
        current.state.geoY
      )
      frame += 1
      const settled = move <= SETTLE_MOVE || frame >= 200
      if (settled) finishStressLayout(current.state, STRESS_MIN_SEP)
      if (frame % 2 === 0 || settled) setLaidNodes(snapshotLayout(current))
      if (!settled) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [seeded, layout])

  return useMemo(() => {
    if (!seeded) return []
    const seededIds = seeded.nodes.map((node) => node.id).join("\0")
    const laidIds = laidNodes.map((node) => node.id).join("\0")
    if (laidIds === seededIds) return laidNodes
    if (layout === "geo") {
      return snapshotLayout({
        ...seeded,
        state: {
          ...seeded.state,
          x: seeded.state.geoX.slice(),
          y: seeded.state.geoY.slice(),
        },
      })
    }
    return snapshotLayout(seeded)
  }, [seeded, laidNodes, layout])
}

const GraphPlot = ({
  title,
  source,
  topology,
  movements,
  color,
  colorByFeatureId,
  lineName,
  layout,
}: {
  title: string
  source: string
  topology: ContractedTopology
  movements: readonly TopologyMovementPair[]
  color: string
  colorByFeatureId: Record<string, string>
  lineName: string
  layout: "geo" | "schematic"
}) => {
  const markerId = useId().replace(/:/g, "")
  const svgRef = useRef<SVGSVGElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const [zoom, setZoom] = useState<ZoomState>({ scale: 1, x: 0, y: 0 })
  const painted = useLaidOut(topology, movements, layout)
  const nodeById = useMemo(
    () => new Map(painted.map((node) => [node.id, node])),
    [painted]
  )
  const viewBox = useMemo(() => fitViewBox(painted), [painted])
  const visibleMovements = useMemo(() => {
    const neighbors = new Map<string, Set<string>>()
    for (const edge of topology.edges) {
      const add = (from: string, to: string) => {
        const values = neighbors.get(from) ?? new Set<string>()
        values.add(to)
        neighbors.set(from, values)
      }
      add(edge.from, edge.to)
      add(edge.to, edge.from)
    }
    return movements.filter(
      (movement) => (neighbors.get(movement.via)?.size ?? 0) >= 3
    )
  }, [movements, topology.edges])

  const viewPoint = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0 || rect.height === 0) return null
    return {
      x: viewBox.x + ((clientX - rect.left) / rect.width) * viewBox.w,
      y: viewBox.y + ((clientY - rect.top) / rect.height) * viewBox.h,
    }
  }

  const handleWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    event.preventDefault()
    const anchor = viewPoint(event.clientX, event.clientY)
    if (!anchor) return
    const factor = Math.exp(-event.deltaY * 0.0015)
    setZoom((current) => zoomAround(current, current.scale * factor, anchor))
  }

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      x: zoom.x,
      y: zoom.y,
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current
    const rect = svgRef.current?.getBoundingClientRect()
    if (!drag || drag.pointerId !== event.pointerId || !rect) return
    const dx = ((event.clientX - drag.clientX) / rect.width) * viewBox.w
    const dy = ((event.clientY - drag.clientY) / rect.height) * viewBox.h
    setZoom((current) => ({ ...current, x: drag.x + dx, y: drag.y + dy }))
  }

  const finishDrag = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (dragRef.current?.pointerId !== event.pointerId) return
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const viewport = useSvgViewport(svgRef)
  const { symbolScale, labelScale } = stationGraphScales(
    zoom.scale,
    viewBox,
    viewport
  )

  return (
    <section className="min-w-0 space-y-2">
      <div className="space-y-0.5">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-xs text-muted-foreground">{source}</p>
      </div>
      <div className="relative overflow-hidden rounded-lg border border-border bg-muted/30">
        {topology.nodes.length === 0 ? (
          <p className="px-3 py-8 text-sm text-muted-foreground">
            No contracted topology in this window.
          </p>
        ) : (
          <svg
            ref={svgRef}
            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
            className="h-[min(42vh,22rem)] w-full cursor-grab touch-none select-none active:cursor-grabbing"
            role="img"
            aria-label={`${lineName} ${title}. Scroll to zoom and drag to pan.`}
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={finishDrag}
            onPointerCancel={finishDrag}
          >
            <defs>
              <marker
                id={`${markerId}-arrow`}
                viewBox="0 0 8 8"
                refX="6.5"
                refY="4"
                markerWidth={2.4 * symbolScale}
                markerHeight={2.4 * symbolScale}
                markerUnits="userSpaceOnUse"
                orient="auto-start-reverse"
              >
                <path d="M 0 1 L 7 4 L 0 7 z" fill={color} />
              </marker>
            </defs>
            <g
              transform={`translate(${zoom.x} ${zoom.y}) scale(${zoom.scale})`}
            >
              {topology.edges.map((edge) => {
                const from = nodeById.get(edge.from)
                const to = nodeById.get(edge.to)
                if (!from || !to) return null
                if (edge.kind === "bond") {
                  return (
                    <line
                      key={edge.id}
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke="var(--muted-foreground)"
                      strokeWidth={3 * symbolScale}
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                  )
                }
                const line = offsetEdge(from, to, edge.trackGroup)
                return (
                  <line
                    key={edge.id}
                    x1={line.x1}
                    y1={line.y1}
                    x2={line.x2}
                    y2={line.y2}
                    stroke={colorByFeatureId[edge.featureId] ?? color}
                    strokeWidth={2.2}
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                )
              })}
              {visibleMovements.map((pair) => {
                const a = nodeById.get(pair.a)
                const via = nodeById.get(pair.via)
                const b = nodeById.get(pair.b)
                if (!a || !via || !b) return null
                const curve = movementCurve(a, via, b)
                return (
                  <g key={pair.id}>
                    <path
                      d={curve}
                      fill="none"
                      stroke="var(--background)"
                      strokeWidth={5.5}
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                    <path
                      d={curve}
                      fill="none"
                      stroke={color}
                      strokeWidth={1.8}
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    />
                    {pair.directions.map((direction) => {
                      const from = nodeById.get(direction.from)
                      const to = nodeById.get(direction.to)
                      if (!from || !to) return null
                      return (
                        <path
                          key={direction.id}
                          d={movementCurve(from, via, to)}
                          fill="none"
                          stroke="transparent"
                          strokeWidth="6"
                          vectorEffect="non-scaling-stroke"
                          markerEnd={`url(#${markerId}-arrow)`}
                        />
                      )
                    })}
                  </g>
                )
              })}
              {painted.map((node) => (
                <g key={node.id} transform={`translate(${node.x} ${node.y})`}>
                  <circle
                    r={
                      (node.kind === "junction"
                        ? 6
                        : node.kind === "station"
                          ? 5
                          : 4) * symbolScale
                    }
                    fill={
                      node.kind === "junction" ? color : "var(--background)"
                    }
                    stroke={
                      node.kind === "junction"
                        ? "var(--background)"
                        : "var(--foreground)"
                    }
                    strokeWidth={
                      (node.kind === "junction" ? 2 : 1.4) * symbolScale
                    }
                  />
                  {!isSecondSplitHalf(node) && (
                    <text
                      x={node.labelX * labelScale}
                      y={node.labelY * labelScale}
                      textAnchor={node.labelAnchor}
                      className={
                        node.kind === "junction"
                          ? "fill-muted-foreground"
                          : "fill-foreground"
                      }
                      fontSize={
                        (node.kind === "junction" ? 10 : 11) * labelScale
                      }
                      style={{ fontFamily: "var(--font-sans)" }}
                    >
                      {nodeLabel(node)}
                    </text>
                  )}
                </g>
              ))}
            </g>
          </svg>
        )}
      </div>
    </section>
  )
}

const movementLabel = (
  pair: TopologyMovementPair,
  nodes: readonly ContractedNode[]
): string => {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  const name = (id: string) =>
    nodeLabel(byId.get(id) ?? { id, coordinates: [0, 0], kind: "junction" })
  const sources = [
    ...new Set(pair.directions.map((direction) => direction.source)),
  ].join(" + ")
  return `${name(pair.a)} ↔ ${name(pair.b)} via ${name(pair.via)} · ${pair.directions.length} dir · ${sources}`
}

export const JunctionCasesView = ({
  variants,
  centreline,
  dual,
}: JunctionCasesViewProps) => {
  const [caseId, setCaseId] = useState(
    JUNCTION_CASES[3]?.id ?? JUNCTION_CASES[0]!.id
  )
  const selected =
    JUNCTION_CASES.find((entry) => entry.id === caseId) ?? JUNCTION_CASES[0]!

  const windowModel = useMemo(
    () => buildJunctionWindow(selected, dual, centreline, variants),
    [selected, dual, centreline, variants]
  )

  const handleCaseChange = (event: ChangeEvent<HTMLSelectElement>) => {
    setCaseId(event.target.value)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-muted/20 p-3">
        <label className="space-y-1 text-sm">
          <span className="text-muted-foreground">Junction</span>
          <select
            value={selected.id}
            onChange={handleCaseChange}
            className="block rounded-md border border-border bg-background px-2 py-1.5 text-base"
          >
            {JUNCTION_CASES.map((entry) => (
              <option key={entry.id} value={entry.id}>
                {entry.name} — {entry.kind}
              </option>
            ))}
          </select>
        </label>
        <p className="max-w-3xl text-xs text-muted-foreground">
          {selected.notes}
        </p>
      </div>

      {windowModel ? (
        <JunctionWindowPanels window={windowModel} />
      ) : (
        <p className="rounded-lg border border-border px-3 py-8 text-sm text-muted-foreground">
          Could not crop this junction from the current dual-track snapshot.
        </p>
      )}
    </div>
  )
}

const JunctionWindowPanels = ({ window }: { window: JunctionWindow }) => {
  const branchMovements = useMemo(() => {
    const neighbors = new Map<string, Set<string>>()
    for (const edge of window.topology.edges) {
      const add = (from: string, to: string) => {
        const values = neighbors.get(from) ?? new Set<string>()
        values.add(to)
        neighbors.set(from, values)
      }
      add(edge.from, edge.to)
      add(edge.to, edge.from)
    }
    return window.movements.filter(
      (movement) => (neighbors.get(movement.via)?.size ?? 0) >= 3
    )
  }, [window])

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="min-w-0 space-y-2">
          <div className="space-y-0.5">
            <h3 className="text-sm font-medium">Geographic zoom</h3>
            <p className="text-xs text-muted-foreground">
              Both running lines around {window.case.name}.
            </p>
          </div>
          <div className="h-[min(42vh,22rem)] overflow-hidden rounded-lg border border-border">
            <TflGeographicMap
              key={`geo-${window.case.id}`}
              data={{ [window.case.mode]: window.croppedDual }}
              modes={[window.case.mode]}
              lineIds={window.case.lineIds}
              trackModel="dual"
              className="h-full"
            />
          </div>
        </section>

        <GraphPlot
          key={`dual-${window.case.id}`}
          title="Dual graph"
          source="Both-track graph at geographic positions. Parallel twins stay as two edges."
          topology={window.topology}
          movements={window.movements}
          color={window.color}
          colorByFeatureId={window.colorByFeatureId}
          lineName={window.lineName}
          layout="geo"
        />

        <GraphPlot
          key={`gestalt-${window.case.id}`}
          title="Schematic gestalt"
          source="Schematic layout, straightened along permitted moves."
          topology={window.topology}
          movements={window.movements}
          color={window.color}
          colorByFeatureId={window.colorByFeatureId}
          lineName={window.lineName}
          layout="schematic"
        />
      </div>

      <section className="space-y-2" aria-labelledby="permitted-routes-heading">
        <h3 id="permitted-routes-heading" className="text-sm font-medium">
          Permitted route constraints
        </h3>
        <p className="max-w-3xl text-xs text-muted-foreground">
          A permitted move is a from–via–to triple from OSM track and TfL
          station order. Two-leg corridors still straighten. Branch marks appear
          only where three or more legs meet.
        </p>
        {branchMovements.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No branch-level constraint in this window
            {window.movements.length > 0
              ? ` — ${window.movements.length} through-move${window.movements.length === 1 ? "" : "s"} still straighten the schematic.`
              : "."}
          </p>
        ) : (
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {branchMovements.map((pair) => (
              <li key={pair.id}>
                {movementLabel(pair, window.topology.nodes)}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
