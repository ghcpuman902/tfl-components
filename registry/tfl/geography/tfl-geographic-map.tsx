"use client";

import {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  useSyncExternalStore,
} from "react";
import maplibregl, { type ExpressionSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { cn } from "@/lib/utils";
import { mapLineColorForBasemap } from "@/lib/tfl/dark-line-colours";
import type {
  TransitGeometryBundle,
  TransitMode,
} from "@/lib/tfl/geography-types";
import {
  TRANSIT_GEOMETRY_PUBLIC_ASSETS,
  openFreeMapStyleUrl,
  OSM_TRANSIT_GEOMETRY_CREDIT,
  type TransitGeometryMode,
} from "@/lib/tfl/geography-credits";
import { useVehicleSegmentSource } from "@/components/tfl/geography/sync-vehicle-source";
import {
  vehiclesToSegmentGeoJSON,
  type VehiclePosition,
} from "@/lib/tfl/map-vehicles";
import type { RoutePolyline } from "@/lib/tfl/vehicle-progress";

const LONDON_CENTER: [number, number] = [-0.12, 51.51];
const LONDON_ZOOM = 10.2;

/** Bottom → top paint order so DLR / tram / Overground stay visible over Tube casing. */
const DEFAULT_MODES: readonly TransitMode[] = [
  "tube",
  "overground",
  "elizabeth",
  "dlr",
  "tram",
];

type TflGeographicMapProps = {
  /**
   * Pre-loaded geometry bundles keyed by mode. When omitted the component
   * fetches vendored GeoJSON from `/data/geography/`.
   */
  data?: Partial<Record<TransitMode, TransitGeometryBundle>>;
  /** Which transit modes to render. Defaults to all five. */
  modes?: readonly TransitMode[];
  /** When set, only these line ids are painted. */
  lineIds?: readonly string[];
  /** Live vehicles. Positions are derived by the caller; this map paints track segments. */
  vehicles?: readonly VehiclePosition[];
  /** Keep vehicles walking along the track between arrival snapshots. */
  coast?: boolean;
  /** Show station circles and names. Default true. */
  showStations?: boolean;
  /** Show line tracks. Default true. */
  showLines?: boolean;
  /** Show zoom/pan controls. Default true. */
  showNavigation?: boolean;
  /** Initial center [lng, lat]. Default London. */
  center?: [number, number];
  /** Initial zoom level. Default 10.2. */
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

const useDocumentDark = () =>
  useSyncExternalStore(subscribeDocumentDark, getDocumentDark, () => false);

const STATION_FILL = { light: "#ffffff", dark: "#111827" } as const;
const STATION_STROKE = { light: "#111827", dark: "#ffffff" } as const;
const LINE_CASING = { light: "#ffffff", dark: "#111827" } as const;

const asFeatureCollection = (
  collection: TransitGeometryBundle["lines"] | TransitGeometryBundle["stations"],
) => ({
  type: "FeatureCollection" as const,
  features: collection.features ?? [],
});

const remapLineCollection = (
  collection: TransitGeometryBundle["lines"],
  dark: boolean,
) => ({
  type: "FeatureCollection" as const,
  features: (collection.features ?? []).map((feature) => {
    const props = feature.properties;
    if (!props?.color) return feature;
    const next = mapLineColorForBasemap(props.color, dark);
    return {
      ...feature,
      properties: { ...props, color: next },
    };
  }),
});

const LINE_LAYOUT = {
  "line-join": "round" as const,
  "line-cap": "round" as const,
};

const LINE_WIDTH: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  10,
  2.2,
  14,
  3.8,
  16,
  5,
];

const LINE_INNER_WIDTH: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  10,
  1.4,
  14,
  2.6,
  16,
  3.4,
];

const STATION_RADIUS: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  10,
  2.5,
  14,
  4,
  16,
  5,
];

const VEHICLE_LINE_WIDTH: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  10,
  5.5,
  14,
  10,
  16,
  14,
];

const STATION_LABEL_SIZE: ExpressionSpecification = [
  "interpolate",
  ["linear"],
  ["zoom"],
  10,
  10,
  12,
  10,
  14,
  11,
  16,
  12,
];

/**
 * OpenFreeMap Positron paints OSM railways and neighbourhood names that fight
 * TfL corridors / station labels. Hide those so unique-track geometry wins.
 */
const OSM_LAYERS_TO_HIDE = [
  "railway_transit",
  "railway_transit_dashline",
  "railway_service",
  "railway_service_dashline",
  "railway",
  "railway_dashline",
  "label_other",
] as const;

const prepareBasemapForTransit = (map: maplibregl.Map) => {
  for (const id of OSM_LAYERS_TO_HIDE) {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, "visibility", "none");
    }
  }
};

/**
 * Add sources first, then casings, then coloured cores, then stations + names.
 * Per-mode casing→core→stations stacks the next mode’s white casing over the
 * previous mode’s colour (Tube/Jubilee was hiding DLR teal in Docklands).
 */
const filterBundleLines = (
  bundle: TransitGeometryBundle,
  lineIds: readonly string[] | undefined,
): TransitGeometryBundle["lines"] => {
  if (!lineIds?.length) return bundle.lines;
  const allow = new Set(lineIds);
  return {
    type: "FeatureCollection",
    features: (bundle.lines.features ?? []).filter((feature) =>
      allow.has(feature.properties?.lineId ?? ""),
    ),
  };
};

const filterBundleStations = (
  bundle: TransitGeometryBundle,
  lineIds: readonly string[] | undefined,
): TransitGeometryBundle["stations"] => {
  if (!lineIds?.length) return bundle.stations;
  const allow = new Set(lineIds);
  return {
    type: "FeatureCollection",
    features: (bundle.stations.features ?? []).filter((feature) =>
      (feature.properties?.lineIds ?? []).some((id) => allow.has(id)),
    ),
  };
};

const polylinesFromBundles = (
  bundles: { mode: TransitGeometryMode; bundle: TransitGeometryBundle }[],
  lineIds?: readonly string[],
): RoutePolyline[] => {
  const allow = lineIds?.length ? new Set(lineIds) : null;
  const out: RoutePolyline[] = [];
  for (const { bundle } of bundles) {
    for (const feature of bundle.lines.features ?? []) {
      const lineId = feature.properties?.lineId ?? "";
      if (allow && !allow.has(lineId)) continue;
      if (feature.geometry?.type === "LineString") {
        out.push({ lineId, line: feature.geometry });
      }
    }
  }
  return out;
};

const fitLineBounds = (
  map: maplibregl.Map,
  bundles: { mode: TransitGeometryMode; bundle: TransitGeometryBundle }[],
  lineIds: readonly string[] | undefined,
) => {
  if (!lineIds?.length) return;
  const bounds = new maplibregl.LngLatBounds();
  let any = false;
  for (const { bundle } of bundles) {
    for (const feature of filterBundleLines(bundle, lineIds).features ?? []) {
      if (feature.geometry?.type !== "LineString") continue;
      for (const coord of feature.geometry.coordinates) {
        const lon = coord[0];
        const lat = coord[1];
        if (lon == null || lat == null) continue;
        bounds.extend([lon, lat]);
        any = true;
      }
    }
  }
  if (any) map.fitBounds(bounds, { padding: 48, duration: 0 });
};

const addTransitLayers = (
  map: maplibregl.Map,
  bundles: { mode: TransitGeometryMode; bundle: TransitGeometryBundle }[],
  showLines: boolean,
  showStations: boolean,
  dark: boolean,
  lineIds?: readonly string[],
) => {
  const tone = dark ? "dark" : "light";

  for (const { mode, bundle } of bundles) {
    if (showLines) {
      map.addSource(`${mode}-lines`, {
        type: "geojson",
        data: remapLineCollection(filterBundleLines(bundle, lineIds), dark),
      });
    }
    if (showStations) {
      map.addSource(`${mode}-stations`, {
        type: "geojson",
        data: asFeatureCollection(filterBundleStations(bundle, lineIds)),
      });
    }
  }

  if (showLines) {
    for (const { mode } of bundles) {
      map.addLayer({
        id: `${mode}-lines-casing`,
        type: "line",
        source: `${mode}-lines`,
        layout: LINE_LAYOUT,
        paint: {
          "line-color": LINE_CASING[tone],
          "line-width": LINE_WIDTH,
          "line-opacity": 0.92,
        },
      });
    }
    for (const { mode } of bundles) {
      map.addLayer({
        id: `${mode}-lines-core`,
        type: "line",
        source: `${mode}-lines`,
        layout: LINE_LAYOUT,
        paint: {
          "line-color": [
            "coalesce",
            ["get", "color"],
            ["get", "lineColour"],
            "#0019A8",
          ],
          "line-width": LINE_INNER_WIDTH,
        },
      });
    }
  }

  if (showStations) {
    for (const { mode } of bundles) {
      map.addLayer({
        id: `${mode}-stations`,
        type: "circle",
        source: `${mode}-stations`,
        minzoom: 10,
        paint: {
          "circle-radius": STATION_RADIUS,
          "circle-color": STATION_FILL[tone],
          "circle-stroke-width": 1.4,
          "circle-stroke-color": STATION_STROKE[tone],
          "circle-opacity": 0.98,
        },
      });
    }
    for (const { mode } of bundles) {
      map.addLayer({
        id: `${mode}-stations-label`,
        type: "symbol",
        source: `${mode}-stations`,
        minzoom: 10,
        layout: {
          "text-field": ["coalesce", ["get", "label"], ["get", "name"], ""],
          "text-font": ["Noto Sans Regular"],
          "text-size": STATION_LABEL_SIZE,
          "text-offset": [0, 1.15],
          "text-anchor": "top",
          "text-max-width": 8,
          "text-allow-overlap": false,
          "text-optional": true,
          "text-padding": 2,
        },
        paint: {
          "text-color": STATION_STROKE[tone],
          "text-halo-color": STATION_FILL[tone],
          "text-halo-width": 1.6,
        },
      });
    }
  }

  if (!map.getSource("rail-vehicles")) {
    map.addSource("rail-vehicles", {
      type: "geojson",
      data: vehiclesToSegmentGeoJSON([], []),
    });
    map.addLayer({
      id: "rail-vehicles",
      type: "line",
      source: "rail-vehicles",
      layout: LINE_LAYOUT,
      paint: {
        "line-color": dark ? "#9ca3af" : "#4b5563",
        "line-width": VEHICLE_LINE_WIDTH,
        "line-opacity": 0.96,
      },
    });
  }
};

/**
 * Free geographic map — MapLibre GL JS over OpenFreeMap Positron / Dark.
 * No API key. Station names render from the geometry `label` / `name` fields.
 *
 * Renders unique-track OSM transit geometry by default (spine + leftover
 * branches only — not every timetable variant). Fetches from
 * `/data/geography/`. Auto-fills parent via `h-full w-full`.
 *
 * ```tsx
 * <div className="h-100">
 *   <TflGeographicMap />
 * </div>
 * ```
 */
export const TflGeographicMap = ({
  data,
  modes,
  lineIds,
  vehicles,
  coast = false,
  showStations = true,
  showLines = true,
  showNavigation = true,
  center = LONDON_CENTER,
  zoom = LONDON_ZOOM,
  className,
}: TflGeographicMapProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const bundlesRef = useRef<
    { mode: TransitGeometryMode; bundle: TransitGeometryBundle }[] | null
  >(null);
  const skipStyleSwapRef = useRef(true);
  const fittedRef = useRef(false);
  const lineIdsKey = lineIds?.join(",") ?? "";
  const modesKey = (modes ?? DEFAULT_MODES).join(",");
  const dark = useDocumentDark();
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  const activeModes = useMemo(
    () => modes ?? DEFAULT_MODES,
    // Parent arrays are often inline (`modes={["tube"]}`); compare by id list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [modesKey],
  );

  const loadGeometry = useCallback(async (): Promise<
    { mode: TransitGeometryMode; bundle: TransitGeometryBundle }[]
  > => {
    if (data) {
      const ordered = DEFAULT_MODES.filter(
        (mode) => activeModes.includes(mode) && data[mode],
      );
      return ordered.map((mode) => ({
        mode,
        bundle: data[mode] as TransitGeometryBundle,
      }));
    }

    const assetByMode = new Map(
      TRANSIT_GEOMETRY_PUBLIC_ASSETS.map((asset) => [asset.mode, asset]),
    );
    const orderedModes = DEFAULT_MODES.filter((mode) =>
      activeModes.includes(mode),
    );

    const results = await Promise.all(
      orderedModes.map(async (mode) => {
        const asset = assetByMode.get(mode);
        if (!asset) {
          throw new Error(`No geography asset for mode ${mode}`);
        }
        const res = await fetch(asset.url);
        if (!res.ok) {
          throw new Error(`Failed to load ${asset.label} (${res.status})`);
        }
        return {
          mode,
          bundle: (await res.json()) as TransitGeometryBundle,
        };
      }),
    );
    return results;
  }, [data, activeModes]);

  const loadGeometryRef = useRef(loadGeometry);
  loadGeometryRef.current = loadGeometry;

  const getPolylines = useCallback(
    (): RoutePolyline[] =>
      polylinesFromBundles(bundlesRef.current ?? [], lineIds),
    // lineIds identity is represented by lineIdsKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [lineIdsKey],
  );

  const { flush: flushVehicles } = useVehicleSegmentSource({
    mapRef,
    sourceId: "rail-vehicles",
    vehicles,
    getPolylines,
    coast,
    ready: status === "ready",
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    let cancelled = false;

    const map = new maplibregl.Map({
      container,
      style: openFreeMapStyleUrl(dark),
      center,
      zoom,
      attributionControl: { compact: true },
      cooperativeGestures: true,
    });

    if (showNavigation) {
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-right",
      );
    }
    mapRef.current = map;

    map.on("load", async () => {
      try {
        prepareBasemapForTransit(map);
        const bundles = bundlesRef.current ?? (await loadGeometryRef.current());
        if (cancelled) return;
        bundlesRef.current = bundles;

        addTransitLayers(map, bundles, showLines, showStations, dark, lineIds);
        if (!fittedRef.current) {
          fitLineBounds(map, bundles, lineIds);
          fittedRef.current = true;
        }
        setStatus("ready");
      } catch {
        if (!cancelled) setStatus("error");
      }
    });

    return () => {
      cancelled = true;
      map.remove();
      mapRef.current = null;
    };
    // Create once. Overlay and style swaps live in the effects below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNavigation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (skipStyleSwapRef.current) {
      skipStyleSwapRef.current = false;
      return;
    }

    const applyOverlays = () => {
      const bundles = bundlesRef.current;
      if (!bundles) return;
      prepareBasemapForTransit(map);
      addTransitLayers(map, bundles, showLines, showStations, dark, lineIds);
      flushVehicles();
    };

    map.setStyle(openFreeMapStyleUrl(dark));
    map.once("style.load", applyOverlays);
    return () => {
      map.off("style.load", applyOverlays);
    };
  }, [dark, showLines, showStations, lineIdsKey, flushVehicles]);

  return (
    <div
      ref={containerRef}
      className={cn("h-full w-full bg-muted", className)}
      role="region"
      aria-label="TfL geographic transit map"
      aria-busy={status === "loading"}
    >
      {status === "error" && (
        <div className="flex h-full items-center justify-center p-4 text-sm text-muted-foreground">
          Failed to load geometry.{" "}
          <span className="sr-only">
            {OSM_TRANSIT_GEOMETRY_CREDIT.attribution}
          </span>
        </div>
      )}
    </div>
  );
};
