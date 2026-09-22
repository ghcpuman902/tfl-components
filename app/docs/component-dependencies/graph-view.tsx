"use client"

import {
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type WheelEvent,
} from "react"
import {
  COMPONENT_GRAPH_LAYOUT,
  type ComponentGraphNode,
  type ComponentGraphSnapshot,
} from "@/lib/dev/component-graph/types"
import { cn } from "@/lib/utils"

const { NODE_WIDTH, NODE_HEIGHT, LAYER_GAP_Y, NODE_GAP_X } =
  COMPONENT_GRAPH_LAYOUT

type GraphViewProps = {
  snapshot: ComponentGraphSnapshot
}

type StateFilter = "all" | "stateful" | "stateless"
type DataFilter = "all" | "tfl" | "generic"

const stateFill = (state: ComponentGraphNode["state"]) =>
  state === "stateful" ? "var(--chart-4)" : "var(--chart-2)"

export const ComponentGraphView = ({ snapshot }: GraphViewProps) => {
  const [query, setQuery] = useState("")
  const [stateFilter, setStateFilter] = useState<StateFilter>("all")
  const [dataFilter, setDataFilter] = useState<DataFilter>("all")
  const [orphansOnly, setOrphansOnly] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pan, setPan] = useState({ x: 24, y: 24 })
  const [scale, setScale] = useState(1)
  const dragRef = useRef<{ x: number; y: number; panX: number; panY: number } | null>(
    null
  )

  const dependantsById = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const edge of snapshot.edges) {
      const list = map.get(edge.to) ?? []
      list.push(edge.from)
      map.set(edge.to, list)
    }
    for (const [key, list] of map) {
      map.set(key, [...list].sort())
    }
    return map
  }, [snapshot.edges])

  const dependenciesById = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const edge of snapshot.edges) {
      const list = map.get(edge.from) ?? []
      list.push(edge.to)
      map.set(edge.from, list)
    }
    for (const [key, list] of map) {
      map.set(key, [...list].sort())
    }
    return map
  }, [snapshot.edges])

  const visibleNodes = useMemo(() => {
    const q = query.trim().toLowerCase()
    return snapshot.nodes.filter((node) => {
      if (orphansOnly && !node.orphan) return false
      if (stateFilter !== "all" && node.state !== stateFilter) return false
      if (dataFilter === "tfl" && !node.tflData) return false
      if (dataFilter === "generic" && node.tflData) return false
      if (!q) return true
      const haystack = [
        node.id,
        node.displayName,
        ...node.exports,
      ]
        .join(" ")
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [snapshot.nodes, query, stateFilter, dataFilter, orphansOnly])

  const visibleIds = useMemo(
    () => new Set(visibleNodes.map((node) => node.id)),
    [visibleNodes]
  )

  const visibleEdges = useMemo(
    () =>
      snapshot.edges.filter(
        (edge) => visibleIds.has(edge.from) && visibleIds.has(edge.to)
      ),
    [snapshot.edges, visibleIds]
  )

  const bounds = useMemo(() => {
    if (visibleNodes.length === 0) {
      return { width: 800, height: 480 }
    }
    let maxX = 0
    let maxY = 0
    for (const node of visibleNodes) {
      maxX = Math.max(maxX, node.x + NODE_WIDTH)
      maxY = Math.max(maxY, node.y + NODE_HEIGHT)
    }
    return {
      width: maxX + NODE_GAP_X,
      height: maxY + LAYER_GAP_Y,
    }
  }, [visibleNodes])

  const selected = selectedId
    ? snapshot.nodes.find((node) => node.id === selectedId) ?? null
    : null

  const handleWheel = (event: WheelEvent<SVGSVGElement>) => {
    event.preventDefault()
    const delta = event.deltaY > 0 ? 0.9 : 1.1
    setScale((current) => Math.min(2.5, Math.max(0.35, current * delta)))
  }

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      panX: pan.x,
      panY: pan.y,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current
    if (!drag) return
    setPan({
      x: drag.panX + (event.clientX - drag.x),
      y: drag.panY + (event.clientY - drag.y),
    })
  }

  const handlePointerUp = (event: PointerEvent<SVGSVGElement>) => {
    dragRef.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const handleNodeKeyDown = (
    event: KeyboardEvent<SVGGElement>,
    nodeId: string
  ) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      setSelectedId(nodeId)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3 text-sm">
        <label className="flex min-w-48 flex-1 flex-col gap-1">
          <span className="text-muted-foreground">Search modules</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="line-badge, arrivals, map…"
            className="h-9 rounded-md border border-border bg-background px-3"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">State</span>
          <select
            value={stateFilter}
            onChange={(event) =>
              setStateFilter(event.target.value as StateFilter)
            }
            className="h-9 rounded-md border border-border bg-background px-2"
          >
            <option value="all">All</option>
            <option value="stateful">Stateful</option>
            <option value="stateless">Stateless</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground">Data contract</span>
          <select
            value={dataFilter}
            onChange={(event) => setDataFilter(event.target.value as DataFilter)}
            className="h-9 rounded-md border border-border bg-background px-2"
          >
            <option value="all">All</option>
            <option value="tfl">tfl-ts typed</option>
            <option value="generic">Generic props</option>
          </select>
        </label>
        <label className="flex items-center gap-2 pb-1">
          <input
            type="checkbox"
            checked={orphansOnly}
            onChange={(event) => setOrphansOnly(event.target.checked)}
          />
          <span>Orphans only</span>
        </label>
        <button
          type="button"
          className="h-9 rounded-md border border-border px-3 hover:bg-muted"
          onClick={() => {
            setPan({ x: 24, y: 24 })
            setScale(1)
          }}
        >
          Reset view
        </button>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span>
          {visibleNodes.length} / {snapshot.manifest.nodeCount} nodes ·{" "}
          {visibleEdges.length} / {snapshot.manifest.edgeCount} edges ·{" "}
          {snapshot.manifest.orphanCount} orphans total
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block size-3 rounded-sm"
            style={{ background: "var(--chart-2)" }}
            aria-hidden
          />
          Stateless
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block size-3 rounded-sm"
            style={{ background: "var(--chart-4)" }}
            aria-hidden
          />
          Stateful
        </span>
        <span className="inline-flex items-center gap-2">
          <span
            className="inline-block size-3 rounded-full border-2 border-primary"
            aria-hidden
          />
          tfl-ts typed props
        </span>
        <span>Arrow: importer → dependency</span>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="overflow-hidden rounded-md border border-border bg-muted/20">
          <svg
            role="img"
            aria-label="TfL component dependency graph"
            viewBox={`0 0 ${bounds.width} ${bounds.height}`}
            className="h-[min(70vh,720px)] w-full touch-none"
            onWheel={handleWheel}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            <g transform={`translate(${pan.x} ${pan.y}) scale(${scale})`}>
              <defs>
                <marker
                  id="component-graph-arrow"
                  viewBox="0 0 10 10"
                  refX="8"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
                </marker>
              </defs>
              {visibleEdges.map((edge) => {
                const from = visibleNodes.find((node) => node.id === edge.from)
                const to = visibleNodes.find((node) => node.id === edge.to)
                if (!from || !to) return null
                const x1 = from.x + NODE_WIDTH / 2
                const y1 = from.y + NODE_HEIGHT
                const x2 = to.x + NODE_WIDTH / 2
                const y2 = to.y
                return (
                  <line
                    key={`${edge.from}->${edge.to}`}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="currentColor"
                    strokeOpacity={0.35}
                    markerEnd="url(#component-graph-arrow)"
                  />
                )
              })}
              {visibleNodes.map((node) => {
                const isSelected = selectedId === node.id
                return (
                  <g
                    key={node.id}
                    transform={`translate(${node.x} ${node.y})`}
                    tabIndex={0}
                    role="button"
                    aria-label={`${node.displayName}, ${node.state}, ${node.tflData ? "tfl-ts typed" : "generic props"}${node.orphan ? ", orphan" : ""}`}
                    onClick={() => setSelectedId(node.id)}
                    onKeyDown={(event) => handleNodeKeyDown(event, node.id)}
                    className="cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {node.tflData ? (
                      <rect
                        x={-4}
                        y={-4}
                        width={NODE_WIDTH + 8}
                        height={NODE_HEIGHT + 8}
                        rx={8}
                        fill="none"
                        stroke="var(--primary)"
                        strokeWidth={3}
                      />
                    ) : null}
                    <rect
                      width={NODE_WIDTH}
                      height={NODE_HEIGHT}
                      rx={6}
                      fill={stateFill(node.state)}
                      fillOpacity={0.18}
                      stroke={isSelected ? "var(--foreground)" : "var(--border)"}
                      strokeWidth={isSelected ? 2 : 1}
                    />
                    <text
                      x={10}
                      y={18}
                      className="fill-foreground text-[11px] font-medium"
                    >
                      {node.displayName}
                    </text>
                    <text
                      x={10}
                      y={34}
                      className="fill-muted-foreground text-[10px]"
                    >
                      {node.state}
                      {node.tflData ? " · tfl-ts" : " · generic"}
                    </text>
                    <text
                      x={10}
                      y={50}
                      className="fill-muted-foreground text-[10px]"
                    >
                      {node.exports.slice(0, 2).join(", ")}
                      {node.exports.length > 2 ? "…" : ""}
                    </text>
                    {node.orphan ? (
                      <text
                        x={10}
                        y={64}
                        className="fill-muted-foreground text-[10px] italic"
                      >
                        orphan
                      </text>
                    ) : null}
                  </g>
                )
              })}
            </g>
          </svg>
        </div>

        <aside className="space-y-3 rounded-md border border-border p-4 text-sm">
          <h2 className="font-medium text-foreground">Selection</h2>
          {selected ? (
            <div className="space-y-3 text-muted-foreground">
              <p className="font-mono text-xs text-foreground">{selected.id}</p>
              <p>
                <span className="text-foreground">Exports:</span>{" "}
                {selected.exports.join(", ") || "—"}
              </p>
              <p>
                <span className="text-foreground">State:</span> {selected.state}{" "}
                ({selected.stateSource})
              </p>
              <p>
                <span className="text-foreground">Data:</span>{" "}
                {selected.tflData ? "tfl-ts typed" : "generic"} (
                {selected.tflDataSource})
              </p>
              {selected.overrideNote ? (
                <p>
                  <span className="text-foreground">Override:</span>{" "}
                  {selected.overrideNote}
                </p>
              ) : null}
              <div>
                <p className="text-foreground">Depends on</p>
                <ul className="mt-1 list-disc pl-5">
                  {(dependenciesById.get(selected.id) ?? []).map((id) => (
                    <li key={id}>
                      <button
                        type="button"
                        className="text-left underline-offset-4 hover:underline"
                        onClick={() => setSelectedId(id)}
                      >
                        {id}
                      </button>
                    </li>
                  ))}
                  {(dependenciesById.get(selected.id) ?? []).length === 0 ? (
                    <li>None</li>
                  ) : null}
                </ul>
              </div>
              <div>
                <p className="text-foreground">Used by</p>
                <ul className="mt-1 list-disc pl-5">
                  {(dependantsById.get(selected.id) ?? []).map((id) => (
                    <li key={id}>
                      <button
                        type="button"
                        className="text-left underline-offset-4 hover:underline"
                        onClick={() => setSelectedId(id)}
                      >
                        {id}
                      </button>
                    </li>
                  ))}
                  {(dependantsById.get(selected.id) ?? []).length === 0 ? (
                    <li>None</li>
                  ) : null}
                </ul>
              </div>
              <div>
                <p className="text-foreground">Evidence</p>
                <ul className="mt-1 list-disc pl-5">
                  {selected.evidence.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <p>Select a node to inspect imports, dependants, and inference.</p>
          )}
        </aside>
      </div>

      {snapshot.manifest.staleOverrideKeys.length > 0 ? (
        <p className={cn("text-sm text-muted-foreground")}>
          Stale override keys:{" "}
          {snapshot.manifest.staleOverrideKeys.join(", ")}
        </p>
      ) : null}
    </div>
  )
}
