"use server"

import { getBusArrivals } from "@/lib/tfl/actions"
import {
  compactRound,
  type CompactRound,
} from "@/lib/tfl/homepage-live/compact"
import {
  replayArrivalsRound,
  replayBusArrivalsRound,
} from "@/lib/tfl/homepage-live/fixture"
import { getCachedNetworkRound } from "@/lib/tfl/homepage-live/network-arrivals"
import {
  REPLAY_FIXTURES,
  REPLAY_LAST_ROUND,
  replayRoundsFor,
  type ReplayFixtureName,
} from "@/lib/tfl/homepage-live/replay-params"

export type NetworkRoundResult =
  | { ok: true; rounds: CompactRound[] }
  | { ok: false; error: string; rateLimited: boolean }

/** The live network poll, shared and cached on the server. */
export async function getNetworkRoundAction(): Promise<NetworkRoundResult> {
  try {
    const state = await getCachedNetworkRound()
    if (!state.ok)
      return {
        ok: false,
        rateLimited: true,
        error: "TfL is busy right now. The map will retry.",
      }
    return { ok: true, rounds: [state.round] }
  } catch {
    return {
      ok: false,
      rateLimited: false,
      error: "Live trains are unavailable right now. The map will retry.",
    }
  }
}

/** Recorded rounds for `?replay=`, read from the committed fixture, never the network. */
export async function getReplayRoundsAction(
  fixture: string,
  round: number
): Promise<NetworkRoundResult> {
  if (!(fixture in REPLAY_FIXTURES) || !Number.isInteger(round))
    return { ok: false, rateLimited: false, error: "Unknown replay." }
  const request = {
    fixture: fixture as ReplayFixtureName,
    round: Math.min(REPLAY_LAST_ROUND, Math.max(0, round)),
  }
  const rounds = replayRoundsFor(request).map((index) => {
    const recorded = replayArrivalsRound(index)
    return compactRound(recorded.rows, recorded.receivedAt)
  })
  return { ok: true, rounds }
}

export type BusBoardRow = {
  route: string
  destination: string
  towards?: string
  etaSec: number
  vehicleId?: string
}

export type BusStopBoardResult =
  | { ok: true; rows: BusBoardRow[] }
  | { ok: false; error: string }

/** Arrivals for one bus stop: the recording under `?replay=`, otherwise the site-key allowlist. */
export async function getBusStopBoardAction(
  stopId: string,
  replay?: { fixture: string; round: number }
): Promise<BusStopBoardResult> {
  if (replay) {
    if (!(replay.fixture in REPLAY_FIXTURES) || !Number.isInteger(replay.round))
      return { ok: false, error: "Unknown replay." }
    const recorded = replayBusArrivalsRound(
      Math.min(REPLAY_LAST_ROUND, Math.max(0, replay.round))
    ).byLine.get(stopId)
    if (!recorded) return { ok: false, error: "This stop is not in the recording." }
    return {
      ok: true,
      rows: recorded
        .map((row) => ({
          route: row.lineId ?? "",
          destination: row.destinationName ?? "",
          towards: row.towards,
          etaSec: row.timeToStation ?? 0,
          vehicleId: row.vehicleId,
        }))
        .sort((a, b) => a.etaSec - b.etaSec),
    }
  }
  const result = await getBusArrivals(stopId)
  if (!result.ok) return { ok: false, error: result.error }
  return {
    ok: true,
    rows: result.arrivals
      .map((row) => ({
        route: row.lineName ?? "",
        destination: row.destinationName ?? "",
        towards: row.towards,
        etaSec: row.timeToStation ?? 0,
        vehicleId: row.vehicleId,
      }))
      .sort((a, b) => a.etaSec - b.etaSec),
  }
}
