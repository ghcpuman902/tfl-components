"use client";

import { useEffect, useState } from "react";
import {
  ArrivalsBoard,
  type ArrivalRow,
} from "@/components/tfl/arrivals/arrivals-board";
import { getStopArrivalsAction } from "@/lib/tfl/live-arrivals-action";

const RAIL_STOP = {
  id: "940GZZLUOXC",
  name: "Oxford Circus",
} as const;

const POLL_MS = 15_000;

/**
 * Converged arrivals demo — rail stop via shared ArrivalsBoard + data props.
 * Bus discovery remains available via the bus-arrivals registry helper for now.
 */
export default function ArrivalsBoardDemo() {
  const [data, setData] = useState<ArrivalRow[]>([]);
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
          setData(
            result.arrivals.map((arrival) => ({
              ...arrival,
              busStyle: false,
            })),
          );
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
      <p className="text-sm text-muted-foreground">
        Unified arrivals UI. Fetch/poll outside the board; pass rows as{" "}
        <code className="text-xs">data</code>. Bus uses the same list model with{" "}
        <code className="text-xs">busStyle</code> chips.
      </p>
      <ArrivalsBoard
        data={data}
        stopName={RAIL_STOP.name}
        stopPointId={RAIL_STOP.id}
        title="Arrivals"
        loading={loading}
        error={error}
        statusLabel={`Poll #${tick} · every ${POLL_MS / 1000}s`}
      />
    </div>
  );
}
