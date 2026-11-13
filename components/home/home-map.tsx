"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type maplibregl from "maplibre-gl"
import { TflGeographicMap } from "@/components/tfl/geography/tfl-geographic-map"
import type { LiveTrain } from "@/lib/tfl/homepage-live/engine"
import type { BusStopOverlay } from "@/lib/tfl/homepage-live/actions"
import { advanceTrainDisplay } from "@/lib/tfl/rail-train-tracker"
import {
  railPolylinesForLines,
  railVehicleColor,
} from "@/lib/tfl/rail-vehicle-geometry"
import type { VehiclePosition } from "@/lib/tfl/map-vehicles"
import { cn } from "@/lib/utils"

type LngLat = { lat: number; lon: number }

export type HomeMapProps = {
  trains: readonly LiveTrain[]
  station?: LngLat & { name: string }
  busStop?: BusStopOverlay
  /** A search result being looked at, before it is chosen. */
  preview?: LngLat | null
  activeKey: string | null
  selectedKey: string | null
  onSelectTrain: (key: string | null) => void
  /** A recorded frame is still: nothing coasts between polls. */
  still: boolean
  caption?: string
  /** A bus stop is the subject: show buses due, never a train count. `undefined` hides the chip until known. */
  busesDue?: number
  subject: "station" | "bus"
  className?: string
}

const OVERLAY = {
  pins: "home-pins",
  busRoutes: "home-bus-routes",
  halo: "home-train-halo",
  betaTags: "home-beta-tags",
} as const

const ALL_TRANSIT_CORES = [
  "tube",
  "overground",
  "elizabeth",
  "dlr",
  "tram",
].flatMap((mode) => [`${mode}-lines-core`, `${mode}-lines-casing`])

const usePrefersReducedMotion = () => {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    const media = matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduce(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])
  return reduce
}

const splitKey = (key: string) => {
  const at = key.indexOf("|")
  return { lineId: key.slice(0, at), vehicleId: key.slice(at + 1) }
}

const pinCollection = (
  station: HomeMapProps["station"],
  busStop: BusStopOverlay | undefined,
  preview: LngLat | null | undefined
) => {
  const pins: { kind: string; lat: number; lon: number }[] = []
  if (station) pins.push({ kind: "station", lat: station.lat, lon: station.lon })
  if (busStop?.stop.lat != null && busStop.stop.lon != null)
    pins.push({ kind: "bus", lat: busStop.stop.lat, lon: busStop.stop.lon })
  if (preview) pins.push({ kind: "preview", lat: preview.lat, lon: preview.lon })
  return {
    type: "FeatureCollection" as const,
    features: pins.map((p) => ({
      type: "Feature" as const,
      properties: { kind: p.kind },
      geometry: { type: "Point" as const, coordinates: [p.lon, p.lat] },
    })),
  }
}

const busRouteCollection = (busStop: BusStopOverlay | undefined) => ({
  type: "FeatureCollection" as const,
  features: (busStop?.routes ?? []).flatMap((route) =>
    route.lines.map((coordinates) => ({
      type: "Feature" as const,
      properties: { route: route.routeId },
      geometry: { type: "LineString" as const, coordinates },
    }))
  ),
})

export const HomeMap = ({
  trains,
  station,
  busStop,
  preview,
  activeKey,
  selectedKey,
  onSelectTrain,
  still,
  caption,
  busesDue,
  subject,
  className,
}: HomeMapProps) => {
  const reduce = usePrefersReducedMotion()
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [ready, setReady] = useState(false)
  const latest = useRef({ station, busStop, preview, activeKey, selectedKey, onSelectTrain })
  useEffect(() => {
    latest.current = { station, busStop, preview, activeKey, selectedKey, onSelectTrain }
  })

  const vehicles = useMemo<VehiclePosition[]>(
    () =>
      trains.flatMap((train) =>
        train.position
          ? [
              {
                ...train.position,
                color: railVehicleColor(train.lineId),
                ...(train.status === "beta" ? { beta: true } : {}),
              },
            ]
          : []
      ),
    [trains]
  )
  const lineIds = useMemo(
    () => [...new Set(trains.map((t) => t.lineId))].sort(),
    [trains]
  )
  const lineIdsKey = lineIds.join(",")
  const polylines = useMemo(
    () => railPolylinesForLines(lineIdsKey ? lineIdsKey.split(",") : []),
    [lineIdsKey]
  )

  /** Overlay layers survive until a style swap (dark mode) removes them; this puts them back. */
  const ensureOverlays = useCallback(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded() || !map.getLayer("rail-vehicles-outline")) return
    const now = latest.current
    if (!map.getSource(OVERLAY.busRoutes)) {
      map.addSource(OVERLAY.busRoutes, { type: "geojson", data: busRouteCollection(now.busStop) })
      map.addLayer(
        {
          id: `${OVERLAY.busRoutes}-casing`,
          type: "line",
          source: OVERLAY.busRoutes,
          paint: { "line-color": "#ffffff", "line-width": 7, "line-opacity": 0.9 },
          layout: { "line-cap": "round", "line-join": "round" },
        },
        "rail-vehicles-outline"
      )
      map.addLayer(
        {
          id: OVERLAY.busRoutes,
          type: "line",
          source: OVERLAY.busRoutes,
          paint: { "line-color": "#dc241f", "line-width": 4 },
          layout: { "line-cap": "round", "line-join": "round" },
        },
        "rail-vehicles-outline"
      )
    }
    if (!map.getLayer(OVERLAY.halo)) {
      map.addLayer(
        {
          id: OVERLAY.halo,
          type: "line",
          source: "rail-vehicles",
          filter: ["==", ["get", "vehicleId"], "__none__"],
          paint: { "line-color": "#0ea5e9", "line-width": 16, "line-opacity": 0.5 },
          layout: { "line-cap": "round" },
        },
        "rail-vehicles-outline"
      )
    }
    // Every estimated train carries its own tag, not only the count in the corner.
    if (!map.getLayer(OVERLAY.betaTags)) {
      map.addLayer({
        id: OVERLAY.betaTags,
        type: "symbol",
        source: "rail-vehicles",
        filter: [
          "all",
          ["==", ["get", "part"], "body"],
          ["==", ["get", "beta"], true],
        ],
        layout: {
          "symbol-placement": "line-center",
          "text-field": "Beta",
          "text-font": ["Noto Sans Regular"],
          "text-size": 11,
          "text-offset": [0, -1.4],
          "text-allow-overlap": true,
          "text-ignore-placement": true,
          "text-rotation-alignment": "viewport",
        },
        paint: {
          "text-color": "#374151",
          "text-halo-color": "#ffffff",
          "text-halo-width": 2,
        },
      })
    }
    if (!map.getSource(OVERLAY.pins)) {
      map.addSource(OVERLAY.pins, {
        type: "geojson",
        data: pinCollection(now.station, now.busStop, now.preview),
      })
      map.addLayer({
        id: OVERLAY.pins,
        type: "circle",
        source: OVERLAY.pins,
        paint: {
          "circle-radius": ["match", ["get", "kind"], "preview", 9, 11],
          "circle-color": [
            "match",
            ["get", "kind"],
            "bus",
            "#dc241f",
            "preview",
            "#ffffff",
            "#111827",
          ],
          "circle-stroke-color": [
            "match",
            ["get", "kind"],
            "preview",
            "#111827",
            "#ffffff",
          ],
          "circle-stroke-width": 3,
        },
      })
    }
  }, [])

  const handleReady = useCallback(
    (map: maplibregl.Map) => {
      mapRef.current = map
      map.on("click", "rail-vehicles", (event) => {
        const props = event.features?.[0]?.properties as
          | { lineId?: string; vehicleId?: string }
          | undefined
        if (props?.lineId && props.vehicleId)
          latest.current.onSelectTrain(`${props.lineId}|${props.vehicleId}`)
      })
      map.on("click", (event) => {
        const hit = map.queryRenderedFeatures(event.point, { layers: ["rail-vehicles"] })
        if (hit.length === 0) latest.current.onSelectTrain(null)
      })
      map.on("mouseenter", "rail-vehicles", () => (map.getCanvas().style.cursor = "pointer"))
      map.on("mouseleave", "rail-vehicles", () => (map.getCanvas().style.cursor = ""))
      map.on("style.load", ensureOverlays)
      map.on("idle", ensureOverlays)
      ensureOverlays()
      setReady(true)
    },
    [ensureOverlays]
  )

  // Overlays follow the selection.
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready) return
    ensureOverlays()
    ;(map.getSource(OVERLAY.pins) as maplibregl.GeoJSONSource | undefined)?.setData(
      pinCollection(station, busStop, preview)
    )
    ;(map.getSource(OVERLAY.busRoutes) as maplibregl.GeoJSONSource | undefined)?.setData(
      busRouteCollection(busStop)
    )
    // Tube and rail tracks step back while a bus stop is the subject.
    for (const id of ALL_TRANSIT_CORES)
      if (map.getLayer(id))
        map.setPaintProperty(id, "line-opacity", busStop ? 0.22 : 1)
  }, [ready, station, busStop, preview, ensureOverlays])

  // A train on the Board and its train on the map are the same highlighted thing.
  const highlighted = selectedKey ?? activeKey
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !map.getLayer(OVERLAY.halo)) return
    if (!highlighted) {
      map.setFilter(OVERLAY.halo, ["==", ["get", "vehicleId"], "__none__"])
      return
    }
    const { lineId, vehicleId } = splitKey(highlighted)
    map.setFilter(OVERLAY.halo, [
      "all",
      ["==", ["get", "lineId"], lineId],
      ["==", ["get", "vehicleId"], vehicleId],
    ])
  }, [ready, highlighted, vehicles])

  // Move the camera when the subject changes, not on every poll.
  const focus = busStop?.stop.lat != null && busStop.stop.lon != null
    ? { lat: busStop.stop.lat, lon: busStop.stop.lon }
    : station
  const focusKey = focus ? `${focus.lat.toFixed(5)},${focus.lon.toFixed(5)}` : ""
  useEffect(() => {
    const map = mapRef.current
    if (!map || !ready || !focus) return
    map.flyTo({
      center: [focus.lon, focus.lat],
      zoom: busStop ? 15 : 14,
      animate: !reduce && !still,
      essential: false,
    })
    // `focusKey` stands for the coordinates.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, focusKey, reduce])

  const betaCount = trains.filter((t) => t.status === "beta").length
  const selected = highlighted
    ? trains.find((t) => t.key === highlighted)
    : undefined

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[14px] border border-border/60",
        className
      )}
    >
      <TflGeographicMap
        vehicles={vehicles}
        vehiclePolylines={polylines}
        coast={!still && !reduce}
        advanceVehicle={advanceTrainDisplay}
        fitToLines={false}
        center={focus ? [focus.lon, focus.lat] : [-0.1238, 51.5308]}
        zoom={14}
        onMapReady={handleReady}
      />
      <div className="pointer-events-none absolute top-3 left-3 max-w-[calc(100%-4rem)] space-y-1 text-sm">
        {subject === "station" ? (
          <p className="inline-block bg-background/90 px-3 py-1.5 text-foreground">
            {trains.length} {trains.length === 1 ? "train" : "trains"} within 10 min
            {betaCount ? ` · ${betaCount} Beta` : ""}
          </p>
        ) : busesDue != null ? (
          <p className="inline-block bg-background/90 px-3 py-1.5 text-foreground">
            {busesDue} {busesDue === 1 ? "bus" : "buses"} due within 10 min
          </p>
        ) : null}
        {betaCount ? (
          <p className="block w-fit bg-background/90 px-3 py-1 text-xs text-muted-foreground">
            Beta trains are estimated from arrival times.
          </p>
        ) : null}
        {caption ? (
          <p className="block w-fit bg-background/90 px-3 py-1 text-xs text-muted-foreground">
            {caption}
          </p>
        ) : null}
      </div>
      {selected ? (
        <p
          className="pointer-events-none absolute bottom-8 left-3 max-w-[calc(100%-1.5rem)] bg-background/95 px-3 py-2 text-sm text-balance"
          role="status"
        >
          {selected.destinationName.replace(/ (Underground|Rail|DLR) Station$/i, "")}
          {selected.nextStopEtaSec != null
            ? ` · next stop in ${Math.max(1, Math.round(selected.nextStopEtaSec / 60))} min`
            : ""}
          {selected.status === "beta" ? " · Beta" : ""}
        </p>
      ) : null}
    </div>
  )
}
