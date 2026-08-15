"use client"

import { useEffect, useState } from "react"
import type { RealtimePrediction } from "tfl-ts"
import { RailArrivalsBoard } from "@/components/tfl/arrivals/rail-arrivals-board"
import { getStopArrivalsAction } from "@/lib/tfl/live-arrivals-action"
import { useArrivalsBoardUiState } from "@/lib/tfl/use-arrivals-board-ui-state"

const DEFAULT_STOP_ID = "940GZZLUOXC"
const POLL_MS = 20_000

/**
 * Docs/demo helper: polls a stop and passes predictions into {@link RailArrivalsBoard}.
 * Prefer using `RailArrivalsBoard` with `data` directly in applications.
 *
 * @deprecated Prefer RailArrivalsBoard + your own fetch. Legacy registry name only.
 */
export const LiveArrivalsBoard = ({
  stopPointId = DEFAULT_STOP_ID,
  stopName,
}: {
  stopPointId?: string
  stopName?: string
}) => {
  const [data, setData] = useState<RealtimePrediction[]>([])
  const [fetchedAt, setFetchedAt] = useState<number | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const boardState = useArrivalsBoardUiState(data.length, fetchError, "rail")

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const load = async () => {
      try {
        const result = await getStopArrivalsAction(stopPointId)
        if (cancelled) return
        if (!result.ok) {
          setFetchError(result.error)
          setData([])
        } else {
          setFetchError(null)
          setData(result.arrivals)
          setFetchedAt(Date.now())
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
  }, [stopPointId])

  return (
    <RailArrivalsBoard
      data={data}
      now={fetchedAt ?? undefined}
      stopName={stopName}
      loading={loading}
      error={boardState.error}
      emptyKind={boardState.emptyKind}
    />
  )
}

export { RailArrivalsBoard } from "@/components/tfl/arrivals/rail-arrivals-board"
export { ArrivalsBoardSkeleton } from "@/components/tfl/arrivals/arrivals-board-view"
