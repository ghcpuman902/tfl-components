"use client"

import { useEffect, useState } from "react"
import type { RealtimePrediction } from "tfl-ts"
import { RailArrivalsBoard } from "@/components/tfl/arrivals/rail-arrivals-board"
import { DataSourceLabel } from "@/components/docs/data-source-label"
import { getStopArrivalsAction } from "@/lib/tfl/live-arrivals-action"
import { HOME_RAIL_LINES } from "@/lib/tfl/home-arrivals-stops"
import { useArrivalsBoardUiState } from "@/lib/tfl/use-arrivals-board-ui-state"

const RAIL_STOP = {
  id: "940GZZLUOXC",
  name: "Oxford Circus",
} as const

const POLL_MS = 15_000

/**
 * Rail arrivals demo — Oxford Circus via RailArrivalsBoard + tfl-ts predictions.
 */
export default function RailArrivalsBoardDemo() {
  const [data, setData] = useState<RealtimePrediction[]>([])
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [tick, setTick] = useState(0)
  const boardState = useArrivalsBoardUiState(data.length, fetchError, "rail")

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const load = async () => {
      try {
        const result = await getStopArrivalsAction(RAIL_STOP.id)
        if (cancelled) return
        if (!result.ok) {
          setFetchError(result.error)
          setData([])
        } else {
          setFetchError(null)
          setData(result.arrivals)
          setTick((n) => n + 1)
        }
      } catch {
        if (!cancelled) setFetchError("Failed to load arrivals.")
      } finally {
        if (!cancelled) {
          setLoading(false)
          timer = setTimeout(load, POLL_MS)
        }
      }
    }

    void load()
    return () => {
      cancelled = true
      if (timer) clearTimeout(timer)
    }
  }, [])

  return (
    <div className="space-y-4">
      <DataSourceLabel source="live" />
      <p className="text-sm text-muted-foreground">
        Pass <code className="text-xs">RealtimePrediction[]</code> from{" "}
        <code className="text-xs">tfl.stopPoint.getArrivals</code> as{" "}
        <code className="text-xs">data</code>. Polling stays outside the board.
      </p>
      <RailArrivalsBoard
        data={data}
        lines={HOME_RAIL_LINES}
        stopName={RAIL_STOP.name}
        loading={loading}
        error={boardState.error}
        emptyKind={boardState.emptyKind}
        statusLabel={`Poll #${tick} · every ${POLL_MS / 1000}s`}
      />
    </div>
  )
}
