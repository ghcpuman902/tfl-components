"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection } from "geojson";
import {
  OPENFREEMAP_BASEMAP_CREDIT,
  OPENFREEMAP_POSITRON_STYLE_URL,
  OSM_TRANSIT_GEOMETRY_CREDIT,
  TFL_STATION_ENRICHMENT_CREDIT,
  TRANSIT_GEOMETRY_PUBLIC_ASSETS,
  type TransitGeometryMode,
} from "@/lib/tfl/geography-credits";

type TransitGeometryBundle = {
  lines: FeatureCollection;
  stations: FeatureCollection;
};

const LONDON_CENTER: [number, number] = [-0.12, 51.51];
const LONDON_ZOOM = 10.2;

const MODE_LABELS = TRANSIT_GEOMETRY_PUBLIC_ASSETS.map(
  (asset) => asset.label,
).join(", ");

/**
 * MapLibre geographic placeholder — provider adapter over unique-track GeoJSON
 * at `/data/geography/`. Full OSM route variants stay under `data/geography/`
 * for non-map use; this component is not the geography source of truth.
 */
export const GeographicMapPlaceholder = () => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loadedModes, setLoadedModes] = useState<TransitGeometryMode[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    let cancelled = false;

    const map = new maplibregl.Map({
      container,
      style: OPENFREEMAP_POSITRON_STYLE_URL,
      center: LONDON_CENTER,
      zoom: LONDON_ZOOM,
      attributionControl: { compact: true },
      cooperativeGestures: true,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    const handleLoad = async () => {
      try {
        const results = await Promise.all(
          TRANSIT_GEOMETRY_PUBLIC_ASSETS.map(async (asset) => {
            const response = await fetch(asset.url);
            if (!response.ok) {
              throw new Error(
                `Failed to load ${asset.label} geometry (${response.status})`,
              );
            }
            const bundle = (await response.json()) as TransitGeometryBundle;
            return { mode: asset.mode, bundle };
          }),
        );
        if (cancelled) return;

        for (const { mode, bundle } of results) {
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

        // Casings for every mode, then cores — avoids Tube white stroke hiding DLR.
        for (const { mode } of results) {
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
        for (const { mode } of results) {
          map.addLayer({
            id: `${mode}-lines`,
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
        for (const { mode } of results) {
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

        setLoadedModes(results.map((result) => result.mode));
        setStatus("ready");
      } catch (error) {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "Geometry load failed",
        );
      }
    };

    map.on("load", () => {
      void handleLoad();
    });

    return () => {
      cancelled = true;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  return (
    <div className="space-y-3">
      <div
        ref={containerRef}
        className="h-[min(70vh,32rem)] w-full overflow-hidden rounded-lg border border-border bg-muted"
        role="img"
        aria-label={`MapLibre placeholder showing ${MODE_LABELS} geometry`}
      />
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {status === "loading"
          ? "Loading transit geometry…"
          : status === "error"
            ? `Map error: ${errorMessage}`
            : `Placeholder MapLibre view — ${loadedModes.length} modes from vendored OSM data (${MODE_LABELS}).`}
      </p>
      <aside
        className="space-y-1 rounded-lg border border-border bg-card p-3 text-xs text-muted-foreground"
        aria-label="Data origin"
      >
        <p className="font-medium text-foreground">Data origin</p>
        <ul className="list-inside list-disc space-y-1">
          <li>
            {OSM_TRANSIT_GEOMETRY_CREDIT.attribution} (
            <a
              className="underline-offset-2 hover:underline"
              href={OSM_TRANSIT_GEOMETRY_CREDIT.licenceUrl}
            >
              {OSM_TRANSIT_GEOMETRY_CREDIT.licence}
            </a>
            )
          </li>
          <li>{TFL_STATION_ENRICHMENT_CREDIT.attribution}</li>
          <li>{OPENFREEMAP_BASEMAP_CREDIT.attribution}</li>
        </ul>
        <p>
          Full declaration:{" "}
          <code className="text-[0.7rem]">data/geography/ORIGIN.md</code>
        </p>
      </aside>
    </div>
  );
};
