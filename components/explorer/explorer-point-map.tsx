"use client";

import { useEffect, useMemo, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { cn } from "@/lib/utils";
import { CARTO_BASEMAP_CREDIT } from "@/lib/tfl/geography-credits";
import type { ExplorerPoint } from "@/lib/tfl/explorer-point-normalise";

const LONDON_CENTER: [number, number] = [-0.128, 51.508];
const FALLBACK_ZOOM = 12;
const SELECTED_ZOOM = 15;
const SOURCE_ID = "explorer-points";
const LAYER_ID = "explorer-points-circle";
const SELECTED_LAYER_ID = "explorer-points-selected";

type ExplorerPointMapProps = {
  points: readonly ExplorerPoint[];
  selectedId?: string | null;
  onSelect: (point: ExplorerPoint) => void;
  className?: string;
};

const prefersReducedMotion = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

/**
 * Explorer-owned MapLibre adapter.
 * Circle GeoJSON layer for all points; label only the selected point.
 * No automatic fetch on map movement.
 */
export const ExplorerPointMap = ({
  points,
  selectedId,
  onSelect,
  className,
}: ExplorerPointMapProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);
  const onSelectRef = useRef(onSelect);
  const pointsRef = useRef(points);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  const geojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: points
        .filter(
          (point) =>
            typeof point.lat === "number" && typeof point.lon === "number",
        )
        .map((point) => ({
          type: "Feature" as const,
          id: point.id,
          properties: {
            id: point.id,
            name: point.name,
            selected: point.id === selectedId,
          },
          geometry: {
            type: "Point" as const,
            coordinates: [point.lon!, point.lat!] as [number, number],
          },
        })),
    }),
    [points, selectedId],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

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
      center: LONDON_CENTER,
      zoom: FALLBACK_ZOOM,
      attributionControl: { compact: true },
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );

    map.on("load", () => {
      map.addSource(SOURCE_ID, {
        type: "geojson",
        data: geojson,
      });

      map.addLayer({
        id: LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        paint: {
          "circle-radius": [
            "case",
            ["boolean", ["get", "selected"], false],
            7,
            4,
          ],
          "circle-color": [
            "case",
            ["boolean", ["get", "selected"], false],
            "#dc2626",
            "#111827",
          ],
          "circle-stroke-width": 1.25,
          "circle-stroke-color": "#ffffff",
        },
      });

      map.addLayer({
        id: SELECTED_LAYER_ID,
        type: "circle",
        source: SOURCE_ID,
        filter: ["==", ["get", "selected"], true],
        paint: {
          "circle-radius": 10,
          "circle-color": "transparent",
          "circle-stroke-width": 2,
          "circle-stroke-color": "#dc2626",
        },
      });
    });

    map.on("click", LAYER_ID, (event) => {
      const feature = event.features?.[0];
      const id = feature?.properties?.id as string | undefined;
      if (!id) return;
      const point = pointsRef.current.find((entry) => entry.id === id);
      if (point) onSelectRef.current(point);
    });

    map.on("mouseenter", LAYER_ID, () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", LAYER_ID, () => {
      map.getCanvas().style.cursor = "";
    });

    mapRef.current = map;

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
    // Intentionally mount once — data updates handled below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateSource = () => {
      const source = map.getSource(SOURCE_ID) as maplibregl.GeoJSONSource | undefined;
      source?.setData(geojson);
    };

    if (map.isStyleLoaded()) {
      updateSource();
    } else {
      map.once("load", updateSource);
    }
  }, [geojson]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markerRef.current?.remove();
    markerRef.current = null;

    if (!selectedId) return;
    const selected = points.find((point) => point.id === selectedId);
    if (
      !selected ||
      typeof selected.lat !== "number" ||
      typeof selected.lon !== "number"
    ) {
      return;
    }

    const el = document.createElement("div");
    el.className =
      "max-w-40 truncate rounded bg-background px-1.5 py-0.5 text-xs font-medium shadow border border-border";
    el.textContent = selected.name;
    el.setAttribute("role", "img");
    el.setAttribute("aria-label", selected.name);

    markerRef.current = new maplibregl.Marker({
      element: el,
      anchor: "bottom",
      offset: [0, -10],
    })
      .setLngLat([selected.lon, selected.lat])
      .addTo(map);

    const duration = prefersReducedMotion() ? 0 : 500;
    map.easeTo({
      center: [selected.lon, selected.lat],
      zoom: Math.max(map.getZoom(), SELECTED_ZOOM),
      duration,
    });
  }, [selectedId, points]);

  return (
    <div
      className={cn(
        "relative h-72 w-full overflow-hidden rounded-lg border border-border bg-muted sm:h-96",
        className,
      )}
    >
      <div ref={containerRef} className="size-full" />
      <p className="sr-only">
        Map of {points.length} points. Selecting a marker selects the same
        entity in the list.
      </p>
    </div>
  );
};
