"use client";

import { TflBusGeoMap } from "@/components/tfl/geography/tfl-bus-geo-map";
import { LiveVehicleChrome } from "@/components/tfl/live-vehicles/live-vehicle-chrome";
import { useLiveVehicleTracking } from "@/hooks/use-live-vehicle-tracking";
import type { BusPositionSource } from "@/lib/tfl/bods-siri-vm";
import type { LiveVehiclesSnapshot } from "@/lib/tfl/live-vehicles-payload";
import type { TargetRequestsPerMinute } from "@/lib/tfl/vehicle-poll-rate";
import { cn } from "@/lib/utils";

export type LiveBusVehiclesProps = {
  busRouteIds: readonly string[];
  targetRequestsPerMinute?: TargetRequestsPerMinute;
  busPositionSource?: BusPositionSource;
  initial?: LiveVehiclesSnapshot;
  className?: string;
};

export const LiveBusVehicles = ({
  busRouteIds,
  targetRequestsPerMinute = "max",
  busPositionSource = "auto",
  initial,
  className,
}: LiveBusVehiclesProps) => {
  const tracking = useLiveVehicleTracking({
    busRouteIds,
    targetRequestsPerMinute,
    busPositionSource,
    initial,
  });

  if (busRouteIds.length === 0) {
    return (
      <p className="px-1 text-sm text-muted-foreground">
        Choose at least one route.
      </p>
    );
  }

  if (tracking.busGeometries.length === 0) {
    return (
      <div className={cn("space-y-2", className)}>
        <div
          className="h-[min(60vh,28rem)] animate-pulse rounded-lg bg-muted"
          aria-hidden
        />
        <LiveVehicleChrome
          source={tracking.source}
          fetchedAt={tracking.fetchedAt}
          loading={tracking.loading}
          error={tracking.error}
        />
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {tracking.busGeometries.map((geometry) => {
        const vehicles = tracking.bus.filter(
          (vehicle) => vehicle.lineId === geometry.routeId,
        );
        const algorithm = tracking.algorithms.find(
          (item) => item.domain === "bus" && item.lineId === geometry.routeId,
        )?.algorithm;
        return (
          <section key={geometry.routeId} className="space-y-2">
            {tracking.busGeometries.length > 1 ? (
              <h2 className="px-1 text-sm font-medium text-foreground">
                Route {geometry.routeId}
              </h2>
            ) : null}
            <div className="h-[min(60vh,28rem)] overflow-hidden rounded-lg border border-border">
              <TflBusGeoMap
                data={geometry}
                vehicles={vehicles}
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
          </section>
        );
      })}
    </div>
  );
};
