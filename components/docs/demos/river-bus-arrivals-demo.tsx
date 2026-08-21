"use client"

import Link from "next/link"
import { DataSourceLabel } from "@/components/docs/data-source-label"
import { RiverBusArrivalsBoard } from "@/components/tfl/arrivals/river-bus-arrivals-board"
import { useArrivalsBoardUiState } from "@/lib/tfl/use-arrivals-board-ui-state"
import type { BusArrivalsGroupBy } from "@/lib/tfl/arrivals-prepare"
import { HOME_RIVER_STOP } from "@/lib/tfl/home-arrivals-stops"
import { useDualPathArrivals } from "@/hooks/use-dual-path-arrivals"

const POLL_MS = 20_000

const RiverBusArrivalsLiveBoard = ({
  groupBy = "none",
  showIntro = false,
}: {
  groupBy?: BusArrivalsGroupBy
  showIntro?: boolean
}) => {
  const { data, loading, fetchError, fetchedAt, refresh } = useDualPathArrivals(
    {
      stopPointId: HOME_RIVER_STOP.id,
      pollMs: POLL_MS,
    }
  )
  const boardState = useArrivalsBoardUiState(data.length, fetchError, "river")

  return (
    <div className="space-y-4">
      {showIntro ? (
        <p className="text-sm text-muted-foreground">
          Pass <code className="text-xs">RealtimePrediction[]</code> from{" "}
          <code className="text-xs">tfl.stopPoint.getArrivals</code> as{" "}
          <code className="text-xs">data</code>. Nearby search lives under{" "}
          <Link
            href="/docs/explorer/points/river"
            className="text-foreground underline underline-offset-4"
          >
            Explorer → River
          </Link>
          .
        </p>
      ) : null}
      <RiverBusArrivalsBoard
        data={data}
        now={fetchedAt ?? undefined}
        stopName={HOME_RIVER_STOP.name}
        groupBy={groupBy}
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

export default function RiverBusArrivalsBoardDemo() {
  return <RiverBusArrivalsLiveBoard showIntro />
}

export const RiverBusArrivalsBoardGroupedDemo = () => (
  <RiverBusArrivalsLiveBoard groupBy="route" />
)
