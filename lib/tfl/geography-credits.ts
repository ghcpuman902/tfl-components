/**
 * Credits for geographic datasets vendored under data/geography.
 * Keep in sync with data/geography/ORIGIN.md.
 */

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
  url: `/data/geography/${TransitGeometryMode}-geometry.json`;
};

/**
 * Unique-track GeoJSON served under `/data/geography/` for map drawing.
 * Order = bottom → top paint preference (Tube under DLR / tram / Overground).
 * Full OSM route variants stay in `data/geography/{mode}-geometry.json`
 * (not painted). Rebuild with `pnpm geography:unique-track`.
 */
export const TRANSIT_GEOMETRY_PUBLIC_ASSETS: readonly TransitGeometryPublicAsset[] =
  [
    {
      mode: "tube",
      label: "Underground",
      url: "/data/geography/tube-geometry.json",
    },
    {
      mode: "overground",
      label: "Overground",
      url: "/data/geography/overground-geometry.json",
    },
    {
      mode: "elizabeth",
      label: "Elizabeth line",
      url: "/data/geography/elizabeth-geometry.json",
    },
    {
      mode: "dlr",
      label: "DLR",
      url: "/data/geography/dlr-geometry.json",
    },
    {
      mode: "tram",
      label: "Tram",
      url: "/data/geography/tram-geometry.json",
    },
  ] as const;

export const OSM_TRANSIT_GEOMETRY_CREDIT: GeographyCredit = {
  id: "osm-transit-geometry",
  title: "OpenStreetMap London transit route geometry",
  provider: "OpenStreetMap contributors",
  licence: "ODbL 1.0",
  licenceUrl: "https://opendatacommons.org/licenses/odbl/1-0/",
  datasetUrl: "https://www.openstreetmap.org/copyright",
  attribution: "© OpenStreetMap contributors · track geometry · ODbL",
  notes:
    "Unique-track map layer derived from ssh.ldn Overpass cache (tube, DLR, Elizabeth, Overground, tram). Full route variants kept under data/geography for non-map use.",
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

export const CARTO_BASEMAP_CREDIT: GeographyCredit = {
  id: "carto-positron",
  title: "CARTO Positron basemap",
  provider: "CARTO · OpenStreetMap contributors",
  licence: "See CARTO / OSM terms",
  licenceUrl: "https://carto.com/basemaps/",
  datasetUrl: "https://www.openstreetmap.org/copyright",
  attribution: "© CARTO · © OpenStreetMap contributors",
};
