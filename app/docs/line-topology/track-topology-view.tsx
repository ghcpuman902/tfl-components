"use client"

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react"
import type {
  TrackModel,
  TransitGeometryBundle,
  TransitMode,
} from "@/lib/tfl/geography-types"
import { LineBadge } from "@/components/tfl/brand/line-badge"
import {
  type ContractedEdge,
  type ContractedNode,
  type ContractedTopology,
} from "@/lib/tfl/geometry/contract-track-topology"
import { TflGeographicMap } from "@/registry/tfl/geography/tfl-geographic-map"
import { officialTrackTopology } from "@/lib/tfl/geometry/official-track-topology"
import { splitBondedThroughStations } from "@/lib/tfl/geometry/split-bonded-stations"
import {
  mergeOsmStationPositions,
  type OsmRouteStopsFile,
} from "@/lib/tfl/geometry/osm-route-stops"
import tubeStops from "@/data/geography/osm-cache/tube-route-stops.json"
import overgroundStops from "@/data/geography/osm-cache/overground-route-stops.json"
import elizabethStops from "@/data/geography/osm-cache/elizabeth-route-stops.json"
import dlrStops from "@/data/geography/osm-cache/dlr-route-stops.json"
import tramStops from "@/data/geography/osm-cache/tram-route-stops.json"
import {
  STRESS_MIN_SEP,
  createStressState,
  finishStressLayout,
  orientToGeo,
  stepStress,
  stressGraphFromLngLats,
  untangleHubLegs,
  type StressState,
} from "@/lib/tfl/geometry/stress-layout"
import type {
  LngLat,
  TrackStation,
} from "@/lib/tfl/geometry/transit-track-graph"
import {
  movementPairs,
  tflMovementsForTopology,
  type TopologyMovementPair,
} from "@/lib/tfl/geometry/topology-movements"
import {
  edgeLengthsFromHopTimes,
  type LineHopTimesByLine,
} from "@/lib/tfl/geometry/line-hop-times"
import { hopGraphForRailLine } from "@/lib/tfl/vehicle-hop-graph"
import { servicePatternEvidenceForLine } from "@/lib/tfl/service-pattern-evidence"
import type { NetworkModelSnapshot } from "@/lib/tfl/network-model/from-gtfs"
import {
  isTimetableSkip,
  sliceNetworkModel,
  snapshotMovementsForTopology,
  snapshotPassengerTopology,
  snapshotPathsBundle,
  transitModeForSnapshotLine,
  type NetworkModelManifest,
} from "@/lib/tfl/network-model/line-slice"
import { cn } from "@/lib/utils"
import { RoutePatternInspector } from "./route-pattern-inspector"
import {
  stationGraphScales,
  useSvgViewport,
} from "./station-graph-scale"

type BundlesByMode = Partial<Record<TransitMode, TransitGeometryBundle>>

type TrackTopologyViewProps = {
  variants: BundlesByMode
  centreline: BundlesByMode
  dual: BundlesByMode
  networkModel: NetworkModelSnapshot
  networkManifest: NetworkModelManifest
  hopTimes?: LineHopTimesByLine
}

type PassengerSource = "tfl" | "snapshot"
type PhysicalModel = TrackModel | "timetable"

type LineOption = {
  lineId: string
  lineName: string
  color: string
  mode?: TransitMode
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

const TRACK_MODELS: { id: PhysicalModel; label: string }[] = [
  { id: "centreline", label: "Merged centreline" },
  { id: "dual", label: "Both tracks" },
  { id: "timetable", label: "Timetable shapes" },
]

const PASSENGER_SOURCES: { id: PassengerSource; label: string }[] = [
  { id: "tfl", label: "TfL sequences" },
  { id: "snapshot", label: "Typicality overlay" },
]

const WIDTH = 1100
const HEIGHT = 720
const LABEL_W = 108
const LABEL_H = 16
const STEPS_PER_FRAME = 4
const SETTLE_MOVE = 0.08
const MIN_ZOOM = 0.75
const MAX_ZOOM = 8

type ZoomState = {
  scale: number
  x: number
  y: number
}

type DragState = {
  pointerId: number
  clientX: number
  clientY: number
  x: number
  y: number
}

const stationsFromBundle = (bundle: TransitGeometryBundle): TrackStation[] =>
  (bundle.stations.features ?? []).flatMap((feature) => {
    if (feature.geometry?.type !== "Point") return []
    const coords = feature.geometry.coordinates
    if (coords.length < 2) return []
    return [
      {
        id: String(feature.id ?? feature.properties.featureId),
        name: feature.properties.name,
        label: feature.properties.label,
        coordinates: [coords[0]!, coords[1]!] as LngLat,
      },
    ]
  })

const linesFromBundles = (bundles: BundlesByMode): LineOption[] => {
  const seen = new Set<string>()
  const options: LineOption[] = []
  for (const mode of Object.keys(bundles) as TransitMode[]) {
    const bundle = bundles[mode]
    if (!bundle) continue
    for (const feature of bundle.lines.features ?? []) {
      const lineId = feature.properties.lineId
      if (seen.has(lineId)) continue
      seen.add(lineId)
      options.push({
        lineId,
        lineName: feature.properties.lineName,
        color: feature.properties.color,
        mode,
      })
    }
  }
  return options
}

const isSecondSplitHalf = (node: ContractedNode): boolean =>
  node.splitFrom != null && node.id.endsWith("~b")

const nodeLabel = (node: ContractedNode): string => {
  if (isSecondSplitHalf(node)) return ""
  if (node.kind === "station") return node.stationName ?? "station"
  if (node.kind === "junction") {
    return node.nearStationName ? `junc · ${node.nearStationName}` : "junction"
  }
  return node.stationName ?? "terminus"
}

const seedSimulation = (
  nodes: readonly ContractedNode[],
  edges: readonly ContractedEdge[],
  movements: readonly TopologyMovementPair[],
  hopTimes?: LineHopTimesByLine[string],
  lineId?: string
): Simulation | null => {
  if (nodes.length === 0) return null
  const nodeStationId = new Map(
    nodes.map((node) => [node.id, node.stationId ?? node.id])
  )
  const canonical = lineId
    ? hopGraphForRailLine(lineId).canonical
    : (id: string) => id
  return {
    nodes: [...nodes],
    edges: [...edges],
    state: createStressState(
      stressGraphFromLngLats(
        nodes,
        edgeLengthsFromHopTimes(
          edges,
          nodeStationId,
          hopTimes?.hops,
          canonical
        ),
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

const positioned = (sim: Simulation) =>
  sim.nodes.map((node, index) => ({
    ...node,
    x: sim.state.x[index]!,
    y: sim.state.y[index]!,
  }))

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
  { x: 10, y: 16, anchor: "start" },
  { x: -10, y: 16, anchor: "end" },
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
  const nodes = positioned(sim)
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
      id: node.id,
      coordinates: node.coordinates,
      stationId: node.stationId,
      stationName: node.stationName,
      nearStationName: node.nearStationName,
      kind: node.kind,
      x: node.x,
      y: node.y,
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
  const pad = 48
  return {
    x: minX - pad,
    y: minY - pad,
    w: Math.max(maxX - minX + pad * 2, 240),
    h: Math.max(maxY - minY + pad * 2, 240),
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
  const controlX = via.x + wedge.x * normalOffset * 1.7
  const controlY = via.y + wedge.y * normalOffset * 1.7
  return `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`
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

const emptyTopology = (): ContractedTopology => ({ nodes: [], edges: [] })

const LINE_QUERY_PARAM = "line"
const ZOOM_SCALE_PARAM = "z"
const ZOOM_X_PARAM = "zx"
const ZOOM_Y_PARAM = "zy"

const DEFAULT_ZOOM: ZoomState = { scale: 1, x: 0, y: 0 }

const readZoomFromUrl = (): ZoomState => {
  const params = new URLSearchParams(window.location.search)
  const scale = Number(params.get(ZOOM_SCALE_PARAM))
  const x = Number(params.get(ZOOM_X_PARAM))
  const y = Number(params.get(ZOOM_Y_PARAM))
  return {
    scale:
      Number.isFinite(scale) && scale > 0
        ? Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, scale))
        : 1,
    x: Number.isFinite(x) ? x : 0,
    y: Number.isFinite(y) ? y : 0,
  }
}

const OSM_STOPS_BY_MODE: Partial<Record<TransitMode, OsmRouteStopsFile>> = {
  tube: tubeStops as unknown as OsmRouteStopsFile,
  overground: overgroundStops as unknown as OsmRouteStopsFile,
  elizabeth: elizabethStops as unknown as OsmRouteStopsFile,
  dlr: dlrStops as unknown as OsmRouteStopsFile,
  tram: tramStops as unknown as OsmRouteStopsFile,
}

const useLaidOutTopology = (
  topology: ContractedTopology,
  movements: readonly TopologyMovementPair[],
  hopTimes?: LineHopTimesByLine[string],
  lineId?: string
) => {
  const seeded = useMemo(
    () =>
      seedSimulation(topology.nodes, topology.edges, movements, hopTimes, lineId),
    [topology, movements, hopTimes, lineId]
  )
  const [laidNodes, setLaidNodes] = useState<LaidOutNode[]>([])
  const simRef = useRef<Simulation | null>(null)

  useEffect(() => {
    simRef.current = seeded
    if (!seeded) return
    let frame = 0
    let raf = 0
    const tick = () => {
      const current = simRef.current
      if (!current) return
      let move = 0
      for (let step = 0; step < STEPS_PER_FRAME; step += 1) {
        move = stepStress(current.state)
      }
      const { state } = current
      orientToGeo(state.x, state.y, state.geoX, state.geoY)
      untangleHubLegs(state)
      frame += 1
      const settled = move <= SETTLE_MOVE || frame >= 200
      if (settled) finishStressLayout(state, STRESS_MIN_SEP)
      if (frame % 2 === 0 || settled) setLaidNodes(snapshotLayout(current))
      if (!settled) {
        raf = requestAnimationFrame(tick)
      }
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
    }
  }, [seeded])

  return useMemo(() => {
    if (!seeded) return []
    const seededIds = seeded.nodes.map((node) => node.id).join("\0")
    const laidIds = laidNodes.map((node) => node.id).join("\0")
    return laidIds === seededIds ? laidNodes : snapshotLayout(seeded)
  }, [seeded, laidNodes])
}

type TopologyPlotProps = {
  title?: string
  source: string
  topology: ContractedTopology
  color: string
  lineName: string
  lineId?: string
  movements?: readonly TopologyMovementPair[]
  hopTimes?: LineHopTimesByLine[string]
  dual?: boolean
  empty?: string
}

const TopologyPlot = ({
  title,
  source,
  topology,
  color,
  lineName,
  lineId,
  movements = [],
  hopTimes,
  dual = false,
  empty,
}: TopologyPlotProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const [zoom, setZoom] = useState<ZoomState>(DEFAULT_ZOOM)
  const zoomUrlReady = useRef(false)
  const painted = useLaidOutTopology(topology, movements, hopTimes, lineId)
  const nodeById = useMemo(
    () => new Map(painted.map((node) => [node.id, node])),
    [painted]
  )
  const viewBox = useMemo(() => fitViewBox(painted), [painted])
  const junctionCount = topology.nodes.filter(
    (node) => node.kind === "junction"
  ).length
  const visibleMovements = useMemo(() => {
    const neighbors = new Map<string, Set<string>>()
    const addNeighbor = (from: string, to: string) => {
      const values = neighbors.get(from) ?? new Set<string>()
      values.add(to)
      neighbors.set(from, values)
    }
    for (const edge of topology.edges) {
      if (edge.kind === "bond") continue
      addNeighbor(edge.from, edge.to)
      addNeighbor(edge.to, edge.from)
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

  const changeZoom = (factor: number) => {
    const anchor = {
      x: viewBox.x + viewBox.w / 2,
      y: viewBox.y + viewBox.h / 2,
    }
    setZoom((current) => zoomAround(current, current.scale * factor, anchor))
  }

  const viewport = useSvgViewport(svgRef)
  const { symbolScale, labelScale } = stationGraphScales(
    zoom.scale,
    viewBox,
    viewport
  )

  useEffect(() => {
    if (!zoomUrlReady.current) {
      zoomUrlReady.current = true
      const fromUrl = readZoomFromUrl()
      if (
        fromUrl.scale !== zoom.scale ||
        fromUrl.x !== zoom.x ||
        fromUrl.y !== zoom.y
      ) {
        setZoom(fromUrl)
        return
      }
    }
    const url = new URL(window.location.href)
    const scale = zoom.scale.toFixed(2)
    const x = zoom.x.toFixed(1)
    const y = zoom.y.toFixed(1)
    const same =
      url.searchParams.get(ZOOM_SCALE_PARAM) === scale &&
      url.searchParams.get(ZOOM_X_PARAM) === x &&
      url.searchParams.get(ZOOM_Y_PARAM) === y
    if (same) return
    if (zoom.scale === 1 && zoom.x === 0 && zoom.y === 0) {
      url.searchParams.delete(ZOOM_SCALE_PARAM)
      url.searchParams.delete(ZOOM_X_PARAM)
      url.searchParams.delete(ZOOM_Y_PARAM)
    } else {
      url.searchParams.set(ZOOM_SCALE_PARAM, scale)
      url.searchParams.set(ZOOM_X_PARAM, x)
      url.searchParams.set(ZOOM_Y_PARAM, y)
    }
    window.history.replaceState(null, "", url)
  }, [zoom])

  return (
    <section className="min-w-0 space-y-2">
      <div className="space-y-0.5">
        {title ? <h3 className="text-sm font-medium">{title}</h3> : null}
        <p className="text-xs text-muted-foreground">{source}</p>
        <p className="text-xs text-muted-foreground">
          {topology.nodes.length} nodes · {topology.edges.length} edges ·{" "}
          {junctionCount} junctions · {movements.length} layout continuities ·{" "}
          {visibleMovements.length} marked branch pairs
          {hopTimes
            ? ` · ${hopTimes.timedHopCount} hops seeded from TfL travel time`
            : ""}
        </p>
      </div>
      <div className="relative overflow-hidden rounded-lg border border-border bg-muted/30">
        {empty && topology.nodes.length === 0 ? (
          <p className="px-3 py-8 text-sm text-muted-foreground">{empty}</p>
        ) : (
          <>
            <div className="absolute top-2 right-2 z-10 flex overflow-hidden rounded-md border border-border bg-background/90 shadow-sm">
              <button
                type="button"
                onClick={() => changeZoom(1.35)}
                className="h-8 w-8 border-r border-border text-sm"
                aria-label={`Zoom in on ${title ?? lineName}`}
              >
                +
              </button>
              <button
                type="button"
                onClick={() => changeZoom(1 / 1.35)}
                className="h-8 w-8 border-r border-border text-sm"
                aria-label={`Zoom out of ${title ?? lineName}`}
              >
                -
              </button>
              <button
                type="button"
                onClick={() => setZoom({ scale: 1, x: 0, y: 0 })}
                className="h-8 px-2 text-[10px] tabular-nums"
                aria-label={`Reset zoom on ${title ?? lineName}`}
              >
                {Math.round(zoom.scale * 100)}%
              </button>
            </div>
            <svg
              ref={svgRef}
              viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
              className="h-[min(60vh,36rem)] w-full cursor-grab touch-none select-none active:cursor-grabbing"
              role="img"
              aria-label={`${lineName} ${title}. Scroll to zoom and drag to pan.`}
              onWheel={handleWheel}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishDrag}
              onPointerCancel={finishDrag}
            >
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
                      >
                        <title>Same station — two through-corridors</title>
                      </line>
                    )
                  }
                  const line = offsetEdge(from, to, edge.trackGroup)
                  const fast = edge.service === "fast"
                  const occasional = edge.service === "occasional"
                  const skip = fast || occasional
                  return (
                    <line
                      key={edge.id}
                      x1={line.x1}
                      y1={line.y1}
                      x2={line.x2}
                      y2={line.y2}
                      stroke={occasional ? "var(--muted-foreground)" : color}
                      strokeWidth={dual || skip ? 2.2 : 3}
                      strokeDasharray={
                        occasional ? "2 5" : fast ? "7 5" : undefined
                      }
                      strokeOpacity={occasional ? 0.55 : fast ? 0.85 : 1}
                      strokeLinecap="round"
                      vectorEffect="non-scaling-stroke"
                    >
                      <title>
                        {edge.serviceNote ??
                          (skip
                            ? "Skip-stop or short working. Some trains omit stations between these two."
                            : "Usual passenger hop on this corridor.")}
                      </title>
                    </line>
                  )
                })}
                {visibleMovements.map((pair) => {
                    const a = nodeById.get(pair.a)
                    const via = nodeById.get(pair.via)
                    const b = nodeById.get(pair.b)
                    if (!a || !via || !b) return null
                    const curve = movementCurve(a, via, b)
                    const patternIds = [
                      ...new Set(
                        pair.directions.flatMap(
                          (direction) => direction.patternIds
                        )
                      ),
                    ]
                    return (
                      <g key={pair.id}>
                        <path
                          d={curve}
                          fill="none"
                          stroke="var(--background)"
                          strokeWidth={dual ? 5.5 : 6.5}
                          strokeLinecap="round"
                          vectorEffect="non-scaling-stroke"
                        />
                        <path
                          d={curve}
                          fill="none"
                          stroke={color}
                          strokeWidth={dual ? 1.8 : 2.2}
                          strokeLinecap="round"
                          vectorEffect="non-scaling-stroke"
                        >
                          <title>
                            {`${pair.directions.length} permitted direction${pair.directions.length === 1 ? "" : "s"}; ${patternIds.length} supporting pattern${patternIds.length === 1 ? "" : "s"}`}
                          </title>
                        </path>
                      </g>
                    )
                  })}
                {painted.map((node) => (
                  <g key={node.id} transform={`translate(${node.x} ${node.y})`}>
                    <circle
                      r={
                        node.kind === "junction"
                          ? 6 * symbolScale
                          : node.kind === "station"
                            ? 5 * symbolScale
                            : 4 * symbolScale
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
          </>
        )}
      </div>
    </section>
  )
}

export const TrackTopologyView = ({
  variants,
  centreline,
  dual,
  networkModel,
  networkManifest,
  hopTimes,
}: TrackTopologyViewProps) => {
  const lineOptions = useMemo(() => {
    const fromOsm = linesFromBundles(centreline)
    const seen = new Set(fromOsm.map((option) => option.lineId))
    const extra = networkModel.lines
      .filter((line) => !seen.has(line.id))
      .map((line) => ({
        lineId: line.id,
        lineName: line.longName || line.shortName,
        color: line.color,
        mode: transitModeForSnapshotLine(line),
      }))
    return [...fromOsm, ...extra]
  }, [centreline, networkModel.lines])
  const [lineId, setLineId] = useState(
    () =>
      lineOptions.find((option) => option.lineId === "elizabeth")?.lineId ??
      lineOptions[0]?.lineId ??
      ""
  )
  const [passengerSource, setPassengerSource] =
    useState<PassengerSource>("tfl")
  const [trackModel, setTrackModel] = useState<PhysicalModel>("centreline")
  const [showSkipHops, setShowSkipHops] = useState(true)
  const lineUrlReady = useRef(false)

  useEffect(() => {
    if (!lineUrlReady.current) {
      lineUrlReady.current = true
      const requested = new URLSearchParams(window.location.search).get(
        LINE_QUERY_PARAM
      )
      if (
        requested &&
        requested !== lineId &&
        lineOptions.some((option) => option.lineId === requested)
      ) {
        setLineId(requested)
        return
      }
    }
    if (!lineId) return
    const url = new URL(window.location.href)
    if (url.searchParams.get(LINE_QUERY_PARAM) === lineId) return
    url.searchParams.set(LINE_QUERY_PARAM, lineId)
    window.history.replaceState(null, "", url)
  }, [lineId, lineOptions])

  const selected = lineOptions.find((option) => option.lineId === lineId)
  const snapshotSlice = useMemo(
    () => (selected ? sliceNetworkModel(networkModel, selected.lineId) : null),
    [networkModel, selected]
  )
  const timetableBundle = useMemo(
    () => (snapshotSlice ? snapshotPathsBundle(snapshotSlice) : null),
    [snapshotSlice]
  )
  const centrelineBundle = selected?.mode
    ? centreline[selected.mode]
    : undefined
  const osmPhysicalBundle = selected?.mode
    ? (trackModel === "dual" ? dual : centreline)[selected.mode]
    : undefined
  const variantsBundle = selected?.mode ? variants[selected.mode] : undefined
  const mapMode = selected?.mode ?? "elizabeth"
  const physicalBundle =
    trackModel === "timetable" ? timetableBundle : osmPhysicalBundle
  const physicalData = useMemo<BundlesByMode>(
    () =>
      physicalBundle ? { [mapMode]: physicalBundle } : {},
    [mapMode, physicalBundle]
  )
  const stations = useMemo(() => {
    if (!centrelineBundle) return []
    const tflStations = stationsFromBundle(centrelineBundle)
    const osmStops = selected?.mode
      ? OSM_STOPS_BY_MODE[selected.mode]?.stops
      : undefined
    return osmStops
      ? mergeOsmStationPositions(tflStations, osmStops)
      : tflStations
  }, [centrelineBundle, selected])

  const servicePatterns = useMemo(
    () => (selected ? servicePatternEvidenceForLine(selected.lineId) : null),
    [selected]
  )

  const tflSplit = useMemo(() => {
    const raw = selected
      ? officialTrackTopology(selected.lineId, stations)
      : null
    if (!raw) {
      return {
        topology: emptyTopology(),
        movements: [] as ReturnType<typeof tflMovementsForTopology>,
      }
    }
    return splitBondedThroughStations(
      raw,
      tflMovementsForTopology(raw, servicePatterns)
    )
  }, [selected, stations, servicePatterns])

  const snapshotSplit = useMemo(() => {
    if (!snapshotSlice) {
      return {
        topology: emptyTopology(),
        movements: [] as ReturnType<typeof snapshotMovementsForTopology>,
      }
    }
    const raw = snapshotPassengerTopology(snapshotSlice)
    return splitBondedThroughStations(
      raw,
      snapshotMovementsForTopology(snapshotSlice, raw)
    )
  }, [snapshotSlice])

  const tflTopology = tflSplit.topology
  const snapshotTopology = snapshotSplit.topology

  const passengerTopology = useMemo(() => {
    if (passengerSource !== "snapshot") return tflTopology
    if (showSkipHops) return snapshotTopology
    return {
      nodes: snapshotTopology.nodes,
      edges: snapshotTopology.edges.filter(
        (edge) => !isTimetableSkip(edge.service),
      ),
    }
  }, [passengerSource, showSkipHops, snapshotTopology, tflTopology])

  const tflMovementPairs = useMemo(
    () => movementPairs(tflSplit.movements),
    [tflSplit.movements]
  )

  const snapshotMovementPairs = useMemo(
    () => movementPairs(snapshotSplit.movements),
    [snapshotSplit.movements]
  )

  const passengerMovements =
    passengerSource === "snapshot" ? snapshotMovementPairs : tflMovementPairs

  const handleLineSelect = (nextLineId: string) => {
    setLineId(nextLineId)
  }

  useEffect(() => {
    if (trackModel === "timetable" && !timetableBundle) {
      setTrackModel("centreline")
    }
  }, [selected?.mode, timetableBundle, trackModel])

  return (
    <div className="space-y-10">
      <section className="space-y-3" aria-labelledby="passenger-model-heading">
        <div
          className="flex flex-wrap gap-1.5"
          role="group"
          aria-label="Line"
        >
          {lineOptions.map((option) => {
            const selectedLine = option.lineId === lineId
            return (
              <button
                key={option.lineId}
                type="button"
                aria-pressed={selectedLine}
                aria-label={option.lineName}
                onClick={() => handleLineSelect(option.lineId)}
                className={cn(
                  "cursor-pointer focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  selectedLine
                    ? "outline-solid outline-2 outline-offset-1 outline-foreground"
                    : "opacity-60 hover:opacity-100"
                )}
              >
                <LineBadge
                  lineId={option.lineId}
                  name={option.lineName}
                  color={option.color}
                  diagram={option.lineId === "cable-car"}
                />
              </button>
            )
          })}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h2 id="passenger-model-heading" className="text-lg font-medium">
            Passenger topology
          </h2>
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Passenger topology source"
          >
            {PASSENGER_SOURCES.map((option) => (
              <button
                key={option.id}
                type="button"
                aria-pressed={passengerSource === option.id}
                onClick={() => setPassengerSource(option.id)}
                className={cn(
                  "rounded-full border border-border px-2.5 py-1 text-xs",
                  passengerSource === option.id
                    ? "bg-foreground text-background"
                    : "bg-background text-foreground"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {passengerSource === "snapshot" && (
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={showSkipHops}
                onChange={(event) => setShowSkipHops(event.target.checked)}
              />
              Skip-stop hops (dashed regular / dotted occasional)
            </label>
            <p className="max-w-xl text-xs text-muted-foreground">
              Marks how typical a skip or branch is. Not a second station
              graph.
            </p>
            <p className="text-xs text-muted-foreground">
              {networkManifest.publisher}, {networkManifest.feedStartDate}–
              {networkManifest.feedEndDate}
            </p>
          </div>
        )}
        <TopologyPlot
          key={`passenger-${passengerSource}-${lineId}`}
          source={
            passengerSource === "snapshot"
              ? "Dashed hops are regular weekday skips. Dotted hops are evening, weekend-only, or rare. Segment length follows travel time."
              : "Segment length follows travel time. Track junctions are omitted."
          }
          topology={passengerTopology}
          color={selected?.color ?? snapshotSlice?.line.color ?? "#888"}
          lineName={selected?.lineName ?? "Line"}
          lineId={selected?.lineId}
          movements={passengerMovements}
          hopTimes={selected ? hopTimes?.[selected.lineId] : undefined}
          empty={
            passengerSource === "snapshot"
              ? "No timetable snapshot patterns for this line."
              : "No TfL sequence for this line."
          }
        />
      </section>

      <section className="space-y-4" aria-labelledby="physical-model-heading">
        <div className="space-y-1">
          <h2 id="physical-model-heading" className="text-lg font-medium">
            Physical topology
          </h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Track the geographic map paints. Merged centreline is one stroke
            per corridor. Both tracks keeps the running lines. Elizabeth line
            and Overground also have low-resolution timetable shapes.
          </p>
        </div>
        <div
          className="flex flex-wrap gap-2"
          role="group"
          aria-label="Physical track model"
        >
          {TRACK_MODELS.map((option) => {
            const disabled =
              option.id === "timetable"
                ? !timetableBundle
                : !selected?.mode || !osmPhysicalBundle
            return (
              <button
                key={option.id}
                type="button"
                aria-pressed={trackModel === option.id}
                disabled={disabled}
                onClick={() => setTrackModel(option.id)}
                className={cn(
                  "rounded-full border border-border px-2.5 py-1 text-xs",
                  trackModel === option.id
                    ? "bg-foreground text-background"
                    : "bg-background text-foreground",
                  disabled && "cursor-not-allowed opacity-40"
                )}
              >
                {option.label}
              </button>
            )
          })}
        </div>
        {selected && physicalBundle ? (
          <div className="h-[min(72vh,42rem)] overflow-hidden rounded-lg border border-border">
            <TflGeographicMap
              key={`physical-${lineId}-${trackModel}`}
              data={physicalData}
              modes={[mapMode]}
              lineIds={[selected.lineId]}
              trackModel={trackModel === "timetable" ? "centreline" : trackModel}
              className="h-full"
            />
          </div>
        ) : (
          <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
            {trackModel === "timetable"
              ? "No timetable shapes for this line. Underground, DLR, and Tram use OSM track."
              : "No physical geometry for this line."}
          </p>
        )}
      </section>

      {selected && (
        <section className="space-y-4" aria-labelledby="evidence-model-heading">
          <div className="space-y-1">
            <h2 id="evidence-model-heading" className="text-lg font-medium">
              Sources for this line
            </h2>
            <p className="max-w-3xl text-sm text-muted-foreground">
              The same line as three inventories: TfL routes, timetable
              patterns, and OSM relations.
            </p>
          </div>
          <RoutePatternInspector
            lineId={selected.lineId}
            lineName={selected.lineName}
            color={selected.color}
            variantsBundle={variantsBundle}
            stopsFile={selected.mode ? OSM_STOPS_BY_MODE[selected.mode] : undefined}
            dataset={servicePatterns}
            snapshot={snapshotSlice}
          />
        </section>
      )}
    </div>
  )
}
