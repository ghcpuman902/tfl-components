"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import type { CycleHireDock } from "@/lib/tfl/cycle-hire-types";
import { CYCLE_HIRE_MAP_HOME_FRAME_CLASSNAME } from "@/components/tfl/cycle-hire/cycle-hire-map-camera";

const MapFillSkeleton = () => (
  <div className="size-full animate-pulse bg-muted" aria-hidden />
);

const CycleHireDocksMap = dynamic(
  () =>
    import("@/components/tfl/cycle-hire/cycle-hire-docks").then(
      (mod) => mod.CycleHireDocksMap,
    ),
  {
    ssr: false,
    loading: () => <MapFillSkeleton />,
  },
);

type HomeCycleHireMapProps = {
  data: readonly CycleHireDock[];
  className?: string;
  markerSize?: number;
  showNavigation?: boolean;
};

/**
 * Homepage-only lazy MapLibre surface — keeps the heavy SDK off the first JS.
 * Parent owns the arrivals-rhythm frame so skeleton and map share one size.
 */
export const HomeCycleHireMap = ({
  data,
  className,
  markerSize = 28,
  showNavigation = false,
}: HomeCycleHireMapProps) => (
  <div
    className={cn(
      CYCLE_HIRE_MAP_HOME_FRAME_CLASSNAME,
      "border border-border bg-muted",
      className,
    )}
  >
    <CycleHireDocksMap
      data={data}
      className="size-full max-h-none aspect-auto border-0"
      markerSize={markerSize}
      showNavigation={showNavigation}
    />
  </div>
);
