/**
 * Abstract directed-matrix vertex scenarios. Investigation only —
 * no preferred layout is chosen here.
 */

import type { PatternKind } from "./pattern"

export const PORT_LABELS = ["A", "B", "C", "D", "E", "F"] as const

export type PortId = (typeof PORT_LABELS)[number]

/**
 * Demo terminus names keyed by port letter — real station strings so
 * the name-box safe space is exercised the same way
 * `/drafts/diagram-atoms` proves it. Typography fixtures only; not
 * live TfL arm identities.
 */
export const PORT_DEMO_NAMES: Record<PortId, string> = {
  A: "Aldgate",
  B: "Bank",
  C: "Cannon Street",
  D: "Dagenham East",
  E: "Earl's Court",
  F: "Farringdon",
}

/** Interchange-group label `stationNameAnchors` always paints. */
export const STATION_GROUP_NAME = "Station"

export type DirectedMove = {
  from: PortId
  to: PortId
}

export type DirectedMatrix = {
  /** Circular clockwise order. After canonicalisation A is first. */
  ports: PortId[]
  moves: DirectedMove[]
}

export type ObservedExample = {
  lineId: string
  lineName: string
  stationId: string
  stationName: string
}

export type DirectedForbiddenTurn = {
  at: string
  from: string
  to: string
}

export type VertexNodeKind = "boundary" | "station" | "anonymous"

export type VertexNode = {
  id: string
  kind: VertexNodeKind
  port?: PortId
}

export type VertexEdgeKind = "track" | "bond"

export type VertexEdge = {
  id: string
  a: string
  b: string
  kind: VertexEdgeKind
}

export type VertexTree = {
  nodes: VertexNode[]
  edges: VertexEdge[]
  forbiddenTurns: DirectedForbiddenTurn[]
  /** Planar offset for a bonded terminus relative to a through trunk. */
  stubSide: -1 | 1 | 0
}

export type DirectedPath = {
  from: PortId
  to: PortId
  permitted: boolean
  nodeIds: string[]
  edgeIds: string[]
}

export type DirectedCellState = "na" | "none" | "forward" | "reverse" | "both"

export type VertexCandidate = {
  id: string
  scenarioId: string
  index: number
  total: number
  planarKey: string
  planarNote: string
  tree: VertexTree
  passengerVertices: number
  anonymousJunctions: number
  exact: boolean
  reconstructed: DirectedPath[]
}

export type VertexScenario = {
  id: string
  degree: number
  kind: PatternKind
  title: string
  note: string
  matrix: DirectedMatrix
  signature: string
  connected: boolean
  directional: boolean
  examples: ObservedExample[]
  candidates: VertexCandidate[]
}
