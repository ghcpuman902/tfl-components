/**
 * Cases chips: pedagogical presets that already draw, plus any other
 * undirected matrix that `composeYs` or a known-block drawer can
 * actually render. Directional / empty-compose shapes stay out.
 */

import { catalogAllJunctions } from "../catalog"
import { composeYs } from "./compose"
import {
  canonicalizeDirectedMatrix,
  directedSignature,
  isDirectional,
  matrixFromJunction,
} from "./directed-matrix"
import {
  canonicalizePattern,
  classifyPattern,
  patternNote,
  patternTitle,
  undirectedPairs,
} from "./pattern"
import { PORT_LABELS, type DirectedMatrix, type PortId } from "./types"
import {
  WORKBENCH_PRESETS,
  type WorkbenchPreset,
} from "./workbench-presets"

const both = (a: PortId, b: PortId) => [
  { from: a, to: b },
  { from: b, to: a },
]

const permutations = <T,>(items: readonly T[]): T[][] => {
  if (items.length <= 1) return [items.slice()]
  return items.flatMap((item, index) =>
    permutations(items.filter((_, i) => i !== index)).map((rest) => [
      item,
      ...rest,
    ])
  )
}

/** Same undirected graph under any port relabelling — not just rotation. */
const undirectedIsoSignature = (matrix: DirectedMatrix): string => {
  const n = matrix.ports.length
  const ports = PORT_LABELS.slice(0, n)
  const pairs = undirectedPairs(matrix)
  let best = ""
  for (const order of permutations(matrix.ports)) {
    const map = new Map(order.map((port, index) => [port, ports[index]!]))
    const relabeled: DirectedMatrix = {
      ports,
      moves: pairs.flatMap(([a, b]) => both(map.get(a)!, map.get(b)!)),
    }
    const sig = directedSignature(relabeled)
    if (!best || sig < best) best = sig
  }
  return best
}

export const caseSignature = (matrix: DirectedMatrix): string => {
  const kind = classifyPattern(matrix)
  if (kind !== "other") {
    const canonical = canonicalizePattern(matrix)
    return `${kind}|${canonical.ports.length}|${directedSignature(canonical)}`
  }
  return `${kind}|${matrix.ports.length}|${undirectedIsoSignature(matrix)}`
}

const draws = (matrix: DirectedMatrix): boolean => {
  if (isDirectional(matrix)) return false
  const kind = classifyPattern(matrix)
  if (kind !== "other") return true
  return composeYs(matrix).length > 0
}

const enumerateUndirected = (n: number): DirectedMatrix[] => {
  const ports = PORT_LABELS.slice(0, n)
  const pairs = ports.flatMap((from, i) =>
    ports.slice(i + 1).map((to) => [from, to] as const)
  )
  const out: DirectedMatrix[] = []
  const limit = 1 << pairs.length
  for (let mask = 0; mask < limit; mask++) {
    const moves = pairs.flatMap(([from, to], i) =>
      mask & (1 << i) ? both(from, to) : []
    )
    out.push({ ports, moves })
  }
  return out
}

const degreeSequence = (matrix: DirectedMatrix): number[] => {
  const counts = new Map(matrix.ports.map((port) => [port, 0]))
  for (const [a, b] of undirectedPairs(matrix)) {
    counts.set(a, (counts.get(a) ?? 0) + 1)
    counts.set(b, (counts.get(b) ?? 0) + 1)
  }
  return [...counts.values()].sort((left, right) => right - left)
}

const titleFor = (matrix: DirectedMatrix): { title: string; note: string } => {
  const kind = classifyPattern(matrix)
  const n = matrix.ports.length
  if (kind !== "other") {
    return {
      title: `${n} arms · ${patternTitle(kind)}`,
      note: patternNote(kind),
    }
  }
  const pairs = undirectedPairs(matrix).length
  const degrees = degreeSequence(matrix).join("·")
  return {
    title: `${n} arms · Joined Ys · ${pairs} pairs (${degrees})`,
    note: `A tree of Ys that preserves every permitted pair (${pairs}) and invents none.`,
  }
}

const asPreset = (
  id: string,
  matrix: DirectedMatrix
): WorkbenchPreset => {
  const { title, note } = titleFor(matrix)
  const kind = classifyPattern(matrix)
  return {
    id,
    title,
    note,
    matrix: kind === "other" ? canonicalizeDirectedMatrix(matrix) : canonicalizePattern(matrix),
  }
}

export const discoverWorkbenchCases = (
  pedagogical: readonly WorkbenchPreset[] = WORKBENCH_PRESETS
): WorkbenchPreset[] => {
  const seen = new Set<string>()
  const cases: WorkbenchPreset[] = []
  const take = (preset: WorkbenchPreset) => {
    if (!draws(preset.matrix)) return
    const sig = caseSignature(preset.matrix)
    if (seen.has(sig)) return
    seen.add(sig)
    cases.push(preset)
  }

  for (const preset of pedagogical) take(preset)

  for (const n of [3, 4, 5] as const) {
    for (const matrix of enumerateUndirected(n)) {
      take(asPreset(`enum-${caseSignature(matrix)}`, matrix))
    }
  }

  for (const item of catalogAllJunctions()) {
    const n = item.junction.neighbours.length
    if (n < 2 || n > 6) continue
    const matrix = matrixFromJunction(item.junction)
    if (n === 6 && classifyPattern(matrix) === "other" && composeYs(matrix).length === 0) {
      continue
    }
    take(asPreset(`junc-${caseSignature(matrix)}`, matrix))
  }

  return cases
}

let cached: WorkbenchPreset[] | null = null

/** Pedagogical presets plus every distinct composable shape. Lazy so
 * tests that never open the workbench skip the junction scan. */
export const workbenchCases = (): WorkbenchPreset[] => {
  cached ??= discoverWorkbenchCases()
  return cached
}
