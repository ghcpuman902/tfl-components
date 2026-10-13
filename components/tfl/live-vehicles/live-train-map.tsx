"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Minus, Plus, Maximize2, Pause, Play } from "lucide-react"
import { getLineColor } from "tfl-ts"
import { advanceTrainDisplay } from "@/lib/tfl/rail-train-tracker"
import {
  buildTrainMapLayout,
  trainDiagramPoint,
} from "@/lib/tfl/train-map-layout"
import type { VehiclePosition } from "@/lib/tfl/map-vehicles"

export const LiveTrainMap = ({
  lineIds,
  vehicles,
}: {
  lineIds: readonly string[]
  vehicles: readonly VehiclePosition[]
}) => {
  const lineKey = lineIds.join(",")
  const layout = useMemo(
    () => buildTrainMapLayout(lineKey.split(",").filter(Boolean)),
    [lineKey]
  )
  const svgRef = useRef<SVGSVGElement>(null)
  const trainElements = useRef(new Map<string, SVGGElement>())
  const rendered = useRef(new Map<string, VehiclePosition>())
  const vehiclesRef = useRef(vehicles)
  const [viewport, setViewport] = useState({ width: 900, height: 650 })
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const panRef = useRef({ x: 0, y: 0 })
  const [paused, setPaused] = useState(false)
  const [reduce, setReduce] = useState(false)
  const drag = useRef<{
    x: number
    y: number
    panX: number
    panY: number
  } | null>(null)
  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect
      if (rect && rect.width > 0 && rect.height > 0)
        setViewport({ width: rect.width, height: rect.height })
    })
    observer.observe(svg)
    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    vehiclesRef.current = vehicles
  }, [vehicles])
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduce(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])
  useEffect(() => {
    if (!reduce || paused) return
    const next = new Map<string, VehiclePosition>()
    for (const vehicle of vehicles) {
      const key = `${vehicle.lineId}:${vehicle.vehicleId}`
      next.set(key, vehicle)
      if (!vehicle.trainMotion) continue
      const point = trainDiagramPoint(layout, vehicle.trainMotion)
      if (point)
        trainElements.current
          .get(key)
          ?.setAttribute(
            "transform",
            `translate(${point.x} ${point.y}) rotate(${point.angle})`
          )
    }
    rendered.current = next
  }, [reduce, paused, vehicles, layout])
  useEffect(() => {
    if (reduce || paused) return
    let frame = 0,
      last = 0
    const draw = (now: number) => {
      if (now - last >= 32) {
        last = now
        const clock = Date.now(),
          next = new Map<string, VehiclePosition>()
        for (const vehicle of vehiclesRef.current) {
          const key = `${vehicle.lineId}:${vehicle.vehicleId}`
          const placed = advanceTrainDisplay(
            vehicle,
            rendered.current.get(key),
            clock,
            false
          )
          next.set(key, placed)
          if (!placed.trainMotion) continue
          const point = trainDiagramPoint(layout, placed.trainMotion)
          if (point)
            trainElements.current
              .get(key)
              ?.setAttribute(
                "transform",
                `translate(${point.x} ${point.y}) rotate(${point.angle})`
              )
        }
        rendered.current = next
      }
      frame = requestAnimationFrame(draw)
    }
    frame = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(frame)
  }, [layout, paused, reduce])
  const b = layout.bounds
  const width = b.width / zoom,
    height = b.height / zoom
  const viewBox = `${b.x + (b.width - width) / 2 + pan.x} ${b.y + (b.height - height) / 2 + pan.y} ${width} ${height}`
  const scale = Math.max(width / viewport.width, height / viewport.height)
  const labels = useMemo(() => {
    const placed: { x: number; y: number; width: number; height: number }[] = []
    const labels = new Map<string, { x: number; anchor: "start" | "end" }>()
    const degree = new Map<string, number>()
    for (const edge of layout.edges)
      for (const node of [edge.points[0]!, edge.points.at(-1)!]) {
        const key = `${node.x}:${node.y}`
        degree.set(key, (degree.get(key) ?? 0) + 1)
      }
    const importance = (
      node: typeof layout.nodes extends Map<string, infer N> ? N : never
    ) =>
      (degree.get(`${node.x}:${node.y}`) === 1 ? 10 : 0) + node.lines.size * 2
    const candidates = [...layout.nodes.values()].sort(
      (a, b) => importance(b) - importance(a)
    )
    for (const node of candidates) {
      if (zoom <= 1.4 && importance(node) < 4) continue
      const textWidth = node.name.length * 5.3 * scale
      const right =
        node.x + 11 * scale + textWidth <= b.x + b.width - 12 * scale
      const x = node.x + (right ? 11 : -11) * scale
      const box = {
        x: right ? x : x - textWidth,
        y: node.y - 9 * scale,
        width: textWidth,
        height: 16 * scale,
      }
      if (
        placed.some(
          (p) =>
            box.x < p.x + p.width + 8 * scale &&
            box.x + box.width + 8 * scale > p.x &&
            box.y < p.y + p.height &&
            box.y + box.height > p.y
        )
      )
        continue
      placed.push(box)
      labels.set(node.id, { x, anchor: right ? "start" : "end" })
    }
    return labels
  }, [layout, scale, zoom, b.x, b.width])
  const control =
    "flex size-11 items-center justify-center rounded-full bg-background/95 text-foreground shadow-sm ring-1 ring-border hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#f7f5ef] dark:bg-[#171d25]">
      <svg
        ref={svgRef}
        className="h-full w-full touch-none select-none"
        viewBox={viewBox}
        role="img"
        tabIndex={0}
        onKeyDown={(event) => {
          const step = width * 0.08
          const movement: Record<string, { x: number; y: number }> = {
            ArrowLeft: { x: -step, y: 0 },
            ArrowRight: { x: step, y: 0 },
            ArrowUp: { x: 0, y: -step },
            ArrowDown: { x: 0, y: step },
          }
          const delta = movement[event.key]
          if (!delta) return
          event.preventDefault()
          const next = {
            x: panRef.current.x + delta.x,
            y: panRef.current.y + delta.y,
          }
          panRef.current = next
          setPan(next)
        }}
        aria-label={`Live ${lineIds.join(" and ")} trains. Estimated positions.`}
        onPointerDown={(event) => {
          if (event.button !== 0) return
          event.currentTarget.setPointerCapture(event.pointerId)
          drag.current = {
            x: event.clientX,
            y: event.clientY,
            panX: panRef.current.x,
            panY: panRef.current.y,
          }
        }}
        onPointerMove={(event) => {
          if (!drag.current) return
          const rect = event.currentTarget.getBoundingClientRect()
          const units = Math.max(width / rect.width, height / rect.height)
          const next = {
            x: drag.current.panX - (event.clientX - drag.current.x) * units,
            y: drag.current.panY - (event.clientY - drag.current.y) * units,
          }
          panRef.current = next
          event.currentTarget.setAttribute(
            "viewBox",
            `${b.x + (b.width - width) / 2 + next.x} ${b.y + (b.height - height) / 2 + next.y} ${width} ${height}`
          )
        }}
        onPointerUp={() => {
          setPan(panRef.current)
          drag.current = null
        }}
        onPointerCancel={() => {
          setPan(panRef.current)
          drag.current = null
        }}
      >
        <title>London trains</title>
        {layout.edges.map((edge) => (
          <polyline
            key={edge.id}
            points={edge.points.map((p) => `${p.x},${p.y}`).join(" ")}
            fill="none"
            stroke={getLineColor(edge.lineId).hex}
            strokeWidth={5}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={
              edge.lineId === "northern" ? "dark:stroke-[#b8c4ce]" : undefined
            }
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {[...layout.nodes.values()].map((node) => (
          <g key={node.id}>
            <circle
              cx={node.x}
              cy={node.y}
              r={(node.lines.size > 1 ? 6 : 4) * scale}
              className="fill-[#f7f5ef] stroke-[#252c35] dark:fill-[#171d25] dark:stroke-[#e5e8eb]"
              strokeWidth={1.8}
              vectorEffect="non-scaling-stroke"
            >
              <title>{node.name}</title>
            </circle>
            {labels.has(node.id) ? (
              <text
                x={labels.get(node.id)!.x}
                textAnchor={labels.get(node.id)!.anchor}
                y={node.y + 3 * scale}
                fontSize={10 * scale}
                className="fill-[#5e6267] dark:fill-[#aeb7c3]"
                style={{
                  paintOrder: "stroke",
                  stroke: "var(--train-map-paper)",
                  strokeWidth: 3 * scale,
                  strokeLinejoin: "round",
                }}
              >
                {node.name}
              </text>
            ) : null}
          </g>
        ))}
        {vehicles
          .filter((v) => v.trainMotion)
          .map((vehicle) => {
            const key = `${vehicle.lineId}:${vehicle.vehicleId}`
            const point = trainDiagramPoint(layout, vehicle.trainMotion!)
            return (
              <g
                key={key}
                ref={(element) => {
                  if (element) {
                    trainElements.current.set(key, element)
                    if (point && !element.hasAttribute("transform"))
                      element.setAttribute(
                        "transform",
                        `translate(${point.x} ${point.y}) rotate(${point.angle})`
                      )
                  } else trainElements.current.delete(key)
                }}
              >
                <title>
                  {vehicle.lineId} train to {vehicle.destinationName}
                </title>
                <rect
                  x={-8 * scale}
                  y={-4 * scale}
                  width={16 * scale}
                  height={8 * scale}
                  rx={2.5 * scale}
                  fill={vehicle.color ?? getLineColor(vehicle.lineId).hex}
                  className={
                    vehicle.lineId === "northern"
                      ? "stroke-[#f7f5ef] dark:fill-[#b8c4ce] dark:stroke-[#171d25]"
                      : "stroke-[#f7f5ef] dark:stroke-[#171d25]"
                  }
                  strokeWidth={2}
                  vectorEffect="non-scaling-stroke"
                />
                <rect
                  x={3 * scale}
                  y={-2 * scale}
                  width={2.5 * scale}
                  height={4 * scale}
                  rx={0.8 * scale}
                  fill="white"
                  fillOpacity={0.85}
                />
              </g>
            )
          })}
      </svg>
      <div className="pointer-events-none absolute top-5 left-5 flex flex-wrap gap-3 text-xs text-foreground/80">
        {lineIds.map((id) => (
          <span key={id} className="flex items-center gap-2">
            <span
              className={
                id === "northern"
                  ? "h-1 w-5 rounded-full dark:!bg-[#b8c4ce]"
                  : "h-1 w-5 rounded-full"
              }
              style={{ background: getLineColor(id).hex }}
            />
            {id[0]!.toUpperCase() + id.slice(1)}
          </span>
        ))}
      </div>
      <div className="absolute right-4 bottom-4 flex gap-2">
        <button
          className={control}
          aria-label={paused ? "Resume trains" : "Pause trains"}
          onClick={() => setPaused((p) => !p)}
        >
          {paused ? <Play size={16} /> : <Pause size={16} />}
        </button>
        <button
          className={control}
          aria-label="Zoom out"
          disabled={zoom <= 1}
          onClick={() => setZoom((z) => Math.max(1, z / 1.4))}
        >
          <Minus size={16} />
        </button>
        <button
          className={control}
          aria-label="Zoom in"
          disabled={zoom >= 5}
          onClick={() => setZoom((z) => Math.min(5, z * 1.4))}
        >
          <Plus size={16} />
        </button>
        <button
          className={control}
          aria-label="Fit network"
          onClick={() => {
            setZoom(1)
            panRef.current = { x: 0, y: 0 }
            setPan({ x: 0, y: 0 })
          }}
        >
          <Maximize2 size={16} />
        </button>
      </div>
      <span className="pointer-events-none absolute bottom-5 left-5 text-[10px] text-foreground/45">
        Estimated positions · TfL open data
      </span>
    </div>
  )
}
