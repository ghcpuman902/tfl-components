"use client"

import { TflGeographicMap } from "@/components/tfl/geography/tfl-geographic-map"
import { LiveVehicleChrome } from "@/components/tfl/live-vehicles/live-vehicle-chrome"
import { useLiveVehicleTracking } from "@/hooks/use-live-vehicle-tracking"
import type { LiveVehiclesSnapshot } from "@/lib/tfl/live-vehicles-payload"
import { railModesForLineIds } from "@/lib/tfl/rail-vehicle-geometry"
import type { TargetRequestsPerMinute } from "@/lib/tfl/vehicle-poll-rate"
import { cn } from "@/lib/utils"

export type LiveRailVehiclesProps = {
  railLineIds: readonly string[]
  targetRequestsPerMinute?: TargetRequestsPerMinute
  initial?: LiveVehiclesSnapshot
  className?: string
}

export const LiveRailVehicles = ({
  railLineIds,
  targetRequestsPerMinute = "max",
  initial,
  className,
}: LiveRailVehiclesProps) => {
  const tracking = useLiveVehicleTracking({
    railLineIds,
    targetRequestsPerMinute,
    initial,
  })
  const algorithm = tracking.algorithms.find(
    (row) => row.domain === "rail"
  )?.algorithm

  if (railLineIds.length === 0) {
    return (
      <p className="px-1 text-sm text-muted-foreground">
        Choose at least one line.
      </p>
    )
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="h-[min(60vh,28rem)] overflow-hidden rounded-lg border border-border">
        <TflGeographicMap
          modes={railModesForLineIds(railLineIds)}
          lineIds={railLineIds}
          vehicles={tracking.rail}
          vehiclePolylines={tracking.railPolylines}
          coast
          showNavigation={false}
        />
      </div>
      <LiveVehicleChrome
        algorithm={algorithm}
        source={tracking.source}
        fetchedAt={tracking.fetchedAt}
        loading={tracking.loading}
        error={tracking.error}
      />
    </div>
  )
}
