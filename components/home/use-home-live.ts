"use client"

import { useEffect, useState } from "react"
import type { CompactRound } from "@/lib/tfl/homepage-live/compact"
import type { LiveFrame } from "@/lib/tfl/homepage-live/replay-frame"
import type { ReplayRequest } from "@/lib/tfl/homepage-live/replay-params"
import {
  getNetworkRoundAction,
  getReplayRoundsAction,
  type NetworkRoundResult,
} from "@/lib/tfl/homepage-live/actions"

/** Network polls are shared on the server for about 20 s, so asking faster gains nothing. */
export const LIVE_POLL_MS = 30_000
/** A request that has not answered by now is abandoned, and the next poll tries again. */
export const LIVE_TIMEOUT_MS = 8_000

export type HomeLive = {
  frame?: LiveFrame
  status: "loading" | "ok" | "error"
  /** One sentence for the person looking, set when the latest poll failed. */
  error?: string
  /** Epoch ms when the shown frame arrived. */
  updatedAt?: number
}

const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), ms)
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error)
      }
    )
  })

const SLOW = "Live trains are slow to respond. The map will retry."
const DOWN = "Live trains are unavailable right now. The map will retry."

/**
 * Live trains for the whole network. Live: one shared network poll every 30 s
 * fed through one engine so each train keeps its history. Replay: the recorded
 * rounds up to the chosen frame, once, no network.
 */
export const useHomeLive = (replay?: ReplayRequest): HomeLive => {
  const [state, setState] = useState<HomeLive>({ status: "loading" })
  const fixture = replay?.fixture
  const round = replay?.round

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const run = async () => {
      const { HomepageLiveEngine } = await import("@/lib/tfl/homepage-live/engine")
      const { computeFrame } = await import("@/lib/tfl/homepage-live/replay-frame")
      const { expandRound } = await import("@/lib/tfl/homepage-live/compact")
      const engine = new HomepageLiveEngine()

      const apply = (rounds: readonly CompactRound[]) => {
        const frame = computeFrame(rounds)
        setState({ frame, status: "ok", updatedAt: Date.now() })
      }

      if (fixture !== undefined && round !== undefined) {
        try {
          const result = await withTimeout(
            getReplayRoundsAction(fixture, round),
            LIVE_TIMEOUT_MS * 4
          )
          if (cancelled) return
          if (result.ok) apply(result.rounds)
          else setState({ status: "error", error: result.error })
        } catch {
          if (!cancelled) setState({ status: "error", error: DOWN })
        }
        return
      }

      const poll = async () => {
        let result: NetworkRoundResult
        try {
          result = await withTimeout(getNetworkRoundAction(), LIVE_TIMEOUT_MS)
        } catch (error) {
          if (cancelled) return
          const message = error instanceof Error && error.message === "timeout" ? SLOW : DOWN
          setState((prev) => ({ ...prev, status: "error", error: message }))
          timer = setTimeout(poll, LIVE_POLL_MS)
          return
        }
        if (cancelled) return
        if (result.ok) {
          const received = result.rounds[0]!
          const rows = expandRound(received)
          const snapshot = engine.ingest(rows, received.at)
          setState({
            frame: { receivedAt: received.at, rows, snapshot },
            status: "ok",
            updatedAt: Date.now(),
          })
        } else {
          setState((prev) => ({ ...prev, status: "error", error: result.error }))
        }
        timer = setTimeout(poll, LIVE_POLL_MS)
      }
      await poll()
    }
    void run()

    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [fixture, round])

  return state
}
