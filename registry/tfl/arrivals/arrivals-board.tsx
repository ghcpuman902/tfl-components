"use client";

import { getLineCssProps } from "tfl-ts";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/** Shared arrival row — rail and bus map into this shape before render. */
export type ArrivalRow = {
  id?: string;
  lineId?: string;
  lineName?: string;
  destinationName?: string;
  towards?: string;
  platformName?: string;
  timeToStation?: number;
  vehicleId?: string;
  /** Bus-oriented extras */
  expectedArrival?: string;
  direction?: string | number;
  /** When true, use route-number chip styling instead of tube line colours. */
  busStyle?: boolean;
};

export type ArrivalsBoardProps = {
  data: readonly ArrivalRow[];
  stopName: string;
  stopPointId?: string;
  title?: string;
  loading?: boolean;
  error?: string | null;
  /** Optional poll / refresh label (e.g. "Poll #3 · every 15s"). */
  statusLabel?: string;
  emptyMessage?: string;
  maxRows?: number;
};

const formatCountdown = (seconds?: number): string => {
  if (seconds === undefined || seconds < 0) return "-";
  if (seconds < 60) return "Due";
  return `${Math.floor(seconds / 60)} min`;
};

export const ArrivalsBoardSkeleton = () => (
  <div className="w-full space-y-4" aria-busy aria-label="Loading arrivals">
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div className="space-y-2">
        <Skeleton className="h-9 w-48 max-w-full" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <Skeleton className="h-4 w-28" />
    </div>
    <ul className="list-none space-y-0 p-0" role="presentation">
      {Array.from({ length: 8 }).map((_, i) => (
        <li key={i} className="border-b border-border py-2.5 last:border-0">
          <Skeleton className="h-8 w-full" />
        </li>
      ))}
    </ul>
  </div>
);

/**
 * Unified arrivals presentation — pass normalised rows as `data`.
 * Fetching / polling / stop discovery belong outside this component.
 */
export const ArrivalsBoard = ({
  data,
  stopName,
  stopPointId,
  title = "Arrivals",
  loading = false,
  error = null,
  statusLabel,
  emptyMessage = "No arrivals right now.",
  maxRows = 16,
}: ArrivalsBoardProps) => {
  if (loading && data.length === 0 && !error) {
    return <ArrivalsBoardSkeleton />;
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-1 text-muted-foreground">
            {stopName}{" "}
            {stopPointId ? (
              <code className="rounded bg-muted px-1 text-xs">{stopPointId}</code>
            ) : null}
          </p>
        </div>
        {statusLabel || loading ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            {loading ? (
              <>
                <Loader2 className="size-3.5 animate-spin" aria-hidden />
                Loading…
              </>
            ) : (
              statusLabel
            )}
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {!error && data.length === 0 && !loading ? (
        <p className="text-sm text-muted-foreground">{emptyMessage}</p>
      ) : null}

      <ul className="list-none space-y-0 p-0" role="list">
        {data.slice(0, maxRows).map((arrival, index) => {
          const lineId = arrival.lineId ?? "";
          const label = (arrival.lineName ?? lineId) || "-";
          const cssProps = arrival.busStyle
            ? undefined
            : getLineCssProps(lineId);

          return (
            <li
              key={
                arrival.id ??
                `${arrival.vehicleId ?? arrival.lineId}-${arrival.timeToStation}-${index}`
              }
              className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-border py-2.5 text-sm last:border-0"
            >
              <span
                className={cn(
                  "inline-flex min-w-16 items-center justify-center rounded-md px-2 py-0.5 text-xs font-bold",
                  arrival.busStyle
                    ? "bg-foreground text-background"
                    : "bg-[var(--line-color)] text-white dark:bg-[var(--line-dark-fill)] dark:text-[var(--line-dark-on-fill)] dark:[box-shadow:var(--line-dark-box-shadow)]",
                )}
                style={cssProps}
              >
                {label}
              </span>
              <span className="min-w-0 truncate">
                <span className="font-medium">
                  {arrival.towards ?? arrival.destinationName ?? "Unknown"}
                </span>
                {arrival.platformName ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {arrival.platformName}
                  </span>
                ) : null}
              </span>
              <span className="font-semibold tabular-nums">
                {formatCountdown(arrival.timeToStation)}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
