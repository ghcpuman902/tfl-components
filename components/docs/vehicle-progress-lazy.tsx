"use client";

import dynamic from "next/dynamic";

const PreviewSkeleton = () => (
  <div
    className="h-[min(70vh,32rem)] animate-pulse rounded-lg bg-muted"
    aria-hidden
  />
);

export const VehicleProgressDemo = dynamic(
  () => import("@/components/docs/demos/vehicle-progress-demo"),
  { ssr: false, loading: PreviewSkeleton },
);
