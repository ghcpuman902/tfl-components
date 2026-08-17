"use client";

import { TflBusGeoMap } from "@/components/tfl/geography/tfl-bus-geo-map";
import { BUS_ROUTE_DIVERSION_DEMO } from "@/lib/tfl/fixtures/bus-route-diversion-demo";

export default function MapBusGeoDemo() {
  return (
    <div className="h-[min(70vh,32rem)] w-full overflow-hidden rounded-lg border border-border">
      <TflBusGeoMap data={BUS_ROUTE_DIVERSION_DEMO} />
    </div>
  );
}
