"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { RealtimePrediction } from "tfl-ts";
import { ArrivalsBoard } from "@/components/tfl/arrivals/arrivals-board";
import { DataSourceLabel } from "@/components/docs/data-source-label";
import { getStopArrivalsAction } from "@/lib/tfl/live-arrivals-action";

/** Matches homepage / docs get-data example (NaPTAN 490…G). */
const BUS_STOP = {
  id: "490000091G",
  name: "Trafalgar Square",
  stopLetter: "G",
} as const;

const POLL_MS = 15_000;

/**
 * Docs preview — one fixed bus stop via shared ArrivalsBoard.
 * Stop discovery (near you / search) lives under Explorer.
 */
export default function BusArrivalsBoardDemo() {
  const [data, setData] = useState<RealtimePrediction[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      try {
        const result = await getStopArrivalsAction(BUS_STOP.id);
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
        <code className="text-xs">data</code> with{" "}
        <code className="text-xs">variant=&quot;bus&quot;</code>. Polling stays
        outside the board. For nearby / search, use{" "}
        <Link
          href="/explore/bus-stops"
          className="text-foreground underline underline-offset-4"
        >
          Explorer → Bus stops
        </Link>
        .
      </p>
      <ArrivalsBoard
        data={data}
        stopName={BUS_STOP.name}
        stopLetter={BUS_STOP.stopLetter}
        variant="bus"
        loading={loading}
        error={error}
        statusLabel={`Poll #${tick} · every ${POLL_MS / 1000}s`}
        emptyMessage="No buses due at this stop right now."
      />
    </div>
  );
}
