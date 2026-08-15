"use client";

import { useEffect, useState } from "react";
import { GlobeCheck, GlobeX, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatFetchedAgo } from "@/lib/format-fetched-ago";
import { cn } from "@/lib/utils";

export type DataSourceKind = "cached" | "fixture" | "live";

type DataSourceLabelProps = {
  source: DataSourceKind;
  className?: string;
  /** Epoch ms of the last successful fetch. Live only; formatted on the client. */
  fetchedAt?: number;
  loading?: boolean;
  /** Live only. Hover/click refreshes; no instructional copy. */
  onRefresh?: () => void;
};

const RELATIVE_TICK_MS = 15_000;

/** Compact provenance pill — under the preview, right-aligned. */
export const DataSourceLabel = ({
  source,
  className,
  fetchedAt,
  loading = false,
  onRefresh,
}: DataSourceLabelProps) => {
  const isLive = source === "live";
  const Icon = isLive ? GlobeCheck : GlobeX;
  const canRefresh = Boolean(onRefresh) && isLive;
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!isLive || fetchedAt == null) {
      setNow(null);
      return;
    }

    const readNow = () => {
      setNow(Date.now());
    };
    readNow();
    const id = window.setInterval(readNow, RELATIVE_TICK_MS);
    return () => window.clearInterval(id);
  }, [isLive, fetchedAt]);

  const label =
    isLive && fetchedAt != null && now != null
      ? formatFetchedAgo(fetchedAt, now)
      : isLive
        ? "Live data"
        : "Stale data";

  const handleClick = () => {
    if (!canRefresh || loading) return;
    onRefresh?.();
  };

  return (
    <div className={cn("flex justify-end", className)}>
      <Badge
        variant="outline"
        className={cn(
          "px-1 text-muted-foreground",
          canRefresh &&
            "cursor-pointer hover:bg-muted focus-visible:bg-muted disabled:cursor-progress",
        )}
        render={
          canRefresh ? (
            <button
              type="button"
              onClick={handleClick}
              disabled={loading}
              aria-label={`${label}. Refresh`}
              aria-busy={loading}
            />
          ) : undefined
        }
      >
        <span
          data-icon="inline-start"
          className="relative -ml-0.5 inline-flex size-3 shrink-0"
          aria-hidden
        >
          <Loader2
            className={cn(
              "absolute inset-0 size-3 text-muted-foreground transition-opacity duration-200",
              loading
                ? "opacity-100 motion-safe:animate-spin"
                : "opacity-0",
            )}
          />
          <Icon
            className={cn(
              "size-3 transition-opacity duration-200",
              loading ? "opacity-0" : "opacity-100",
              isLive
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground",
            )}
          />
        </span>
        {label}
      </Badge>
    </div>
  );
};
