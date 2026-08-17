import { cacheLife, cacheTag } from "next/cache";
import type { LineString, Position } from "geojson";
import { TFL_MODAL_COLOURS } from "@/lib/tfl/brand-colours";
import type { BusRouteGeometry, BusRouteStop } from "@/lib/tfl/bus-geography-types";
import { getTflClient } from "@/lib/tfl/client";
import { selectLongestOrderedRoute } from "@/lib/tfl/week-ahead-status";

export type BusRouteDirection = "inbound" | "outbound";

const isLonLat = (value: unknown): value is Position =>
  Array.isArray(value) &&
  value.length >= 2 &&
  typeof value[0] === "number" &&
  typeof value[1] === "number" &&
  Number.isFinite(value[0]) &&
  Number.isFinite(value[1]);

const isCoordRing = (value: unknown): value is Position[] =>
  Array.isArray(value) && value.length >= 2 && value.every(isLonLat);

/** TfL `lineStrings` are JSON-encoded LineString or MultiLineString coordinates. */
export const parseTflLineStrings = (
  lineStrings: readonly string[] | undefined,
): LineString[] => {
  if (!lineStrings?.length) return [];
  const lines: LineString[] = [];
  for (const raw of lineStrings) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isCoordRing(parsed)) {
        lines.push({ type: "LineString", coordinates: parsed });
        continue;
      }
      if (Array.isArray(parsed)) {
        for (const part of parsed) {
          if (isCoordRing(part)) {
            lines.push({ type: "LineString", coordinates: part });
          }
        }
      }
    } catch {
      // Skip malformed TfL encodings.
    }
  }
  return lines;
};

const buildBusRouteGeometry = async (
  routeId: string,
  direction: BusRouteDirection,
): Promise<BusRouteGeometry> => {
  const client = getTflClient();
  const sequence = await client.line.getRouteSequence({
    id: routeId,
    direction,
  });
  const spine = selectLongestOrderedRoute(sequence.orderedLineRoutes);
  const byId = new Map(
    (sequence.stations ?? [])
      .filter(
        (stop) =>
          stop.id &&
          typeof stop.lat === "number" &&
          typeof stop.lon === "number",
      )
      .map((stop) => [stop.id!, stop] as const),
  );

  const orderedIds = spine?.naptanIds ?? [];
  const stops: BusRouteStop[] = [];
  const seen = new Set<string>();
  const sourceIds =
    orderedIds.length > 0 ? orderedIds : [...byId.keys()];

  for (const id of sourceIds) {
    if (seen.has(id)) continue;
    const stop = byId.get(id);
    if (!stop || stop.lat == null || stop.lon == null) continue;
    seen.add(id);
    stops.push({
      id,
      name: stop.name ?? id,
      lat: stop.lat,
      lon: stop.lon,
      sequence: stops.length,
    });
  }

  const lines = parseTflLineStrings(sequence.lineStrings);
  const segments = (lines.length > 0 ? lines : []).map((line, index) => ({
    id: `${routeId}-${direction}-${index}`,
    status: "current" as const,
    line,
  }));

  return {
    routeId,
    direction,
    color: TFL_MODAL_COLOURS.buses.hex,
    stops,
    segments,
  };
};

/**
 * Cached TfL route sequence for one bus line + direction.
 * Not vendored — there are hundreds of routes.
 */
export async function getCachedBusRouteGeometry(
  routeId: string,
  direction: BusRouteDirection,
): Promise<BusRouteGeometry> {
  "use cache";
  cacheLife({ stale: 3600, revalidate: 7200, expire: 86400 });
  cacheTag("tfl-bus-route-geometry", `tfl-bus-route-${routeId}-${direction}`);
  return buildBusRouteGeometry(routeId.trim(), direction);
}
