"use client";

import { useEffect, useState } from "react";
import {
  ArrivalsBoard,
  type ArrivalRow,
} from "@/components/tfl/arrivals/arrivals-board";
import {
  getStopArrivalsAction,
  type LiveArrival,
} from "@/lib/tfl/live-arrivals-action";

const DEFAULT_STOP_ID = "940GZZLUOXC";
const POLL_MS = 15_000;

const toRows = (arrivals: LiveArrival[]): ArrivalRow[] =>
  arrivals.map((arrival) => ({
    lineId: arrival.lineId,
    lineName: arrival.lineName,
    destinationName: arrival.destinationName,
    towards: arrival.towards,
    platformName: arrival.platformName,
    timeToStation: arrival.timeToStation,
    vehicleId: arrival.vehicleId,
    busStyle: false,
  }));

/**
 * Docs/demo helper: polls a stop and passes rows into {@link ArrivalsBoard}.
 * Prefer using `ArrivalsBoard` with `data` directly in applications.
 */
export const LiveArrivalsBoard = ({
  stopPointId = DEFAULT_STOP_ID,
  stopName = "Oxford Circus",
}: {
  stopPointId?: string;
  stopName?: string;
}) => {
  const [data, setData] = useState<ArrivalRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      try {
        const result = await getStopArrivalsAction(stopPointId);
        if (cancelled) return;
        if (!result.ok) {
          setError(result.error);
          setData([]);
        } else {
          setError(null);
          setData(toRows(result.arrivals));
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
  }, [stopPointId]);

  return (
    <ArrivalsBoard
      data={data}
      stopName={stopName}
      stopPointId={stopPointId}
      title="Live arrivals"
      loading={loading}
      error={error}
      statusLabel={`Poll #${tick} · every ${POLL_MS / 1000}s`}
    />
  );
};

export {
  ArrivalsBoard,
  ArrivalsBoardSkeleton,
  type ArrivalRow,
  type ArrivalsBoardProps,
} from "@/components/tfl/arrivals/arrivals-board";
