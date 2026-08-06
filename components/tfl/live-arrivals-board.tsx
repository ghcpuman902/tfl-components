"use client";

import { useEffect, useState } from "react";
import {
  getLineCssProps,
  getLineInlineStyles,
} from "tfl-ts";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getStopArrivalsAction,
  type LiveArrival,
} from "@/lib/tfl/live-arrivals-action";

const DEFAULT_STOP_ID = "940GZZLUOXC"; // Oxford Circus
const POLL_MS = 15_000;

const formatCountdown = (seconds?: number): string => {
  if (seconds === undefined || seconds < 0) return "-";
  if (seconds < 60) return "Due";
  return `${Math.floor(seconds / 60)} min`;
};

export const LiveArrivalsBoard = ({
  stopPointId = DEFAULT_STOP_ID,
  stopName = "Oxford Circus",
}: {
  stopPointId?: string;
  stopName?: string;
}) => {
  const [arrivals, setArrivals] = useState<LiveArrival[]>([]);
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
          setArrivals([]);
        } else {
          setError(null);
          setArrivals(result.arrivals);
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
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold">Live arrivals</h1>
          <p className="mt-1 text-muted-foreground">
            {stopName}{" "}
            <code className="rounded bg-muted px-1 text-xs">{stopPointId}</code>
          </p>
        </div>
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          {loading ? (
            <>
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              Loading…
            </>
          ) : (
            <>Poll #{tick} · every {POLL_MS / 1000}s</>
          )}
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      {!error && arrivals.length === 0 && !loading && (
        <p className="text-sm text-muted-foreground">No arrivals right now.</p>
      )}

      <ul className="list-none space-y-0 p-0" role="list">
        {arrivals.slice(0, 16).map((arrival, index) => {
          const lineId = arrival.lineId ?? "";
          const styles = getLineInlineStyles(lineId);
          const cssProps = getLineCssProps(lineId);

          return (
            <li
              key={`${arrival.vehicleId ?? arrival.lineId}-${arrival.timeToStation}-${index}`}
              className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-border py-2.5 text-sm last:border-0"
            >
              <span
                className={cn(
                  "inline-flex min-w-16 items-center justify-center rounded-md px-2 py-0.5 text-xs font-bold text-white",
                  "dark:[box-shadow:var(--line-dark-box-shadow)]",
                )}
                style={{
                  backgroundColor: styles.backgroundColor,
                  ...cssProps,
                }}
              >
                {arrival.lineName ?? lineId}
              </span>
              <span className="min-w-0 truncate">
                <span className="font-medium">
                  {arrival.towards ?? arrival.destinationName ?? "Unknown"}
                </span>
                {arrival.platformName && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {arrival.platformName}
                  </span>
                )}
              </span>
              <span className="tabular-nums font-semibold">
                {formatCountdown(arrival.timeToStation)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
