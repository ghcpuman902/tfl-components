import along from "@turf/along";
import { point } from "@turf/helpers";
import length from "@turf/length";
import { lineSlice } from "@turf/line-slice";
import type { LineString, Position } from "geojson";

export type StationCoord = {
  lat: number;
  lon: number;
};

export type RoutePoint = {
  lat: number;
  lon: number;
  bearingDeg: number;
};

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const toRad = (deg: number) => (deg * Math.PI) / 180;

const bearingDeg = (from: Position, to: Position): number => {
  const φ1 = toRad(from[1] ?? 0);
  const φ2 = toRad(to[1] ?? 0);
  const Δλ = toRad((to[0] ?? 0) - (from[0] ?? 0));
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
};

const squaredDistance = (a: Position, b: Position): number => {
  const dx = (a[0] ?? 0) - (b[0] ?? 0);
  const dy = (a[1] ?? 0) - (b[1] ?? 0);
  return dx * dx + dy * dy;
};

const minVertexDistance = (line: LineString, target: Position): number => {
  let best = Number.POSITIVE_INFINITY;
  for (const coord of line.coordinates) {
    const d = squaredDistance(coord, target);
    if (d < best) best = d;
  }
  return best;
};

const angleDiffDeg = (a: number, b: number): number => {
  const raw = Math.abs(a - b) % 360;
  return raw > 180 ? 360 - raw : raw;
};

const segmentBearingNear = (
  line: LineString,
  target: Position,
): number | null => {
  let bestScore = Number.POSITIVE_INFINITY;
  let bestBearing: number | null = null;
  const coords = line.coordinates;
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i];
    const b = coords[i + 1];
    if (!a || !b) continue;
    const mid: Position = [
      ((a[0] ?? 0) + (b[0] ?? 0)) / 2,
      ((a[1] ?? 0) + (b[1] ?? 0)) / 2,
    ];
    const score = squaredDistance(target, mid);
    if (score < bestScore) {
      bestScore = score;
      bestBearing = bearingDeg(a, b);
    }
  }
  return bestBearing;
};

const pickPolyline = (
  polylines: readonly LineString[],
  start: Position,
  end: Position,
  travelBearingDeg?: number,
): LineString | null => {
  if (polylines.length === 0) return null;
  let best: LineString | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const line of polylines) {
    if (line.coordinates.length < 2) continue;
    const distance =
      minVertexDistance(line, start) + minVertexDistance(line, end);
    if (travelBearingDeg == null) {
      if (distance < bestScore) {
        best = line;
        bestScore = distance;
      }
      continue;
    }
    const lineBearing = segmentBearingNear(line, start);
    if (lineBearing == null) continue;
    const turn = angleDiffDeg(lineBearing, travelBearingDeg);
    if (turn > 60) continue;
    const score = distance + 3 * (turn / 180);
    if (score < bestScore) {
      best = line;
      bestScore = score;
    }
  }
  if (best) return best;
  if (travelBearingDeg == null) return null;
  return pickPolyline(polylines, start, end);
};

/**
 * 0–1 progress along the segment from the next stop to the stop after,
 * from two `timeToStation` values. Clamped. `0` when the following time
 * is missing or not later than the next time.
 */
export const progressBetweenStops = (
  timeToNextSec: number,
  timeToFollowingSec: number | undefined,
): number => {
  if (timeToFollowingSec == null || timeToFollowingSec <= timeToNextSec) {
    return 0;
  }
  const segmentTotal = timeToFollowingSec - timeToNextSec;
  return clamp01((segmentTotal - timeToNextSec) / segmentTotal);
};

/**
 * A point on route geometry between two stations.
 * `progress` 0 is `from`, 1 is `to`. Snaps to the nearest polyline when given.
 */
export const pointBetweenStations = ({
  from,
  to,
  progress,
  polylines = [],
}: {
  from: StationCoord;
  to: StationCoord;
  progress: number;
  polylines?: readonly LineString[];
}): RoutePoint => {
  const fraction = clamp01(progress);
  const start: Position = [from.lon, from.lat];
  const end: Position = [to.lon, to.lat];
  const line = pickPolyline(polylines, start, end);
  if (line) {
    try {
      const sliced = lineSlice(point(start), point(end), line);
      const km = length(sliced, { units: "kilometers" });
      if (km > 0) {
        const at = along(sliced, km * fraction, { units: "kilometers" });
        const ahead = along(sliced, Math.min(km, km * fraction + km * 0.02), {
          units: "kilometers",
        });
        const coord = at.geometry.coordinates;
        return {
          lon: coord[0] ?? from.lon,
          lat: coord[1] ?? from.lat,
          bearingDeg: bearingDeg(coord, ahead.geometry.coordinates),
        };
      }
    } catch {
      // Fall through to a straight lerp.
    }
  }
  return {
    lon: from.lon + (to.lon - from.lon) * fraction,
    lat: from.lat + (to.lat - from.lat) * fraction,
    bearingDeg: bearingDeg(start, end),
  };
};

export type RoutePolyline = {
  lineId?: string;
  line: LineString;
};

const asRoutePolylines = (
  polylines: readonly (LineString | RoutePolyline)[],
): RoutePolyline[] =>
  polylines.map((entry) =>
    "line" in entry ? entry : { line: entry },
  );

const lerpPosition = (a: Position, b: Position, t: number): Position => [
  (a[0] ?? 0) + ((b[0] ?? 0) - (a[0] ?? 0)) * t,
  (a[1] ?? 0) + ((b[1] ?? 0) - (a[1] ?? 0)) * t,
];

const asLineFeature = (line: LineString) => ({
  type: "Feature" as const,
  properties: {},
  geometry: line,
});

const lengthKm = (line: LineString): number =>
  length(asLineFeature(line), { units: "kilometers" });

const segmentLengthKm = (a: Position, b: Position): number =>
  lengthKm({ type: "LineString", coordinates: [a, b] });

const nearestOnLine = (
  line: LineString,
  target: Position,
): { distanceKm: number; score: number } => {
  let bestScore = Number.POSITIVE_INFINITY;
  let bestDistanceKm = 0;
  let travelled = 0;
  const coords = line.coordinates;
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i];
    const b = coords[i + 1];
    if (!a || !b) continue;
    const segKm = segmentLengthKm(a, b);
    const ax = a[0] ?? 0;
    const ay = a[1] ?? 0;
    const dx = (b[0] ?? 0) - ax;
    const dy = (b[1] ?? 0) - ay;
    const denom = dx * dx + dy * dy;
    const t =
      denom === 0
        ? 0
        : Math.min(
            1,
            Math.max(0, ((target[0] - ax) * dx + (target[1] - ay) * dy) / denom),
          );
    const px = ax + dx * t;
    const py = ay + dy * t;
    const score = squaredDistance(target, [px, py]);
    if (score < bestScore) {
      bestScore = score;
      bestDistanceKm = travelled + segKm * t;
    }
    travelled += segKm;
  }
  return { distanceKm: bestDistanceKm, score: bestScore };
};

/**
 * Assumed average speed including dwell time, used to dead-reckon a
 * vehicle backwards from its next stop. TfL only ever gives a
 * `timeToStation` countdown to a future stop, never a current position or
 * a previous stop, so there is no reliable "progress between two future
 * stops" — the gap between a vehicle's next two predicted stops is
 * usually much shorter than its `timeToStation` to the first of them,
 * which would clamp progress to 0 for most of the journey. Walking
 * backward from the next stop by `speed × timeToStation` instead keeps
 * every vehicle visibly moving for as long as its ETA counts down.
 */
export const vehicleSpeedMetersPerSec = (lineId: string): number => {
  if (lineId === "elizabeth") return 14;
  if (lineId === "metropolitan") return 10;
  if (lineId === "dlr") return 7;
  if (lineId === "tram") return 6;
  if (/^\d/.test(lineId) || /^n\d/i.test(lineId)) return 5;
  return 8.5;
};

/**
 * Walk backward from `nextStop` by a known remaining distance. Used by
 * the hop engine so a locked remaining-km can be re-placed without
 * re-deriving distance from an assumed speed.
 */
export const positionBehindStop = ({
  nextStop,
  followingStop,
  remainingKm,
  lineId,
  polylines,
}: {
  nextStop: StationCoord;
  followingStop?: StationCoord;
  remainingKm: number;
  lineId?: string;
  polylines: readonly (LineString | RoutePolyline)[];
}): RoutePoint => {
  const nextPos: Position = [nextStop.lon, nextStop.lat];
  const followingPos: Position | undefined = followingStop
    ? [followingStop.lon, followingStop.lat]
    : undefined;
  const travelBearingDeg = followingPos
    ? bearingDeg(nextPos, followingPos)
    : undefined;

  const rows = asRoutePolylines(polylines).filter(
    (row) => row.line.coordinates.length >= 2,
  );
  const preferred = lineId ? rows.filter((row) => row.lineId === lineId) : rows;
  const pool = preferred.length > 0 ? preferred : rows;
  const line = pickPolyline(
    pool.map((row) => row.line),
    nextPos,
    followingPos ?? nextPos,
    travelBearingDeg,
  );

  if (!line) {
    return { lat: nextStop.lat, lon: nextStop.lon, bearingDeg: 0 };
  }

  const totalKm = lengthKm(line);
  const dNext = nearestOnLine(line, nextPos).distanceKm;
  const goingForward = followingPos
    ? nearestOnLine(line, followingPos).distanceKm >= dNext
    : true;
  const distanceBackKm = Math.max(0, remainingKm);
  const targetKm = goingForward
    ? Math.max(0, dNext - distanceBackKm)
    : Math.min(totalKm, dNext + distanceBackKm);

  const at = along(asLineFeature(line), targetKm, { units: "kilometers" });
  const coord = at.geometry.coordinates;
  return {
    lon: coord[0] ?? nextStop.lon,
    lat: coord[1] ?? nextStop.lat,
    bearingDeg: bearingDeg(coord, nextPos),
  };
};

/** Polyline length between two stations, or 0 when they cannot be sliced. */
export const hopLengthKm = ({
  from,
  to,
  lineId,
  polylines,
}: {
  from: StationCoord;
  to: StationCoord;
  lineId?: string;
  polylines: readonly (LineString | RoutePolyline)[];
}): number => {
  const start: Position = [from.lon, from.lat];
  const end: Position = [to.lon, to.lat];
  const rows = asRoutePolylines(polylines).filter(
    (row) => row.line.coordinates.length >= 2,
  );
  const preferred = lineId ? rows.filter((row) => row.lineId === lineId) : rows;
  const pool = preferred.length > 0 ? preferred : rows;
  const line = pickPolyline(
    pool.map((row) => row.line),
    start,
    end,
    bearingDeg(start, end),
  );
  if (!line) return 0;
  try {
    const sliced = lineSlice(point(start), point(end), line);
    const km = length(sliced, { units: "kilometers" });
    return Number.isFinite(km) ? km : 0;
  } catch {
    return 0;
  }
};

/**
 * Dead-reckons a vehicle's position by walking backward from `nextStop`
 * along the nearest polyline, by `speedMetersPerSec × timeToNextSec`.
 * `followingStop`, when known, only picks which of the two directions
 * along the polyline is "backward" (away from where the vehicle is
 * headed next) — it is not used as an interpolation endpoint. Converges
 * exactly on `nextStop` as `timeToNextSec` reaches 0.
 */
export const positionApproachingStop = ({
  nextStop,
  followingStop,
  timeToNextSec,
  speedMetersPerSec,
  lineId,
  polylines,
}: {
  nextStop: StationCoord;
  followingStop?: StationCoord;
  timeToNextSec: number;
  speedMetersPerSec: number;
  lineId?: string;
  polylines: readonly (LineString | RoutePolyline)[];
}): RoutePoint =>
  positionBehindStop({
    nextStop,
    followingStop,
    remainingKm: (speedMetersPerSec * Math.max(0, timeToNextSec)) / 1000,
    lineId,
    polylines,
  });

const sliceLineByKm = (
  line: LineString,
  startKm: number,
  endKm: number,
): Position[] => {
  const start = Math.min(startKm, endKm);
  const end = Math.max(startKm, endKm);
  const out: Position[] = [];
  let travelled = 0;
  const coords = line.coordinates;
  for (let i = 0; i < coords.length - 1; i++) {
    const a = coords[i];
    const b = coords[i + 1];
    if (!a || !b) continue;
    const segKm = segmentLengthKm(a, b);
    const segStart = travelled;
    const segEnd = travelled + segKm;
    travelled = segEnd;
    if (segEnd < start || segStart > end) continue;
    if (out.length === 0) {
      const t = segKm === 0 ? 0 : (start - segStart) / segKm;
      out.push(lerpPosition(a, b, Math.min(1, Math.max(0, t))));
    }
    if (segStart > start && segStart < end) out.push(a);
    if (segStart <= end && end <= segEnd) {
      const t = segKm === 0 ? 1 : (end - segStart) / segKm;
      out.push(lerpPosition(a, b, Math.min(1, Math.max(0, t))));
    }
  }
  return out;
};

/**
 * In-service length along the track. Elizabeth is a 9-car Class 345;
 * most Tube stock is shorter. Bus routes are the vehicle, not a train.
 */
export const vehicleLengthMeters = (lineId: string): number => {
  if (lineId === "elizabeth") return 205;
  if (lineId === "metropolitan") return 160;
  if (lineId === "dlr") return 56;
  if (lineId === "tram") return 32;
  if (/^\d/.test(lineId) || /^n\d/i.test(lineId)) return 12;
  return 133;
};

/**
 * A track-following segment centred on `at`, true to `lengthMeters`.
 * Uses the nearest OSM polyline so the body follows that branch's curve.
 */
export const segmentAroundPoint = ({
  at,
  lengthMeters,
  lineId,
  polylines,
}: {
  at: StationCoord;
  lengthMeters: number;
  lineId?: string;
  polylines: readonly (LineString | RoutePolyline)[];
}): LineString => {
  const target: Position = [at.lon, at.lat];
  const rows = asRoutePolylines(polylines).filter(
    (row) => row.line.coordinates.length >= 2,
  );
  const preferred = lineId
    ? rows.filter((row) => row.lineId === lineId)
    : rows;
  const pool = preferred.length > 0 ? preferred : rows;
  let best: RoutePolyline | null = null;
  let bestHit = { distanceKm: 0, score: Number.POSITIVE_INFINITY };
  for (const row of pool) {
    const hit = nearestOnLine(row.line, target);
    if (hit.score < bestHit.score) {
      best = row;
      bestHit = hit;
    }
  }
  const halfKm = Math.max(lengthMeters, 8) / 2000;
  if (!best) {
    return {
      type: "LineString",
      coordinates: [
        [at.lon - 0.0002, at.lat],
        [at.lon + 0.0002, at.lat],
      ],
    };
  }
  const totalKm = lengthKm(best.line);
  const startKm = Math.max(0, bestHit.distanceKm - halfKm);
  const endKm = Math.min(totalKm, bestHit.distanceKm + halfKm);
  const coordinates = sliceLineByKm(best.line, startKm, endKm);
  if (coordinates.length >= 2) {
    return { type: "LineString", coordinates };
  }
  const fallback = along(asLineFeature(best.line), bestHit.distanceKm, {
    units: "kilometers",
  }).geometry.coordinates;
  return {
    type: "LineString",
    coordinates: [
      fallback,
      [ (fallback[0] ?? at.lon) + 0.00015, fallback[1] ?? at.lat ],
    ],
  };
};
