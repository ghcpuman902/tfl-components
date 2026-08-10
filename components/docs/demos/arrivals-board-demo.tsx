"use client";

import { useEffect, useState } from "react";
import type { RealtimePrediction } from "tfl-ts";
import { ArrivalsBoard } from "@/components/tfl/arrivals/arrivals-board";
import { DataSourceLabel } from "@/components/docs/data-source-label";
import { getStopArrivalsAction } from "@/lib/tfl/live-arrivals-action";

const RAIL_STOP = {
  id: "940GZZLUOXC",
  name: "Oxford Circus",
} as const;

const POLL_MS = 15_000;

/**
 * Converged arrivals demo — rail stop via shared ArrivalsBoard + tfl-ts predictions.
 */
export default function ArrivalsBoardDemo() {
  const [data, setData] = useState<RealtimePrediction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      try {
        const result = await getStopArrivalsAction(RAIL_STOP.id);
        if (cancelled) return;
        if (!result.ok) {
          setError(result.error);
          setData([]);
        } else {
          setError(null);
          setData(result.arrivals);
          setTick((n) => n + 1);
        }
      } catch {
        if (!cancelled) setError("Failed to load arrivals.");
      } finally {
        if (!cancelled) {
          setLoading(false);
          timer = setTimeout(load, POLL_MS);
        }
      }
    };

    void load();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return (
    <div className="space-y-4">
      <DataSourceLabel source="live" />
      <p className="text-sm text-muted-foreground">
        Pass <code className="text-xs">RealtimePrediction[]</code> from{" "}
        <code className="text-xs">tfl.stopPoint.getArrivals</code> as{" "}
        <code className="text-xs">data</code>. Polling stays outside the board.
      </p>
      <ArrivalsBoard
        data={data}
        stopName={RAIL_STOP.name}
        loading={loading}
        error={error}
        statusLabel={`Poll #${tick} · every ${POLL_MS / 1000}s`}
      />
    </div>
  );
}
