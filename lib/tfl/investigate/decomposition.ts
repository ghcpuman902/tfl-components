/**
 * Junction archetype classification and candidate degree-≤3 decomposition.
 *
 * The archetype is read straight off the movement matrix (see
 * `movement-matrix.ts`): how many of a degree-3 station's three pairs are
 * supported, and whether a higher-degree station's incident edges form one
 * connected movement graph or several. This is a fresh classification, not
 * a port of `branch-schematic-layout.ts`'s lane assignment.
 *
 * Decomposition uses average-linkage hierarchical clustering over the raw
 * per-pair evidence counts: repeatedly join whichever two edges (or partial
 * joins) have the strongest average evidence, until one root remains. Each
 * join is a candidate degree-3 vertex. This is a heuristic, not a proof of
 * the smallest possible decomposition — the aim is a legible candidate to
 * inspect, not a final answer.
 */

import { countTripleEvidence } from "./movement-matrix"
import type { PassengerGraph } from "./passenger-graph"
import type { DecompositionNode, JunctionArchetype } from "./types"

const pairKey = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`)

type Cluster = { node: DecompositionNode; members: string[] }

export const buildDecomposition = (
  graph: PassengerGraph,
  stationId: string,
  neighbourIds: readonly string[]
): DecompositionNode | null => {
  if (neighbourIds.length <= 3) return null

  const rawWeight = new Map<string, number>()
  for (let i = 0; i < neighbourIds.length; i++) {
    for (let j = i + 1; j < neighbourIds.length; j++) {
      const a = neighbourIds[i]!
      const b = neighbourIds[j]!
      rawWeight.set(pairKey(a, b), countTripleEvidence(graph.sequences, stationId, a, b))
    }
  }

  let clusters: Cluster[] = neighbourIds.map((id) => ({
    node: { kind: "leaf", neighbourId: id, neighbourName: graph.stationsById.get(id) ?? id },
    members: [id],
  }))

  const weightBetween = (x: Cluster, y: Cluster): number => {
    let total = 0
    for (const m1 of x.members) {
      for (const m2 of y.members) total += rawWeight.get(pairKey(m1, m2)) ?? 0
    }
    return total / (x.members.length * y.members.length)
  }

  let joinCounter = 0
  while (clusters.length > 1) {
    let bestI = 0
    let bestJ = 1
    let bestWeight = -1
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const weight = weightBetween(clusters[i]!, clusters[j]!)
        if (weight > bestWeight) {
          bestWeight = weight
          bestI = i
          bestJ = j
        }
      }
    }
    const left = clusters[bestI]!
    const right = clusters[bestJ]!
    joinCounter++
    const merged: Cluster = {
      node: {
        kind: "join",
        id: `J${joinCounter}`,
        evidenceCount: Math.round(bestWeight * 10) / 10,
        left: left.node,
        right: right.node,
      },
      members: [...left.members, ...right.members],
    }
    clusters = clusters.filter((_, index) => index !== bestI && index !== bestJ)
    clusters.push(merged)
  }

  return clusters[0]!.node
}

export const classifyArchetype = (
  degree: number,
  supportedPairCount: number,
  componentCount: number
): JunctionArchetype => {
  if (degree === 2 && supportedPairCount === 0) return "non-through-degree-2"
  if (degree === 3) {
    if (supportedPairCount === 3) return "triangle-junction"
    if (supportedPairCount === 2) return "through-y"
    if (supportedPairCount === 1) return "ordinary-y"
    return "isolated-degree-3"
  }
  if (componentCount > 1) return "independent-corridors"
  return "chained-junction"
}

export const ARCHETYPE_LABEL: Record<JunctionArchetype, string> = {
  "ordinary-y":
    "Ordinary Y — one through pair, one stub; split into a through vertex and a bonded terminus",
  "through-y": "Through Y — two of three pairs through-run",
  "triangle-junction": "Triangle junction — every pair through-runs",
  "isolated-degree-3": "Isolated degree 3 — no supported pair (check evidence)",
  "independent-corridors":
    "Independent corridors — two through-lines that share a name; split into bonded degree-2 vertices (H)",
  "chained-junction": "Chained junction — one connected group, needs internal expansion",
  "non-through-degree-2":
    "Dual terminus — two edges, no A–via–B run; split into two bonded termini",
  complex: "Complex — degree too high for a single archetype",
}

/** Short gallery heading — degree is prefixed by the catalogue. */
export const CATALOG_TYPE_LABEL: Record<JunctionArchetype, string> = {
  "non-through-degree-2": "Dual terminus",
  "through-y": "Through Y",
  "ordinary-y": "Through + terminus",
  "triangle-junction": "Triangle",
  "isolated-degree-3": "Isolated",
  "independent-corridors": "Independent corridors",
  "chained-junction": "Chained junction",
  complex: "Complex",
}

/** Within one degree, keep simple through-shapes before splits. */
export const CATALOG_TYPE_RANK: Record<JunctionArchetype, number> = {
  "non-through-degree-2": 0,
  "through-y": 1,
  "ordinary-y": 2,
  "triangle-junction": 3,
  "isolated-degree-3": 4,
  "independent-corridors": 5,
  "chained-junction": 6,
  complex: 7,
}
