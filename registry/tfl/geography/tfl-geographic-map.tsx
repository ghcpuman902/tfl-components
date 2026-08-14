"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import maplibregl, { type ExpressionSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { cn } from "@/lib/utils";
import type {
  TransitGeometryBundle,
  TransitMode,
} from "@/lib/tfl/geography-types";
import {
  TRANSIT_GEOMETRY_PUBLIC_ASSETS,
  OPENFREEMAP_POSITRON_STYLE_URL,
  OSM_TRANSIT_GEOMETRY_CREDIT,
  type TransitGeometryMode,
} from "@/lib/tfl/geography-credits";

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

const asFeatureCollection = (
  collection: TransitGeometryBundle["lines"] | TransitGeometryBundle["stations"],
) => ({
  type: "FeatureCollection" as const,
  features: collection.features ?? [],
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
const addTransitLayers = (
  map: maplibregl.Map,
  bundles: { mode: TransitGeometryMode; bundle: TransitGeometryBundle }[],
  showLines: boolean,
  showStations: boolean,
) => {
  for (const { mode, bundle } of bundles) {
    if (showLines) {
      map.addSource(`${mode}-lines`, {
        type: "geojson",
        data: asFeatureCollection(bundle.lines),
      });
    }
    if (showStations) {
      map.addSource(`${mode}-stations`, {
        type: "geojson",
        data: asFeatureCollection(bundle.stations),
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
          "line-color": "#ffffff",
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
          "circle-color": "#ffffff",
          "circle-stroke-width": 1.4,
          "circle-stroke-color": "#111827",
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
          "text-color": "#111827",
          "text-halo-color": "#ffffff",
          "text-halo-width": 1.6,
        },
      });
    }
  }
};

/**
 * Free geographic map — MapLibre GL JS over OpenFreeMap vector Positron.
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
  showStations = true,
  showLines = true,
  showNavigation = true,
  center = LONDON_CENTER,
  zoom = LONDON_ZOOM,
  className,
}: TflGeographicMapProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  const activeModes = useMemo(() => modes ?? DEFAULT_MODES, [modes]);

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

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    let cancelled = false;

    const map = new maplibregl.Map({
      container,
      style: OPENFREEMAP_POSITRON_STYLE_URL,
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
        const bundles = await loadGeometry();
        if (cancelled) return;

        addTransitLayers(map, bundles, showLines, showStations);
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
  }, [center, zoom, showNavigation, showLines, showStations, loadGeometry]);

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
