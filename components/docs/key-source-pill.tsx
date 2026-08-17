"use client";

import { KeyRound, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { DualPathSource } from "@/lib/tfl/dual-path-arrivals";
import { cn } from "@/lib/utils";

/**
 * Compact pill next to {@link DataSourceLabel} on demos wired through
 * `useLiveVehicleTracking` / `useDualPathArrivals` — which quota this demo is
 * spending, not how fresh the data is.
 */
export const KeySourcePill = ({
  source,
  className,
}: {
  source: DualPathSource;
  className?: string;
}) => {
  const usingKey = source === "user";
  const Icon = usingKey ? KeyRound : Users;
  return (
    <Badge variant="outline" className={cn("px-1 text-muted-foreground", className)}>
      <Icon
        data-icon="inline-start"
        className={cn(
          "-ml-0.5 size-3 shrink-0",
          usingKey && "text-emerald-600 dark:text-emerald-400",
        )}
        aria-hidden
      />
      {usingKey ? "Using your key" : "Shared demo data"}
    </Badge>
  );
};
