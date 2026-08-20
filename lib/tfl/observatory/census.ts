import type {
  ObservatoryCensusRecord,
  ObservatoryState,
} from "@/lib/tfl/observatory/types"

export const CENSUS_IDS = ["bus-lines", "bus-points", "bike-points"] as const

export type CensusId = (typeof CENSUS_IDS)[number]

export const CENSUS_SUBJECT_PREFIX = "census:"

/**
 * Seed counts used only when there is no previous successful run.
 * After that, every check is against yesterday's last good count.
 */
export const VERIFIED_CENSUS_COUNTS: Record<CensusId, number> = {
  "bus-lines": 641,
  "bus-points": 32_554,
  "bike-points": 798,
}

export const CENSUS_LABELS: Record<CensusId, string> = {
  "bus-lines": "Bus lines",
  "bus-points": "Bus stops",
  "bike-points": "Cycle hire docks",
}

export const CENSUS_DRIFT_RATIO = 0.1
export const CENSUS_TRIES = 3

export const censusSubjectId = (id: CensusId): string =>
  `${CENSUS_SUBJECT_PREFIX}${id}`

export const isCensusSubjectId = (subjectId: string | null): boolean =>
  Boolean(subjectId?.startsWith(CENSUS_SUBJECT_PREFIX))

export const formatCountDelta = (delta: number): string => {
  if (delta === 0) return "same"
  return delta > 0 ? `+${delta}` : String(delta)
}

export const previousCensusBaseline = (
  previous: ObservatoryCensusRecord | undefined,
  id: CensusId
): number => {
  if (previous?.state === "current" && previous.observedCount != null) {
    return previous.observedCount
  }
  if (previous?.baselineCount != null) return previous.baselineCount
  return VERIFIED_CENSUS_COUNTS[id]
}

export const assessCensusCount = ({
  observed,
  baseline,
}: {
  observed: number | null
  baseline: number
}): {
  state: ObservatoryState
  summary: string
  delta: number | null
} => {
  if (observed == null || observed <= 0) {
    return {
      state: "unavailable",
      summary: `TfL returned no count. Previous count is ${baseline}.`,
      delta: null,
    }
  }

  const delta = observed - baseline
  const ratio = Math.abs(delta) / baseline
  if (ratio > CENSUS_DRIFT_RATIO) {
    return {
      state: "incomplete",
      summary: `${observed} vs previous ${baseline} (${formatCountDelta(delta)}). Outside the 10% band.`,
      delta,
    }
  }

  if (delta === 0) {
    return {
      state: "current",
      summary: `Matches the previous count (${baseline}).`,
      delta,
    }
  }

  return {
    state: "current",
    summary: `${observed} vs previous ${baseline} (${formatCountDelta(delta)}). Within the normal band.`,
    delta,
  }
}
