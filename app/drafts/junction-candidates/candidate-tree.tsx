"use client"

import { formatStationName } from "@/lib/tfl/diagram-station"
import { lineCssPaint } from "@/lib/tfl/line-colour-map"
import {
  DIAGRAM_BASELINE,
  interchangeOuterRadius,
  interchangeStroke,
  scale,
} from "@/lib/tfl/line-diagram"
import type { CandidateRecord, CandidateTree, ReconstructedPair } from "@/lib/tfl/investigate/candidates/types"

type Pt = { x: number; y: number }

const layoutTree = (tree: CandidateTree, order: readonly string[], size: number): Map<string, Pt> => {
  const pos = new Map<string, Pt>()
  const centre: Pt = { x: size / 2, y: size / 2 }
  const radius = size * 0.34
  const leafIndex = new Map(order.map((leafId, index) => [leafId, index]))
  const leafCount = Math.max(1, order.length)

  for (const node of tree.nodes) {
    if (node.kind === "boundary" && node.leafId) {
      const index = leafIndex.get(node.leafId) ?? 0
      const angle = (index / leafCount) * Math.PI * 2 - Math.PI / 2
      pos.set(node.id, {
        x: centre.x + radius * Math.cos(angle),
        y: centre.y + radius * Math.sin(angle),
      })
    } else {
      pos.set(node.id, { ...centre })
    }
  }

  const adj = new Map<string, string[]>()
  for (const node of tree.nodes) adj.set(node.id, [])
  for (const edge of tree.edges) {
    adj.get(edge.a)?.push(edge.b)
    adj.get(edge.b)?.push(edge.a)
  }

  for (let step = 0; step < 48; step++) {
    for (const node of tree.nodes) {
      if (node.kind === "boundary") continue
      const neighbours = adj.get(node.id) ?? []
      if (neighbours.length === 0) continue
      let x = 0
      let y = 0
      for (const neighbour of neighbours) {
        const point = pos.get(neighbour) ?? centre
        x += point.x
        y += point.y
      }
      const current = pos.get(node.id) ?? centre
      pos.set(node.id, {
        x: current.x * 0.2 + (x / neighbours.length) * 0.8,
        y: current.y * 0.2 + (y / neighbours.length) * 0.8,
      })
    }

    const internals = tree.nodes.filter((node) => node.kind !== "boundary")
    for (let i = 0; i < internals.length; i++) {
      for (let j = i + 1; j < internals.length; j++) {
        const a = pos.get(internals[i]!.id)
        const b = pos.get(internals[j]!.id)
        if (!a || !b) continue
        const dx = b.x - a.x
        const dy = b.y - a.y
        const dist = Math.hypot(dx, dy)
        const min = 36
        if (dist >= min || dist === 0) continue
        const push = (min - dist) / 2
        const nx = dx / (dist || 1)
        const ny = dy / (dist || 1)
        a.x -= nx * push
        a.y -= ny * push
        b.x += nx * push
        b.y += ny * push
      }
    }
  }
  return pos
}

const radialLabel = (point: Pt, centre: Pt, away: number): Pt => {
  const dx = point.x - centre.x
  const dy = point.y - centre.y
  const dist = Math.hypot(dx, dy) || 1
  return {
    x: point.x + (dx / dist) * away,
    y: point.y + (dy / dist) * away,
  }
}

export const CandidateTreeSvg = ({
  lineId,
  candidate,
  boundaryOrder,
  labels,
  highlight,
}: {
  lineId: string
  candidate: CandidateRecord
  boundaryOrder: readonly string[]
  labels: Map<string, string>
  highlight: ReconstructedPair | null
}) => {
  const size = 420
  const x = DIAGRAM_BASELINE.horizontal
  const pos = layoutTree(candidate.tree, boundaryOrder, size)
  const centre = { x: size / 2, y: size / 2 }
  const paint = lineCssPaint(lineId)
  const ring = interchangeOuterRadius(x)
  const ringStroke = interchangeStroke(x)
  const anonR = scale(x, 0.85)
  const highlightNodes = new Set(highlight?.pathNodeIds ?? [])
  const highlightEdges = new Set(highlight?.pathEdgeIds ?? [])
  const blocked = highlight != null && !highlight.permitted
  const highlightPaint = highlight ? (highlight.permitted ? paint : "var(--destructive)") : paint
  const stationName = formatStationName(
    candidate.tree.nodes.find((node) => node.kind === "station")?.stationName ?? ""
  )

  return (
    <svg
      viewBox={`-24 -16 ${size + 48} ${size + 40}`}
      role="img"
      aria-label={`Candidate ${candidate.id} tree`}
      data-line={lineId}
      data-tfl-diagram={lineId === "cable-car" ? "" : undefined}
      className="h-auto w-full overflow-visible"
    >
      {candidate.tree.edges.map((edge) => {
        const a = pos.get(edge.a)
        const b = pos.get(edge.b)
        if (!a || !b) return null
        const active = highlightEdges.has(edge.id)
        return (
          <line
            key={edge.id}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={
              edge.kind === "bond"
                ? "var(--muted-foreground)"
                : active
                  ? highlightPaint
                  : paint
            }
            strokeWidth={edge.kind === "bond" ? x * 0.7 : active ? x * 1.7 : x}
            strokeDasharray={edge.kind === "bond" ? "5 4" : undefined}
            strokeLinecap="round"
            opacity={highlight && !active && edge.kind === "track" ? 0.35 : 1}
          >
            <title>{edge.kind === "bond" ? "Passenger or hub bond" : "Track"}</title>
          </line>
        )
      })}

      {candidate.tree.forbiddenTurns.map((turn, index) => {
        const at = pos.get(turn.at)
        if (!at) return null
        const onFail =
          blocked &&
          highlightNodes.has(turn.at) &&
          highlightNodes.has(turn.neighborA) &&
          highlightNodes.has(turn.neighborB)
        return (
          <circle
            key={`turn-${index}`}
            cx={at.x}
            cy={at.y}
            r={anonR + 5}
            fill="none"
            stroke={onFail ? "var(--destructive)" : "var(--muted-foreground)"}
            strokeDasharray="2 2"
            strokeWidth={onFail ? 1.6 : 1}
          >
            <title>Internal turn is forbidden at this node</title>
          </circle>
        )
      })}

      {candidate.tree.nodes.map((node) => {
        const point = pos.get(node.id)
        if (!point) return null
        const active = highlightNodes.has(node.id)
        if (node.kind === "boundary") {
          const label = labels.get(node.leafId ?? "") ?? node.leafName ?? node.id
          const textAt = radialLabel(point, centre, 22)
          return (
            <g key={node.id}>
              <rect
                x={point.x - x * 0.45}
                y={point.y - x}
                width={x * 0.9}
                height={x * 2}
                fill={paint}
                opacity={highlight && !active ? 0.4 : 1}
              />
              <text
                x={textAt.x}
                y={textAt.y}
                textAnchor="middle"
                dominantBaseline="middle"
                className="fill-foreground"
                fontSize={11}
              >
                {label}
              </text>
            </g>
          )
        }
        if (node.kind === "station") {
          const caption = [stationName, node.constituentLabel].filter(Boolean).join(" · ")
          return (
            <g key={node.id}>
              <circle
                cx={point.x}
                cy={point.y}
                r={ring - ringStroke / 2}
                fill="var(--background)"
                stroke={active ? highlightPaint : "var(--foreground)"}
                strokeWidth={active ? ringStroke + 0.8 : ringStroke}
              />
              <title>{caption || "Passenger station"}</title>
              {caption ? (
                <text
                  x={point.x}
                  y={point.y + ring + 11}
                  textAnchor="middle"
                  className="fill-foreground"
                  fontSize={9}
                >
                  {caption}
                </text>
              ) : null}
            </g>
          )
        }
        return (
          <circle
            key={node.id}
            cx={point.x}
            cy={point.y}
            r={anonR}
            fill={active ? highlightPaint : "var(--foreground)"}
          >
            <title>Anonymous track junction</title>
          </circle>
        )
      })}
    </svg>
  )
}
