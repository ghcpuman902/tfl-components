/**
 * Candidate junction trees: labelled degree-≤3 decompositions and the
 * movement matrix reconstructed from them. Investigation only — no
 * preferred layout is chosen here.
 */

import type { HubMembership, MovementPair, NeighbourRef, StationRef } from "../types"

export type TreeNodeKind = "boundary" | "station" | "anonymous"

export type CandidateNode = {
  id: string
  kind: TreeNodeKind
  /** Incident neighbour id when `kind` is boundary. */
  leafId?: string
  leafName?: string
  /** Passenger identity when `kind` is station. */
  stationId?: string
  stationName?: string
  constituentLabel?: string
}

export type CandidateEdgeKind = "track" | "bond"

export type CandidateEdge = {
  id: string
  a: string
  b: string
  kind: CandidateEdgeKind
}

/** A forbidden turn at an internal node, between two adjacent tree nodes. */
export type ForbiddenTurn = {
  at: string
  neighborA: string
  neighborB: string
}

export type CandidateTree = {
  nodes: CandidateNode[]
  edges: CandidateEdge[]
  forbiddenTurns: ForbiddenTurn[]
}

export type ReconstructedPair = {
  a: string
  b: string
  permitted: boolean
  pathNodeIds: string[]
  pathEdgeIds: string[]
}

export type CellVerdict = "both" | "neither" | "missing" | "extra"

export type ComparedCell = {
  a: string
  b: string
  source: boolean
  reconstructed: boolean
  verdict: CellVerdict
}

export type MatrixComparison = {
  order: string[]
  cells: ComparedCell[]
  missing: number
  extra: number
  exact: boolean
}

export type BranchDescription = {
  leafId: string
  leafName: string
  downstreamStationCount: number
  distanceM: number | null
  isTerminus: boolean
  laterJunctionCount: number
  servicePatternCount: number
  bearingDeg: number | null
  hubIds: string[]
}

export type CandidateStats = {
  stationVertices: number
  anonymousJunctions: number
  maxDegree: number
  trackEdges: number
  bonds: number
  exact: boolean
  nearbyHubAffectsLayout: boolean
  tflDataSupports: boolean
}

export type CandidateRecord = {
  id: string
  canonicalKey: string
  tree: CandidateTree
  comparison: MatrixComparison
  reconstructed: ReconstructedPair[]
  stats: CandidateStats
  branches: BranchDescription[]
  coupledLayoutNote: string | null
}

export type SourceEvidenceRow = {
  a: string
  b: string
  sequences: { label: string; direction: "a-then-b" | "b-then-a" }[]
}

export type JunctionExplorerModel = {
  lineId: string
  lineName: string
  station: StationRef
  neighbours: NeighbourRef[]
  sourceMatrix: MovementPair[]
  hub: HubMembership | null
  candidates: CandidateRecord[]
  evidence: SourceEvidenceRow[]
  boundaryOrder: string[]
}
