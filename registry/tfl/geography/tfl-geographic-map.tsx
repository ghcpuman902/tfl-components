"use client";

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { cn } from "@/lib/utils";
import type {
  TransitGeometryBundle,
  TransitMode,
} from "@/lib/tfl/geography-types";
import {
  TRANSIT_GEOMETRY_PUBLIC_ASSETS,
  CARTO_BASEMAP_CREDIT,
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
  /** Show station circles. Default true. */
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

/**
 * Add sources first, then casings, then coloured cores, then stations.
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
        paint: {
          "line-color": "#ffffff",
          "line-width": 5,
          "line-opacity": 0.85,
        },
      });
    }
    for (const { mode } of bundles) {
      map.addLayer({
        id: `${mode}-lines-core`,
        type: "line",
        source: `${mode}-lines`,
        paint: {
          "line-color": [
            "coalesce",
            ["get", "color"],
            ["get", "lineColour"],
            "#0019A8",
          ],
          "line-width": 3,
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
        paint: {
          "circle-radius": 3,
          "circle-color": "#ffffff",
          "circle-stroke-width": 1.25,
          "circle-stroke-color": "#111827",
        },
      });
    }
  }
};

/**
 * Free geographic map — MapLibre GL JS over CARTO Positron, no API key.
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
      style: {
        version: 8,
        sources: {
          carto: {
            type: "raster",
            tiles: [
              "https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png",
            ],
            tileSize: 256,
            attribution: CARTO_BASEMAP_CREDIT.attribution,
          },
        },
        layers: [
          {
            id: "carto",
            type: "raster",
            source: "carto",
            minzoom: 0,
            maxzoom: 20,
          },
        ],
      },
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
