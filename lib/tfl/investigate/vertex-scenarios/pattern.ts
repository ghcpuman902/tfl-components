/**
 * Building-block patterns. One-way and two-way through a pair
 * are the same shape. Direction is a mark, not a different block.
 */

import {
  PORT_LABELS,
  type DirectedMatrix,
  type DirectedMove,
  type PortId,
} from "./types"
import { pairState, undirectedComponents } from "./directed-matrix"

export type PatternKind =
  | "through"
  | "dual-terminus"
  | "y"
  | "through-terminus"
  | "triangle"
  | "three-termini"
  | "independent-corridors"
  | "other"

export const PATTERN_ORDER: PatternKind[] = [
  "through",
  "dual-terminus",
  "y",
  "through-terminus",
  "triangle",
  "three-termini",
  "independent-corridors",
  "other",
]

const both = (a: PortId, b: PortId): DirectedMove[] => [
  { from: a, to: b },
  { from: b, to: a },
]

export const undirectedPairs = (matrix: DirectedMatrix): [PortId, PortId][] => {
  const seen = new Set<string>()
  const pairs: [PortId, PortId][] = []
  for (const move of matrix.moves) {
    const key = [move.from, move.to].sort().join("|")
    if (seen.has(key)) continue
    seen.add(key)
    pairs.push([move.from, move.to] as [PortId, PortId])
  }
  return pairs
}

export const classifyPattern = (matrix: DirectedMatrix): PatternKind => {
  const n = matrix.ports.length
  const pairs = undirectedPairs(matrix)
  if (n === 2) return pairs.length === 0 ? "dual-terminus" : "through"
  if (n === 3) {
    if (pairs.length === 0) return "three-termini"
    if (pairs.length === 3) return "triangle"
    if (pairs.length === 2) return "y"
    return "through-terminus"
  }
  if (n === 4) {
    const components = undirectedComponents(matrix)
    if (
      pairs.length === 2 &&
      components.length === 2 &&
      components.every((component) => component.length === 2)
    ) {
      return "independent-corridors"
    }
  }
  return "other"
}

const rename = (port: PortId, map: Map<PortId, PortId>): PortId =>
  map.get(port) ?? port

/** `order` is the old ports in the positions they should occupy as A, B, C… */
const relabelAsABC = (
  matrix: DirectedMatrix,
  order: readonly PortId[]
): DirectedMatrix => {
  const ports = PORT_LABELS.slice(0, order.length)
  const map = new Map(order.map((port, index) => [port, ports[index]!]))
  const moves = matrix.moves
    .map((move) => ({ from: rename(move.from, map), to: rename(move.to, map) }))
    .sort((left, right) =>
      `${left.from}>${left.to}`.localeCompare(`${right.from}>${right.to}`)
    )
  return { ports, moves }
}

/** Put the pattern in a fixed labelling so drawings stay comparable. */
export const canonicalizePattern = (matrix: DirectedMatrix): DirectedMatrix => {
  const kind = classifyPattern(matrix)
  const ports = matrix.ports
  const pairs = undirectedPairs(matrix)
  if (kind === "y" && pairs.length === 2) {
    const counts = new Map<PortId, number>()
    for (const port of ports) counts.set(port, 0)
    for (const [a, b] of pairs) {
      counts.set(a, (counts.get(a) ?? 0) + 1)
      counts.set(b, (counts.get(b) ?? 0) + 1)
    }
    const stem = [...counts.entries()].sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0])
    )[0]![0]
    const branches = ports.filter((port) => port !== stem)
    return relabelAsABC(matrix, [stem, ...branches] as PortId[])
  }
  if (kind === "through-terminus" && pairs.length === 1) {
    const [a, b] = pairs[0]!
    const stub = ports.find((port) => port !== a && port !== b)!
    return relabelAsABC(matrix, [a, b, stub] as PortId[])
  }
  if (kind === "independent-corridors" && pairs.length === 2) {
    const [first, second] = pairs
    return relabelAsABC(matrix, [
      first![0],
      first![1],
      second![0],
      second![1],
    ] as PortId[])
  }
  return matrix
}

export const patternMatrix = (kind: PatternKind): DirectedMatrix => {
  if (kind === "through") return { ports: ["A", "B"], moves: both("A", "B") }
  if (kind === "dual-terminus") return { ports: ["A", "B"], moves: [] }
  if (kind === "y")
    return {
      ports: ["A", "B", "C"],
      moves: [...both("A", "B"), ...both("A", "C")],
    }
  if (kind === "through-terminus")
    return { ports: ["A", "B", "C"], moves: both("A", "B") }
  if (kind === "triangle") {
    return {
      ports: ["A", "B", "C"],
      moves: [...both("A", "B"), ...both("A", "C"), ...both("B", "C")],
    }
  }
  if (kind === "three-termini") return { ports: ["A", "B", "C"], moves: [] }
  if (kind === "independent-corridors") {
    return {
      ports: ["A", "B", "C", "D"],
      moves: [...both("A", "B"), ...both("C", "D")],
    }
  }
  return { ports: ["A", "B", "C", "D"], moves: [] }
}

export const patternTitle = (kind: PatternKind): string => {
  if (kind === "through") return "Through"
  if (kind === "dual-terminus") return "Dual terminus"
  if (kind === "y") return "Y"
  if (kind === "through-terminus") return "Through + terminus"
  if (kind === "triangle") return "Triangle"
  if (kind === "three-termini") return "Three termini"
  if (kind === "independent-corridors") return "Independent corridors"
  return "Higher degree"
}

export type DrawingVariant = {
  id: string
  label: string
}

export const drawingVariants = (kind: PatternKind): DrawingVariant[] => {
  if (kind === "dual-terminus" || kind === "three-termini") {
    return [
      { id: "opposite", label: "Different sides" },
      { id: "same-side", label: "Same side" },
    ]
  }
  if (kind === "triangle")
    return [
      { id: "a-left", label: "A on the left" },
      { id: "a-right", label: "A on the right" },
    ]
  if (kind === "y") {
    return [
      { id: "stem", label: "Stem S" },
      { id: "split", label: "Split S" },
    ]
  }
  if (kind === "through-terminus") {
    return [
      { id: "same-as-a", label: "C same as A" },
      { id: "same-as-b", label: "C same as B" },
    ]
  }
  return [{ id: "default", label: patternTitle(kind) }]
}

export const patternNote = (kind: PatternKind): string => {
  if (kind === "through") return "A and B continue through S."
  if (kind === "dual-terminus")
    return "A and B both stop at S. Moving the termini to the same side does not create a through-run."
  if (kind === "y")
    return "A reaches B and C through S. S can sit on the stem or on both branches. B and C do not through-run."
  if (kind === "through-terminus") {
    return "A and B through-run. C stops at S, on the same axis as A or as B."
  }
  if (kind === "triangle") {
    return "Every pair through-runs. A single Y omits one pair, so it needs a further passage."
  }
  if (kind === "three-termini")
    return "Three arms, no through-move. Same side or different sides."
  if (kind === "independent-corridors") {
    return "Two independent through-runs share a station name. Their S markers are joined by an interchange."
  }
  return "Not a degree-2 or degree-3 building block."
}

export const isDirectionalPair = (matrix: DirectedMatrix): boolean => {
  for (const [a, b] of undirectedPairs(matrix)) {
    if (pairState(matrix, a, b) !== "both") return true
  }
  return false
}
