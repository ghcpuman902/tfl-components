"use client";

import { TflGeographicMap } from "@/components/tfl/geography/tfl-geographic-map";
import type { VehiclePosition } from "@/lib/tfl/map-vehicles";

const VICTORIA_LINE_IDS = ["victoria"] as const;

export default function VehicleProgressDemo({
  vehicles,
}: {
  vehicles: readonly VehiclePosition[];
}) {
  return (
    <div className="h-[min(70vh,32rem)] w-full overflow-hidden rounded-lg border border-border">
      <TflGeographicMap
        modes={["tube"]}
        lineIds={VICTORIA_LINE_IDS}
        vehicles={vehicles}
        center={[-0.14, 51.507]}
        zoom={13.4}
      />
    </div>
  );
}
