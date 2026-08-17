/**
 * Credits for geographic datasets vendored under data/geography.
 * Keep in sync with data/geography/ORIGIN.md.
 */
import type { TrackModel } from "@/lib/tfl/geography-types";

export type GeographyCredit = {
  id: string;
  title: string;
  provider: string;
  licence: string;
  licenceUrl: string;
  datasetUrl: string;
  attribution: string;
  notes?: string;
};

export type TransitGeometryMode =
  | "tube"
  | "elizabeth"
  | "overground"
  | "dlr"
  | "tram";

export type TransitGeometryPublicAsset = {
  mode: TransitGeometryMode;
  label: string;
  url: `/data/geography/${string}`;
};

export const transitGeometryAssetUrl = (
  mode: TransitGeometryMode,
  model: TrackModel = "centreline",
): `/data/geography/${string}` =>
  model === "dual"
    ? `/data/geography/${mode}-geometry-dual.json`
    : `/data/geography/${mode}-geometry.json`;

export const transitGraphAssetUrl = (
  mode: TransitGeometryMode,
): `/data/geography/${string}` => `/data/geography/${mode}-graph.json`;

/**
 * Unique-track GeoJSON served under `/data/geography/` for map drawing
 * (merged centreline). Dual and graph URLs are `transitGeometryAssetUrl`
 * / `transitGraphAssetUrl`. Order = bottom → top paint preference.
 * Rebuild with `pnpm geography:unique-track`.
 */
export const TRANSIT_GEOMETRY_PUBLIC_ASSETS: readonly TransitGeometryPublicAsset[] =
  [
    {
      mode: "tube",
      label: "Underground",
      url: transitGeometryAssetUrl("tube"),
    },
    {
      mode: "overground",
      label: "Overground",
      url: transitGeometryAssetUrl("overground"),
    },
    {
      mode: "elizabeth",
      label: "Elizabeth line",
      url: transitGeometryAssetUrl("elizabeth"),
    },
    {
      mode: "dlr",
      label: "DLR",
      url: transitGeometryAssetUrl("dlr"),
    },
    {
      mode: "tram",
      label: "Tram",
      url: transitGeometryAssetUrl("tram"),
    },
  ] as const;

export const TRANSIT_GEOMETRY_DUAL_ASSETS: readonly TransitGeometryPublicAsset[] =
  TRANSIT_GEOMETRY_PUBLIC_ASSETS.map((asset) => ({
    ...asset,
    url: transitGeometryAssetUrl(asset.mode, "dual"),
  }));

export const TRANSIT_GEOMETRY_GRAPH_ASSETS: readonly {
  mode: TransitGeometryMode;
  label: string;
  url: `/data/geography/${string}`;
}[] = TRANSIT_GEOMETRY_PUBLIC_ASSETS.map((asset) => ({
  mode: asset.mode,
  label: asset.label,
  url: transitGraphAssetUrl(asset.mode),
}));

export const OSM_TRANSIT_GEOMETRY_CREDIT: GeographyCredit = {
  id: "osm-transit-geometry",
  title: "OpenStreetMap London transit route geometry",
  provider: "OpenStreetMap contributors",
  licence: "ODbL 1.0",
  licenceUrl: "https://opendatacommons.org/licenses/odbl/1-0/",
  datasetUrl: "https://www.openstreetmap.org/copyright",
  attribution: "© OpenStreetMap contributors · track geometry · ODbL",
  notes:
    "Unique-track map layers (merged centreline, dual directional tracks, welded junction graph) derived from ssh.ldn Overpass cache. Full route variants stay under data/geography for non-map use.",
};

export const TFL_STATION_ENRICHMENT_CREDIT: GeographyCredit = {
  id: "tfl-station-enrichment",
  title: "TfL station metadata (enrichment)",
  provider: "Transport for London",
  licence: "TfL Open Data",
  licenceUrl: "https://tfl.gov.uk/info-for/open-data-users/",
  datasetUrl: "https://api.tfl.gov.uk/",
  attribution: "© Transport for London · station metadata where present",
};

/** Vector Positron — same OpenFreeMap style ssh.ldn uses instead of CARTO PNG rasters. */
export const OPENFREEMAP_POSITRON_STYLE_URL =
  "https://tiles.openfreemap.org/styles/positron" as const;

/** OpenFreeMap dark — pair to Positron for theme-aware maps. */
export const OPENFREEMAP_DARK_STYLE_URL =
  "https://tiles.openfreemap.org/styles/dark" as const;

export const openFreeMapStyleUrl = (dark: boolean): string =>
  dark ? OPENFREEMAP_DARK_STYLE_URL : OPENFREEMAP_POSITRON_STYLE_URL;

export const OPENFREEMAP_BASEMAP_CREDIT: GeographyCredit = {
  id: "openfreemap-positron",
  title: "OpenFreeMap Positron basemap",
  provider: "OpenFreeMap · OpenMapTiles · OpenStreetMap contributors",
  licence: "BSD / ODbL (OSM data)",
  licenceUrl: "https://openfreemap.org/",
  datasetUrl: "https://tiles.openfreemap.org/",
  attribution: "© OpenStreetMap contributors · © OpenFreeMap",
};
