"use client"

import { useMemo, useState } from "react"
import {
  composeYs,
  checkComposed,
  type ComposedYs,
} from "@/lib/tfl/investigate/vertex-scenarios/compose"
import { reconstructDirected } from "@/lib/tfl/investigate/vertex-scenarios/reconstruct"
import { WORKBENCH_PRESETS } from "@/lib/tfl/investigate/vertex-scenarios/workbench-presets"
import type {
  DirectedMatrix,
  DirectedMove,
  PortId,
} from "@/lib/tfl/investigate/vertex-scenarios/types"
import { octilinearLanePath } from "@/lib/tfl/schematic-layout"
import { cn } from "@/lib/utils"
import { Bond, Ring, Tick, Track, type ActiveMove } from "./paint"

type Point = { x: number; y: number }

function layoutTree(composition: ComposedYs, root: PortId) {
  const { tree, stems } = composition
  const adj = new Map(
    tree.nodes.map((node) => [
      node.id,
      tree.edges
        .filter((e) => e.a === node.id || e.b === node.id)
        .map((e) => (e.a === node.id ? e.b : e.a)),
    ])
  )
  const pos = new Map<string, Point>()
  const outward = new Map<string, number>()
  const leafCount = (id: string, parent: string): number =>
    tree.nodes.find((n) => n.id === id)?.port
      ? 1
      : adj
          .get(id)!
          .filter((n) => n !== parent)
          .reduce((sum, n) => sum + leafCount(n, id), 0)
  const visit = (
    id: string,
    parent: string,
    x: number,
    y: number,
    going: number,
    parentY: number
  ) => {
    pos.set(id, { x, y })
    if (tree.nodes.find((n) => n.id === id)?.port) {
      outward.set(id, going)
      return
    }
    const children = adj.get(id)!.filter((n) => n !== parent)
    if (stems[id] === parent) {
      const gap = 20 * Math.max(...children.map((n) => leafCount(n, id))) + 16
      children.forEach((n, i) =>
        visit(n, id, x + going * 120, y + (i === 0 ? -gap : gap), going, y)
      )
    } else {
      const stem = stems[id]!
      const branch = children.find((n) => n !== stem)!
      visit(stem, id, x + going * 120, y, going, y)
      const sign = y < parentY ? -1 : 1
      visit(
        branch,
        id,
        x - going * 120,
        y + sign * (20 * leafCount(branch, id) + 36),
        -going,
        y
      )
    }
  }
  const start = tree.nodes.find((node) => node.port === root)!.id
  pos.set(start, { x: 0, y: 0 })
  outward.set(start, -1)
  visit(adj.get(start)![0]!, start, 120, 0, 1, 0)
  const internalX = tree.nodes
    .filter((n) => !n.port)
    .map((n) => pos.get(n.id)!.x)
  const left = Math.min(...internalX) - 150
  const right = Math.max(...internalX) + 150
  for (const [id, direction] of outward)
    pos.set(id, { ...pos.get(id)!, x: direction < 0 ? left : right })
  const ys = [...pos.values()].map((p) => p.y)
  return {
    pos,
    minX: left - 34,
    minY: Math.min(...ys) - 48,
    width: right - left + 68,
    height: Math.max(...ys) - Math.min(...ys) + 96,
  }
}

function JoinedDrawing({
  composition,
  root,
  markerIndex,
  mirror,
  active,
}: {
  composition: ComposedYs
  root: PortId
  markerIndex: number
  mirror: boolean
  active: ActiveMove
}) {
  const layout = layoutTree(composition, root)
  const { tree } = composition
  const project = (point: Point) => ({
    x: mirror ? layout.width - (point.x - layout.minX) : point.x - layout.minX,
    y: point.y - layout.minY,
  })
  const positions = new Map([...layout.pos].map(([id, p]) => [id, project(p)]))
  const leafEnd = (a: string, b: string) => {
    const leaf = tree.nodes.find(
      (node) => (node.id === a || node.id === b) && node.port
    )
    if (!leaf) return null
    const point = positions.get(leaf.id)!
    const inner = positions.get(leaf.id === a ? b : a)!
    return { point, inner, sign: Math.sign(inner.x - point.x) }
  }
  const selected = active
    ? reconstructDirected(
        tree,
        tree.nodes.flatMap((n) => (n.port ? [n.port] : []))
      ).find((p) => p.from === active.from && p.to === active.to)
    : null
  const markers = (
    composition.markerVariants[markerIndex] ?? composition.markerVariants[0]!
  )
    .map((id) => {
      const edge = tree.edges.find((e) => e.id === id)!
      const leaf = leafEnd(edge.a, edge.b)
      if (leaf) return { x: leaf.point.x + leaf.sign * 24, y: leaf.point.y }
      const a = positions.get(edge.a)!,
        b = positions.get(edge.b)!
      return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
    })
    .sort((a, b) => a.y - b.y)
  return (
    <svg
      role="img"
      aria-label="Joined Ys with each boundary arm drawn once"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      className="h-auto w-full min-w-[540px]"
    >
      {tree.edges.map((edge) => {
        const a = positions.get(edge.a)!,
          b = positions.get(edge.b)!
        const selectedEdge =
          selected?.permitted && selected.edgeIds.includes(edge.id)
        const leaf = leafEnd(edge.a, edge.b)
        const path = leaf
          ? `${octilinearLanePath(leaf.inner.x, leaf.inner.y, leaf.point.x + leaf.sign * 48, leaf.point.y, 22)} L ${leaf.point.x} ${leaf.point.y}`
          : octilinearLanePath(a.x, a.y, b.x, b.y, 22)
        return (
          <Track
            key={edge.id}
            d={path}
            on={Boolean(selectedEdge)}
            active={active}
          />
        )
      })}
      {markers.slice(1).map((b, i) => (
        <Bond key={i} a={markers[i]!} b={b} />
      ))}
      {markers.map((p, i) => (
        <Ring key={i} x={p.x} y={p.y} />
      ))}
      {tree.nodes
        .filter((node) => node.port)
        .map((node) => {
          const p = positions.get(node.id)!
          const neighbour = tree.edges.find(
            (e) => e.a === node.id || e.b === node.id
          )!
          const inside = positions.get(
            neighbour.a === node.id ? neighbour.b : neighbour.a
          )!
          const left = p.x < inside.x
          return (
            <Tick
              key={node.id}
              x={p.x}
              y={p.y}
              axis="v"
              label={node.port!}
              labelAt={{ x: p.x + (left ? -20 : 20), y: p.y }}
            />
          )
        })}
    </svg>
  )
}

export function CompositionExperiment({
  matrix,
  active,
  photoCase,
  onAdoptPhotoPermissions,
  compact = false,
  mirror: mirrorProp,
}: {
  matrix: DirectedMatrix
  active: DirectedMove | null
  photoCase: boolean
  onAdoptPhotoPermissions: () => void
  compact?: boolean
  mirror?: boolean
}) {
  const candidates = useMemo(() => composeYs(matrix), [matrix])
  const reference = useMemo(
    () =>
      composeYs(WORKBENCH_PRESETS.find((p) => p.id === "shared-five")!.matrix),
    []
  )
  const [photo, setPhoto] = useState(photoCase)
  const [candidateIndex, setCandidateIndex] = useState(0)
  const [markerIndex, setMarkerIndex] = useState(0)
  const [mirrorState, setMirrorState] = useState(true)
  const [root, setRoot] = useState<PortId>("A")
  const mirror = mirrorProp ?? mirrorState
  const comparison = photo && photoCase && matrix.ports.length === 5
  const choices = comparison ? reference : candidates
  const composition = choices[candidateIndex] ?? choices[0]
  const check = composition ? checkComposed(matrix, composition) : null
  const exact = check && check.extra.length === 0 && check.missing.length === 0
  const control =
    "min-h-10 rounded-md border border-border bg-background px-3 py-2 text-sm"
  return (
    <section
      className={cn("space-y-4", !compact && "rounded-xl border border-border p-5 sm:p-6")}
      aria-label="Joined Ys"
    >
      {!compact && (
        <header className="space-y-2">
          <h3 className="text-xl font-medium">Joined Ys</h3>
        </header>
      )}
      {photoCase && matrix.ports.length === 5 && (
        <div
          role="group"
          aria-label="Composition comparison"
          className="flex flex-wrap gap-2"
        >
          {[false, true].map((value) => (
            <button
              type="button"
              key={String(value)}
              aria-pressed={photo === value}
              className={cn(control, photo === value && "border-foreground bg-foreground text-background")}
              onClick={() => {
                setPhoto(value)
                setCandidateIndex(0)
                setMarkerIndex(0)
              }}
            >
              {value ? "Photograph" : "Recorded services"}
            </button>
          ))}
        </div>
      )}
      {!composition ? (
        <p className="text-sm text-muted-foreground">
          No tree of Ys matches this matrix.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-3">
            {choices.length > 1 && (
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                Combination
                <select
                  className={cn(control, "text-foreground")}
                  value={Math.min(candidateIndex, choices.length - 1)}
                  onChange={(e) => {
                    setCandidateIndex(Number(e.target.value))
                    setMarkerIndex(0)
                  }}
                >
                  {choices.map((_, i) => (
                    <option value={i} key={i}>
                      {i + 1} of {choices.length}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {composition.markerVariants.length > 1 && (
              <label className="flex flex-col gap-1 text-xs text-muted-foreground">
                S placement
                <select
                  className={cn(control, "text-foreground")}
                  value={Math.min(
                    markerIndex,
                    composition.markerVariants.length - 1
                  )}
                  onChange={(e) => setMarkerIndex(Number(e.target.value))}
                >
                  {composition.markerVariants.map((_, i) => (
                    <option value={i} key={i}>
                      {i + 1} of {composition.markerVariants.length}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="flex flex-col gap-1 text-xs text-muted-foreground">
              From
              <select
                className={cn(control, "text-foreground")}
                value={matrix.ports.includes(root) ? root : matrix.ports[0]}
                onChange={(e) => setRoot(e.target.value as PortId)}
              >
                {matrix.ports.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            {mirrorProp == null && (
              <label className="flex min-h-10 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={mirrorState}
                  onChange={(e) => setMirrorState(e.target.checked)}
                />
                Mirror
              </label>
            )}
          </div>
          <div
            className="overflow-x-auto rounded-lg border border-border p-3"
            tabIndex={0}
            role="region"
            aria-label="Joined Y drawing"
          >
            <JoinedDrawing
              composition={composition}
              root={matrix.ports.includes(root) ? root : matrix.ports[0]!}
              markerIndex={markerIndex}
              mirror={mirror}
              active={active}
            />
          </div>
          <p
            className={cn(
              "text-sm",
              exact ? "text-muted-foreground" : "text-destructive"
            )}
            role="status"
          >
            {exact
              ? `${Object.keys(composition.stems).length} Ys · ${composition.markerVariants[0]!.length} S`
              : `${check!.missing.length} missing · ${check!.extra.length} extra`}
            {check!.extra.length > 0
              ? ` · ${check!.extra.map((m) => `${m.from}→${m.to}`).join(", ")}`
              : ""}
          </p>
          {comparison && !exact && (
            <button
              type="button"
              className={control}
              onClick={onAdoptPhotoPermissions}
            >
              Permit B ↔ E
            </button>
          )}
        </>
      )}
    </section>
  )
}
