"use client";

import { TflBusGeoMap } from "@/components/tfl/geography/tfl-bus-geo-map";
import type { BusRouteGeometry } from "@/lib/tfl/bus-geography-types";

export default function MapBusGeoDemo({ data }: { data: BusRouteGeometry }) {
  return (
    <div className="h-[min(70vh,32rem)] w-full overflow-hidden rounded-lg border border-border">
      <TflBusGeoMap data={data} />
    </div>
  );
}
