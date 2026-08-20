"use client"

import dynamic from "next/dynamic"

const PreviewSkeleton = () => (
  <div
    className="h-[min(70vh,32rem)] animate-pulse rounded-lg bg-muted"
    aria-hidden
  />
)

const VendorSkeleton = () => (
  <div className="h-80 animate-pulse rounded-lg bg-muted" aria-hidden />
)

/**
 * Docs-only lazy map surfaces — MapLibre/Leaflet/Mapbox/Google Maps need
 * `ssr: false`, which Next.js only allows inside a Client Component.
 */
export const MapGeographicDemo = dynamic(
  () => import("@/components/docs/demos/map-geographic-demo"),
  { ssr: false, loading: PreviewSkeleton }
)

export const MapLibreExample = dynamic(
  () =>
    import("@/components/docs/vendor-maps/maplibre-example").then((m) => ({
      default: m.MapLibreExample,
    })),
  { ssr: false, loading: VendorSkeleton }
)

export const LeafletExample = dynamic(
  () =>
    import("@/components/docs/vendor-maps/leaflet-example").then((m) => ({
      default: m.LeafletExample,
    })),
  { ssr: false, loading: VendorSkeleton }
)

export const MapboxExample = dynamic(
  () =>
    import("@/components/docs/vendor-maps/mapbox-example").then((m) => ({
      default: m.MapboxExample,
    })),
  { ssr: false, loading: VendorSkeleton }
)

export const GoogleMapsExample = dynamic(
  () =>
    import("@/components/docs/vendor-maps/google-maps-example").then((m) => ({
      default: m.GoogleMapsExample,
    })),
  { ssr: false, loading: VendorSkeleton }
)
