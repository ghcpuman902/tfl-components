import type { RealtimePrediction } from "tfl-ts"
import {
  expandRound,
  type CompactRound,
} from "@/lib/tfl/homepage-live/compact"
import {
  HomepageLiveEngine,
  type LiveSnapshot,
} from "@/lib/tfl/homepage-live/engine"

export type LiveFrame = {
  receivedAt: number
  /** Cleaned rows of the latest poll, for the Board. */
  rows: RealtimePrediction[]
  snapshot: LiveSnapshot
}

/** Feeds polls oldest-first through a fresh engine; the same polls always give the same frame. */
export const computeFrame = (rounds: readonly CompactRound[]): LiveFrame => {
  const engine = new HomepageLiveEngine()
  let frame: LiveFrame | undefined
  for (const round of rounds) {
    const rows = expandRound(round)
    frame = {
      receivedAt: round.at,
      rows,
      snapshot: engine.ingest(rows, round.at),
    }
  }
  if (!frame) throw new Error("No rounds to compute a frame from")
  return frame
}
