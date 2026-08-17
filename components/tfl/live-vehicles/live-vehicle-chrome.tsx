"use client";

import { Badge } from "@/components/ui/badge";
import { DataSourceLabel } from "@/components/docs/data-source-label";
import { KeySourcePill } from "@/components/docs/key-source-pill";
import type { DualPathSource } from "@/lib/tfl/dual-path-arrivals";
import type { VehicleAlgorithm } from "@/lib/tfl/vehicle-hop-engine";

const ALGORITHM_LABEL: Record<VehicleAlgorithm, string> = {
  "branch-aware": "Branch-aware",
  "simple-hop-lock": "Hop-locked",
  gps: "GPS",
  "dead-reckoning": "Dead-reckoning",
};

export const LiveVehicleChrome = ({
  algorithm,
  source,
  fetchedAt,
  loading,
  error,
}: {
  algorithm?: VehicleAlgorithm;
  source: DualPathSource;
  fetchedAt: number | null;
  loading: boolean;
  error: string | null;
}) => (
  <>
    {error ? (
      <p className="px-1 text-sm text-destructive">{error}</p>
    ) : null}
    <div className="flex flex-wrap items-center justify-end gap-2 px-1">
      {algorithm ? (
        <Badge variant="outline" className="px-1 text-muted-foreground">
          {ALGORITHM_LABEL[algorithm]}
        </Badge>
      ) : null}
      <KeySourcePill source={source} />
      <DataSourceLabel
        source={source === "user" ? "live" : "cached"}
        fetchedAt={fetchedAt ?? undefined}
        loading={loading}
      />
    </div>
  </>
);
