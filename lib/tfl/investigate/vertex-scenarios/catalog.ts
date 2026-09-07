/**
 * Degree-2 and degree-3 building blocks, with TfL observations attached.
 * One-way and two-way through-pairs share a block.
 */

import { catalogAllJunctions } from "../catalog"
import { matrixFromJunction, undirectedComponents } from "./directed-matrix"
import {
  PATTERN_ORDER,
  canonicalizePattern,
  classifyPattern,
  isDirectionalPair,
  patternMatrix,
  patternNote,
  patternTitle,
  type PatternKind,
} from "./pattern"
import { buildVertexCandidates } from "./candidates"
import type { ObservedExample, VertexCandidate, VertexScenario } from "./types"

const short = (name: string) => name.replace(/ (Underground|Rail|DLR) Station$/, "")

const BLOCKS: { kind: PatternKind; degree: number }[] = [
  { kind: "through", degree: 2 },
  { kind: "dual-terminus", degree: 2 },
  { kind: "y", degree: 3 },
  { kind: "through-terminus", degree: 3 },
  { kind: "triangle", degree: 3 },
  { kind: "three-termini", degree: 3 },
  { kind: "independent-corridors", degree: 4 },
]

export const catalogVertexScenarios = (): VertexScenario[] => {
  const examplesByKind = new Map<PatternKind, ObservedExample[]>()
  const directional = new Set<PatternKind>()

  for (const item of catalogAllJunctions()) {
    const matrix = canonicalizePattern(matrixFromJunction(item.junction))
    const kind = classifyPattern(matrix)
    if (kind === "other") continue
    if (isDirectionalPair(matrix)) directional.add(kind)
    const example: ObservedExample = {
      lineId: item.lineId,
      lineName: item.lineName,
      stationId: item.junction.station.id,
      stationName: short(item.junction.station.name),
    }
    const list = examplesByKind.get(kind) ?? []
    if (!list.some((row) => row.lineId === example.lineId && row.stationId === example.stationId)) {
      list.push(example)
    }
    examplesByKind.set(kind, list)
  }

  return BLOCKS.map(({ kind, degree }) => {
    const matrix = patternMatrix(kind)
    const id = `d${degree}-${kind}`
    const examples = (examplesByKind.get(kind) ?? []).sort((a, b) =>
      a.stationName.localeCompare(b.stationName)
    )
    const candidates = buildVertexCandidates(id, matrix)
    return {
      id,
      degree,
      kind,
      title: patternTitle(kind),
      note: patternNote(kind),
      matrix,
      signature: kind,
      connected: undirectedComponents(matrix).length === 1,
      directional: directional.has(kind),
      examples,
      candidates: candidates.slice(0, 1).map((candidate) => ({
        ...candidate,
        id,
        index: 1,
        total: 1,
        planarNote: patternTitle(kind),
      })),
    }
  }).sort((left, right) => {
    if (left.degree !== right.degree) return left.degree - right.degree
    return PATTERN_ORDER.indexOf(left.kind) - PATTERN_ORDER.indexOf(right.kind)
  })
}

export const scenarioById = (id: string): VertexScenario | undefined =>
  catalogVertexScenarios().find((scenario) => scenario.id === id)

export const candidateById = (id: string): VertexCandidate | undefined => {
  for (const scenario of catalogVertexScenarios()) {
    const found = scenario.candidates.find((candidate) => candidate.id === id)
    if (found) return found
  }
  return undefined
}
