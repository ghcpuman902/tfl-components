import {
  approximateStationMeasure,
  formatStationLabel,
} from "@/lib/tfl/station-typography"
import { labelScreenScale, viewBoxScreenScale } from "./station-graph-scale"

export type LabelAnchor = "start" | "end" | "middle"

export type LabelSide = "up" | "down"

export type GraphLabelNode = {
  id: string
  x: number
  y: number
  text: string
  kind: string
  degree: number
  neighborIds: readonly string[]
}

export type PlacedGraphLabel = {
  id: string
  lines: readonly string[]
  side: LabelSide
  pxX: number
  pxY: number
  anchor: LabelAnchor
  visible: boolean
  scale: number
}

const LINE_HEIGHT = 1.15
const CLEARANCE = 12
const MAX_LINES = 2

export const estimateLabelWidth = (text: string, fontSize: number): number =>
  Math.min(240, Math.max(18, text.length * fontSize * 0.56))

export const userToScreen = (
  userX: number,
  userY: number,
  viewBox: { x: number; y: number; w: number; h: number },
  viewport: { w: number; h: number }
): { x: number; y: number } => {
  const scale = viewBoxScreenScale(viewBox, viewport)
  const ox = (viewport.w - viewBox.w * scale) / 2
  const oy = (viewport.h - viewBox.h * scale) / 2
  return {
    x: (userX - viewBox.x) * scale + ox,
    y: (userY - viewBox.y) * scale + oy,
  }
}

const edgeKey = (a: string, b: string): string =>
  a < b ? `${a}|${b}` : `${b}|${a}`

export const assignLabelSides = (
  nodes: readonly GraphLabelNode[]
): Map<string, LabelSide> => {
  const sides = new Map<string, LabelSide>()
  const adj = new Map(nodes.map((node) => [node.id, node.neighborIds]))
  const used = new Set<string>()

  const walk = (start: string, next: string, startUp: boolean) => {
    const path = [start, next]
    used.add(edgeKey(start, next))
    let prev = start
    let cur = next
    while (true) {
      const neighbors = adj.get(cur) ?? []
      if (neighbors.length !== 2) break
      const step = neighbors.find(
        (id) => id !== prev && !used.has(edgeKey(cur, id))
      )
      if (!step) break
      used.add(edgeKey(cur, step))
      path.push(step)
      prev = cur
      cur = step
    }
    path.forEach((id, index) => {
      if (sides.has(id)) return
      const up = index % 2 === 0 ? startUp : !startUp
      sides.set(id, up ? "up" : "down")
    })
  }

  const starts = [
    ...nodes.filter((node) => node.degree <= 1),
    ...nodes.filter((node) => node.degree >= 3),
    ...nodes,
  ]
  for (const node of starts) {
    for (const neighbor of node.neighborIds) {
      if (used.has(edgeKey(node.id, neighbor))) continue
      walk(node.id, neighbor, sides.get(node.id) !== "down")
    }
  }
  for (const node of nodes) {
    if (!sides.has(node.id)) sides.set(node.id, "up")
  }
  return sides
}

const wrapStationName = (
  text: string,
  fontSize: number,
  maxWidth: number
) =>
  formatStationLabel(text, approximateStationMeasure, {
    maxWidth,
    fontSize,
    maxLines: MAX_LINES,
    allowAbbreviation: true,
    allowScaleDown: true,
  })

export const layoutStationLabels = (
  nodes: readonly GraphLabelNode[],
  zoom: { scale: number },
  hopScreenPx = Number.POSITIVE_INFINITY
): PlacedGraphLabel[] => {
  const font = 11 * labelScreenScale(zoom.scale)
  const maxWidth = Math.min(
    font * 7,
    Math.max(font * 3.4, hopScreenPx * 1.7)
  )
  const sides = assignLabelSides(nodes)
  return nodes.map((node) => {
    const side = sides.get(node.id) ?? "up"
    if (!node.text) {
      return {
        id: node.id,
        lines: [],
        side,
        pxX: 0,
        pxY: side === "up" ? -CLEARANCE : CLEARANCE,
        anchor: "middle",
        visible: false,
        scale: 1,
      }
    }
    const formatted = wrapStationName(node.text, font, maxWidth)
    return {
      id: node.id,
      lines: formatted.lines,
      side,
      pxX: 0,
      pxY: side === "up" ? -CLEARANCE : CLEARANCE,
      anchor: "middle",
      visible: true,
      scale: formatted.scale,
    }
  })
}

export const labelLineHeight = LINE_HEIGHT
export const labelClearance = CLEARANCE
