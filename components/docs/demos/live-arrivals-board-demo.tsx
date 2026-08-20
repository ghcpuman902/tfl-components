"use client"

import { DataSourceLabel } from "@/components/docs/data-source-label"
import { RailArrivalsBoard } from "@/components/tfl/arrivals/rail-arrivals-board"
import { useDualPathArrivals } from "@/hooks/use-dual-path-arrivals"
import { HOME_RAIL_STOP } from "@/lib/tfl/home-arrivals-stops"
import { useArrivalsBoardUiState } from "@/lib/tfl/use-arrivals-board-ui-state"

const POLL_MS = 20_000

export default function LiveArrivalsBoardDemo() {
  const { data, loading, fetchError, fetchedAt, refresh } = useDualPathArrivals(
    {
      stopPointId: HOME_RAIL_STOP.id,
      pollMs: POLL_MS,
    }
  )
  const boardState = useArrivalsBoardUiState(data.length, fetchError, "rail")

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Polls Oxford Circus. Requires server API keys.
      </p>
      <RailArrivalsBoard
        data={data}
        stopName={HOME_RAIL_STOP.name}
        loading={loading}
        error={boardState.error}
        emptyKind={boardState.emptyKind}
      />
      <DataSourceLabel
        source="live"
        fetchedAt={fetchedAt ?? undefined}
        loading={loading}
        onRefresh={refresh}
      />
    </div>
  )
}
