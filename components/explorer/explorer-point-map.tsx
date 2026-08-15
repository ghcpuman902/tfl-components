"use client";

import { useEffect, useMemo, useRef } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { cn } from "@/lib/utils";
import { useDocumentDark } from "@/hooks/use-document-dark";
import { openFreeMapStyleUrl } from "@/lib/tfl/geography-credits";
import type { ExplorerPoint } from "@/lib/tfl/explorer-point-normalise";

const LONDON_CENTER: [number, number] = [-0.128, 51.508];
const FALLBACK_ZOOM = 12;
const SELECTED_ZOOM = 15;
const SOURCE_ID = "explorer-points";
const LAYER_ID = "explorer-points-circle";
const LABEL_LAYER_ID = "explorer-points-label";

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

const stationCirclePaint = (dark: boolean) =>
  ({
    "circle-radius": [
      "case",
      ["boolean", ["get", "selected"], false],
      7,
      4,
    ],
    "circle-color": dark ? "#111827" : "#ffffff",
    "circle-stroke-width": [
      "case",
      ["boolean", ["get", "selected"], false],
      2,
      1.25,
    ],
    "circle-stroke-color": dark ? "#ffffff" : "#111827",
  }) as maplibregl.CircleLayerSpecification["paint"];

const stationLabelPaint = (dark: boolean) =>
  ({
    "text-color": dark ? "#ffffff" : "#111827",
    "text-halo-color": dark ? "#111827" : "#ffffff",
    "text-halo-width": 1.6,
  }) as maplibregl.SymbolLayerSpecification["paint"];

const addExplorerLayers = (map: maplibregl.Map, dark: boolean) => {
  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }

  if (!map.getLayer(LAYER_ID)) {
    map.addLayer({
      id: LAYER_ID,
      type: "circle",
      source: SOURCE_ID,
      paint: stationCirclePaint(dark),
    });
  }

  if (!map.getLayer(LABEL_LAYER_ID)) {
    map.addLayer({
      id: LABEL_LAYER_ID,
      type: "symbol",
      source: SOURCE_ID,
      layout: {
        "text-field": ["coalesce", ["get", "name"], ""],
        "text-font": ["Noto Sans Regular"],
        "text-size": 11,
        "text-offset": [0, 1.15],
        "text-anchor": "top",
        "text-max-width": 8,
        "text-allow-overlap": false,
        "text-optional": true,
        "text-padding": 2,
      },
      paint: stationLabelPaint(dark),
    });
  }
};

const selectPointFromEvent = (
  event: maplibregl.MapLayerMouseEvent,
  points: readonly ExplorerPoint[],
  onSelect: (point: ExplorerPoint) => void,
) => {
  const id = event.features?.[0]?.properties?.id as string | undefined;
  if (!id) return;
  const point = points.find((entry) => entry.id === id);
  if (point) onSelect(point);
};

const toExplorerGeojson = (
  points: readonly ExplorerPoint[],
  selectedId?: string | null,
) => ({
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
});

/**
 * Explorer-owned MapLibre adapter.
 * Circle + name layers for all points; selected is a larger TfL ring.
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
  const onSelectRef = useRef(onSelect);
  const pointsRef = useRef(points);
  const geojsonRef = useRef<ReturnType<typeof toExplorerGeojson> | null>(null);
  const dark = useDocumentDark();
  const skipStyleSwapRef = useRef(true);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  const geojson = useMemo(
    () => toExplorerGeojson(points, selectedId),
    [points, selectedId],
  );

  useEffect(() => {
    geojsonRef.current = geojson;
  }, [geojson]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    const map = new maplibregl.Map({
      container,
      style: openFreeMapStyleUrl(dark),
      center: LONDON_CENTER,
      zoom: FALLBACK_ZOOM,
      attributionControl: { compact: true },
      cooperativeGestures: true,
    });

    map.addControl(
      new maplibregl.NavigationControl({ showCompass: false }),
      "top-right",
    );

    const handlePointClick = (event: maplibregl.MapLayerMouseEvent) => {
      selectPointFromEvent(event, pointsRef.current, onSelectRef.current);
    };

    const handleEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const handleLeave = () => {
      map.getCanvas().style.cursor = "";
    };

    map.on("load", () => {
      addExplorerLayers(map, dark);
      const source = map.getSource(SOURCE_ID) as
        | maplibregl.GeoJSONSource
        | undefined;
      if (geojsonRef.current) source?.setData(geojsonRef.current);
      map.on("click", LAYER_ID, handlePointClick);
      map.on("click", LABEL_LAYER_ID, handlePointClick);
      map.on("mouseenter", LAYER_ID, handleEnter);
      map.on("mouseenter", LABEL_LAYER_ID, handleEnter);
      map.on("mouseleave", LAYER_ID, handleLeave);
      map.on("mouseleave", LABEL_LAYER_ID, handleLeave);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // Mount once — theme swaps via setStyle below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (skipStyleSwapRef.current) {
      skipStyleSwapRef.current = false;
      return;
    }

    const applyStyle = () => {
      addExplorerLayers(map, dark);
      const source = map.getSource(SOURCE_ID) as
        | maplibregl.GeoJSONSource
        | undefined;
      if (geojsonRef.current) source?.setData(geojsonRef.current);
    };

    map.setStyle(openFreeMapStyleUrl(dark));
    map.once("style.load", applyStyle);
    return () => {
      map.off("style.load", applyStyle);
    };
  }, [dark]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const updateSource = () => {
      const source = map.getSource(SOURCE_ID) as
        | maplibregl.GeoJSONSource
        | undefined;
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
    if (!map || !selectedId) return;
    const selected = points.find((point) => point.id === selectedId);
    if (
      !selected ||
      typeof selected.lat !== "number" ||
      typeof selected.lon !== "number"
    ) {
      return;
    }

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
        "relative h-full min-h-72 w-full overflow-hidden rounded-xl border border-border bg-muted",
        className,
      )}
    >
      <div ref={containerRef} className="size-full" />
      <p className="sr-only">
        Map of {points.length} points. Selecting a marker or name selects the
        same entity in the list.
      </p>
    </div>
  );
};
