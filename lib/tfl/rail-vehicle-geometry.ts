import type { LineString } from "geojson";
import { getLineColor, STATION_HUBS } from "tfl-ts";
import allStations from "@/data/geography/all-stations.json";
import tubeGeometry from "@/data/geography/tube-geometry.json";
import type {
  TransitGeometryBundle,
  TransitMode,
} from "@/lib/tfl/geography-types";
import type { RoutePolyline, StationCoord } from "@/lib/tfl/vehicle-progress";

type StationRow = {
  id?: string | number;
  properties?: { featureId?: string };
  geometry?: { coordinates?: number[] };
};

const stations = allStations as { features: StationRow[] };
const tube = tubeGeometry as TransitGeometryBundle;

const coordFromFeature = (feature: StationRow): StationCoord | null => {
  const lon = feature.geometry?.coordinates?.[0];
  const lat = feature.geometry?.coordinates?.[1];
  if (lat == null || lon == null) return null;
  return { lat, lon };
};

/**
 * Arrival naptans (`940GZZLUVIC`) and geometry ids (`HUBVIC`) both resolve
 * to the same coordinate via `STATION_HUBS`.
 */
export const railStationsById = (): Map<string, StationCoord> => {
  const byFeature = new Map<string, StationCoord>();
  for (const feature of stations.features) {
    const id = String(feature.id ?? feature.properties?.featureId ?? "");
    const coord = coordFromFeature(feature);
    if (!id || !coord) continue;
    byFeature.set(id, coord);
  }

  const map = new Map(byFeature);
  for (const [id, hub] of Object.entries(STATION_HUBS)) {
    const coord =
      byFeature.get(id) ??
      (hub.hubId ? byFeature.get(hub.hubId) : undefined) ??
      hub.members
        .map((member) => byFeature.get(member.id))
        .find((value): value is StationCoord => value != null);
    if (!coord) continue;
    map.set(id, coord);
    if (hub.hubId) map.set(hub.hubId, coord);
    for (const member of hub.members) map.set(member.id, coord);
    for (const memberId of Object.values(hub.lineMemberIds)) {
      if (memberId) map.set(memberId, coord);
    }
  }
  return map;
};

export const railPolylinesForLine = (lineId: string): LineString[] =>
  (tube.lines.features ?? [])
    .filter((feature) => feature.properties?.lineId === lineId)
    .map((feature) => feature.geometry)
    .filter((geometry): geometry is LineString => geometry.type === "LineString");

export const railPolylinesForLines = (
  lineIds: readonly string[],
): RoutePolyline[] =>
  lineIds.flatMap((lineId) =>
    railPolylinesForLine(lineId).map((line) => ({ lineId, line })),
  );

const OVERGROUND_LINE_IDS = new Set([
  "london-overground",
  "mildmay",
  "windrush",
  "liberty",
  "lioness",
  "suffragette",
  "weaver",
]);

export const railModeForLineId = (lineId: string): TransitMode => {
  if (lineId === "elizabeth") return "elizabeth";
  if (lineId === "dlr") return "dlr";
  if (lineId === "tram") return "tram";
  if (OVERGROUND_LINE_IDS.has(lineId)) return "overground";
  return "tube";
};

export const railModesForLineIds = (
  lineIds: readonly string[],
): TransitMode[] => [...new Set(lineIds.map(railModeForLineId))];

export const railVehicleColor = (lineId: string): string =>
  getLineColor(lineId).hex;
