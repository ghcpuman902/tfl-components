import { getStationCatalog } from "@/lib/tfl/station-catalog";
import type { ExplorerTubeRailPoint } from "@/lib/tfl/explorer/common";
import { getExplorerHubMembership } from "@/lib/tfl/explorer/hub-membership";
import tubeGeometry from "@/data/geography/tube-geometry.json";
import elizabethGeometry from "@/data/geography/elizabeth-geometry.json";
import overgroundGeometry from "@/data/geography/overground-geometry.json";
import dlrGeometry from "@/data/geography/dlr-geometry.json";
import tramGeometry from "@/data/geography/tram-geometry.json";

type StationFeature = {
  id?: string | number;
  properties?: {
    featureId?: string;
    label?: string;
    name?: string;
  };
  geometry?: {
    type?: string;
    coordinates?: number[];
  };
};

type GeometryBundle = {
  stations?: {
    features?: StationFeature[];
  };
};

type GeoLookup = {
  lat?: number;
  lon?: number;
};

const GEO_BUNDLES = [
  tubeGeometry,
  elizabethGeometry,
  overgroundGeometry,
  dlrGeometry,
  tramGeometry,
] as unknown as GeometryBundle[];

const buildGeoLookup = (): Map<string, GeoLookup> => {
  const lookup = new Map<string, GeoLookup>();

  for (const bundle of GEO_BUNDLES) {
    for (const feature of bundle.stations?.features ?? []) {
      const id =
        feature.properties?.featureId?.trim() ||
        (typeof feature.id === "string" ? feature.id.trim() : undefined);
      if (!id) continue;

      const coords = feature.geometry?.coordinates;
      const existing = lookup.get(id) ?? {};
      lookup.set(id, {
        lon:
          existing.lon ??
          (Array.isArray(coords) && typeof coords[0] === "number"
            ? coords[0]
            : undefined),
        lat:
          existing.lat ??
          (Array.isArray(coords) && typeof coords[1] === "number"
            ? coords[1]
            : undefined),
      });
    }
  }

  return lookup;
};

const buildExplorerTubeRailPoints = (): ExplorerTubeRailPoint[] => {
  const catalog = getStationCatalog();
  const geoLookup = buildGeoLookup();

  return catalog.map((station) => {
    const geo =
      geoLookup.get(station.id) ??
      station.aliasIds.map((alias) => geoLookup.get(alias)).find(Boolean);

    const membership = getExplorerHubMembership(station.id);
    const hubFields = membership?.isHub
      ? {
          hubId: membership.hubId,
          hubMembers: membership.members,
          arrivalsStopIds: membership.arrivalsStopIds,
        }
      : {};

    return {
      ...station,
      lat: geo?.lat,
      lon: geo?.lon,
      ...hubFields,
    };
  });
};

let pointsMemo: ExplorerTubeRailPoint[] | undefined;

/**
 * Tube & rail Points seed dataset — hard-cached topology.
 * Identity from tfl-ts `LINE_STATION_SEQUENCES` plus `STATION_HUBS`
 * (sibling StopPoints / arrivals ids). Coords from bundled geography.
 * Zone is not in that snapshot — omit it from the seed list.
 */
export const getExplorerTubeRailPoints = (): ExplorerTubeRailPoint[] => {
  pointsMemo ??= buildExplorerTubeRailPoints();
  return pointsMemo;
};
