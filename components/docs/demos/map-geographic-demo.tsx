"use client";

import { TflGeographicMap } from "@/components/tfl/geography/tfl-geographic-map";

export default function MapGeographicDemo() {
  return (
    <div className="h-[min(70vh,32rem)] w-full overflow-hidden rounded-lg border border-border">
      <TflGeographicMap />
    </div>
  );
}
