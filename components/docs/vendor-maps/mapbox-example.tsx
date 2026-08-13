"use client";

import { useEffect, useRef, useState } from "react";
import type { Map as MapboxMap } from "mapbox-gl";
import type { TransitGeometryBundle } from "@/lib/tfl/geography-types";
import { TRANSIT_GEOMETRY_PUBLIC_ASSETS } from "@/lib/tfl/geography-credits";

const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const accessToken = mapboxToken ? mapboxToken.trim() : undefined;

const MapboxPlaceholder = () => (
  <div
    className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border bg-muted"
    role="img"
    aria-label="Mapbox example placeholder — requires access token"
  >
    <p className="px-4 text-center text-sm text-muted-foreground">
      Mapbox GL JS renders with the same GeoJSON. Set{" "}
      <code className="text-xs">NEXT_PUBLIC_MAPBOX_TOKEN</code> in{" "}
      <code className="text-xs">.env.local</code> and restart the dev server to
      preview it here.
    </p>
  </div>
);

/**
 * Docs-only Mapbox vendor example. Live map loads only when
 * `NEXT_PUBLIC_MAPBOX_TOKEN` is set; otherwise the dashed placeholder stays.
 * `mapbox-gl` is imported inside the effect so the SDK is not downloaded
 * without a token.
 */
export const MapboxExample = () => {
  if (!accessToken) return <MapboxPlaceholder />;
  return <MapboxLiveMap accessToken={accessToken} />;
};

const MapboxLiveMap = ({ accessToken }: { accessToken: string }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    let cancelled = false;
    let map: MapboxMap | null = null;

    const handleInit = async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      await import("mapbox-gl/dist/mapbox-gl.css");
      if (cancelled || !containerRef.current) return;

      if (!mapboxgl) {
        setErrorMessage("mapbox-gl failed to load");
        return;
      }

      mapboxgl.accessToken = accessToken;
      map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [-0.12, 51.51],
        zoom: 10.2,
        attributionControl: true,
      });
      mapRef.current = map;
      map.addControl(
        new mapboxgl.NavigationControl({ showCompass: false }),
        "top-right",
      );

      map.on("error", (event) => {
        const message =
          event.error instanceof Error
            ? event.error.message
            : "Mapbox failed to load";
        setErrorMessage(message);
      });

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
            (
              item,
            ): item is {
              mode: (typeof TRANSIT_GEOMETRY_PUBLIC_ASSETS)[number]["mode"];
              bundle: TransitGeometryBundle;
            } => item != null,
          );
          if (cancelled || !map) return;

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
          if (!cancelled) {
            setErrorMessage("Geometry load failed");
          }
        }
      });
    };

    void handleInit();

    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
  }, [accessToken]);

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="h-80 w-full overflow-hidden rounded-lg border border-border bg-muted"
        role="img"
        aria-label="Mapbox GL JS example with TfL transit lines"
      />
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {errorMessage
          ? `Mapbox error: ${errorMessage}`
          : `Mapbox GL JS · light-v11 · NEXT_PUBLIC_MAPBOX_TOKEN${loaded ? " · Loaded" : ""}`}
      </p>
    </div>
  );
};
