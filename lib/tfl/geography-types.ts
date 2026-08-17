import type { FeatureCollection, Point, LineString } from "geojson";

export type TransitMode = "tube" | "elizabeth" | "overground" | "dlr" | "tram";

export type StationProperties = {
  featureId: string;
  name: string;
  label: string;
  lineIds: string[];
  zone?: string;
};

/** Which unique-track layer a map should paint. */
export type TrackModel = "centreline" | "dual";

export type LineSegmentProperties = {
  featureId: string;
  lineId: string;
  lineName: string;
  color: string;
  /**
   * Parallel-corridor paint offset on full OSM variant bundles.
   * Omitted on unique-track map geometry.
   */
  lineOffset?: number;
  /** Directional group on dual-track geometry (`0` / `1`). */
  trackGroup?: 0 | 1;
  /** Nearest station name at this directional group's far end. */
  towards?: string;
};

export type TransitGraphNodeKind = "junction" | "terminus";

export type TransitGraphNode = {
  id: string;
  kind: TransitGraphNodeKind;
  coordinates: [number, number];
  degree: number;
  lineId: string;
  stationId?: string;
  stationName?: string;
};

export type TransitGraphEdge = {
  id: string;
  from: string;
  to: string;
  lineId: string;
  featureId: string;
  coordinates: [number, number][];
  lengthMetres: number;
};

export type TransitGraph = {
  nodes: TransitGraphNode[];
  edges: TransitGraphEdge[];
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
