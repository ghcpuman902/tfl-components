import {
  DRAMATIC_REDUCTION_RATIO,
  MALFORMED_VALID_RATIO,
  SMALL_SET_ITEM_FLOOR,
} from "@/lib/tfl/observatory/inventory"
import type { FetchFailureReason } from "@/lib/tfl/observatory/types"

export type CompletenessInput = {
  rawCount: number
  validCount: number
  baselineCount: number | null
}

export type CompletenessVerdict = {
  reason: FetchFailureReason | null
}

/**
 * Empty, malformed, or dramatically incomplete responses are TfL response
 * problems — never a legitimate metadata update.
 */
export const judgeCompleteness = (
  input: CompletenessInput
): CompletenessVerdict => {
  const { rawCount, validCount, baselineCount } = input
  const expected = baselineCount ?? 0

  if (rawCount > 0 && validCount === 0) {
    return { reason: "malformed" }
  }

  if (
    rawCount >= SMALL_SET_ITEM_FLOOR &&
    validCount < rawCount * MALFORMED_VALID_RATIO
  ) {
    return { reason: "malformed" }
  }

  if (validCount === 0) {
    return { reason: expected > 0 || baselineCount === null ? "empty" : null }
  }

  if (
    expected > SMALL_SET_ITEM_FLOOR &&
    validCount < expected * DRAMATIC_REDUCTION_RATIO
  ) {
    return { reason: "incomplete" }
  }

  return { reason: null }
}

export const isCompleteObservation = (input: CompletenessInput): boolean =>
  judgeCompleteness(input).reason === null
