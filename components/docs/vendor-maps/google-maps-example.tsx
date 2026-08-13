"use client";

import { useEffect, useRef, useState } from "react";
import type { TransitGeometryBundle } from "@/lib/tfl/geography-types";
import { TRANSIT_GEOMETRY_PUBLIC_ASSETS } from "@/lib/tfl/geography-credits";

const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
const apiKey = googleMapsKey ? googleMapsKey.trim() : undefined;

const GoogleMapsPlaceholder = () => (
  <div
    className="flex h-40 items-center justify-center rounded-lg border border-dashed border-border bg-muted"
    role="img"
    aria-label="Google Maps example placeholder — requires API key"
  >
    <p className="px-4 text-center text-sm text-muted-foreground">
      Google Maps Data layer accepts GeoJSON directly. Set{" "}
      <code className="text-xs">NEXT_PUBLIC_GOOGLE_MAPS_KEY</code> in{" "}
      <code className="text-xs">.env.local</code> and restart the dev server to
      preview it here.
    </p>
  </div>
);

/**
 * Docs-only Google Maps vendor example. Live map loads only when
 * `NEXT_PUBLIC_GOOGLE_MAPS_KEY` is set; otherwise the dashed placeholder stays.
 * The Maps JS API is imported inside the effect so the SDK is not downloaded
 * without a key.
 */
export const GoogleMapsExample = () => {
  if (!apiKey) return <GoogleMapsPlaceholder />;
  return <GoogleMapsLiveMap apiKey={apiKey} />;
};

const GoogleMapsLiveMap = ({ apiKey }: { apiKey: string }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || mapRef.current) return;

    let cancelled = false;

    const previousAuthFailure = window.gm_authFailure;
    window.gm_authFailure = () => {
      setErrorMessage(
        "Google Maps API key rejected — enable Maps JavaScript API and allow http://localhost:3000/*",
      );
    };

    const handleInit = async () => {
      try {
        const { setOptions, importLibrary } = await import(
          "@googlemaps/js-api-loader"
        );
        setOptions({ key: apiKey, v: "weekly" });
        const { Map } = await importLibrary("maps");
        if (cancelled || !containerRef.current) return;

        const map = new Map(containerRef.current, {
          center: { lat: 51.51, lng: -0.12 },
          zoom: 10,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        mapRef.current = map;

        const bundles = await Promise.all(
          TRANSIT_GEOMETRY_PUBLIC_ASSETS.map(async (asset) => {
            const res = await fetch(asset.url);
            if (!res.ok) return null;
            return (await res.json()) as TransitGeometryBundle;
          }),
        );
        if (cancelled) return;

        for (const bundle of bundles) {
          if (!bundle) continue;
          map.data.addGeoJson(bundle.lines);
          map.data.addGeoJson(bundle.stations);
        }

        map.data.setStyle((feature) => {
          if (feature.getGeometry()?.getType() === "Point") {
            return {
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 3,
                fillColor: "#ffffff",
                fillOpacity: 1,
                strokeColor: "#111827",
                strokeWeight: 1.25,
              },
            };
          }
          const color = feature.getProperty("color");
          return {
            strokeColor: typeof color === "string" ? color : "#0019A8",
            strokeWeight: 3,
            strokeOpacity: 0.9,
            fillOpacity: 0,
          };
        });

        setLoaded(true);
      } catch (error) {
        if (cancelled) return;
        setErrorMessage(
          error instanceof Error ? error.message : "Google Maps failed to load",
        );
      }
    };

    void handleInit();

    return () => {
      cancelled = true;
      window.gm_authFailure = previousAuthFailure;
      mapRef.current = null;
      if (containerRef.current) {
        containerRef.current.replaceChildren();
      }
    };
  }, [apiKey]);

  return (
    <div className="space-y-2">
      <div
        ref={containerRef}
        className="h-80 w-full overflow-hidden rounded-lg border border-border bg-muted"
        role="img"
        aria-label="Google Maps example with TfL transit lines"
      />
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {errorMessage
          ? `Google Maps error: ${errorMessage}`
          : `Google Maps JavaScript API · NEXT_PUBLIC_GOOGLE_MAPS_KEY${loaded ? " · Loaded" : ""}`}
      </p>
    </div>
  );
};

declare global {
  interface Window {
    gm_authFailure?: () => void;
  }
}
