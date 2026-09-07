/**
 * TfL Route/Sequence rows that justify a source-matrix cell.
 * Kept separate from the reconstructed candidate result.
 */

import { getNamedEvidenceSequences, getRawSequence } from "../raw-data"
import { countDirectedTriple } from "../movement-matrix"
import type { SourceEvidenceRow } from "./types"

export const sourceEvidenceForJunction = (
  lineId: string,
  stationId: string,
  order: readonly string[]
): SourceEvidenceRow[] => {
  const raw = getRawSequence(lineId)
  if (!raw) return []
  const named = getNamedEvidenceSequences(raw)
  const rows: SourceEvidenceRow[] = []
  for (let i = 0; i < order.length; i++) {
    for (let j = i + 1; j < order.length; j++) {
      const a = order[i]!
      const b = order[j]!
      const sequences: SourceEvidenceRow["sequences"] = []
      for (const sequence of named) {
        if (countDirectedTriple([sequence.stationIds], stationId, a, b) > 0) {
          sequences.push({ label: sequence.label, direction: "a-then-b" })
        }
        if (countDirectedTriple([sequence.stationIds], stationId, b, a) > 0) {
          sequences.push({ label: sequence.label, direction: "b-then-a" })
        }
      }
      rows.push({ a, b, sequences })
    }
  }
  return rows
}
