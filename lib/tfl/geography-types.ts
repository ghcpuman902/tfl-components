import type { FeatureCollection, Point, LineString } from "geojson";

export type TransitMode = "tube" | "elizabeth" | "overground" | "dlr" | "tram";

export type StationProperties = {
  featureId: string;
  name: string;
  label: string;
  lineIds: string[];
  zone?: string;
};

export type LineSegmentProperties = {
  featureId: string;
  lineId: string;
  lineName: string;
  color: string;
  /**
   * Parallel-corridor paint offset on full OSM variant bundles.
   * Omitted on unique-track map geometry (spine + leftover branches only).
   */
  lineOffset?: number;
};

export type StationFeatureCollection = FeatureCollection<
  Point,
  StationProperties
>;

export type LineFeatureCollection = FeatureCollection<
  LineString,
  LineSegmentProperties
>;

export type TransitGeometryBundle = {
  lines: LineFeatureCollection;
  stations: StationFeatureCollection;
};

export const TRANSIT_MODES: readonly TransitMode[] = [
  "tube",
  "elizabeth",
  "overground",
  "dlr",
  "tram",
] as const;

export const TRANSIT_MODE_LABELS: Record<TransitMode, string> = {
  tube: "Underground",
  elizabeth: "Elizabeth line",
  overground: "Overground",
  dlr: "DLR",
  tram: "Tram",
};
