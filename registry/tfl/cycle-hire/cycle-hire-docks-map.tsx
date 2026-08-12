"use client";

import { useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { cn } from "@/lib/utils";
import type { CycleHireDock } from "@/lib/tfl/cycle-hire-types";
import { useCycleHireDocksData } from "@/components/tfl/cycle-hire/cycle-hire-docks-context";
import { CycleHireDockMarker } from "@/components/tfl/cycle-hire/cycle-hire-dock-marker";
import { offsetLngLatSouth } from "@/components/tfl/cycle-hire/cycle-hire-map-camera";
import { StationName } from "@/components/tfl/station-name";

const CARTO_ATTRIBUTION = "© CARTO · © OpenStreetMap contributors";
/** Geographic London fallback, then south chrome/textbox compensation. */
const LONDON_CENTER = offsetLngLatSouth([-0.08, 51.507]);
const FALLBACK_ZOOM = 13;
/** Map pin label box — fit policy measures against this width. */
const LABEL_WIDTH_PX = 112;
const LABEL_FONT_SIZE_PX = 11;

type MapPadding = number | { top: number; bottom: number; left: number; right: number };

type MapProps = {
  /** Normalised bike points. Omit when rendered under `CycleHireDocks` / Provider. */
  data?: readonly CycleHireDock[];
  className?: string;
  /** Marker diameter in px. */
  markerSize?: number;
  /** Zoom controls (default true). Hide on compact proof surfaces. */
  showNavigation?: boolean;
  /** `fitBounds` padding in px (default 72). Use less / asymmetric on mini maps. */
  fitPadding?: MapPadding;
};

type MarkerEntry = {
  marker: maplibregl.Marker;
  root: Root;
  dock: CycleHireDock & { lat: number; lon: number };
};

/** Defer createRoot unmount — sync unmount during React render/cleanup races. */
const disposeMarkerEntry = (entry: MarkerEntry) => {
  entry.marker.remove();
  queueMicrotask(() => {
    entry.root.unmount();
  });
};

const hasCoordinates = (
  dock: CycleHireDock,
): dock is CycleHireDock & { lat: number; lon: number } =>
  typeof dock.lat === "number" &&
  Number.isFinite(dock.lat) &&
  typeof dock.lon === "number" &&
  Number.isFinite(dock.lon);

const DockMapPin = ({
  dock,
  size,
}: {
  dock: CycleHireDock;
  size: number;
}) => (
  <div className="flex flex-col items-center gap-0.5">
    <CycleHireDockMarker dock={dock} size={size} />
    <div
      className="bg-background/90 leading-none shadow-sm"
      style={{ width: LABEL_WIDTH_PX }}
    >
      <StationName
        name={dock.name}
        layout="auto"
        maxWidth={LABEL_WIDTH_PX}
        fontSize={LABEL_FONT_SIZE_PX}
        maxLines={2}
        allowAbbreviation
        allowScaleDown
        align="center"
        className="h-auto font-sans font-medium leading-none text-foreground"
      />
    </div>
  </div>
);

/**
 * OSM / MapLibre surface — circle-gauge markers at dock lat/lon.
 * Glance info only (bike / e-bike / space). Not linked to Detail selection.
 */
export const CycleHireDocksMap = ({
  data,
  className,
  markerSize = 48,
  showNavigation = true,
  fitPadding = 72,
}: MapProps) => {
  const docks = useCycleHireDocksData(data);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<MarkerEntry[]>([]);

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
            attribution: CARTO_ATTRIBUTION,
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

    if (showNavigation) {
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-right",
      );
    }
    mapRef.current = map;

    return () => {
      for (const entry of markersRef.current) {
        disposeMarkerEntry(entry);
      }
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [showNavigation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    let cancelled = false;

    const syncMarkers = () => {
      if (cancelled) return;

      const located = docks.filter(hasCoordinates);
      const nextById = new Map(located.map((dock) => [dock.id, dock]));
      const prevById = new Map(
        markersRef.current.map((entry) => [entry.dock.id, entry]),
      );

      for (const [id, entry] of prevById) {
        if (!nextById.has(id)) {
          disposeMarkerEntry(entry);
          markersRef.current = markersRef.current.filter(
            (item) => item.dock.id !== id,
          );
        }
      }

      const bounds = new maplibregl.LngLatBounds();
      const nextEntries: MarkerEntry[] = [];

      for (const dock of located) {
        const existing = prevById.get(dock.id);
        if (existing) {
          const moved =
            existing.dock.lat !== dock.lat || existing.dock.lon !== dock.lon;
          if (moved) {
            existing.marker.setLngLat([dock.lon, dock.lat]);
          }
          // Re-render in place — avoid createRoot teardown on every data tick.
          existing.root.render(<DockMapPin dock={dock} size={markerSize} />);
          existing.dock = dock;
          nextEntries.push(existing);
        } else {
          const el = document.createElement("div");
          const root = createRoot(el);
          root.render(<DockMapPin dock={dock} size={markerSize} />);
          const marker = new maplibregl.Marker({ element: el, anchor: "top" })
            .setLngLat([dock.lon, dock.lat])
            .addTo(map);
          nextEntries.push({ marker, root, dock });
        }
        bounds.extend([dock.lon, dock.lat]);
      }

      markersRef.current = nextEntries;

      if (located.length === 0) return;

      if (located.length === 1) {
        map.easeTo({
          center: offsetLngLatSouth([located[0].lon, located[0].lat]),
          zoom: 15,
          duration: 0,
        });
        return;
      }

      map.fitBounds(bounds, {
        padding: fitPadding,
        maxZoom: 16,
        duration: 0,
      });
      // fitBounds centres the geographic midpoint; nudge south so pin+label
      // clear chrome / textbox overlays (see cycle-hire-map-camera).
      const fitted = map.getCenter();
      map.setCenter(offsetLngLatSouth([fitted.lng, fitted.lat]));
    };

    if (map.isStyleLoaded()) {
      syncMarkers();
    } else {
      map.once("load", syncMarkers);
    }

    return () => {
      cancelled = true;
      map.off("load", syncMarkers);
    };
  }, [docks, markerSize, fitPadding]);

  const locatedCount = docks.filter(hasCoordinates).length;

  return (
    <div
      ref={containerRef}
      className={cn("h-[min(70vh,28rem)] w-full bg-muted", className)}
      role="region"
      aria-label={
        locatedCount === 0
          ? "Cycle hire map — no docks with coordinates"
          : `Cycle hire map — ${locatedCount} docks`
      }
    />
  );
};
