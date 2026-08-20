"use client"

import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import type { TransitGeometryBundle } from "@/lib/tfl/geography-types"
import { TRANSIT_GEOMETRY_PUBLIC_ASSETS } from "@/lib/tfl/geography-credits"

/**
 * Docs-only Leaflet vendor example — loads vendored OSM GeoJSON and renders
 * with Leaflet. No API key required (uses OSM tile server).
 */
export const LeafletExample = () => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const container = containerRef.current
    if (!container || mapRef.current) return

    let cancelled = false

    const map = L.map(container, {
      center: [51.51, -0.12],
      zoom: 10,
      zoomControl: true,
    })
    mapRef.current = map

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(map)

    const loadData = async () => {
      try {
        const bundles = await Promise.all(
          TRANSIT_GEOMETRY_PUBLIC_ASSETS.map(async (asset) => {
            const res = await fetch(asset.url)
            if (!res.ok) return null
            return (await res.json()) as TransitGeometryBundle
          })
        )
        if (cancelled) return

        for (const bundle of bundles) {
          if (!bundle) continue

          L.geoJSON(bundle.lines as GeoJSON.GeoJsonObject, {
            style: (feature) => ({
              color:
                (feature?.properties as Record<string, string> | null)?.color ??
                "#0019A8",
              weight: 3,
              opacity: 0.9,
            }),
          }).addTo(map)

          L.geoJSON(bundle.stations as GeoJSON.GeoJsonObject, {
            pointToLayer: (_feature, latlng) =>
              L.circleMarker(latlng, {
                radius: 3,
                fillColor: "#ffffff",
                color: "#111827",
                weight: 1.25,
                fillOpacity: 1,
              }),
          }).addTo(map)
        }
        setLoaded(true)
      } catch {
        /* noop for docs example */
      }
    }

    void loadData()

    return () => {
      cancelled = true
      map.remove()
      mapRef.current = null
    }
  }, [])

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="h-80 w-full overflow-hidden rounded-lg border border-border bg-muted"
        role="img"
        aria-label="Leaflet example with TfL transit lines"
      />
      <p className="text-xs text-muted-foreground">
        Leaflet · OpenStreetMap tiles · No API key required
        {loaded && " · Loaded"}
      </p>
    </div>
  )
}
