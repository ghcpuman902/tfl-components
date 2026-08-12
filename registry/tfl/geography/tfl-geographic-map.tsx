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
const DEFAULT_MODES: readonly TransitMode[] = [
  "tube",
  "elizabeth",
  "overground",
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

const addModeToMap = (
  map: maplibregl.Map,
  mode: TransitGeometryMode,
  bundle: TransitGeometryBundle,
  showLines: boolean,
  showStations: boolean,
) => {
  const linesId = `${mode}-lines`;
  const stationsId = `${mode}-stations`;

  if (showLines) {
    map.addSource(linesId, { type: "geojson", data: bundle.lines });
    map.addLayer({
      id: `${mode}-lines-casing`,
      type: "line",
      source: linesId,
      paint: {
        "line-color": "#ffffff",
        "line-width": 5,
        "line-opacity": 0.85,
      },
    });
    map.addLayer({
      id: `${mode}-lines-core`,
      type: "line",
      source: linesId,
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

  if (showStations) {
    map.addSource(stationsId, { type: "geojson", data: bundle.stations });
    map.addLayer({
      id: `${mode}-stations`,
      type: "circle",
      source: stationsId,
      paint: {
        "circle-radius": 3,
        "circle-color": "#ffffff",
        "circle-stroke-width": 1.25,
        "circle-stroke-color": "#111827",
      },
    });
  }
};

/**
 * Free geographic map — MapLibre GL JS over CARTO Positron, no API key.
 *
 * Renders vendored OSM transit line + station geometry by default.
 * Auto-fills parent via `h-full w-full`; wrap in a sized container.
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
      return Object.entries(data)
        .filter(([mode]) => activeModes.includes(mode as TransitMode))
        .map(([mode, bundle]) => ({
          mode: mode as TransitGeometryMode,
          bundle: bundle as TransitGeometryBundle,
        }));
    }

    const assets = TRANSIT_GEOMETRY_PUBLIC_ASSETS.filter((a) =>
      activeModes.includes(a.mode),
    );
    const results = await Promise.all(
      assets.map(async (asset) => {
        const res = await fetch(asset.url);
        if (!res.ok) {
          throw new Error(`Failed to load ${asset.label} (${res.status})`);
        }
        return {
          mode: asset.mode,
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

        for (const { mode, bundle } of bundles) {
          addModeToMap(map, mode, bundle, showLines, showStations);
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
