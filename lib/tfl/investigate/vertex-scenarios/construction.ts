import { hasMove, moveKey, undirectedComponents } from "./directed-matrix"
import type { DirectedMatrix, DirectedMove, PortId } from "./types"

/** A track permits cross-side passages only, with no reversal at a fork.
 * Separate blocks share station identity through walking bonds, never track.
 * Repeated arm labels are boundary copies, not additional track junctions.
 */
export type PassageBlock = {
  left: PortId[]
  right: PortId[]
  direction: "both" | "forward"
}

export type Construction = { blocks: PassageBlock[]; termini: PortId[] }
export type ConstructionMethod = "pairs" | "components" | "share"

export const blockMoves = (block: PassageBlock): DirectedMove[] =>
  block.left.flatMap((from) =>
    block.right.flatMap((to) =>
      block.direction === "both"
        ? [
            { from, to },
            { from: to, to: from },
          ]
        : [{ from, to }]
    )
  )

export const blockLabel = (block: PassageBlock): string =>
  `${block.left.join(", ")} ${block.direction === "both" ? "↔" : "→"} ${block.right.join(", ")}`

export const decodeConstruction = (
  construction: Construction
): DirectedMove[] => {
  const moves = new Map<string, DirectedMove>()
  for (const block of construction.blocks) {
    for (const move of blockMoves(block))
      moves.set(moveKey(move.from, move.to), move)
  }
  return [...moves.values()]
}

export const checkConstruction = (
  matrix: DirectedMatrix,
  construction: Construction
) => {
  const decoded = decodeConstruction(construction)
  const keys = new Set(decoded.map((move) => moveKey(move.from, move.to)))
  const represented = new Set([
    ...construction.termini,
    ...construction.blocks.flatMap((block) => [...block.left, ...block.right]),
  ])
  const missing = matrix.moves.filter(
    (move) => !keys.has(moveKey(move.from, move.to))
  )
  const extra = decoded.filter((move) => !hasMove(matrix, move.from, move.to))
  const missingArms = matrix.ports.filter((port) => !represented.has(port))
  const extraArms = [...represented].filter(
    (port) => !matrix.ports.includes(port)
  )
  return {
    exact:
      !missing.length &&
      !extra.length &&
      !missingArms.length &&
      !extraArms.length,
    missing,
    extra,
    missingArms,
    extraArms,
    decoded,
  }
}

const pairBlocks = (matrix: DirectedMatrix): PassageBlock[] =>
  matrix.ports.flatMap((a, i) =>
    matrix.ports.slice(i + 1).flatMap((b): PassageBlock[] => {
      const ab = hasMove(matrix, a, b)
      const ba = hasMove(matrix, b, a)
      if (!ab && !ba) return []
      return [
        {
          left: [ab ? a : b],
          right: [ab ? b : a],
          direction: ab && ba ? "both" : "forward",
        },
      ]
    })
  )

/** Enumerate complete cross-products, bounded to the six-arm workbench.
 * No permission is inferred from mere connectivity or a similar row.
 */
const sharingOptions = (matrix: DirectedMatrix): PassageBlock[] => {
  const options: PassageBlock[] = []
  const limit = 1 << matrix.ports.length
  const members = (mask: number) =>
    matrix.ports.filter((_, i) => mask & (1 << i))
  for (let a = 1; a < limit; a++) {
    for (let b = 1; b < limit; b++) {
      if (a & b) continue
      const left = members(a)
      const right = members(b)
      if (!left.every((from) => right.every((to) => hasMove(matrix, from, to))))
        continue
      options.push({ left, right, direction: "forward" })
      if (
        a < b &&
        right.every((from) => left.every((to) => hasMove(matrix, from, to)))
      ) {
        options.push({ left, right, direction: "both" })
      }
    }
  }
  return options
}

export const constructPassages = (
  matrix: DirectedMatrix,
  method: ConstructionMethod
): Construction => {
  if (matrix.ports.length < 2 || matrix.ports.length > 6)
    throw new Error("Expected two to six arms")
  const termini = matrix.ports.filter(
    (port) =>
      !matrix.moves.some((move) => move.from === port || move.to === port)
  )
  const components = undirectedComponents(matrix)
  if (method !== "share") {
    const blocks = pairBlocks(matrix)
    if (method === "components") {
      blocks.sort(
        (a, b) =>
          components.findIndex((c) => c.includes(a.left[0]!)) -
          components.findIndex((c) => c.includes(b.left[0]!))
      )
    }
    return { blocks, termini }
  }

  // Greedy exact cover, not a claim of minimum block or marker count.
  // Overlap is allowed: a movement drawn twice is still one permission.
  const uncovered = new Set(
    matrix.moves.map((move) => moveKey(move.from, move.to))
  )
  const options = sharingOptions(matrix).map((block) => ({
    block,
    keys: blockMoves(block).map((move) => moveKey(move.from, move.to)),
  }))
  const blocks: PassageBlock[] = []
  while (uncovered.size) {
    const ranked = options
      .map((option) => ({
        ...option,
        gain: option.keys.filter((key) => uncovered.has(key)).length,
      }))
      .sort(
        (a, b) =>
          b.gain - a.gain ||
          a.block.left.length +
            a.block.right.length -
            (b.block.left.length + b.block.right.length) ||
          blockLabel(a.block).localeCompare(blockLabel(b.block))
      )
    const best = ranked[0]
    if (!best?.gain) throw new Error("No block covers the remaining movements")
    blocks.push(best.block)
    best.keys.forEach((key) => uncovered.delete(key))
  }
  return { blocks, termini }
}

export const togglePermission = (
  matrix: DirectedMatrix,
  from: PortId,
  to: PortId,
  linked: boolean
): DirectedMatrix => {
  if (from === to) return matrix
  const remove = hasMove(matrix, from, to)
  const moves = matrix.moves.filter(
    (move) =>
      !(move.from === from && move.to === to) &&
      !(linked && move.from === to && move.to === from)
  )
  if (!remove) {
    moves.push({ from, to })
    if (linked) moves.push({ from: to, to: from })
  }
  return { ...matrix, moves }
}
