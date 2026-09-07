/**
 * Directed A–via–B matrices over labelled ports.
 * Two matrices that share undirected pairs but differ in direction
 * are distinct. Rotation of the circular port order is canonicalised
 * so the same service pattern groups together; reflections are not.
 */

import type { JunctionReport } from "../types"
import { PORT_LABELS, type DirectedMatrix, type DirectedMove, type PortId } from "./types"

export const moveKey = (from: string, to: string): string => `${from}>${to}`

export const moveSet = (matrix: DirectedMatrix): Set<string> =>
  new Set(matrix.moves.map((move) => moveKey(move.from, move.to)))

export const hasMove = (matrix: DirectedMatrix, from: string, to: string): boolean =>
  matrix.moves.some((move) => move.from === from && move.to === to)

export const pairState = (
  matrix: DirectedMatrix,
  a: string,
  b: string
): "none" | "ab" | "ba" | "both" => {
  const forward = hasMove(matrix, a, b)
  const reverse = hasMove(matrix, b, a)
  if (forward && reverse) return "both"
  if (forward) return "ab"
  if (reverse) return "ba"
  return "none"
}

export const directedSignature = (matrix: DirectedMatrix): string => {
  const ports = matrix.ports
  const allowed = moveSet(matrix)
  const bits: string[] = []
  for (const from of ports) {
    for (const to of ports) {
      if (from === to) continue
      bits.push(allowed.has(moveKey(from, to)) ? "1" : "0")
    }
  }
  return bits.join("")
}

const rotatePorts = (ports: readonly PortId[], offset: number): PortId[] => {
  const n = ports.length
  const shifted = ports.map((_, index) => ports[(index + offset + n) % n]!)
  return shifted.map((_, index) => PORT_LABELS[index]!)
}

const rotateMoves = (
  moves: readonly DirectedMove[],
  ports: readonly PortId[],
  offset: number
): DirectedMove[] => {
  const n = ports.length
  const rename = (port: PortId): PortId => {
    const index = ports.indexOf(port)
    const next = (index - offset + n) % n
    return PORT_LABELS[next]!
  }
  return moves
    .map((move) => ({ from: rename(move.from), to: rename(move.to) }))
    .sort((left, right) => moveKey(left.from, left.to).localeCompare(moveKey(right.from, right.to)))
}

export const canonicalizeDirectedMatrix = (matrix: DirectedMatrix): DirectedMatrix => {
  const n = matrix.ports.length
  if (n === 0) return matrix
  let best: DirectedMatrix | null = null
  let bestSig = ""
  for (let offset = 0; offset < n; offset++) {
    const candidate: DirectedMatrix = {
      ports: rotatePorts(matrix.ports, offset),
      moves: rotateMoves(matrix.moves, matrix.ports, offset),
    }
    const sig = directedSignature(candidate)
    if (best == null || sig < bestSig) {
      best = candidate
      bestSig = sig
    }
  }
  return best!
}

export const matrixFromJunction = (junction: JunctionReport): DirectedMatrix => {
  const neighbours = junction.neighbours
  const ports = neighbours.map((_, index) => PORT_LABELS[index]!)
  const idToPort = new Map(neighbours.map((neighbour, index) => [neighbour.id, ports[index]!]))
  const moves: DirectedMove[] = []
  for (const pair of junction.matrix) {
    const a = idToPort.get(pair.a.id)
    const b = idToPort.get(pair.b.id)
    if (!a || !b) continue
    if (pair.aThenB > 0) moves.push({ from: a, to: b })
    if (pair.bThenA > 0) moves.push({ from: b, to: a })
  }
  moves.sort((left, right) => moveKey(left.from, left.to).localeCompare(moveKey(right.from, right.to)))
  return canonicalizeDirectedMatrix({ ports, moves })
}

export const undirectedComponents = (matrix: DirectedMatrix): PortId[][] => {
  const adj = new Map<PortId, Set<PortId>>(matrix.ports.map((port) => [port, new Set()]))
  for (const move of matrix.moves) {
    adj.get(move.from)?.add(move.to)
    adj.get(move.to)?.add(move.from)
  }
  const seen = new Set<PortId>()
  const components: PortId[][] = []
  for (const start of matrix.ports) {
    if (seen.has(start)) continue
    const queue = [start]
    const component: PortId[] = []
    seen.add(start)
    while (queue.length > 0) {
      const current = queue.shift()!
      component.push(current)
      for (const next of adj.get(current) ?? []) {
        if (seen.has(next)) continue
        seen.add(next)
        queue.push(next)
      }
    }
    components.push(component)
  }
  return components
}

export const isDirectional = (matrix: DirectedMatrix): boolean => {
  const seen = new Set<string>()
  for (const move of matrix.moves) {
    const undirected = [move.from, move.to].sort().join("|")
    if (seen.has(undirected)) continue
    seen.add(undirected)
    if (pairState(matrix, move.from, move.to) !== "both") return true
  }
  return false
}

export const scenarioTitle = (matrix: DirectedMatrix): string => {
  const n = matrix.ports.length
  const components = undirectedComponents(matrix)
  const sizes = components.map((component) => component.length).sort((a, b) => b - a)
  const undirectedPairs = new Set(matrix.moves.map((move) => [move.from, move.to].sort().join("|")))
  const bidirectional = [...undirectedPairs].filter((key) => {
    const [a, b] = key.split("|") as [PortId, PortId]
    return pairState(matrix, a, b) === "both"
  }).length
  const oneWay = undirectedPairs.size - bidirectional
  const dir = oneWay > 0 ? "directional" : "bidirectional"

  if (n === 2 && undirectedPairs.size === 0) return "Dual terminus"
  if (n === 3 && undirectedPairs.size === 0) return "Three isolated termini"
  if (sizes.length > 1) {
    const stubs = sizes.filter((size) => size === 1).length
    if (sizes[0] === 2 && stubs === sizes.length - 1 && stubs === 1) {
      return oneWay > 0 ? "Through + terminus · directional" : "Through + terminus"
    }
    if (sizes.every((size) => size === 2)) {
      return oneWay > 0 ? "Independent corridors · directional" : "Independent corridors"
    }
    return `Declustered ${sizes.join("+")}`
  }
  if (n === 3 && undirectedPairs.size === 3) return `Triangle · ${dir}`
  if (n === 3 && undirectedPairs.size === 2) return `Through Y · ${dir}`
  if (n === 3 && undirectedPairs.size === 1) {
    return oneWay > 0 ? "One through-pair · directional" : "One through-pair + stub"
  }
  if (n >= 4 && undirectedPairs.size === 2 && sizes.length === 1) {
    return `Chained · ${dir}`
  }
  if (n >= 4 && bidirectional === n && oneWay === 0) return "Complete bidirectional"
  return `Degree ${n} · ${undirectedPairs.size} pair${undirectedPairs.size === 1 ? "" : "s"} · ${dir}`
}

export const matricesEqual = (left: DirectedMatrix, right: DirectedMatrix): boolean =>
  directedSignature(left) === directedSignature(right) &&
  left.ports.join("") === right.ports.join("")
