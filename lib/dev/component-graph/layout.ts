import {
  COMPONENT_GRAPH_LAYOUT,
  type ComponentGraphEdge,
  type ComponentGraphNode,
} from "./types"

const { NODE_WIDTH, LAYER_GAP_Y, NODE_GAP_X } = COMPONENT_GRAPH_LAYOUT

const compareIds = (a: string, b: string) => a.localeCompare(b)

/**
 * Strongly connected components via iterative Tarjan. Nodes in the same
 * component share a layer so cyclic importer↔dependency pairs cannot spin
 * longest-path layering forever.
 */
const stronglyConnectedComponents = (
  ids: readonly string[],
  outgoing: ReadonlyMap<string, ReadonlySet<string>>
): string[][] => {
  let index = 0
  const indices = new Map<string, number>()
  const lowlink = new Map<string, number>()
  const onStack = new Set<string>()
  const stack: string[] = []
  const components: string[][] = []

  type Frame = {
    id: string
    neighbours: string[]
    next: number
  }

  for (const start of ids) {
    if (indices.has(start)) continue
    const frames: Frame[] = [
      { id: start, neighbours: [...(outgoing.get(start) ?? [])].sort(compareIds), next: 0 },
    ]
    indices.set(start, index)
    lowlink.set(start, index)
    index += 1
    stack.push(start)
    onStack.add(start)

    while (frames.length > 0) {
      const frame = frames[frames.length - 1]!
      if (frame.next < frame.neighbours.length) {
        const neighbour = frame.neighbours[frame.next]!
        frame.next += 1
        if (!indices.has(neighbour)) {
          indices.set(neighbour, index)
          lowlink.set(neighbour, index)
          index += 1
          stack.push(neighbour)
          onStack.add(neighbour)
          frames.push({
            id: neighbour,
            neighbours: [...(outgoing.get(neighbour) ?? [])].sort(compareIds),
            next: 0,
          })
          continue
        }
        if (onStack.has(neighbour)) {
          lowlink.set(
            frame.id,
            Math.min(lowlink.get(frame.id) ?? 0, indices.get(neighbour) ?? 0)
          )
        }
        continue
      }

      frames.pop()
      if ((lowlink.get(frame.id) ?? 0) === (indices.get(frame.id) ?? 0)) {
        const component: string[] = []
        while (stack.length > 0) {
          const node = stack.pop()!
          onStack.delete(node)
          component.push(node)
          if (node === frame.id) break
        }
        components.push(component.sort(compareIds))
      }

      const parent = frames[frames.length - 1]
      if (parent) {
        lowlink.set(
          parent.id,
          Math.min(lowlink.get(parent.id) ?? 0, lowlink.get(frame.id) ?? 0)
        )
      }
    }
  }

  return components
}

/** Deterministic layered layout with cycle-safe longest-path layering. */
export const layoutComponentGraph = (
  nodeIds: readonly string[],
  edges: readonly ComponentGraphEdge[],
  nodeMeta: Readonly<
    Map<
      string,
      Pick<
        ComponentGraphNode,
        | "displayName"
        | "exports"
        | "state"
        | "stateSource"
        | "tflData"
        | "tflDataSource"
        | "evidence"
        | "overrideNote"
      >
    >
  >
): ComponentGraphNode[] => {
  const ids = [...nodeIds].sort(compareIds)
  const idSet = new Set(ids)
  const outgoing = new Map<string, Set<string>>()
  const incoming = new Map<string, Set<string>>()

  for (const id of ids) {
    outgoing.set(id, new Set())
    incoming.set(id, new Set())
  }

  for (const edge of edges) {
    if (!idSet.has(edge.from) || !idSet.has(edge.to)) continue
    outgoing.get(edge.from)!.add(edge.to)
    incoming.get(edge.to)!.add(edge.from)
  }

  const components = stronglyConnectedComponents(ids, outgoing)
  const componentIndex = new Map<string, number>()
  components.forEach((component, index) => {
    for (const id of component) componentIndex.set(id, index)
  })

  const componentLayer = new Map<number, number>()
  for (let i = 0; i < components.length; i += 1) componentLayer.set(i, 0)

  // Longest path over the component condensation (a DAG).
  let changed = true
  let guard = 0
  const maxPasses = components.length + 1
  while (changed && guard < maxPasses) {
    changed = false
    guard += 1
    for (const edge of edges) {
      if (!idSet.has(edge.from) || !idSet.has(edge.to)) continue
      const fromComponent = componentIndex.get(edge.from)
      const toComponent = componentIndex.get(edge.to)
      if (fromComponent === undefined || toComponent === undefined) continue
      if (fromComponent === toComponent) continue
      const next = (componentLayer.get(fromComponent) ?? 0) + 1
      if (next > (componentLayer.get(toComponent) ?? 0)) {
        componentLayer.set(toComponent, next)
        changed = true
      }
    }
  }

  const layer = new Map<string, number>()
  for (const id of ids) {
    const component = componentIndex.get(id) ?? 0
    layer.set(id, componentLayer.get(component) ?? 0)
  }

  const byLayer = new Map<number, string[]>()
  for (const id of ids) {
    const l = layer.get(id) ?? 0
    const bucket = byLayer.get(l) ?? []
    bucket.push(id)
    byLayer.set(l, bucket)
  }

  const dependantCount = (id: string) => incoming.get(id)?.size ?? 0
  const dependencyCount = (id: string) => outgoing.get(id)?.size ?? 0

  const nodes: ComponentGraphNode[] = []

  for (const [layerIndex, layerIds] of [...byLayer.entries()].sort(
    (a, b) => a[0] - b[0]
  )) {
    const sorted = [...layerIds].sort(compareIds)
    sorted.forEach((id, index) => {
      const meta = nodeMeta.get(id)
      if (!meta) return
      const orphan = dependantCount(id) === 0 && dependencyCount(id) === 0
      nodes.push({
        id,
        displayName: meta.displayName,
        exports: meta.exports,
        state: meta.state,
        stateSource: meta.stateSource,
        tflData: meta.tflData,
        tflDataSource: meta.tflDataSource,
        orphan,
        layer: layerIndex,
        x: index * (NODE_WIDTH + NODE_GAP_X),
        y: layerIndex * LAYER_GAP_Y,
        evidence: meta.evidence,
        overrideNote: meta.overrideNote,
      })
    })
  }

  return nodes
}
