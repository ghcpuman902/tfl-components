"use client";

import { DataSourceLabel } from "@/components/docs/data-source-label";
import { RailArrivalsBoard } from "@/components/tfl/arrivals/rail-arrivals-board";
import {
  HOME_RAIL_LINES,
  HOME_RAIL_STOP,
} from "@/lib/tfl/home-arrivals-stops";
import { useArrivalsBoardUiState } from "@/lib/tfl/use-arrivals-board-ui-state";
import { useDualPathArrivals } from "@/hooks/use-dual-path-arrivals";

const POLL_MS = 20_000;

/**
 * Rail arrivals demo — Oxford Circus via RailArrivalsBoard + tfl-ts predictions.
 * Site Server Action when no user key; browser tfl-ts when a key is ready.
 * Identity (stop name) paints immediately; predictions stream in after poll.
 */
export default function RailArrivalsBoardDemo() {
  const { data, loading, fetchError, fetchedAt, refresh } = useDualPathArrivals({
    stopPointId: HOME_RAIL_STOP.id,
    pollMs: POLL_MS,
  });
  const boardState = useArrivalsBoardUiState(data.length, fetchError, "rail");

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Pass <code className="text-xs">RealtimePrediction[]</code> from{" "}
        <code className="text-xs">tfl.stopPoint.getArrivals</code> as{" "}
        <code className="text-xs">data</code>. Polling stays outside the board.
      </p>
      <RailArrivalsBoard
        data={data}
        lines={HOME_RAIL_LINES}
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
  );
}
