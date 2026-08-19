import { judgeCompleteness } from "@/lib/tfl/observatory/completeness"
import {
  diffCanonical,
  emptyResponseSummary,
  incompleteSummary,
} from "@/lib/tfl/observatory/diff"
import { hashCanonical, itemCount } from "@/lib/tfl/observatory/hash"
import type {
  CanonicalPayload,
  FetchFailureReason,
  ObservatoryState,
} from "@/lib/tfl/observatory/types"

export type AssessContext = {
  lineId?: string
  lineName?: string
  modeName?: string
}

export type AssessInput = {
  baseline: CanonicalPayload | null
  observed: CanonicalPayload | null
  failure?: FetchFailureReason
  rawCount: number
  validCount: number
  context: AssessContext
}

export type AssessResult = {
  state: ObservatoryState
  hash: string | null
  itemCount: number | null
  summary: string
  details: string[]
  shouldUpdateBaseline: boolean
}

const problemSummary = (
  kind: CanonicalPayload["kind"],
  reason: FetchFailureReason,
  context: AssessContext
): { state: ObservatoryState; summary: string; details: string[] } => {
  if (reason === "empty" || reason === "error") {
    return {
      state: "unavailable",
      summary: emptyResponseSummary(kind, context),
      details: [
        reason === "error"
          ? "The TfL request failed or returned nothing usable."
          : "An empty response is treated as a TfL response problem, not a metadata update.",
      ],
    }
  }
  return {
    state: "incomplete",
    summary: incompleteSummary(kind, context),
    details: [
      "A malformed or dramatically incomplete response is not treated as a metadata update.",
    ],
  }
}

const kindFromInput = (input: AssessInput): CanonicalPayload["kind"] => {
  if (input.observed) return input.observed.kind
  if (input.baseline) return input.baseline.kind
  return "line-catalogue"
}

/**
 * Classify one observation against the stored baseline.
 * Does not confirm — the runner issues a second observation when needed.
 */
export const assessObservation = (input: AssessInput): AssessResult => {
  const kind = kindFromInput(input)
  const completeness = judgeCompleteness({
    rawCount: input.rawCount,
    validCount: input.validCount,
    baselineCount: input.baseline ? itemCount(input.baseline) : null,
  })
  const failure = input.failure ?? completeness.reason

  if (failure || !input.observed) {
    return {
      ...problemSummary(kind, failure ?? "error", input.context),
      hash: null,
      itemCount: input.validCount,
      shouldUpdateBaseline: false,
    }
  }

  const hash = hashCanonical(input.observed)
  const count = itemCount(input.observed)

  if (!input.baseline) {
    return {
      state: "current",
      hash,
      itemCount: count,
      summary: "First complete observation — baseline established.",
      details: [],
      shouldUpdateBaseline: true,
    }
  }

  const baselineHash = hashCanonical(input.baseline)
  if (baselineHash === hash) {
    return {
      state: "current",
      hash,
      itemCount: count,
      summary: "Matches the stored baseline.",
      details: [],
      shouldUpdateBaseline: false,
    }
  }

  const diff = diffCanonical(input.baseline, input.observed, input.context)
  return {
    state: "suspect",
    hash,
    itemCount: count,
    summary: diff.summary,
    details: diff.details,
    shouldUpdateBaseline: false,
  }
}

export const confirmAssessments = (
  first: AssessResult,
  second: AssessResult,
  secondPayload: CanonicalPayload | null
): AssessResult => {
  if (second.state === "unavailable" || second.state === "incomplete") {
    return second
  }

  if (second.state === "current") {
    return second
  }

  if (
    first.state === "suspect" &&
    second.state === "suspect" &&
    first.hash &&
    first.hash === second.hash &&
    secondPayload
  ) {
    return {
      ...second,
      state: "changed",
      shouldUpdateBaseline: true,
    }
  }

  return {
    ...second,
    state: "suspect",
    shouldUpdateBaseline: false,
    summary:
      second.hash && first.hash && second.hash !== first.hash
        ? `${second.summary} A follow-up observation did not match the first.`
        : second.summary,
  }
}
