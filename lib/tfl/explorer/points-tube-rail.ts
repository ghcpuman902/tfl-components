import { cacheLife, cacheTag } from "next/cache";
import { getStationCatalog } from "@/lib/tfl/station-catalog";
import type { ExplorerTubeRailPoint } from "@/lib/tfl/explorer/common";
import tubeGeometry from "@/data/geography/tube-geometry.json";
import elizabethGeometry from "@/data/geography/elizabeth-geometry.json";
import overgroundGeometry from "@/data/geography/overground-geometry.json";
import dlrGeometry from "@/data/geography/dlr-geometry.json";
import tramGeometry from "@/data/geography/tram-geometry.json";

type StationFeature = {
  id?: string | number;
  properties?: {
    featureId?: string;
    zone?: string | null;
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
  zone?: string;
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
        zone:
          existing.zone ??
          (feature.properties?.zone?.trim() || undefined),
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

/**
 * Cached Tube & rail Points Browse dataset.
 * Identity from `getStationCatalog`; zone/coords from bundled geography.
 */
export async function getExplorerTubeRailPoints(): Promise<
  ExplorerTubeRailPoint[]
> {
  "use cache";
  cacheLife("days");
  cacheTag("tfl-explorer-tube-rail-points");

  const [catalog, geoLookup] = await Promise.all([
    getStationCatalog(),
    Promise.resolve(buildGeoLookup()),
  ]);

  return catalog.map((station) => {
    const geo =
      geoLookup.get(station.id) ??
      station.aliasIds.map((alias) => geoLookup.get(alias)).find(Boolean);

    return {
      ...station,
      zone: geo?.zone,
      lat: geo?.lat,
      lon: geo?.lon,
    };
  });
}
