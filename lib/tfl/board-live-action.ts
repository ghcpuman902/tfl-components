"use server"

import type { RealtimePrediction } from "tfl-ts"
import { isBoardBikePointId, isBoardStopId, BOARD_LIVE_DOCK_LIMIT } from "@/lib/tfl/board-live-ids"
import { BOARD_RATE_LIMIT_INLINE } from "@/lib/tfl/board-rate-limit"
import { formatBikePointId } from "@/lib/tfl/board-panels"
import { getCachedStopArrivalsState } from "@/lib/tfl/cached-stop-arrivals"
import { getCachedBikePointsState } from "@/lib/tfl/cycle-hire-data"
import type { CycleHireDock } from "@/lib/tfl/cycle-hire-types"

export type BoardLiveFailureKind = "rate-limited" | "rejected" | "failed"

export type BoardLiveResult<T> =
  | { ok: true; data: T }
  | { ok: false; kind: BoardLiveFailureKind; error: string }

const rateLimited = <T>(): BoardLiveResult<T> => ({
  ok: false,
  kind: "rate-limited",
  error: BOARD_RATE_LIMIT_INLINE,
})

const unavailable = <T>(): BoardLiveResult<T> => ({
  ok: false,
  kind: "failed",
  error: "Live departures are unavailable right now.",
})

/**
 * Hosted Board arrivals. Uses the project key inside the shared cache.
 * Callers never supply a credential.
 */
export async function getBoardStopArrivalsAction(
  stopPointId: string
): Promise<BoardLiveResult<RealtimePrediction[]>> {
  const trimmed = stopPointId.trim()
  if (!isBoardStopId(trimmed)) {
    return { ok: false, kind: "rejected", error: "That stop is not available." }
  }

  try {
    const state = await getCachedStopArrivalsState(trimmed)
    if (state.rateLimited) return rateLimited()
    return { ok: true, data: state.arrivals }
  } catch {
    return unavailable()
  }
}

/**
 * Hosted Board cycle docks. Same project-key cache as other site fetches,
 * without the docs-demo dock allowlist.
 */
export async function getBoardBikePointsAction(
  bikePointIds: readonly string[]
): Promise<BoardLiveResult<CycleHireDock[]>> {
  const allowed = [
    ...new Set(
      bikePointIds
        .map((id) => formatBikePointId(id))
        .filter((id) => isBoardBikePointId(id))
    ),
  ].slice(0, BOARD_LIVE_DOCK_LIMIT)

  if (allowed.length === 0) {
    return { ok: false, kind: "rejected", error: "Choose cycle docks to show nearby bikes." }
  }

  try {
    const state = await getCachedBikePointsState(allowed)
    if (state.rateLimited) return rateLimited()
    return { ok: true, data: state.docks }
  } catch {
    return unavailable()
  }
}
