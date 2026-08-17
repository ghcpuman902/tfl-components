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

const pickPolyline = (
  polylines: readonly LineString[],
  start: Position,
  end: Position,
): LineString | null => {
  if (polylines.length === 0) return null;
  let best: LineString | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  for (const line of polylines) {
    if (line.coordinates.length < 2) continue;
    const score = minVertexDistance(line, start) + minVertexDistance(line, end);
    if (score < bestScore) {
      best = line;
      bestScore = score;
    }
  }
  return best;
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
