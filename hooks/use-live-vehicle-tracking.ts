"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createBrowserTflClient } from "@/lib/tfl/browser-tfl-client";
import { translateTflClientError } from "@/lib/tfl/tfl-error-translation";
import {
  selectArrivalsDataPath,
  shouldPausePollingForVisibility,
  type DualPathSource,
} from "@/lib/tfl/dual-path-arrivals";
import { useUserTflCredentials } from "@/components/user-tfl-credentials-provider";
import { TFL_MODAL_COLOURS } from "@/lib/tfl/brand-colours";
import type { BusRouteGeometry } from "@/lib/tfl/bus-geography-types";
import {
  bodsActivitiesToVehicles,
  resolveBusPositionSource,
  type BodsVehicleActivity,
  type BusPositionSource,
} from "@/lib/tfl/bods-siri-vm";
import type { LiveVehiclesSnapshot } from "@/lib/tfl/live-vehicles-payload";
import {
  algorithmForGraph,
  ingestVehicleHops,
  type VehicleAlgorithm,
  type VehicleHopTrack,
} from "@/lib/tfl/vehicle-hop-engine";
import {
  hopGraphForRailLine,
  hopGraphFromOrderedStops,
  type HopGraph,
} from "@/lib/tfl/vehicle-hop-graph";
import type { VehiclePosition } from "@/lib/tfl/map-vehicles";
import {
  computeBatchedPollIntervalMs,
  SITE_POLL_MS,
  type TargetRequestsPerMinute,
} from "@/lib/tfl/vehicle-poll-rate";
import {
  railPolylinesForLines,
  railStationsById,
  railVehicleColor,
} from "@/lib/tfl/rail-vehicle-geometry";

const NO_KEY_MESSAGE =
  "Add a TfL API key to load live vehicles with your quota.";
const INVALID_KEY_MESSAGE =
  "Your TfL API key was rejected. Replace or clear it in the sidebar.";

export type LiveVehiclesResponse =
  | { ok: true; data: LiveVehiclesSnapshot }
  | { ok: false; error: string };

export type LineAlgorithmRow = {
  lineId: string;
  domain: "rail" | "bus";
  algorithm: VehicleAlgorithm;
};

export type UseLiveVehicleTrackingOptions = {
  railLineIds?: readonly string[];
  busRouteIds?: readonly string[];
  targetRequestsPerMinute?: TargetRequestsPerMinute;
  busPositionSource?: BusPositionSource;
  initial?: LiveVehiclesSnapshot;
};

export type UseLiveVehicleTrackingResult = {
  rail: VehiclePosition[];
  bus: VehiclePosition[];
  algorithms: LineAlgorithmRow[];
  busGeometries: BusRouteGeometry[];
  fetchedAt: number | null;
  loading: boolean;
  error: string | null;
  source: DualPathSource;
  pollIntervalMs: number;
  resolvedBusSource: "gps" | "dead-reckoning";
  bodsConfigured: boolean;
};

const uniqueIds = (ids: readonly string[] | undefined): string[] =>
  [...new Set((ids ?? []).map((id) => id.trim()).filter(Boolean))];

const fetchSiteSnapshot = async (
  railLineIds: readonly string[],
  busRouteIds: readonly string[],
): Promise<LiveVehiclesResponse> => {
  try {
    const params = new URLSearchParams();
    if (railLineIds.length) params.set("rail", railLineIds.join(","));
    if (busRouteIds.length) params.set("bus", busRouteIds.join(","));
    const response = await fetch(`/api/live-vehicles?${params}`, {
      cache: "no-store",
    });
    const body = (await response.json()) as LiveVehiclesResponse;
    if (!response.ok && !("ok" in body)) {
      return { ok: false, error: "Failed to load live vehicles." };
    }
    return body;
  } catch {
    return { ok: false, error: "Failed to load live vehicles." };
  }
};

const colorVehicles = (
  vehicles: VehiclePosition[],
  colorFor: (lineId: string) => string,
): VehiclePosition[] =>
  vehicles.map((vehicle) => ({
    ...vehicle,
    color: vehicle.color ?? colorFor(vehicle.lineId),
  }));

export const useLiveVehicleTracking = ({
  railLineIds,
  busRouteIds,
  targetRequestsPerMinute = "max",
  busPositionSource = "auto",
  initial,
}: UseLiveVehicleTrackingOptions = {}): UseLiveVehicleTrackingResult => {
  const railKey = uniqueIds(railLineIds).join(",");
  const busKey = uniqueIds(busRouteIds).join(",");
  const railIds = useMemo(
    () => (railKey ? railKey.split(",") : []),
    [railKey],
  );
  const busIds = useMemo(
    () => (busKey ? busKey.split(",") : []),
    [busKey],
  );

  const { status, getAppKey, markInvalid } = useUserTflCredentials();
  const source = selectArrivalsDataPath(status);
  const isInvalid = status === "invalid";

  const userPollMs = computeBatchedPollIntervalMs({
    targetRequestsPerMinute,
    requestsPerTick: (railIds.length > 0 ? 1 : 0) + (busIds.length > 0 ? 1 : 0) || 1,
  });
  const pollIntervalMs = source === "user" ? userPollMs : SITE_POLL_MS;

  const stationsById = useMemo(() => railStationsById(), []);
  const railPolylines = useMemo(
    () => railPolylinesForLines(railIds),
    [railIds],
  );
  const railGraphs = useMemo(() => {
    const map = new Map<string, HopGraph>();
    for (const id of railIds) map.set(id, hopGraphForRailLine(id));
    return map;
  }, [railIds]);

  const tracksRef = useRef<Map<string, VehicleHopTrack>>(new Map());
  const stationsRef = useRef(stationsById);
  const railPolylinesRef = useRef(railPolylines);
  const railGraphsRef = useRef(railGraphs);
  const [rail, setRail] = useState<VehiclePosition[]>([]);
  const [bus, setBus] = useState<VehiclePosition[]>([]);
  const [busGeometries, setBusGeometries] = useState<BusRouteGeometry[]>(
    () => initial?.busGeometries ?? [],
  );
  const busGeometriesRef = useRef(busGeometries);
  const [fetchedAt, setFetchedAt] = useState<number | null>(
    initial?.fetchedAt ?? null,
  );
  const [loading, setLoading] = useState(initial == null);
  const [error, setError] = useState<string | null>(null);
  const [bodsConfigured, setBodsConfigured] = useState(
    initial?.bodsConfigured ?? false,
  );

  useEffect(() => {
    stationsRef.current = stationsById;
    railPolylinesRef.current = railPolylines;
    railGraphsRef.current = railGraphs;
    busGeometriesRef.current = busGeometries;
  });

  const busGraphs = useMemo(() => {
    const map = new Map<string, HopGraph>();
    for (const geometry of busGeometries) {
      map.set(
        geometry.routeId,
        hopGraphFromOrderedStops(geometry.stops.map((stop) => stop.id)),
      );
    }
    return map;
  }, [busGeometries]);

  const resolvedBusSource = resolveBusPositionSource(
    busPositionSource,
    bodsConfigured,
  );

  const algorithms = useMemo<LineAlgorithmRow[]>(() => {
    const rows: LineAlgorithmRow[] = railIds.map((lineId) => ({
      lineId,
      domain: "rail",
      algorithm: algorithmForGraph(railGraphs.get(lineId) ?? null),
    }));
    for (const id of busIds) {
      rows.push({
        lineId: id,
        domain: "bus",
        algorithm: algorithmForGraph(
          busGraphs.get(id) ?? null,
          resolvedBusSource,
        ),
      });
    }
    return rows;
  }, [railIds, busIds, railGraphs, busGraphs, resolvedBusSource]);

  const placeSnapshot = (
    snapshot: Pick<
      LiveVehiclesSnapshot,
      "railPredictions" | "busPredictions" | "fetchedAt"
    > & {
      bodsActivities?: readonly BodsVehicleActivity[];
    },
    geometries: BusRouteGeometry[] = busGeometriesRef.current,
  ) => {
    const asOf = snapshot.fetchedAt;
    const graphs = railGraphsRef.current;
    const railPlaced = colorVehicles(
      ingestVehicleHops({
        tracks: tracksRef.current,
        predictions: snapshot.railPredictions,
        stationsById: stationsRef.current,
        polylines: railPolylinesRef.current,
        graphForLine: (lineId) => graphs.get(lineId) ?? null,
        asOf,
      }),
      railVehicleColor,
    );
    const gps =
      busPositionSource === "dead-reckoning"
        ? []
        : bodsActivitiesToVehicles(
            snapshot.bodsActivities ?? [],
            busIds,
            asOf,
          );
    let busPlaced: VehiclePosition[];
    if (gps.length > 0) {
      busPlaced = colorVehicles(gps, () => TFL_MODAL_COLOURS.buses.hex);
    } else {
      const busStations = new Map(
        geometries.flatMap((geometry) =>
          geometry.stops.map((stop) => [
            stop.id,
            { lat: stop.lat, lon: stop.lon },
          ]),
        ),
      );
      const busPolylines = geometries.flatMap((geometry) =>
        geometry.segments.map((segment) => ({
          lineId: geometry.routeId,
          line: segment.line,
        })),
      );
      const busGraphMap = new Map<string, HopGraph>();
      for (const geometry of geometries) {
        busGraphMap.set(
          geometry.routeId,
          hopGraphFromOrderedStops(geometry.stops.map((stop) => stop.id)),
        );
      }
      busPlaced = colorVehicles(
        ingestVehicleHops({
          tracks: tracksRef.current,
          predictions: snapshot.busPredictions,
          stationsById: busStations,
          polylines: busPolylines,
          graphForLine: (lineId) => busGraphMap.get(lineId) ?? null,
          asOf,
        }),
        () => TFL_MODAL_COLOURS.buses.hex,
      );
    }
    setRail(railPlaced);
    setBus(busPlaced);
    setFetchedAt(asOf);
    setLoading(false);
    setError(null);
  };

  useEffect(() => {
    if (initial) placeSnapshot(initial, initial.busGeometries);
    // Seed once from SSR payload.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isInvalid) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let paused = false;

    const clearTimer = () => {
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
    };

    const applyFailure = (message: string) => {
      if (cancelled) return;
      setError(message);
      setLoading(false);
    };

    const schedule = (fn: () => void, delayMs: number) => {
      clearTimer();
      if (cancelled || paused) return;
      timer = setTimeout(fn, delayMs);
    };

    const runSite = async () => {
      if (cancelled || paused) return;
      const result = await fetchSiteSnapshot(railIds, busIds);
      if (cancelled || paused) return;
      if (!result.ok) {
        applyFailure(result.error);
      } else {
        setBusGeometries(result.data.busGeometries);
        busGeometriesRef.current = result.data.busGeometries;
        setBodsConfigured(result.data.bodsConfigured);
        placeSnapshot(result.data, result.data.busGeometries);
      }
      schedule(() => void runSite(), SITE_POLL_MS);
    };

    const runUser = async () => {
      const appKey = getAppKey();
      if (!appKey) {
        applyFailure(NO_KEY_MESSAGE);
        return;
      }
      let client;
      try {
        client = await createBrowserTflClient(appKey);
      } catch (caught) {
        if (cancelled) return;
        const translated = translateTflClientError(caught, [appKey]);
        if (
          translated.kind === "invalid-key" ||
          translated.kind === "rate-limited"
        ) {
          markInvalid(translated);
        }
        applyFailure(translated.message);
        return;
      }
      if (cancelled) return;

      if (busGeometries.length === 0 && busIds.length > 0) {
        const seed = await fetchSiteSnapshot(railIds, busIds);
        if (cancelled) return;
        if (seed.ok) {
          setBusGeometries(seed.data.busGeometries);
          busGeometriesRef.current = seed.data.busGeometries;
          setBodsConfigured(seed.data.bodsConfigured);
        }
      }

      const poll = async () => {
        if (cancelled || paused) return;
        try {
          const [railPredictions, busPredictions, site] = await Promise.all([
            railIds.length
              ? client.line.getArrivals({ lineIds: railIds })
              : Promise.resolve([]),
            busIds.length
              ? client.line.getArrivals({ lineIds: busIds })
              : Promise.resolve([]),
            busIds.length && busPositionSource !== "dead-reckoning"
              ? fetchSiteSnapshot(railIds, busIds)
              : Promise.resolve(null),
          ]);
          if (cancelled || paused) return;
          if (site?.ok) {
            setBusGeometries(site.data.busGeometries);
            busGeometriesRef.current = site.data.busGeometries;
            setBodsConfigured(site.data.bodsConfigured);
          }
          placeSnapshot(
            {
              railPredictions,
              busPredictions,
              bodsActivities: site?.ok ? site.data.bodsActivities : [],
              fetchedAt: Date.now(),
            },
            site?.ok ? site.data.busGeometries : busGeometriesRef.current,
          );
        } catch (caught) {
          if (cancelled) return;
          const translated = translateTflClientError(caught, [appKey]);
          if (
            translated.kind === "invalid-key" ||
            translated.kind === "rate-limited"
          ) {
            markInvalid(translated);
          }
          applyFailure(translated.message);
        }
        schedule(() => void poll(), userPollMs);
      };
      void poll();
    };

    const handleVisibility = () => {
      const hidden = shouldPausePollingForVisibility(document.visibilityState);
      if (hidden) {
        paused = true;
        clearTimer();
        return;
      }
      paused = false;
      if (source === "site") void runSite();
      else void runUser();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    if (shouldPausePollingForVisibility(document.visibilityState)) {
      paused = true;
    } else if (source === "site") {
      void runSite();
    } else {
      void runUser();
    }

    return () => {
      cancelled = true;
      clearTimer();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
    // busGeometries are stored on a ref; a length change must not restart polling.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    railIds,
    busIds,
    source,
    isInvalid,
    getAppKey,
    markInvalid,
    userPollMs,
    busPositionSource,
  ]);

  if (isInvalid) {
    return {
      rail: [],
      bus: [],
      algorithms,
      busGeometries,
      fetchedAt,
      loading: false,
      error: INVALID_KEY_MESSAGE,
      source,
      pollIntervalMs,
      resolvedBusSource,
      bodsConfigured,
    };
  }

  return {
    rail,
    bus,
    algorithms,
    busGeometries,
    fetchedAt,
    loading,
    error,
    source,
    pollIntervalMs,
    resolvedBusSource,
    bodsConfigured,
  };
};
