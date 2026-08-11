"use client";

import { useEffect, useState } from "react";
import type { RealtimePrediction } from "tfl-ts";
import { ArrivalsBoard } from "@/components/tfl/arrivals/arrivals-board";
import { getStopArrivalsAction } from "@/lib/tfl/live-arrivals-action";
import { useArrivalsBoardUiState } from "@/lib/tfl/use-arrivals-board-ui-state";

const DEFAULT_STOP_ID = "940GZZLUOXC";
const POLL_MS = 15_000;

/**
 * Docs/demo helper: polls a stop and passes predictions into {@link ArrivalsBoard}.
 * Prefer using `ArrivalsBoard` with `data` directly in applications.
 *
 * @deprecated Prefer ArrivalsBoard + your own fetch. Legacy registry name only.
 */
export const LiveArrivalsBoard = ({
  stopPointId = DEFAULT_STOP_ID,
  stopName = "Oxford Circus",
}: {
  stopPointId?: string;
  stopName?: string;
}) => {
  const [data, setData] = useState<RealtimePrediction[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const boardState = useArrivalsBoardUiState(data.length, fetchError, "rail");

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const load = async () => {
      try {
        const result = await getStopArrivalsAction(stopPointId);
        if (cancelled) return;
        if (!result.ok) {
          setFetchError(result.error);
          setData([]);
        } else {
          setFetchError(null);
          setData(result.arrivals);
          setTick((n) => n + 1);
        }
      } catch {
        if (!cancelled) setFetchError("Failed to load arrivals.");
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
      loading={loading}
      error={boardState.error}
      emptyKind={boardState.emptyKind}
      statusLabel={`Poll #${tick} · every ${POLL_MS / 1000}s`}
    />
  );
};

export {
  ArrivalsBoard,
  ArrivalsBoardSkeleton,
  toArrivalRows,
  type ArrivalRow,
  type ArrivalsBoardProps,
} from "@/components/tfl/arrivals/arrivals-board";
