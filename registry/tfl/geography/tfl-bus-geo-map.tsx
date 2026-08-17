"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { FeatureCollection, LineString } from "geojson";
import maplibregl, { type ExpressionSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type {
  BusRouteGeometry,
  BusRouteSegment,
  BusRouteSegmentStatus,
} from "@/lib/tfl/bus-geography-types";
import { mapLineColorForBasemap } from "@/lib/tfl/dark-line-colours";
import {
  openFreeMapStyleUrl,
} from "@/lib/tfl/geography-credits";
import { useVehicleSegmentSource } from "@/components/tfl/geography/sync-vehicle-source";
import { provideMissingStyleImages } from "@/components/tfl/maps/provide-missing-style-images";
import {
  vehiclesToSegmentGeoJSON,
  type VehiclePosition,
} from "@/lib/tfl/map-vehicles";
import type { RoutePolyline } from "@/lib/tfl/vehicle-progress";
import { cn } from "@/lib/utils";

const LONDON_CENTER: [number, number] = [-0.128, 51.507];
const LONDON_ZOOM = 13;
const DISABLED_COLOR = "#6B7280";

type TflBusGeoMapProps = {
  /** One route. Caller owns current / diverted / disabled interpretation. */
  data: BusRouteGeometry;
  /** Optional extra geometry (e.g. a second direction). */
  alternate?: BusRouteGeometry;
  vehicles?: readonly VehiclePosition[];
  /** Keep vehicles walking along the track between arrival snapshots. */
  coast?: boolean;
  showStops?: boolean;
  showNavigation?: boolean;
  center?: [number, number];
  zoom?: number;
  className?: string;
};

const subscribeDocumentDark = (onStoreChange: () => void) => {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
};

const getDocumentDark = () =>
  document.documentElement.classList.contains("dark");

const STATUS_ORDER: readonly BusRouteSegmentStatus[] = [
  "disabled",
  "diverted",
  "current",
];

const collectSegments = (
  routes: readonly (BusRouteGeometry | undefined)[],
): BusRouteSegment[] =>
  routes.flatMap((route) => route?.segments ?? []);

const segmentsToCollection = (
  segments: readonly BusRouteSegment[],
  status: BusRouteSegmentStatus,
  color: string,
  dark: boolean,
): FeatureCollection<LineString, { status: BusRouteSegmentStatus; color: string }> => ({
  type: "FeatureCollection",
  features: segments
    .filter((segment) => segment.status === status)
    .map((segment) => ({
      type: "Feature",
      id: segment.id,
      properties: {
        status: segment.status,
        color:
          status === "disabled"
            ? DISABLED_COLOR
            : mapLineColorForBasemap(color, dark),
      },
      geometry: segment.line,
    })),
});

const LINE_LAYOUT = {
  "line-join": "round" as const,
  "line-cap": "round" as const,
};

const LINE_WIDTH: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  11,
  3,
  15,
  5,
];

const STOP_RADIUS: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  12,
  3,
  16,
  5,
];

const VEHICLE_LINE_WIDTH: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  11,
  6,
  15,
  11,
  17,
  14,
];

const boundsFromGeometry = (
  routes: readonly (BusRouteGeometry | undefined)[],
): maplibregl.LngLatBounds | null => {
  const bounds = new maplibregl.LngLatBounds();
  let hasPoint = false;
  for (const route of routes) {
    if (!route) continue;
    for (const stop of route.stops) {
      bounds.extend([stop.lon, stop.lat]);
      hasPoint = true;
    }
    for (const segment of route.segments) {
      for (const coord of segment.line.coordinates) {
        const lon = coord[0];
        const lat = coord[1];
        if (lon == null || lat == null) continue;
        bounds.extend([lon, lat]);
        hasPoint = true;
      }
    }
  }
  return hasPoint ? bounds : null;
};

const addRouteLayers = (
  map: maplibregl.Map,
  routes: readonly (BusRouteGeometry | undefined)[],
  showStops: boolean,
  dark: boolean,
) => {
  const color = routes.find((route) => route)?.color ?? "#DC241F";
  const segments = collectSegments(routes);

  for (const status of STATUS_ORDER) {
    const sourceId = `bus-route-${status}`;
    if (map.getSource(sourceId)) continue;
    map.addSource(sourceId, {
      type: "geojson",
      data: segmentsToCollection(segments, status, color, dark),
    });
    map.addLayer({
      id: sourceId,
      type: "line",
      source: sourceId,
      layout: LINE_LAYOUT,
      paint: {
        "line-color": ["get", "color"],
        "line-width": LINE_WIDTH,
        "line-opacity": status === "disabled" ? 0.45 : 0.95,
        "line-dasharray": status === "diverted" ? [1.4, 1.4] : [1, 0],
      },
    });
  }

  if (showStops) {
    map.addSource("bus-stops", {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: routes.flatMap(
          (route) =>
            route?.stops.map((stop) => ({
              type: "Feature" as const,
              id: stop.id,
              properties: { name: stop.name },
              geometry: {
                type: "Point" as const,
                coordinates: [stop.lon, stop.lat],
              },
            })) ?? [],
        ),
      },
    });
    map.addLayer({
      id: "bus-stops",
      type: "circle",
      source: "bus-stops",
      minzoom: 12,
      paint: {
        "circle-radius": STOP_RADIUS,
        "circle-color": dark ? "#111827" : "#ffffff",
        "circle-stroke-width": 1.4,
        "circle-stroke-color": mapLineColorForBasemap(color, dark),
      },
    });
    map.addLayer({
      id: "bus-stops-label",
      type: "symbol",
      source: "bus-stops",
      minzoom: 14,
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Regular"],
        "text-size": 10,
        "text-offset": [0, 1.1],
        "text-anchor": "top",
        "text-max-width": 8,
        "text-optional": true,
      },
      paint: {
        "text-color": dark ? "#ffffff" : "#111827",
        "text-halo-color": dark ? "#111827" : "#ffffff",
        "text-halo-width": 1.4,
      },
    });
  }

  map.addSource("bus-vehicles", {
    type: "geojson",
    data: vehiclesToSegmentGeoJSON([], []),
  });
  map.addLayer({
    id: "bus-vehicles",
    type: "line",
    source: "bus-vehicles",
    layout: {
      "line-join": "round",
      "line-cap": "round",
    },
    paint: {
      "line-color": dark ? "#9ca3af" : "#4b5563",
      "line-width": VEHICLE_LINE_WIDTH,
      "line-opacity": 0.96,
    },
  });
};

const polylinesFromRoutes = (
  routes: readonly (BusRouteGeometry | undefined)[],
): RoutePolyline[] => {
  const out: RoutePolyline[] = [];
  for (const route of routes) {
    if (!route) continue;
    for (const segment of route.segments) {
      out.push({ lineId: route.routeId, line: segment.line });
    }
  }
  return out;
};

const asGeoJsonSource = (
  source: maplibregl.Source | undefined,
): maplibregl.GeoJSONSource | null =>
  source?.type === "geojson" ? (source as maplibregl.GeoJSONSource) : null;

const syncRouteSources = (
  map: maplibregl.Map,
  routes: readonly (BusRouteGeometry | undefined)[],
  dark: boolean,
) => {
  const color = routes.find((route) => route)?.color ?? "#DC241F";
  const segments = collectSegments(routes);
  for (const status of STATUS_ORDER) {
    asGeoJsonSource(map.getSource("bus-route-" + status))?.setData(
      segmentsToCollection(segments, status, color, dark),
    );
  }
};

/**
 * One bus route on OpenFreeMap / MapLibre. Segment status is props-only —
 * this component does not read live TfL disruptions.
 */
export const TflBusGeoMap = ({
  data,
  alternate,
  vehicles,
  coast = false,
  showStops = true,
  showNavigation = true,
  center = LONDON_CENTER,
  zoom = LONDON_ZOOM,
  className,
}: TflBusGeoMapProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const skipStyleSwapRef = useRef(true);
  const dark = useSyncExternalStore(
    subscribeDocumentDark,
    getDocumentDark,
    () => false,
  );
  const [status, setStatus] = useState<"loading" | "ready">("loading");

  const routes = useMemo(() => [data, alternate], [data, alternate]);
  const getPolylines = useCallback(
    (): RoutePolyline[] => polylinesFromRoutes(routes),
    [routes],
  );
  const { flush: flushVehicles } = useVehicleSegmentSource({
    mapRef,
    sourceId: "bus-vehicles",
    vehicles,
    getPolylines,
    coast,
    ready: status === "ready",
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = new maplibregl.Map({
      container,
      style: openFreeMapStyleUrl(dark),
      center,
      zoom,
      attributionControl: { compact: true },
      cooperativeGestures: true,
    });
    provideMissingStyleImages(map);

    if (showNavigation) {
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-right",
      );
    }
    mapRef.current = map;

    map.on("load", () => {
      addRouteLayers(map, routes, showStops, dark);
      const bounds = boundsFromGeometry(routes);
      if (bounds) {
        map.fitBounds(bounds, { padding: 48, maxZoom: 15, duration: 0 });
      }
      setStatus("ready");
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Create once. Overlay and style swaps live in the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNavigation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    syncRouteSources(map, routes, dark);
  }, [routes, dark]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (skipStyleSwapRef.current) {
      skipStyleSwapRef.current = false;
      return;
    }
    const apply = () => {
      addRouteLayers(map, routes, showStops, dark);
      flushVehicles();
    };
    map.setStyle(openFreeMapStyleUrl(dark));
    map.once("style.load", apply);
    return () => {
      map.off("style.load", apply);
    };
  }, [dark, showStops, flushVehicles]);

  return (
    <div
      ref={containerRef}
      className={cn("h-full w-full bg-muted", className)}
      role="region"
      aria-label={`Bus route ${data.routeId} geographic map`}
      aria-busy={status === "loading"}
    />
  );
};
