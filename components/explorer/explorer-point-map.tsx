"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { createRoot, type Root } from "react-dom/client"
import maplibregl from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useDocumentDark } from "@/hooks/use-document-dark"
import { openFreeMapStyleUrl } from "@/lib/tfl/geography-credits"
import { provideMissingStyleImages } from "@/components/tfl/maps/provide-missing-style-images"
import { TFL_MODAL_COLOURS } from "@/lib/tfl/brand-colours"
import {
  MAP_SEARCH_RADIUS_METERS,
  circleBounds,
  circlePolygon,
  fractionOutsideCircle,
  pointsCentroid,
} from "@/lib/tfl/geo"
import type { ExplorerPoint } from "@/lib/tfl/explorer-point-normalise"
import { CycleHireDockMarker } from "@/components/tfl/cycle-hire/cycle-hire-dock-marker"
import type { CycleHireDock } from "@/lib/tfl/cycle-hire-types"

const LONDON_CENTER: [number, number] = [-0.128, 51.508]
const FALLBACK_ZOOM = 12
const SELECTED_ZOOM = 15
const SEARCH_FIT_MAX_ZOOM = 17
const SOURCE_ID = "explorer-points"
const LAYER_ID = "explorer-points-circle"
const LABEL_LAYER_ID = "explorer-points-label"
const SELECTED_LABEL_LAYER_ID = "explorer-points-label-selected"
const SEARCH_SOURCE_ID = "explorer-search-circle"
const SEARCH_FILL_ID = "explorer-search-circle-fill"
const SEARCH_LINE_ID = "explorer-search-circle-line"
const BUS_RED = TFL_MODAL_COLOURS.buses.hex
const CYCLE_MARKER_SIZE = 32
const CYCLE_SELECTED_SIZE = 44
const MARKER_Z_SELECTED = "4"
const MARKER_Z_DEFAULT = "1"
/** Show Search here once this share of the viewport sits outside the result circle. */
const SEARCH_HERE_OUTSIDE_FRACTION = 0.4
const VIEWPORT_SAMPLE_GRID = 12

/**
 * Lucide `mars` arrow (v1.31.0) — the male-symbol pointer outside the circle.
 * Circle is the stop-letter disc; this is only the protruding arrow.
 * Default Lucide orientation is NE; SVG rotates −45° so 0° is north.
 */
const LUCIDE_MARS_ARROW_PATHS = `
  <path d="M16 3h5v5"/>
  <path d="m21 3-6.75 6.75"/>
`

type ExplorerPointMapProps = {
  points: readonly ExplorerPoint[]
  selectedId?: string | null
  onSelect: (point: ExplorerPoint) => void
  className?: string
  /** Omit to hide the Search here control (Tube & rail catalog map). */
  onSearchHere?: (center: { lat: number; lon: number }) => void
  searchRadiusMeters?: number
  searchHereLoading?: boolean
  /** Bump after a map-centre search so the camera fits the radius circle. */
  fitSearchKey?: number
  searchOrigin?: { lat: number; lon: number } | null
}

type PointFeatureProperties = {
  id: string
  name: string
  selected: boolean
  marker: "bus" | "cycle" | "station"
  stopLetter: string
  bearing?: number
}

const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined") return false
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

const isBusPoint = (point: ExplorerPoint): boolean =>
  point.modes?.includes("bus") === true

const isCyclePoint = (point: ExplorerPoint): boolean =>
  point.kind === "bikePoint"

const emptyCollection = {
  type: "FeatureCollection" as const,
  features: [] as {
    type: "Feature"
    properties: Record<string, never>
    geometry: ReturnType<typeof circlePolygon>
  }[],
}

const searchCircleCollection = (
  lon: number,
  lat: number,
  radiusMeters: number
) => ({
  type: "FeatureCollection" as const,
  features: [
    {
      type: "Feature" as const,
      properties: {},
      geometry: circlePolygon(lon, lat, radiusMeters),
    },
  ],
})

const setSearchCircleData = (
  map: maplibregl.Map,
  lon: number | null,
  lat: number | null,
  radiusMeters: number
) => {
  const source = map.getSource(SEARCH_SOURCE_ID) as
    maplibregl.GeoJSONSource | undefined
  if (!source) return
  if (lon == null || lat == null) {
    source.setData(emptyCollection)
    return
  }
  source.setData(searchCircleCollection(lon, lat, radiusMeters))
}

const paintSearchCircle = (
  map: maplibregl.Map,
  options: {
    enabled: boolean
    previewAtCenter: boolean
    searchOrigin: { lat: number; lon: number } | null | undefined
    points: readonly ExplorerPoint[]
    radiusMeters: number
  }
) => {
  if (!options.enabled) {
    setSearchCircleData(map, null, null, options.radiusMeters)
    return
  }
  if (options.previewAtCenter) {
    const centre = map.getCenter()
    setSearchCircleData(map, centre.lng, centre.lat, options.radiusMeters)
    return
  }
  const origin = resultCircleOrigin(options.searchOrigin, options.points)
  if (!origin) {
    setSearchCircleData(map, null, null, options.radiusMeters)
    return
  }
  setSearchCircleData(map, origin.lon, origin.lat, options.radiusMeters)
}

const setMarkerZIndex = (element: HTMLElement, selected: boolean) => {
  element.style.zIndex = selected ? MARKER_Z_SELECTED : MARKER_Z_DEFAULT
}

const resultCircleOrigin = (
  searchOrigin: { lat: number; lon: number } | null | undefined,
  points: readonly ExplorerPoint[]
): { lat: number; lon: number } | null => searchOrigin ?? pointsCentroid(points)

const viewportSamplePoints = (
  map: maplibregl.Map,
  samples = VIEWPORT_SAMPLE_GRID
): { lat: number; lon: number }[] => {
  const width = map.getCanvas().clientWidth
  const height = map.getCanvas().clientHeight
  if (width < 2 || height < 2) return []
  const out: { lat: number; lon: number }[] = []
  for (let row = 0; row < samples; row++) {
    const y = ((row + 0.5) / samples) * height
    for (let col = 0; col < samples; col++) {
      const x = ((col + 0.5) / samples) * width
      const lngLat = map.unproject([x, y])
      out.push({ lat: lngLat.lat, lon: lngLat.lng })
    }
  }
  return out
}

const viewIsOutsideResultCircle = (
  map: maplibregl.Map,
  origin: { lat: number; lon: number } | null,
  radiusMeters: number
): boolean => {
  if (!origin) return true
  return (
    fractionOutsideCircle(viewportSamplePoints(map), {
      lat: origin.lat,
      lon: origin.lon,
      radiusMeters,
    }) > SEARCH_HERE_OUTSIDE_FRACTION
  )
}

const stationCirclePaint = (dark: boolean) =>
  ({
    "circle-radius": ["case", ["boolean", ["get", "selected"], false], 7, 4],
    "circle-color": dark ? "#111827" : "#ffffff",
    "circle-stroke-width": [
      "case",
      ["boolean", ["get", "selected"], false],
      2,
      1.25,
    ],
    "circle-stroke-color": dark ? "#ffffff" : "#111827",
  }) as maplibregl.CircleLayerSpecification["paint"]

const stationLabelPaint = (dark: boolean) =>
  ({
    "text-color": dark ? "#ffffff" : "#111827",
    "text-halo-color": dark ? "#111827" : "#ffffff",
    "text-halo-width": 1.6,
  }) as maplibregl.SymbolLayerSpecification["paint"]

const labelLayout = (
  selected: boolean
): maplibregl.SymbolLayerSpecification["layout"] => ({
  "text-field": ["coalesce", ["get", "name"], ""],
  "text-font": ["Noto Sans Regular"],
  "text-size": selected ? 12 : 11,
  // Prefer below the pin; flip above when the bottom strip / other labels collide.
  "text-variable-anchor": ["top", "bottom"],
  "text-radial-offset": [
    "case",
    [
      "all",
      ["==", ["get", "marker"], "cycle"],
      ["boolean", ["get", "selected"], false],
    ],
    2.05,
    ["==", ["get", "marker"], "cycle"],
    1.55,
    ["==", ["get", "marker"], "bus"],
    1.5,
    1.15,
  ],
  "text-justify": "auto",
  "text-max-width": 8,
  "text-padding": 2,
  "text-optional": !selected,
  "text-allow-overlap": selected,
  "text-ignore-placement": selected,
})

const searchCirclePaint = (dark: boolean) => {
  const ink = dark ? "#ffffff" : "#111827"
  return {
    fill: {
      "fill-color": ink,
      "fill-opacity": 0.07,
    } satisfies maplibregl.FillLayerSpecification["paint"],
    line: {
      "line-color": ink,
      "line-opacity": 0.45,
      "line-width": 1.5,
      "line-dasharray": [2, 1.5],
    } satisfies maplibregl.LineLayerSpecification["paint"],
  }
}

const addExplorerLayers = (map: maplibregl.Map, dark: boolean) => {
  if (!map.getSource(SEARCH_SOURCE_ID)) {
    map.addSource(SEARCH_SOURCE_ID, {
      type: "geojson",
      data: emptyCollection,
    })
  }
  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, {
      type: "geojson",
      data: emptyCollection,
    })
  }

  const searchPaint = searchCirclePaint(dark)
  if (!map.getLayer(SEARCH_FILL_ID)) {
    map.addLayer({
      id: SEARCH_FILL_ID,
      type: "fill",
      source: SEARCH_SOURCE_ID,
      paint: searchPaint.fill,
    })
  }
  if (!map.getLayer(SEARCH_LINE_ID)) {
    map.addLayer({
      id: SEARCH_LINE_ID,
      type: "line",
      source: SEARCH_SOURCE_ID,
      paint: searchPaint.line,
    })
  }

  if (!map.getLayer(LAYER_ID)) {
    map.addLayer({
      id: LAYER_ID,
      type: "circle",
      source: SOURCE_ID,
      filter: ["==", ["get", "marker"], "station"],
      paint: stationCirclePaint(dark),
      layout: {
        "circle-sort-key": [
          "case",
          ["boolean", ["get", "selected"], false],
          1,
          0,
        ],
      },
    })
  }

  if (!map.getLayer(LABEL_LAYER_ID)) {
    map.addLayer({
      id: LABEL_LAYER_ID,
      type: "symbol",
      source: SOURCE_ID,
      filter: ["!", ["boolean", ["get", "selected"], false]],
      layout: labelLayout(false),
      paint: stationLabelPaint(dark),
    })
  }

  if (!map.getLayer(SELECTED_LABEL_LAYER_ID)) {
    map.addLayer({
      id: SELECTED_LABEL_LAYER_ID,
      type: "symbol",
      source: SOURCE_ID,
      filter: ["boolean", ["get", "selected"], false],
      layout: labelLayout(true),
      paint: {
        ...stationLabelPaint(dark),
        "text-halo-width": 2,
      },
    })
  }
}

const selectPointFromEvent = (
  event: maplibregl.MapLayerMouseEvent,
  points: readonly ExplorerPoint[],
  onSelect: (point: ExplorerPoint) => void
) => {
  const id = event.features?.[0]?.properties?.id as string | undefined
  if (!id) return
  const point = points.find((entry) => entry.id === id)
  if (point) onSelect(point)
}

const toExplorerGeojson = (
  points: readonly ExplorerPoint[],
  selectedId?: string | null
) => ({
  type: "FeatureCollection" as const,
  features: points
    .filter(
      (point) => typeof point.lat === "number" && typeof point.lon === "number"
    )
    .map((point) => {
      const bus = isBusPoint(point)
      const cycle = isCyclePoint(point)
      const properties: PointFeatureProperties = {
        id: point.id,
        name: point.name,
        selected: point.id === selectedId,
        marker: bus ? "bus" : cycle ? "cycle" : "station",
        stopLetter: bus ? (point.stopLetter ?? "") : "",
      }
      if (bus && point.compassBearingDegrees !== undefined) {
        properties.bearing = point.compassBearingDegrees
      }
      return {
        type: "Feature" as const,
        id: point.id,
        properties,
        geometry: {
          type: "Point" as const,
          coordinates: [point.lon!, point.lat!] as [number, number],
        },
      }
    }),
})

const createBusStopMarkerElement = (
  point: ExplorerPoint,
  selected: boolean,
  onSelect: (point: ExplorerPoint) => void
): HTMLButtonElement => {
  const button = document.createElement("button")
  button.type = "button"
  button.className =
    "relative flex size-9 cursor-pointer items-center justify-center overflow-visible border-0 bg-transparent p-0"
  const letter = point.stopLetter ?? ""
  button.setAttribute(
    "aria-label",
    [
      point.name,
      letter ? `stop ${letter}` : null,
      point.towards ? `towards ${point.towards}` : null,
    ]
      .filter(Boolean)
      .join(", ")
  )

  if (point.compassBearingDegrees !== undefined) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    svg.setAttribute("viewBox", "0 0 24 24")
    svg.setAttribute("aria-hidden", "true")
    svg.setAttribute(
      "class",
      "pointer-events-none absolute inset-0 overflow-visible"
    )
    svg.style.transform = `rotate(${point.compassBearingDegrees}deg)`
    svg.innerHTML = `
      <g transform="translate(12,12) rotate(-45) scale(1.45) translate(-10,-14)" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <g stroke="#ffffff" stroke-width="3.25">${LUCIDE_MARS_ARROW_PATHS}</g>
        <g stroke="${BUS_RED}" stroke-width="2">${LUCIDE_MARS_ARROW_PATHS}</g>
      </g>
    `
    button.append(svg)
  }

  const disc = document.createElement("span")
  const pair = letter.length > 1
  disc.className = cn(
    "relative z-1 inline-flex items-center justify-center rounded-full font-bold text-white",
    selected && "ring-2 ring-background ring-offset-1 ring-offset-transparent",
    pair
      ? selected
        ? "h-7 min-w-7 px-1"
        : "h-6 min-w-6 px-1"
      : selected
        ? "size-7"
        : "size-6"
  )
  disc.style.backgroundColor = BUS_RED
  const glyph = document.createElement("span")
  glyph.className = pair
    ? "text-[9px] tracking-tighter"
    : "text-[11px] leading-none"
  glyph.textContent = letter
  disc.append(glyph)
  button.append(disc)

  button.addEventListener("click", (event) => {
    event.stopPropagation()
    onSelect(point)
  })
  return button
}

const syncBusMarkers = (
  map: maplibregl.Map,
  points: readonly ExplorerPoint[],
  selectedId: string | null | undefined,
  onSelect: (point: ExplorerPoint) => void,
  markers: Map<string, maplibregl.Marker>
) => {
  const busPoints = points.filter(
    (point) =>
      isBusPoint(point) &&
      typeof point.lat === "number" &&
      typeof point.lon === "number"
  )
  const nextIds = new Set(busPoints.map((point) => point.id))
  for (const [id, marker] of markers) {
    if (nextIds.has(id)) continue
    marker.remove()
    markers.delete(id)
  }
  for (const point of busPoints) {
    const existing = markers.get(point.id)
    existing?.remove()
    const marker = new maplibregl.Marker({
      element: createBusStopMarkerElement(
        point,
        point.id === selectedId,
        onSelect
      ),
      anchor: "center",
    })
      .setLngLat([point.lon!, point.lat!])
      .addTo(map)
    setMarkerZIndex(marker.getElement(), point.id === selectedId)
    markers.set(point.id, marker)
  }
}

const toCycleDock = (point: ExplorerPoint): CycleHireDock => {
  const bikes = point.bikes ?? 0
  const eBikes = point.eBikes ?? 0
  const spaces = point.spaces ?? 0
  return {
    id: point.id,
    name: point.name,
    bikes,
    eBikes,
    spaces,
    docks: bikes + spaces,
    brokenDocks: 0,
    standardBikes: Math.max(0, bikes - eBikes),
    lat: point.lat,
    lon: point.lon,
  }
}

const ExplorerCyclePin = ({
  point,
  selected,
}: {
  point: ExplorerPoint
  selected: boolean
}) => {
  const size = selected ? CYCLE_SELECTED_SIZE : CYCLE_MARKER_SIZE
  return (
    <button
      type="button"
      aria-label={point.name}
      className="relative block cursor-pointer border-0 bg-transparent p-0"
      style={{ width: size, height: size }}
    >
      <CycleHireDockMarker dock={toCycleDock(point)} size={size} />
    </button>
  )
}

type CycleMarkerEntry = {
  marker: maplibregl.Marker
  root: Root
  point: ExplorerPoint
  onSelect: (point: ExplorerPoint) => void
}

const disposeCycleMarker = (entry: CycleMarkerEntry) => {
  entry.marker.remove()
  queueMicrotask(() => {
    entry.root.unmount()
  })
}

const paintCycleMarker = (entry: CycleMarkerEntry, selected: boolean) => {
  entry.root.render(
    <ExplorerCyclePin point={entry.point} selected={selected} />
  )
}

const syncCycleMarkers = (
  map: maplibregl.Map,
  points: readonly ExplorerPoint[],
  selectedId: string | null | undefined,
  onSelect: (point: ExplorerPoint) => void,
  markers: Map<string, CycleMarkerEntry>
) => {
  const cyclePoints = points.filter(
    (point) =>
      isCyclePoint(point) &&
      typeof point.lat === "number" &&
      typeof point.lon === "number"
  )
  const nextIds = new Set(cyclePoints.map((point) => point.id))
  for (const [id, entry] of markers) {
    if (nextIds.has(id)) continue
    disposeCycleMarker(entry)
    markers.delete(id)
  }
  for (const point of cyclePoints) {
    const selected = point.id === selectedId
    const existing = markers.get(point.id)
    if (existing) {
      existing.point = point
      existing.onSelect = onSelect
      existing.marker.setLngLat([point.lon!, point.lat!])
      setMarkerZIndex(existing.marker.getElement(), selected)
      paintCycleMarker(existing, selected)
      continue
    }
    const el = document.createElement("div")
    const root = createRoot(el)
    const marker = new maplibregl.Marker({ element: el, anchor: "center" })
      .setLngLat([point.lon!, point.lat!])
      .addTo(map)
    setMarkerZIndex(el, selected)
    const entry: CycleMarkerEntry = { marker, root, point, onSelect }
    el.addEventListener("click", (event) => {
      event.stopPropagation()
      const current = markers.get(point.id)
      current?.onSelect(current.point)
    })
    paintCycleMarker(entry, selected)
    markers.set(point.id, entry)
  }
}

/**
 * Explorer-owned MapLibre adapter.
 * Station points use circle + name layers. Bus stops use a red letter disc and
 * a Lucide Mars arrow aimed at the stop bearing. Cycle docks use the occupancy
 * ring marker; the selected dock is larger and its label always paints.
 * always paints. Name labels prefer below, then flip above on collision.
 * Panning does not fetch — Search here asks the parent to query 400m.
 */
export const ExplorerPointMap = ({
  points,
  selectedId,
  onSelect,
  className,
  onSearchHere,
  searchRadiusMeters = MAP_SEARCH_RADIUS_METERS,
  searchHereLoading = false,
  fitSearchKey = 0,
  searchOrigin = null,
}: ExplorerPointMapProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const onSelectRef = useRef(onSelect)
  const onSearchHereRef = useRef(onSearchHere)
  const pointsRef = useRef(points)
  const selectedIdRef = useRef(selectedId)
  const geojsonRef = useRef<ReturnType<typeof toExplorerGeojson> | null>(null)
  const busMarkersRef = useRef(new Map<string, maplibregl.Marker>())
  const cycleMarkersRef = useRef(new Map<string, CycleMarkerEntry>())
  const programmaticMoveRef = useRef(false)
  const userGestureRef = useRef(false)
  const skipFollowSelectedRef = useRef(false)
  const lastFitKeyRef = useRef(0)
  const showSearchHereRef = useRef(false)
  const searchOriginRef = useRef(searchOrigin)
  const searchRadiusRef = useRef(searchRadiusMeters)
  const dark = useDocumentDark()
  const skipStyleSwapRef = useRef(true)
  const [showSearchHere, setShowSearchHere] = useState(false)
  const [fitKeySeen, setFitKeySeen] = useState(fitSearchKey)
  const [pointsSeen, setPointsSeen] = useState(points)
  if (fitSearchKey !== fitKeySeen) {
    setFitKeySeen(fitSearchKey)
    if (showSearchHere) setShowSearchHere(false)
  }
  if (points !== pointsSeen) {
    setPointsSeen(points)
    if (showSearchHere) setShowSearchHere(false)
  }

  useEffect(() => {
    onSelectRef.current = onSelect
  }, [onSelect])

  useEffect(() => {
    onSearchHereRef.current = onSearchHere
  }, [onSearchHere])

  useEffect(() => {
    pointsRef.current = points
  }, [points])

  useEffect(() => {
    showSearchHereRef.current = showSearchHere
  }, [showSearchHere])

  useEffect(() => {
    selectedIdRef.current = selectedId
  }, [selectedId])

  useEffect(() => {
    searchOriginRef.current = searchOrigin
  }, [searchOrigin])

  useEffect(() => {
    searchRadiusRef.current = searchRadiusMeters
  }, [searchRadiusMeters])

  const geojson = useMemo(
    () => toExplorerGeojson(points, selectedId),
    [points, selectedId]
  )

  useEffect(() => {
    geojsonRef.current = geojson
  }, [geojson])

  useEffect(() => {
    const container = containerRef.current
    if (!container || mapRef.current) return

    const map = new maplibregl.Map({
      container,
      style: openFreeMapStyleUrl(dark),
      center: LONDON_CENTER,
      zoom: FALLBACK_ZOOM,
      attributionControl: { compact: true },
      cooperativeGestures: true,
    })
    provideMissingStyleImages(map)

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right"
    )

    const handlePointClick = (event: maplibregl.MapLayerMouseEvent) => {
      selectPointFromEvent(event, pointsRef.current, onSelectRef.current)
    }

    const handleEnter = () => {
      map.getCanvas().style.cursor = "pointer"
    }
    const handleLeave = () => {
      map.getCanvas().style.cursor = ""
    }

    const handleMoveStart = (event: maplibregl.MapLibreEvent) => {
      if (event.originalEvent) userGestureRef.current = true
    }

    const handleMove = () => {
      if (!showSearchHereRef.current || !onSearchHereRef.current) return
      const centre = map.getCenter()
      setSearchCircleData(map, centre.lng, centre.lat, searchRadiusRef.current)
    }

    const handleMoveEnd = () => {
      if (programmaticMoveRef.current) {
        programmaticMoveRef.current = false
        skipFollowSelectedRef.current = false
        userGestureRef.current = false
        return
      }
      if (userGestureRef.current && onSearchHereRef.current) {
        const origin = resultCircleOrigin(
          searchOriginRef.current,
          pointsRef.current
        )
        const show = viewIsOutsideResultCircle(
          map,
          origin,
          searchRadiusRef.current
        )
        setShowSearchHere(show)
        paintSearchCircle(map, {
          enabled: true,
          previewAtCenter: show,
          searchOrigin: searchOriginRef.current,
          points: pointsRef.current,
          radiusMeters: searchRadiusRef.current,
        })
      }
      userGestureRef.current = false
    }

    const busMarkers = busMarkersRef.current
    const cycleMarkers = cycleMarkersRef.current

    map.on("load", () => {
      addExplorerLayers(map, dark)
      const source = map.getSource(SOURCE_ID) as
        maplibregl.GeoJSONSource | undefined
      if (geojsonRef.current) source?.setData(geojsonRef.current)
      syncBusMarkers(
        map,
        pointsRef.current,
        selectedIdRef.current,
        onSelectRef.current,
        busMarkers
      )
      syncCycleMarkers(
        map,
        pointsRef.current,
        selectedIdRef.current,
        onSelectRef.current,
        cycleMarkers
      )
      paintSearchCircle(map, {
        enabled: Boolean(onSearchHereRef.current),
        previewAtCenter: false,
        searchOrigin: searchOriginRef.current,
        points: pointsRef.current,
        radiusMeters: searchRadiusRef.current,
      })
      map.on("click", LAYER_ID, handlePointClick)
      map.on("click", LABEL_LAYER_ID, handlePointClick)
      map.on("click", SELECTED_LABEL_LAYER_ID, handlePointClick)
      map.on("mouseenter", LAYER_ID, handleEnter)
      map.on("mouseenter", LABEL_LAYER_ID, handleEnter)
      map.on("mouseenter", SELECTED_LABEL_LAYER_ID, handleEnter)
      map.on("mouseleave", LAYER_ID, handleLeave)
      map.on("mouseleave", LABEL_LAYER_ID, handleLeave)
      map.on("mouseleave", SELECTED_LABEL_LAYER_ID, handleLeave)
      map.on("movestart", handleMoveStart)
      map.on("move", handleMove)
      map.on("moveend", handleMoveEnd)
    })

    mapRef.current = map

    return () => {
      for (const marker of busMarkers.values()) {
        marker.remove()
      }
      busMarkers.clear()
      for (const entry of cycleMarkers.values()) {
        disposeCycleMarker(entry)
      }
      cycleMarkers.clear()
      map.remove()
      mapRef.current = null
    }
    // Mount once — theme swaps via setStyle below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (skipStyleSwapRef.current) {
      skipStyleSwapRef.current = false
      return
    }

    const applyStyle = () => {
      addExplorerLayers(map, dark)
      const source = map.getSource(SOURCE_ID) as
        maplibregl.GeoJSONSource | undefined
      if (geojsonRef.current) source?.setData(geojsonRef.current)
      syncBusMarkers(
        map,
        pointsRef.current,
        selectedIdRef.current,
        onSelectRef.current,
        busMarkersRef.current
      )
      syncCycleMarkers(
        map,
        pointsRef.current,
        selectedIdRef.current,
        onSelectRef.current,
        cycleMarkersRef.current
      )
      paintSearchCircle(map, {
        enabled: Boolean(onSearchHereRef.current),
        previewAtCenter: showSearchHereRef.current,
        searchOrigin: searchOriginRef.current,
        points: pointsRef.current,
        radiusMeters: searchRadiusRef.current,
      })
    }

    map.setStyle(openFreeMapStyleUrl(dark))
    map.once("style.load", applyStyle)
    return () => {
      map.off("style.load", applyStyle)
    }
  }, [dark])

  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const updateSource = () => {
      const source = map.getSource(SOURCE_ID) as
        maplibregl.GeoJSONSource | undefined
      source?.setData(geojson)
      syncBusMarkers(
        map,
        points,
        selectedId,
        onSelectRef.current,
        busMarkersRef.current
      )
      syncCycleMarkers(
        map,
        points,
        selectedId,
        onSelectRef.current,
        cycleMarkersRef.current
      )
    }

    if (map.isStyleLoaded()) {
      updateSource()
    } else {
      map.once("load", updateSource)
    }
  }, [geojson, points, selectedId])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !map.isStyleLoaded()) return
    paintSearchCircle(map, {
      enabled: Boolean(onSearchHere),
      previewAtCenter: showSearchHere,
      searchOrigin,
      points,
      radiusMeters: searchRadiusMeters,
    })
  }, [points, searchOrigin, searchRadiusMeters, onSearchHere, showSearchHere])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !fitSearchKey || fitSearchKey === lastFitKeyRef.current) {
      return
    }
    lastFitKeyRef.current = fitSearchKey
    const origin = searchOrigin ?? {
      lat: map.getCenter().lat,
      lon: map.getCenter().lng,
    }
    skipFollowSelectedRef.current = true
    programmaticMoveRef.current = true
    const duration = prefersReducedMotion() ? 0 : 500
    map.fitBounds(circleBounds(origin.lon, origin.lat, searchRadiusMeters), {
      padding: 36,
      maxZoom: SEARCH_FIT_MAX_ZOOM,
      duration,
    })
  }, [fitSearchKey, searchOrigin, searchRadiusMeters])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedId) return
    if (skipFollowSelectedRef.current) return
    const selected = points.find((point) => point.id === selectedId)
    if (
      !selected ||
      typeof selected.lat !== "number" ||
      typeof selected.lon !== "number"
    ) {
      return
    }

    programmaticMoveRef.current = true
    const duration = prefersReducedMotion() ? 0 : 500
    map.easeTo({
      center: [selected.lon, selected.lat],
      zoom: Math.max(map.getZoom(), SELECTED_ZOOM),
      duration,
    })
  }, [selectedId, points])

  const handleSearchHereClick = () => {
    const map = mapRef.current
    if (!map || !onSearchHere) return
    const centre = map.getCenter()
    onSearchHere({ lat: centre.lat, lon: centre.lng })
  }

  return (
    <div
      className={cn(
        "relative h-full min-h-72 w-full overflow-hidden rounded-xl border border-border bg-muted",
        className
      )}
    >
      <div ref={containerRef} className="size-full" />
      {onSearchHere && showSearchHere ? (
        <Button
          type="button"
          size="lg"
          variant="secondary"
          disabled={searchHereLoading}
          aria-busy={searchHereLoading}
          aria-label="Search this area"
          onClick={handleSearchHereClick}
          className="absolute bottom-10 left-1/2 z-1 -translate-x-1/2 shadow-md"
        >
          {searchHereLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden />
              Searching…
            </>
          ) : (
            <>
              <Search className="size-4" aria-hidden />
              Search here
            </>
          )}
        </Button>
      ) : null}
      <p className="sr-only">
        Map of {points.length} points. Selecting a marker or name selects the
        same entity in the list.
      </p>
    </div>
  )
}
