"use client"

import dynamic from "next/dynamic"

const PreviewSkeleton = () => (
  <div
    className="h-[min(70vh,32rem)] animate-pulse rounded-lg bg-muted"
    aria-hidden
  />
)

export const MapBusGeoDemo = dynamic(
  () => import("@/components/docs/demos/map-bus-geo-demo"),
  { ssr: false, loading: PreviewSkeleton }
)
