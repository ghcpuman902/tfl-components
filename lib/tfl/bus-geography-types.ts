import type { LineString } from "geojson";

export type BusRouteSegmentStatus = "current" | "diverted" | "disabled";

export type BusRouteSegment = {
  id: string;
  status: BusRouteSegmentStatus;
  line: LineString;
};

export type BusRouteStop = {
  id: string;
  name: string;
  lat: number;
  lon: number;
  sequence: number;
};

export type BusRouteGeometry = {
  routeId: string;
  direction: "inbound" | "outbound";
  color: string;
  stops: BusRouteStop[];
  segments: BusRouteSegment[];
};
