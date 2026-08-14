"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { TransitGeometryBundle } from "@/lib/tfl/geography-types";
import {
  TRANSIT_GEOMETRY_PUBLIC_ASSETS,
  CARTO_BASEMAP_CREDIT,
} from "@/lib/tfl/geography-credits";

/**
 * Docs-only MapLibre vendor example — loads vendored OSM GeoJSON and renders
 * it with MapLibre GL JS. No API key required.
 */
export const MapLibreExample = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [loaded, setLoaded] = useState(false);

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
      center: [-0.12, 51.51],
      zoom: 10.2,
      attributionControl: { compact: true },
      cooperativeGestures: true,
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );
    mapRef.current = map;

    map.on("load", async () => {
      try {
        const bundles = (
          await Promise.all(
            TRANSIT_GEOMETRY_PUBLIC_ASSETS.map(async (asset) => {
              const res = await fetch(asset.url);
              if (!res.ok) return null;
              const bundle = (await res.json()) as TransitGeometryBundle;
              return { mode: asset.mode, bundle };
            }),
          )
        ).filter(
          (item): item is { mode: (typeof TRANSIT_GEOMETRY_PUBLIC_ASSETS)[number]["mode"]; bundle: TransitGeometryBundle } =>
            item != null,
        );
        if (cancelled) return;

        for (const { mode, bundle } of bundles) {
          map.addSource(`${mode}-lines`, {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: bundle.lines.features ?? [],
            },
          });
          map.addSource(`${mode}-stations`, {
            type: "geojson",
            data: {
              type: "FeatureCollection",
              features: bundle.stations.features ?? [],
            },
          });
        }

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
              "line-color": ["coalesce", ["get", "color"], "#0019A8"],
              "line-width": 3,
            },
          });
        }
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
        setLoaded(true);
      } catch {
        /* noop for docs example */
      }
    });

    return () => {
      cancelled = true;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="h-80 w-full overflow-hidden rounded-lg border border-border bg-muted"
        role="img"
        aria-label="MapLibre GL JS example with TfL transit lines"
      />
      <p className="text-xs text-muted-foreground">
        MapLibre GL JS · CARTO Positron · No API key required
        {loaded && " · Loaded"}
      </p>
    </div>
  );
};
