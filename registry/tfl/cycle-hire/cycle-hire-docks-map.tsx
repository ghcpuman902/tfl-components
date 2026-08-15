"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { createRoot, type Root } from "react-dom/client";
import { flushSync } from "react-dom";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { cn } from "@/lib/utils";
import type { CycleHireDock } from "@/lib/tfl/cycle-hire-types";
import { useCycleHireDocksData } from "@/components/tfl/cycle-hire/cycle-hire-docks-context";
import { CycleHireDockMarker } from "@/components/tfl/cycle-hire/cycle-hire-dock-marker";
import {
  CYCLE_HIRE_MAP_ATTRIBUTION_FALLBACK_PX,
  CYCLE_HIRE_MAP_FRAME_CLASSNAME,
  CYCLE_HIRE_MAP_LABEL_FONT_SIZE_PX,
  CYCLE_HIRE_MAP_LABEL_WIDTH_PX,
  clampCycleHireFitPadding,
  cycleHireFitPadding,
  resolveCycleHireLabelSides,
  type CycleHireLabelSide,
  type CycleHireMapEdgePadding,
} from "@/components/tfl/cycle-hire/cycle-hire-map-camera";
import { StationName } from "@/components/tfl/station-name";

/** OpenFreeMap vector styles — inlined so the registry stays self-contained. */
const OPENFREEMAP_POSITRON_STYLE_URL =
  "https://tiles.openfreemap.org/styles/positron";
const OPENFREEMAP_DARK_STYLE_URL =
  "https://tiles.openfreemap.org/styles/dark";
const openFreeMapStyleUrl = (dark: boolean) =>
  dark ? OPENFREEMAP_DARK_STYLE_URL : OPENFREEMAP_POSITRON_STYLE_URL;

const subscribeDocumentDark = (onStoreChange: () => void) => {
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
};
const getDocumentDark = () =>
  document.documentElement.classList.contains("dark");
const LONDON_CENTER: [number, number] = [-0.08, 51.507];
const FALLBACK_ZOOM = 13;
const SINGLE_DOCK_ZOOM = 15;
const MULTI_DOCK_MAX_ZOOM = 16;

type MapPadding = number | CycleHireMapEdgePadding;

type MapProps = {
  /** Normalised bike points. Omit when rendered under `CycleHireDocks` / Provider. */
  data?: readonly CycleHireDock[];
  className?: string;
  /** Marker diameter in px. */
  markerSize?: number;
  /** Zoom controls (default true). Hide on compact proof surfaces. */
  showNavigation?: boolean;
  /**
   * Optional `fitBounds` padding override. When omitted, padding is derived
   * from measured pin + label + attribution via `cycleHireFitPadding`.
   */
  fitPadding?: MapPadding;
};

type MarkerEntry = {
  marker: maplibregl.Marker;
  root: Root;
  dock: CycleHireDock & { lat: number; lon: number };
  labelSide: CycleHireLabelSide;
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
  labelSide,
}: {
  dock: CycleHireDock;
  size: number;
  labelSide: CycleHireLabelSide;
}) => (
  <div className="relative" style={{ width: size, height: size }}>
    <CycleHireDockMarker dock={dock} size={size} />
    <div
      className={cn(
        "absolute left-1/2 z-1 -translate-x-1/2 bg-background/90 leading-none shadow-sm",
        labelSide === "below" ? "top-full mt-0.5" : "bottom-full mb-0.5",
      )}
      style={{ width: CYCLE_HIRE_MAP_LABEL_WIDTH_PX }}
    >
      <StationName
        name={dock.name}
        layout="auto"
        maxWidth={CYCLE_HIRE_MAP_LABEL_WIDTH_PX}
        fontSize={CYCLE_HIRE_MAP_LABEL_FONT_SIZE_PX}
        maxLines={2}
        allowAbbreviation
        allowScaleDown
        align="center"
        className="h-auto font-sans font-medium leading-none text-foreground"
      />
    </div>
  </div>
);

const paintPin = (entry: MarkerEntry, markerSize: number) => {
  entry.root.render(
    <DockMapPin
      dock={entry.dock}
      size={markerSize}
      labelSide={entry.labelSide}
    />,
  );
};

const measureAttributionHeight = (container: HTMLElement): number => {
  const attrib = container.querySelector(".maplibregl-ctrl-attrib");
  if (!(attrib instanceof HTMLElement)) {
    return CYCLE_HIRE_MAP_ATTRIBUTION_FALLBACK_PX;
  }
  return Math.max(
    attrib.getBoundingClientRect().height,
    CYCLE_HIRE_MAP_ATTRIBUTION_FALLBACK_PX,
  );
};

const resolveFitPadding = (
  map: maplibregl.Map,
  container: HTMLElement,
  markerSize: number,
  showNavigation: boolean,
  fitPadding: MapPadding | undefined,
  labelClearance: "below" | "both" = "below",
): MapPadding => {
  if (fitPadding != null) return fitPadding;
  const padding = cycleHireFitPadding(markerSize, {
    showNavigation,
    labelClearance,
    attributionHeight: measureAttributionHeight(container),
  });
  const canvas = map.getCanvas();
  return clampCycleHireFitPadding(
    padding,
    canvas.clientWidth,
    canvas.clientHeight,
  );
};

const fitDocksCamera = (
  map: maplibregl.Map,
  located: readonly (CycleHireDock & { lat: number; lon: number })[],
  padding: MapPadding,
) => {
  if (located.length === 0) return;

  if (located.length === 1) {
    const dock = located[0];
    map.easeTo({
      center: [dock.lon, dock.lat],
      zoom: SINGLE_DOCK_ZOOM,
      padding,
      duration: 0,
    });
    return;
  }

  const bounds = new maplibregl.LngLatBounds();
  for (const dock of located) {
    bounds.extend([dock.lon, dock.lat]);
  }
  map.fitBounds(bounds, {
    padding,
    maxZoom: MULTI_DOCK_MAX_ZOOM,
    duration: 0,
  });
};

/**
 * OpenFreeMap vector Positron / MapLibre surface — circle-gauge markers at dock lat/lon.
 * Glance info only (bike / e-bike / space). Not linked to Detail selection.
 * Camera fits once when the map has a real size and docks are on the canvas.
 */
export const CycleHireDocksMap = ({
  data,
  className,
  markerSize = 48,
  showNavigation = true,
  fitPadding,
}: MapProps) => {
  const docks = useCycleHireDocksData(data);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<MarkerEntry[]>([]);
  const hasFittedRef = useRef(false);
  const skipStyleSwapRef = useRef(true);
  const dark = useSyncExternalStore(
    subscribeDocumentDark,
    getDocumentDark,
    () => false,
  );

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

    if (showNavigation) {
      map.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        "top-right",
      );
    }
    mapRef.current = map;
    hasFittedRef.current = false;

    return () => {
      for (const entry of markersRef.current) {
        disposeMarkerEntry(entry);
      }
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
      hasFittedRef.current = false;
    };
    // Initial style from first `dark` snapshot; swaps happen below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showNavigation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (skipStyleSwapRef.current) {
      skipStyleSwapRef.current = false;
      return;
    }
    map.setStyle(openFreeMapStyleUrl(dark));
  }, [dark]);

  useEffect(() => {
    const map = mapRef.current;
    const container = containerRef.current;
    if (!map || !container) return;

    let cancelled = false;
    let observer: ResizeObserver | null = null;

    const syncMarkers = () => {
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

      const nextEntries: MarkerEntry[] = [];

      for (const dock of located) {
        const existing = prevById.get(dock.id);
        if (existing) {
          const moved =
            existing.dock.lat !== dock.lat || existing.dock.lon !== dock.lon;
          if (moved) {
            existing.marker.setLngLat([dock.lon, dock.lat]);
          }
          existing.dock = dock;
          paintPin(existing, markerSize);
          nextEntries.push(existing);
        } else {
          const el = document.createElement("div");
          const root = createRoot(el);
          const marker = new maplibregl.Marker({
            element: el,
            anchor: "center",
          })
            .setLngLat([dock.lon, dock.lat])
            .addTo(map);
          const entry: MarkerEntry = {
            marker,
            root,
            dock,
            labelSide: "below",
          };
          if (!hasFittedRef.current) {
            flushSync(() => {
              paintPin(entry, markerSize);
            });
          } else {
            paintPin(entry, markerSize);
          }
          nextEntries.push(entry);
        }
      }

      markersRef.current = nextEntries;
      return located;
    };

    const applyLabelSides = () => {
      if (cancelled) return;
      const canvas = map.getCanvas();
      const sides = resolveCycleHireLabelSides(
        markersRef.current.map((entry) => {
          const point = map.project([entry.dock.lon, entry.dock.lat]);
          return { id: entry.dock.id, x: point.x, y: point.y };
        }),
        {
          markerSize,
          mapWidth: canvas.clientWidth,
          mapHeight: canvas.clientHeight,
          attributionHeight: measureAttributionHeight(container),
        },
      );
      let flippedUp = false;
      for (const entry of markersRef.current) {
        const nextSide = sides.get(entry.dock.id) ?? "below";
        if (nextSide === "above") flippedUp = true;
        if (entry.labelSide === nextSide) continue;
        entry.labelSide = nextSide;
        paintPin(entry, markerSize);
      }
      return flippedUp;
    };

    const tryInitialFit = (
      located: readonly (CycleHireDock & { lat: number; lon: number })[],
    ) => {
      if (cancelled || hasFittedRef.current || located.length === 0) return true;
      const { width, height } = container.getBoundingClientRect();
      if (width < 2 || height < 2) return false;
      map.resize();
      const padding = resolveFitPadding(
        map,
        container,
        markerSize,
        showNavigation,
        fitPadding,
      );
      fitDocksCamera(map, located, padding);
      hasFittedRef.current = true;
      const flippedUp = applyLabelSides();
      if (flippedUp && fitPadding == null) {
        fitDocksCamera(
          map,
          located,
          resolveFitPadding(
            map,
            container,
            markerSize,
            showNavigation,
            undefined,
            "both",
          ),
        );
        applyLabelSides();
      }
      return true;
    };

    const run = () => {
      if (cancelled) return;
      const located = syncMarkers();
      if (tryInitialFit(located)) {
        observer?.disconnect();
        observer = null;
        return;
      }
      if (observer) return;
      observer = new ResizeObserver(() => {
        if (tryInitialFit(located)) {
          observer?.disconnect();
          observer = null;
        }
      });
      observer.observe(container);
    };

    if (map.isStyleLoaded()) {
      run();
    } else {
      map.once("load", run);
    }

    const handleMoveEnd = () => {
      if (!hasFittedRef.current) return;
      applyLabelSides();
    };
    map.on("moveend", handleMoveEnd);

    return () => {
      cancelled = true;
      observer?.disconnect();
      map.off("load", run);
      map.off("moveend", handleMoveEnd);
    };
  }, [docks, markerSize, fitPadding, showNavigation]);

  const locatedCount = docks.filter(hasCoordinates).length;

  return (
    <div
      ref={containerRef}
      className={cn("bg-muted", CYCLE_HIRE_MAP_FRAME_CLASSNAME, className)}
      role="region"
      aria-label={
        locatedCount === 0
          ? "Cycle hire map — no docks with coordinates"
          : `Cycle hire map — ${locatedCount} docks`
      }
    />
  );
};
