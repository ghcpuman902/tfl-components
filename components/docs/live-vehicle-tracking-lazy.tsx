"use client";

import dynamic from "next/dynamic";

const PreviewSkeleton = () => (
  <div
    className="h-[min(70vh,32rem)] animate-pulse rounded-lg bg-muted"
    aria-hidden
  />
);

export const LiveRailVehiclesDemo = dynamic(
  () => import("@/components/docs/demos/live-rail-vehicles-demo"),
  { ssr: false, loading: PreviewSkeleton },
);

export const LiveBusVehiclesDemo = dynamic(
  () => import("@/components/docs/demos/live-bus-vehicles-demo"),
  { ssr: false, loading: PreviewSkeleton },
);
