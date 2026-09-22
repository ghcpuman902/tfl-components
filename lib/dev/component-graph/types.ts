export type ComponentState = "stateful" | "stateless"

export type FieldSource = "inferred" | "override"

export type ComponentGraphNode = {
  id: string
  displayName: string
  exports: string[]
  state: ComponentState
  stateSource: FieldSource
  tflData: boolean
  tflDataSource: FieldSource
  orphan: boolean
  layer: number
  x: number
  y: number
  evidence: string[]
  overrideNote?: string
}

export type ComponentGraphEdge = {
  from: string
  to: string
}

export type ComponentGraphManifest = {
  generatedAt: string
  nodeCount: number
  edgeCount: number
  orphanCount: number
  overrideKeys: string[]
  staleOverrideKeys: string[]
}

export type ComponentGraphSnapshot = {
  manifest: ComponentGraphManifest
  nodes: ComponentGraphNode[]
  edges: ComponentGraphEdge[]
}

export type ComponentGraphSkeletonCandidate = {
  id: string
  displayName: string
  exports: string[]
  included: boolean
  exclusionReason?: string
  inferredState: ComponentState
  inferredTflData: boolean
  evidence: string[]
  dependencies: string[]
  dependants: string[]
}

export type ComponentGraphSkeleton = {
  generatedAt: string
  candidates: ComponentGraphSkeletonCandidate[]
  edges: ComponentGraphEdge[]
}

export type ComponentGraphOverride = {
  include?: boolean
  displayName?: string
  state?: ComponentState
  tflData?: boolean
  note?: string
}

export const COMPONENT_GRAPH_CACHE_DIR = ".cache/component-dependencies"
export const COMPONENT_GRAPH_SNAPSHOT_FILE = "graph.json"
export const COMPONENT_GRAPH_SKELETON_FILE = "skeleton.json"

export const COMPONENT_GRAPH_LAYOUT = {
  NODE_WIDTH: 220,
  NODE_HEIGHT: 72,
  LAYER_GAP_Y: 120,
  NODE_GAP_X: 32,
} as const
