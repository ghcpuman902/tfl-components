"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import type { CycleHireDock } from "@/lib/tfl/cycle-hire-types";

const CYCLE_HIRE_MAP_HEIGHT_CLASS = "h-[calc(var(--arrivals-row)*6)]";

const MapSkeleton = ({ className }: { className?: string }) => (
  <div
    className={cn(
      "w-full animate-pulse border border-border bg-muted",
      CYCLE_HIRE_MAP_HEIGHT_CLASS,
      className,
    )}
    aria-hidden
  />
);

const CycleHireDocksMap = dynamic(
  () =>
    import("@/components/tfl/cycle-hire/cycle-hire-docks").then(
      (mod) => mod.CycleHireDocksMap,
    ),
  {
    ssr: false,
    loading: () => <MapSkeleton />,
  },
);

type HomeCycleHireMapProps = {
  data: readonly CycleHireDock[];
  className?: string;
  markerSize?: number;
  showNavigation?: boolean;
  fitPadding?:
    | number
    | { top: number; bottom: number; left: number; right: number };
};

/** Homepage-only lazy MapLibre surface — keeps the heavy SDK off the first JS. */
export const HomeCycleHireMap = ({
  data,
  className,
  markerSize = 28,
  showNavigation = false,
  fitPadding = { top: 16, right: 28, bottom: 64, left: 28 },
}: HomeCycleHireMapProps) => (
  <CycleHireDocksMap
    data={data}
    className={className}
    markerSize={markerSize}
    showNavigation={showNavigation}
    fitPadding={fitPadding}
  />
);
