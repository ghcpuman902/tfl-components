import type { BoardNearbyResult } from "@/lib/tfl/board-nearby-action"
import type { BoardSetupDraft } from "@/lib/tfl/board-setup-state"

/** True while the draft is missing a nearby bus stop, pier or docks it shows. */
export const draftNeedsNearbyIds = (draft: BoardSetupDraft): boolean => {
  if (draft.continueWithoutStop) return false
  return (
    !draft.busStopId ||
    (draft.nearbyModes.includes("river") && !draft.riverStopId) ||
    (draft.nearbyModes.includes("cycle") && draft.cycleDockIds.length === 0)
  )
}

/** The stop a nearby lookup is for: the picked stop, else the example stop. */
export const nearbyFillStopId = (
  draft: BoardSetupDraft,
  exampleStopId: string
): string => draft.stopId ?? exampleStopId

export const nearbyFillKey = (
  draft: BoardSetupDraft,
  exampleStopId: string
): string | null =>
  draftNeedsNearbyIds(draft)
    ? `${nearbyFillStopId(draft, exampleStopId)}:${[...draft.nearbyModes].sort().join(",")}`
    : null

/**
 * One lookup per key. `reset` when a station is picked: the pick clears the
 * nearby ids, and picking the example stop (or the same stop again) gives the
 * same key as the lookup already done, which would otherwise be skipped and
 * leave the board link without `b.stop`.
 */
export const createNearbyFillTracker = () => {
  let last: string | null = null
  return {
    claim: (key: string | null): boolean => {
      if (key === null || key === last) return false
      last = key
      return true
    },
    reset: () => {
      last = null
    },
  }
}

/** Fill the missing ids, but only if the draft is still on the stop looked up. */
export const applyNearbyIds = (
  current: BoardSetupDraft,
  lookedUpStopId: string,
  exampleStopId: string,
  result: Extract<BoardNearbyResult, { ok: true }>
): BoardSetupDraft => {
  if (nearbyFillStopId(current, exampleStopId) !== lookedUpStopId)
    return current
  return {
    ...current,
    busStopId: current.busStopId ?? result.bus?.id ?? null,
    riverStopId:
      current.nearbyModes.includes("river") && !current.riverStopId
        ? (result.river?.id ?? current.riverStopId)
        : current.riverStopId,
    cycleDockIds:
      current.nearbyModes.includes("cycle") && current.cycleDockIds.length === 0
        ? result.docks
        : current.cycleDockIds,
  }
}
