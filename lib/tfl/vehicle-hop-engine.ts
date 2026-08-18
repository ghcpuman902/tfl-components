import type { LineString } from "geojson";
import type { RealtimePrediction } from "tfl-ts";
import type { VehiclePosition } from "@/lib/tfl/map-vehicles";
import {
  areAdjacent,
  hopGraphForRailLine,
  hopGraphHasEdges,
  uniqueIncoming,
  type HopGraph,
} from "@/lib/tfl/vehicle-hop-graph";
import {
  hopLengthKm,
  pathTurnBetween,
  pickHopPolyline,
  positionBehindStop,
  remainingKmForHop,
  vehicleSpeedMetersPerSec,
  type RoutePolyline,
  type StationCoord,
} from "@/lib/tfl/vehicle-progress";
import {
  DEFAULT_VEHICLE_VISCOSITY,
  stillDwelling,
  viscousDrainKm,
  type VehicleViscosityParams,
} from "@/lib/tfl/vehicle-viscosity";

export type VehicleAlgorithm =
  | "branch-aware"
  | "simple-hop-lock"
  | "gps"
  | "dead-reckoning";

export type VehicleHopTrack = {
  lineId: string;
  vehicleId: string;
  toStationId: string;
  fromStationId?: string;
  branchId?: string;
  remainingKm: number;
  hopDurationSecEstimate: number;
  lastSeenAsOf: number;
  dueSinceMs?: number;
  destinationName: string;
  nextStopLat: number;
  nextStopLon: number;
  followingStopLat?: number;
  followingStopLon?: number;
  /** Epoch ms when remaining km first hit 0 on this hop. */
  arrivedAtMs?: number;
};

export const vehicleTrackKey = (lineId: string, vehicleId: string): string =>
  `${lineId}:${vehicleId}`;

export const algorithmForGraph = (
  graph: HopGraph | null,
  busSource: "gps" | "dead-reckoning" = "dead-reckoning",
): VehicleAlgorithm => {
  if (busSource === "gps") return "gps";
  if (!graph || !hopGraphHasEdges(graph)) return "dead-reckoning";
  return graph.branched ? "branch-aware" : "simple-hop-lock";
};

const DUE_TTS_SEC = 2;
const STALE_DUE_MS = 50_000;

type GroupedPrediction = {
  vehicleId: string;
  lineId: string;
  rows: RealtimePrediction[];
};

const groupPredictions = (
  predictions: readonly RealtimePrediction[],
): GroupedPrediction[] => {
  const groups = new Map<string, GroupedPrediction>();
  for (const prediction of predictions) {
    const vehicleId = prediction.vehicleId?.trim();
    if (!vehicleId) continue;
    const lineId = prediction.lineId?.trim() ?? "";
    const key = vehicleTrackKey(lineId, vehicleId);
    const existing = groups.get(key);
    if (existing) existing.rows.push(prediction);
    else groups.set(key, { vehicleId, lineId, rows: [prediction] });
  }
  const out: GroupedPrediction[] = [];
  for (const group of groups.values()) {
    group.rows.sort(
      (a, b) => (a.timeToStation ?? 9e9) - (b.timeToStation ?? 9e9),
    );
    out.push(group);
  }
  return out;
};

const remainingFromEta = (
  lineId: string,
  timeToNextSec: number,
  hopKm?: number,
  hopMinutes?: number,
): number =>
  remainingKmForHop({
    lineId,
    timeToNextSec,
    hopKm,
    hopMinutes,
  });

const hopLookup = (
  polylines: readonly (LineString | RoutePolyline)[],
  fromId: string | undefined,
  toId: string,
  graph: HopGraph | null,
) =>
  pickHopPolyline(
    polylines,
    fromId,
    toId,
    graph?.canonical,
  );

const hopKmBetween = ({
  from,
  to,
  fromId,
  toId,
  lineId,
  polylines,
  graph,
}: {
  from?: StationCoord;
  to: StationCoord;
  fromId?: string;
  toId: string;
  lineId: string;
  polylines: readonly (LineString | RoutePolyline)[];
  graph: HopGraph | null;
}): { hopKm?: number; hopMinutes?: number } => {
  const hop = hopLookup(polylines, fromId, toId, graph);
  if (hop) {
    const hopKm = hopLengthKm({
      from: from ?? to,
      to,
      lineId,
      polylines: [hop],
      fromStopId: fromId,
      toStopId: toId,
      canonical: graph?.canonical,
    });
    return {
      hopKm: hopKm > 0 ? hopKm : undefined,
      hopMinutes: hop.hopMinutes,
    };
  }
  if (!from) return {};
  const hopKm = hopLengthKm({
    from,
    to,
    lineId,
    polylines,
    fromStopId: fromId,
    toStopId: toId,
    canonical: graph?.canonical,
  });
  return { hopKm: hopKm > 0 ? hopKm : undefined };
};

const coastRemaining = (
  track: VehicleHopTrack,
  nowMs: number,
  lineId: string,
  viscosity?: VehicleViscosityParams,
): number => {
  const elapsedSec = Math.max(0, (nowMs - track.lastSeenAsOf) / 1000);
  return viscousDrainKm({
    remainingKm: track.remainingKm,
    elapsedSec,
    speedMetersPerSec: vehicleSpeedMetersPerSec(lineId),
    params: viscosity,
  }).remainingKm;
};

const markArrival = (
  track: VehicleHopTrack,
  asOf: number,
): VehicleHopTrack =>
  track.remainingKm <= 0
    ? { ...track, remainingKm: 0, arrivedAtMs: track.arrivedAtMs ?? asOf }
    : { ...track, arrivedAtMs: undefined };

const toPosition = (
  track: VehicleHopTrack,
  placed: { lat: number; lon: number; bearingDeg: number },
  timeToNextStationSec: number,
  asOf: number,
): VehiclePosition => ({
  vehicleId: track.vehicleId,
  lineId: track.lineId,
  lat: placed.lat,
  lon: placed.lon,
  bearingDeg: placed.bearingDeg,
  destinationName: track.destinationName,
  timeToNextStationSec,
  asOf,
  nextStopLat: track.nextStopLat,
  nextStopLon: track.nextStopLon,
  followingStopLat: track.followingStopLat,
  followingStopLon: track.followingStopLon,
  nextStopId: track.toStationId,
  fromStopId: track.fromStationId,
  remainingKm: track.remainingKm,
  arrivedAtMs: track.arrivedAtMs,
});

const placeTrack = (
  track: VehicleHopTrack,
  polylines: readonly (LineString | RoutePolyline)[],
  graph: HopGraph | null,
): { lat: number; lon: number; bearingDeg: number } =>
  positionBehindStop({
    nextStop: { lat: track.nextStopLat, lon: track.nextStopLon },
    followingStop:
      track.followingStopLat != null && track.followingStopLon != null
        ? { lat: track.followingStopLat, lon: track.followingStopLon }
        : undefined,
    remainingKm: track.remainingKm,
    lineId: track.lineId,
    polylines,
    fromStopId: track.fromStationId,
    toStopId: track.toStationId,
    canonical: graph?.canonical,
  });

const seedTrack = ({
  lineId,
  vehicleId,
  toStationId,
  nextStop,
  followingStop,
  timeToNextSec,
  destinationName,
  asOf,
  graph,
  polylines,
}: {
  lineId: string;
  vehicleId: string;
  toStationId: string;
  nextStop: StationCoord;
  followingStop?: StationCoord;
  timeToNextSec: number;
  destinationName: string;
  asOf: number;
  graph: HopGraph | null;
  polylines: readonly (LineString | RoutePolyline)[];
}): VehicleHopTrack => {
  const inferred = graph ? uniqueIncoming(graph, toStationId) : undefined;
  const hop = hopKmBetween({
    to: nextStop,
    fromId: inferred?.stationId,
    toId: toStationId,
    lineId,
    polylines,
    graph,
  });
  return {
    lineId,
    vehicleId,
    toStationId,
    fromStationId: inferred?.stationId,
    branchId: inferred?.branchId,
    remainingKm: remainingFromEta(
      lineId,
      timeToNextSec,
      hop.hopKm,
      hop.hopMinutes,
    ),
    hopDurationSecEstimate: Math.max(timeToNextSec, 1),
    lastSeenAsOf: asOf,
    dueSinceMs: timeToNextSec <= DUE_TTS_SEC ? asOf : undefined,
    destinationName,
    nextStopLat: nextStop.lat,
    nextStopLon: nextStop.lon,
    followingStopLat: followingStop?.lat,
    followingStopLon: followingStop?.lon,
  };
};

/**
 * Ingest a fresh arrivals snapshot into persistent hop tracks.
 * Mutates `tracks`. Vehicles that disappear from the feed are dropped.
 * Stale "due" rows (TTS ≈ 0 with no hop change) are evicted.
 */
export const ingestVehicleHops = ({
  tracks,
  predictions,
  stationsById,
  polylines,
  graph,
  graphForLine,
  asOf,
  staleDueMs = STALE_DUE_MS,
  viscosity = DEFAULT_VEHICLE_VISCOSITY,
}: {
  tracks: Map<string, VehicleHopTrack>;
  predictions: readonly RealtimePrediction[];
  stationsById: ReadonlyMap<string, StationCoord>;
  polylines: readonly (LineString | RoutePolyline)[];
  graph?: HopGraph | null;
  graphForLine?: (lineId: string) => HopGraph | null;
  asOf: number;
  staleDueMs?: number;
  viscosity?: VehicleViscosityParams;
}): VehiclePosition[] => {
  const seen = new Set<string>();
  const scopedLines = new Set<string>();
  const out: VehiclePosition[] = [];

  for (const group of groupPredictions(predictions)) {
    const next = group.rows[0];
    if (!next?.naptanId) continue;
    const nextStop = stationsById.get(next.naptanId);
    if (!nextStop) continue;

    const key = vehicleTrackKey(group.lineId, group.vehicleId);
    seen.add(key);
    scopedLines.add(group.lineId);
    const hopGraph = graphForLine?.(group.lineId) ?? graph ?? null;
    const ttsNext = next.timeToStation ?? 0;
    const after = group.rows[1];
    const followingStop = after?.naptanId
      ? stationsById.get(after.naptanId)
      : undefined;
    const destinationName = next.destinationName ?? next.towards ?? "";
    const prev = tracks.get(key);

    let track: VehicleHopTrack;
    if (!prev) {
      track = seedTrack({
        lineId: group.lineId,
        vehicleId: group.vehicleId,
        toStationId: next.naptanId,
        nextStop,
        followingStop,
        timeToNextSec: ttsNext,
        destinationName,
        asOf,
        graph: hopGraph,
        polylines,
      });
    } else {
      const sameHop = hopGraph
        ? hopGraph.canonical(prev.toStationId) ===
          hopGraph.canonical(next.naptanId)
        : prev.toStationId === next.naptanId;

        if (sameHop) {
        const hop = hopKmBetween({
          from: {
            lat: prev.nextStopLat,
            lon: prev.nextStopLon,
          },
          to: nextStop,
          fromId: prev.fromStationId,
          toId: next.naptanId,
          lineId: group.lineId,
          polylines,
          graph: hopGraph,
        });
        const coasted = coastRemaining(prev, asOf, group.lineId, viscosity);
        const fromEta = remainingFromEta(
          group.lineId,
          ttsNext,
          hop.hopKm,
          hop.hopMinutes,
        );
        track = markArrival(
          {
            ...prev,
            remainingKm: Math.min(coasted, fromEta),
            lastSeenAsOf: asOf,
            destinationName,
            nextStopLat: nextStop.lat,
            nextStopLon: nextStop.lon,
            followingStopLat: followingStop?.lat,
            followingStopLon: followingStop?.lon,
            dueSinceMs:
              ttsNext <= DUE_TTS_SEC ? (prev.dueSinceMs ?? asOf) : undefined,
          },
          asOf,
        );
      } else {
        const adjacent = hopGraph
          ? areAdjacent(hopGraph, prev.toStationId, next.naptanId)
          : true;
        if (!adjacent) {
          const coasted = coastRemaining(prev, asOf, group.lineId, viscosity);
          track = markArrival(
            {
              ...prev,
              remainingKm: coasted,
              lastSeenAsOf: asOf,
            },
            asOf,
          );
        } else if (stillDwelling(prev.arrivedAtMs, asOf, viscosity)) {
          track = markArrival(
            {
              ...prev,
              remainingKm: 0,
              lastSeenAsOf: asOf,
              arrivedAtMs: prev.arrivedAtMs ?? asOf,
            },
            asOf,
          );
        } else {
          const fromCoord = {
            lat: prev.nextStopLat,
            lon: prev.nextStopLon,
          };
          const hop = hopKmBetween({
            from: fromCoord,
            to: nextStop,
            fromId: prev.toStationId,
            toId: next.naptanId,
            lineId: group.lineId,
            polylines,
            graph: hopGraph,
          });
          const hopKm = hop.hopKm ?? hopLengthKm({
            from: fromCoord,
            to: nextStop,
            lineId: group.lineId,
            polylines,
            fromStopId: prev.toStationId,
            toStopId: next.naptanId,
            canonical: hopGraph?.canonical,
          });
          const fromEta = remainingFromEta(
            group.lineId,
            ttsNext,
            hopKm > 0 ? hopKm : undefined,
            hop.hopMinutes,
          );
          const incoming = hopGraph
            ? uniqueIncoming(hopGraph, next.naptanId)
            : undefined;
          track = {
            lineId: group.lineId,
            vehicleId: group.vehicleId,
            toStationId: next.naptanId,
            fromStationId: prev.toStationId,
            branchId: incoming?.branchId,
            remainingKm: hopKm > 0 ? Math.min(hopKm, fromEta) : fromEta,
            hopDurationSecEstimate: Math.max(ttsNext, 1),
            lastSeenAsOf: asOf,
            dueSinceMs: ttsNext <= DUE_TTS_SEC ? asOf : undefined,
            destinationName,
            nextStopLat: nextStop.lat,
            nextStopLon: nextStop.lon,
            followingStopLat: followingStop?.lat,
            followingStopLon: followingStop?.lon,
          };
        }
      }
    }
    track = markArrival(track, asOf);

    if (
      track.dueSinceMs != null &&
      asOf - track.dueSinceMs >= staleDueMs
    ) {
      tracks.delete(key);
      continue;
    }

    tracks.set(key, track);
    const placed = placeTrack(track, polylines, hopGraph);
    out.push(toPosition(track, placed, ttsNext, asOf));
  }

  for (const key of tracks.keys()) {
    if (seen.has(key)) continue;
    const lineId = key.slice(0, key.indexOf(":"));
    if (scopedLines.has(lineId)) tracks.delete(key);
  }

  return out;
};

/** Re-place a hop-locked vehicle as remaining km drains since `asOf`. */
export const advanceHopPosition = (
  vehicle: VehiclePosition,
  nowMs: number,
  polylines: readonly (LineString | RoutePolyline)[],
  viscosity: VehicleViscosityParams = DEFAULT_VEHICLE_VISCOSITY,
): VehiclePosition => {
  if (
    vehicle.asOf == null ||
    vehicle.nextStopLat == null ||
    vehicle.nextStopLon == null
  ) {
    return vehicle;
  }
  if (stillDwelling(vehicle.arrivedAtMs, nowMs, viscosity)) {
    return {
      ...vehicle,
      lat: vehicle.nextStopLat,
      lon: vehicle.nextStopLon,
      remainingKm: 0,
    };
  }
  const elapsedSec = Math.max(0, (nowMs - vehicle.asOf) / 1000);
  const speed = vehicleSpeedMetersPerSec(vehicle.lineId);
  const turnRadians = pathTurnBetween({
    from: { lat: vehicle.lat, lon: vehicle.lon },
    to: { lat: vehicle.nextStopLat, lon: vehicle.nextStopLon },
    lineId: vehicle.lineId,
    polylines,
    fromStopId: vehicle.fromStopId,
    toStopId: vehicle.nextStopId,
    canonical: hopGraphForRailLine(vehicle.lineId).canonical,
  });
  const remainingKm =
    vehicle.remainingKm != null
      ? viscousDrainKm({
          remainingKm: vehicle.remainingKm,
          elapsedSec,
          speedMetersPerSec: speed,
          turnRadians,
          params: viscosity,
        }).remainingKm
      : viscousDrainKm({
          remainingKm: (speed * Math.max(0, vehicle.timeToNextStationSec)) / 1000,
          elapsedSec,
          speedMetersPerSec: speed,
          turnRadians,
          params: viscosity,
        }).remainingKm;
  const ttsNext = Math.max(0, vehicle.timeToNextStationSec - elapsedSec);
  if (remainingKm <= 0 || ttsNext <= 0) {
    return {
      ...vehicle,
      lat: vehicle.nextStopLat,
      lon: vehicle.nextStopLon,
      remainingKm: 0,
      arrivedAtMs: vehicle.arrivedAtMs ?? nowMs,
    };
  }
  const followingStop =
    vehicle.followingStopLat != null && vehicle.followingStopLon != null
      ? { lat: vehicle.followingStopLat, lon: vehicle.followingStopLon }
      : undefined;
  const placed = positionBehindStop({
    nextStop: { lat: vehicle.nextStopLat, lon: vehicle.nextStopLon },
    followingStop,
    remainingKm,
    lineId: vehicle.lineId,
    polylines,
    fromStopId: vehicle.fromStopId,
    toStopId: vehicle.nextStopId,
    canonical: hopGraphForRailLine(vehicle.lineId).canonical,
  });
  return {
    ...vehicle,
    lat: placed.lat,
    lon: placed.lon,
    bearingDeg: placed.bearingDeg,
    remainingKm,
  };
};
