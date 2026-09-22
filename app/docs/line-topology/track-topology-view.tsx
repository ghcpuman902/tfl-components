"use client"

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react"
import { Pause, Play } from "lucide-react"
import { formatStationName } from "@/lib/tfl/diagram-station"
import type {
  TrackModel,
  TransitGeometryBundle,
  TransitMode,
} from "@/lib/tfl/geography-types"
import { LineBadge } from "@/components/tfl/brand/line-badge"
import { lineCssPaint } from "@/lib/tfl/line-colour-map"
import {
  type ContractedNode,
  type ContractedTopology,
} from "@/lib/tfl/geometry/contract-track-topology"
import { TflGeographicMap } from "@/registry/tfl/geography/tfl-geographic-map"
import {
  mergeOsmStationPositions,
  type OsmRouteStopsFile,
} from "@/lib/tfl/geometry/osm-route-stops"
import tubeStops from "@/data/geography/osm-cache/tube-route-stops.json"
import overgroundStops from "@/data/geography/osm-cache/overground-route-stops.json"
import elizabethStops from "@/data/geography/osm-cache/elizabeth-route-stops.json"
import dlrStops from "@/data/geography/osm-cache/dlr-route-stops.json"
import tramStops from "@/data/geography/osm-cache/tram-route-stops.json"
import { layoutTflSequences } from "@/lib/tfl/geometry/tfl-sequences-layout"
import {
  serviceGroupsFromPatterns,
  tflSequencesPassengerTopology,
  type SequenceServiceGroup,
  type TflSequencesPattern,
} from "@/lib/tfl/geometry/tfl-sequences-topology"
import type {
  LngLat,
  TrackStation,
} from "@/lib/tfl/geometry/transit-track-graph"
import {
  movementPairs,
  type TopologyMovementPair,
} from "@/lib/tfl/geometry/topology-movements"
import { type LineHopTimesByLine } from "@/lib/tfl/geometry/line-hop-times"
import { hopGraphForRailLine } from "@/lib/tfl/vehicle-hop-graph"
import { servicePatternEvidenceForLine } from "@/lib/tfl/service-pattern-evidence"
import type { NetworkModelSnapshot } from "@/lib/tfl/network-model/from-gtfs"
import {
  sliceNetworkModel,
  snapshotPathsBundle,
  transitModeForSnapshotLine,
} from "@/lib/tfl/network-model/line-slice"
import { cn } from "@/lib/utils"
import { RoutePatternInspector } from "./route-pattern-inspector"
import {
  labelClearance,
  labelLineHeight,
  layoutStationLabels,
} from "./station-graph-labels"
import {
  DEFAULT_ZOOM,
  originAtBoundsCenter,
  stationGraphScales,
  useSvgViewport,
  viewBoxScreenScale,
  zoomAboutOrigin,
  zoomAround,
  type ZoomState,
} from "./station-graph-scale"

type BundlesByMode = Partial<Record<TransitMode, TransitGeometryBundle>>

type TrackTopologyViewProps = {
  variants: BundlesByMode
  centreline: BundlesByMode
  dual: BundlesByMode
  networkModel: NetworkModelSnapshot
  hopTimes?: LineHopTimesByLine
}

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
}

const TRACK_MODELS: { id: PhysicalModel; label: string }[] = [
  { id: "centreline", label: "Merged centreline" },
  { id: "dual", label: "Both tracks" },
  { id: "timetable", label: "Timetable shapes" },
]

const WIDTH = 1100
const HEIGHT = 720

type DragState = {
  pointerId: number
  clientX: number
  clientY: number
  x: number
  y: number
}

type PinchState = {
  distance: number
  zoom: ZoomState
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
  if (node.kind === "junction") {
    return node.nearStationName
      ? `junc · ${formatStationName(node.nearStationName)}`
      : "junction"
  }
  return formatStationName(
    node.stationName ?? (node.kind === "terminus" ? "terminus" : "station")
  )
}

const fitViewBox = (nodes: readonly LaidOutNode[]) => {
  if (nodes.length === 0) {
    return { x: -WIDTH / 2, y: -HEIGHT / 2, w: WIDTH, h: HEIGHT }
  }
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const node of nodes) {
    minX = Math.min(minX, node.x)
    minY = Math.min(minY, node.y)
    maxX = Math.max(maxX, node.x)
    maxY = Math.max(maxY, node.y)
  }
  const padX = 96
  const padY = 132
  const halfW = Math.max((maxX - minX) / 2 + padX, 120)
  const halfH = Math.max((maxY - minY) / 2 + padY, 120)
  return {
    x: -halfW,
    y: -halfH,
    w: halfW * 2,
    h: halfH * 2,
  }
}

const stationHopKey = (a: string, b: string): string =>
  a < b ? `${a}|${b}` : `${b}|${a}`

const SERVICE_CYCLE_MS = 500

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

const emptyTopology = (): ContractedTopology => ({ nodes: [], edges: [] })

const LINE_QUERY_PARAM = "line"

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
  lineId?: string
) =>
  useMemo(() => {
    if (topology.nodes.length === 0) return []
    const laid = layoutTflSequences(
      topology,
      movements.flatMap((pair) =>
        pair.directions.map((direction) => ({
          from: direction.from,
          via: direction.via,
          to: direction.to,
          patternIds: direction.patternIds,
        }))
      ),
      undefined,
      {
        uniformHops: true,
        canonical: lineId
          ? hopGraphForRailLine(lineId).canonical
          : (id: string) => id,
      }
    )
    return originAtBoundsCenter(laid.nodes)
  }, [topology, movements, lineId])

type TopologyPlotProps = {
  title?: string
  source: string
  topology: ContractedTopology
  color: string
  lineName: string
  lineId?: string
  movements?: readonly TopologyMovementPair[]
  patterns?: readonly TflSequencesPattern[]
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
  patterns = [],
  dual = false,
  empty,
}: TopologyPlotProps) => {
  const linePaint = lineCssPaint(lineId, color)
  const svgRef = useRef<SVGSVGElement | null>(null)
  const dragRef = useRef<DragState | null>(null)
  const pinchRef = useRef<PinchState | null>(null)
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const zoomRef = useRef<ZoomState>(DEFAULT_ZOOM)
  const pendingZoomRef = useRef<ZoomState | null>(null)
  const rafRef = useRef(0)
  const [zoom, setZoom] = useState<ZoomState>(DEFAULT_ZOOM)
  zoomRef.current = zoom
  const painted = useLaidOutTopology(topology, movements, lineId)
  const nodeById = useMemo(
    () => new Map(painted.map((node) => [node.id, node])),
    [painted]
  )
  const viewBox = useMemo(() => fitViewBox(painted), [painted])
  const viewBoxRef = useRef(viewBox)
  viewBoxRef.current = viewBox
  const junctionCount = topology.nodes.filter(
    (node) => node.kind === "junction"
  ).length
  const neighborIds = useMemo(() => {
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
    return neighbors
  }, [topology.edges])
  const visibleMovements = useMemo(
    () =>
      movements.filter(
        (movement) => (neighborIds.get(movement.via)?.size ?? 0) >= 3
      ),
    [movements, neighborIds]
  )
  const serviceGroups = useMemo(
    () => serviceGroupsFromPatterns(patterns),
    [patterns]
  )
  const [playing, setPlaying] = useState(false)
  const [groupIndex, setGroupIndex] = useState<number | null>(null)
  const activeGroup: SequenceServiceGroup | null =
    groupIndex != null ? (serviceGroups[groupIndex] ?? null) : null
  const activeStations = useMemo(
    () => new Set(activeGroup?.stationIds ?? []),
    [activeGroup]
  )
  const activePatternIds = useMemo(
    () => new Set(activeGroup?.patternIds ?? []),
    [activeGroup]
  )

  useEffect(() => {
    if (!playing || serviceGroups.length === 0) return
    const tick = () => {
      if (document.visibilityState === "hidden") return
      setGroupIndex((current) => ((current ?? -1) + 1) % serviceGroups.length)
    }
    const timer = window.setInterval(tick, SERVICE_CYCLE_MS)
    return () => window.clearInterval(timer)
  }, [playing, serviceGroups.length])

  const handlePlayPause = () => {
    setPlaying((on) => {
      if (!on && groupIndex == null) setGroupIndex(0)
      return !on
    })
  }

  const edgeOnGroup = (fromId: string, toId: string): boolean => {
    if (!activeGroup) return true
    const from = nodeById.get(fromId)
    const to = nodeById.get(toId)
    const fromStation = from?.stationId
    const toStation = to?.stationId
    if (!fromStation || !toStation) return false
    return activeGroup.hops.has(stationHopKey(fromStation, toStation))
  }

  const nodeOnGroup = (node: LaidOutNode): boolean => {
    if (!activeGroup) return true
    return node.stationId != null && activeStations.has(node.stationId)
  }

  const movementOnGroup = (pair: TopologyMovementPair): boolean => {
    if (!activeGroup) return true
    return pair.directions.some((direction) =>
      direction.patternIds.some((id) => activePatternIds.has(id))
    )
  }

  const viewPoint = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect()
    const box = viewBoxRef.current
    if (!rect || rect.width === 0 || rect.height === 0) return null
    return {
      x: box.x + ((clientX - rect.left) / rect.width) * box.w,
      y: box.y + ((clientY - rect.top) / rect.height) * box.h,
    }
  }

  const applyZoom = (next: ZoomState) => {
    pendingZoomRef.current = next
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0
      const pending = pendingZoomRef.current
      if (!pending) return
      pendingZoomRef.current = null
      zoomRef.current = pending
      setZoom(pending)
    })
  }

  const currentZoom = () => pendingZoomRef.current ?? zoomRef.current

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    })
    if (event.pointerType === "mouse") {
      event.currentTarget.setPointerCapture(event.pointerId)
    }
    if (pointersRef.current.size >= 2) {
      dragRef.current = null
      const points = [...pointersRef.current.values()]
      const a = points[0]!
      const b = points[1]!
      pinchRef.current = {
        distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        zoom: currentZoom(),
      }
      return
    }
    const live = currentZoom()
    dragRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      x: live.x,
      y: live.y,
    }
  }

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (pointersRef.current.has(event.pointerId)) {
      pointersRef.current.set(event.pointerId, {
        x: event.clientX,
        y: event.clientY,
      })
    }
    const pinch = pinchRef.current
    if (pinch && pointersRef.current.size >= 2) {
      const points = [...pointersRef.current.values()]
      const a = points[0]!
      const b = points[1]!
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
      const anchor = viewPoint(mid.x, mid.y)
      if (!anchor) return
      applyZoom(
        zoomAround(
          pinch.zoom,
          pinch.zoom.scale * (dist / pinch.distance),
          anchor
        )
      )
      return
    }
    const drag = dragRef.current
    const rect = svgRef.current?.getBoundingClientRect()
    if (!drag || drag.pointerId !== event.pointerId || !rect) return
    const dx = ((event.clientX - drag.clientX) / rect.width) * viewBox.w
    const dy = ((event.clientY - drag.clientY) / rect.height) * viewBox.h
    applyZoom({ ...currentZoom(), x: drag.x + dx, y: drag.y + dy })
  }

  const finishPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    pointersRef.current.delete(event.pointerId)
    if (pointersRef.current.size < 2) pinchRef.current = null
    if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const changeZoom = (factor: number) => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    pendingZoomRef.current = null
    setZoom((current) => {
      const next = zoomAboutOrigin(current, current.scale * factor)
      zoomRef.current = next
      return next
    })
  }

  const resetZoom = () => {
    cancelAnimationFrame(rafRef.current)
    rafRef.current = 0
    pendingZoomRef.current = null
    const next = { scale: 1, x: 0, y: 0 }
    zoomRef.current = next
    setZoom(next)
  }

  const viewport = useSvgViewport(svgRef)
  const { symbolScale, labelScale } = stationGraphScales(
    zoom.scale,
    viewBox,
    viewport
  )
  const hopScreenPx = useMemo(() => {
    let nearest = Number.POSITIVE_INFINITY
    for (const node of painted) {
      for (const id of neighborIds.get(node.id) ?? []) {
        const other = nodeById.get(id)
        if (!other) continue
        const dist = Math.hypot(other.x - node.x, other.y - node.y)
        if (dist > 1) nearest = Math.min(nearest, dist)
      }
    }
    if (!Number.isFinite(nearest)) return Number.POSITIVE_INFINITY
    return nearest * zoom.scale * viewBoxScreenScale(viewBox, viewport)
  }, [painted, neighborIds, nodeById, zoom.scale, viewBox, viewport])
  const labels = useMemo(
    () =>
      layoutStationLabels(
        painted.map((node) => ({
          id: node.id,
          x: node.x,
          y: node.y,
          text: nodeLabel(node),
          kind: node.kind,
          degree: neighborIds.get(node.id)?.size ?? 0,
          neighborIds: [...(neighborIds.get(node.id) ?? [])],
        })),
        zoom,
        hopScreenPx
      ),
    [painted, zoom, neighborIds, hopScreenPx]
  )
  const labelById = useMemo(
    () => new Map(labels.map((label) => [label.id, label])),
    [labels]
  )

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const handleWheel = (event: WheelEvent) => {
      event.preventDefault()
      const anchor = viewPoint(event.clientX, event.clientY)
      if (!anchor) return
      const live = currentZoom()
      const factor = Math.exp(-event.deltaY * 0.0015)
      applyZoom(zoomAround(live, live.scale * factor, anchor))
    }
    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length >= 2) event.preventDefault()
    }
    svg.addEventListener("wheel", handleWheel, { passive: false })
    svg.addEventListener("touchmove", handleTouchMove, { passive: false })
    return () => {
      svg.removeEventListener("wheel", handleWheel)
      svg.removeEventListener("touchmove", handleTouchMove)
      cancelAnimationFrame(rafRef.current)
    }
  }, [topology.nodes.length])

  return (
    <section className="min-w-0 space-y-2">
      <div className="space-y-0.5">
        {title ? <h3 className="text-sm font-medium">{title}</h3> : null}
        <p className="text-xs text-muted-foreground">{source}</p>
        <p className="text-xs text-muted-foreground">
          {topology.nodes.length} nodes · {topology.edges.length} edges ·{" "}
          {junctionCount} junctions · {movements.length} layout continuities ·{" "}
          {visibleMovements.length} marked branch pairs
        </p>
      </div>
      <div className="relative overflow-hidden rounded-lg border border-border bg-muted/30">
        {empty && topology.nodes.length === 0 ? (
          <p className="px-3 py-8 text-sm text-muted-foreground">{empty}</p>
        ) : (
          <>
            <div className="absolute top-2 right-2 z-10 flex touch-manipulation overflow-hidden rounded-md border border-border bg-background/90 shadow-sm">
              {serviceGroups.length > 0 ? (
                <button
                  type="button"
                  onClick={handlePlayPause}
                  aria-pressed={playing}
                  aria-label={
                    playing
                      ? `Pause ${lineName} service cycle`
                      : `Play ${lineName} service cycle`
                  }
                  className="flex h-8 w-8 items-center justify-center border-r border-border"
                >
                  {playing ? (
                    <Pause className="size-3 fill-current" aria-hidden />
                  ) : (
                    <Play className="size-3 fill-current stroke-none" aria-hidden />
                  )}
                </button>
              ) : null}
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
                onClick={resetZoom}
                className="h-8 px-2 text-[10px] tabular-nums"
                aria-label={`Reset zoom on ${title ?? lineName}`}
              >
                {Math.round(zoom.scale * 100)}%
              </button>
            </div>
            <svg
              ref={svgRef}
              viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
              data-line={lineId}
              data-tfl-diagram={lineId === "cable-car" ? "" : undefined}
              className="h-[min(60vh,36rem)] w-full cursor-grab touch-none overscroll-none select-none active:cursor-grabbing"
              role="img"
              aria-label={`${lineName} ${title}. Scroll or pinch to zoom and drag to pan.`}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={finishPointer}
              onPointerCancel={finishPointer}
            >
              <g
                transform={`translate(${zoom.x} ${zoom.y}) scale(${zoom.scale})`}
              >
                {topology.edges.map((edge) => {
                  const from = nodeById.get(edge.from)
                  const to = nodeById.get(edge.to)
                  if (!from || !to) return null
                  const onGroup = edgeOnGroup(edge.from, edge.to)
                  const fade = activeGroup && !onGroup
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
                        strokeOpacity={fade ? 0.18 : 1}
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
                  const baseWidth = dual || skip ? 2.2 : 3
                  return (
                    <line
                      key={edge.id}
                      x1={line.x1}
                      y1={line.y1}
                      x2={line.x2}
                      y2={line.y2}
                      stroke={
                        occasional ? "var(--muted-foreground)" : linePaint
                      }
                      strokeWidth={
                        onGroup && activeGroup ? baseWidth + 1.2 : baseWidth
                      }
                      strokeDasharray={
                        occasional ? "2 5" : fast ? "7 5" : undefined
                      }
                      strokeOpacity={
                        fade ? 0.16 : occasional ? 0.55 : fast ? 0.85 : 1
                      }
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
                  const fade = activeGroup && !movementOnGroup(pair)
                  return (
                    <g key={pair.id} opacity={fade ? 0.16 : 1}>
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
                        stroke={linePaint}
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
                {painted.map((node) => {
                  const label = labelById.get(node.id)
                  const name = nodeLabel(node)
                  const fade = activeGroup && !nodeOnGroup(node)
                  const font =
                    (node.kind === "junction" ? 10 : 11) *
                    labelScale *
                    (label?.scale ?? 1)
                  const lineHeight = font * labelLineHeight
                  const clearance = labelClearance * symbolScale
                  const lines = label?.lines ?? []
                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x} ${node.y})`}
                      opacity={fade ? 0.22 : 1}
                    >
                      <circle
                        r={
                          node.kind === "junction"
                            ? 6 * symbolScale
                            : node.kind === "station"
                              ? 5 * symbolScale
                              : 4 * symbolScale
                        }
                        fill={
                          node.kind === "junction"
                            ? linePaint
                            : "var(--background)"
                        }
                        stroke={
                          node.kind === "junction"
                            ? "var(--background)"
                            : "var(--foreground)"
                        }
                        strokeWidth={
                          (node.kind === "junction" ? 2 : 1.4) * symbolScale
                        }
                      >
                        {name ? <title>{name}</title> : null}
                      </circle>
                      {label?.visible && lines.length > 0 ? (
                        <text
                          textAnchor={label.anchor}
                          className={
                            node.kind === "junction"
                              ? "fill-muted-foreground"
                              : "fill-foreground"
                          }
                          fontSize={font}
                          stroke="var(--background)"
                          strokeWidth={2.4 * symbolScale}
                          paintOrder="stroke"
                          style={{ fontFamily: "var(--font-sans)" }}
                        >
                          {lines.map((line, index) => {
                            const y =
                              label.side === "up"
                                ? -clearance -
                                  (lines.length - 1 - index) * lineHeight
                                : clearance + index * lineHeight
                            return (
                              <tspan key={`${line}-${index}`} x={0} y={y}>
                                {line}
                              </tspan>
                            )
                          })}
                        </text>
                      ) : null}
                    </g>
                  )
                })}
              </g>
            </svg>
            {activeGroup ? (
              <p
                aria-live="polite"
                className="pointer-events-none absolute bottom-2 left-2 z-10 max-w-[min(100%-1rem,24rem)] text-[10px] text-muted-foreground"
              >
                {activeGroup.name}
              </p>
            ) : null}
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
  const [trackModel, setTrackModel] = useState<PhysicalModel>("centreline")
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
    () => (physicalBundle ? { [mapMode]: physicalBundle } : {}),
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

  const passengerCompile = useMemo(() => {
    if (!selected) return null
    return tflSequencesPassengerTopology(selected.lineId, stations)
  }, [selected, stations])

  const passengerTopology = passengerCompile?.topology ?? emptyTopology()
  const passengerMovements = useMemo(
    () => movementPairs(passengerCompile?.movements ?? []),
    [passengerCompile]
  )

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
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Line">
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
                    ? "outline-2 outline-offset-1 outline-foreground outline-solid"
                    : "opacity-60 hover:opacity-100"
                )}
              >
                <LineBadge
                  lineId={option.lineId}
                  name={option.lineName}
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
          <p className="text-xs text-muted-foreground">TfL sequences v2</p>
        </div>
        <TopologyPlot
          key={`passenger-v2-${lineId}`}
          title="TfL sequences v2"
          source="Stations start at their map positions. Each hop is the same length. Permitted route continuations stay smooth."
          topology={passengerTopology}
          color={selected?.color ?? snapshotSlice?.line.color ?? "#888"}
          lineName={selected?.lineName ?? "Line"}
          lineId={selected?.lineId}
          movements={passengerMovements}
          patterns={passengerCompile?.patterns ?? []}
          empty="No TfL sequence for this line."
        />
      </section>

      <section className="space-y-4" aria-labelledby="physical-model-heading">
        <div className="space-y-1">
          <h2 id="physical-model-heading" className="text-lg font-medium">
            Physical topology
          </h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Track the geographic map paints. Merged centreline is one stroke per
            corridor. Both tracks keeps the running lines. Elizabeth line and
            Overground also have low-resolution timetable shapes.
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
              trackModel={
                trackModel === "timetable" ? "centreline" : trackModel
              }
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
            variantsBundle={variantsBundle}
            stopsFile={
              selected.mode ? OSM_STOPS_BY_MODE[selected.mode] : undefined
            }
            dataset={servicePatterns}
            snapshot={snapshotSlice}
          />
        </section>
      )}
    </div>
  )
}
