"use client";

import Link from "next/link";
import { BusArrivalsBoard } from "@/components/tfl/arrivals/bus-arrivals-board";
import { useArrivalsBoardUiState } from "@/lib/tfl/use-arrivals-board-ui-state";
import type { BusArrivalsGroupBy } from "@/lib/tfl/arrivals-prepare";
import { HOME_BUS_STOP } from "@/lib/tfl/home-arrivals-stops";
import { useDualPathArrivals } from "@/hooks/use-dual-path-arrivals";

const POLL_MS = 20_000;

const BusArrivalsLiveBoard = ({
  groupBy = "none",
  showIntro = false,
}: {
  groupBy?: BusArrivalsGroupBy;
  showIntro?: boolean;
}) => {
  const { data, loading, fetchError, tick } = useDualPathArrivals({
    stopPointId: HOME_BUS_STOP.id,
    pollMs: POLL_MS,
  });
  const boardState = useArrivalsBoardUiState(data.length, fetchError, "bus");

  return (
    <div className="space-y-4">
      {showIntro ? (
        <p className="text-sm text-muted-foreground">
          Pass <code className="text-xs">RealtimePrediction[]</code> from{" "}
          <code className="text-xs">tfl.stopPoint.getArrivals</code> as{" "}
          <code className="text-xs">data</code>. The default board is a flat
          time-ordered list. Polling stays outside the board. For nearby /
          search, use{" "}
          <Link
            href="/explore/bus-stops"
            className="text-foreground underline underline-offset-4"
          >
            Explorer → Bus stops
          </Link>
          .
        </p>
      ) : null}
      <BusArrivalsBoard
        data={data}
        stopName={HOME_BUS_STOP.name}
        stopLetter={HOME_BUS_STOP.stopLetter}
        groupBy={groupBy}
        loading={loading}
        error={boardState.error}
        emptyKind={boardState.emptyKind}
        emptyMessage={
          boardState.emptyKind === "empty"
            ? "No buses due at this stop right now."
            : undefined
        }
        statusLabel={`Poll #${tick} · every ${POLL_MS / 1000}s`}
      />
    </div>
  );
};

/**
 * Docs preview — one fixed bus stop via BusArrivalsBoard (flat, time-ordered).
 * Stop discovery (near you / search) lives under Explorer.
 */
export default function BusArrivalsBoardDemo() {
  return <BusArrivalsLiveBoard showIntro />;
}

/** Live `groupBy="route"` board for the Variations section. */
export const BusArrivalsBoardGroupedDemo = () => (
  <BusArrivalsLiveBoard groupBy="route" />
);
