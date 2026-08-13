import type { NearbyBusStop } from "@/lib/tfl/bus-stop-shape";
import type { CycleHireDock } from "@/lib/tfl/cycle-hire-types";
import type { ExplorerDirection } from "@/lib/tfl/explorer-url-state";
import type { StatusLine } from "@/lib/tfl/status-types";

export type ExplorerRailModeId =
  | "tube"
  | "elizabeth-line"
  | "dlr"
  | "overground"
  | "tram";

/** Tube & rail station enriched with bundled geography. */
export type ExplorerTubeRailPoint = {
  id: string;
  aliasIds: string[];
  name: string;
  displayName: string;
  modes: ExplorerRailModeId[];
  lines: string[];
  zone?: string;
  lat?: number;
  lon?: number;
};

export type ExplorerBusPoint = NearbyBusStop;

export type ExplorerCyclePoint = CycleHireDock & {
  distance?: number;
};

export type ExplorerLineSummary = {
  id: string;
  name: string;
  modeName?: string;
};

export type ExplorerRouteStop = {
  id?: string;
  name?: string;
};

export type ExplorerLineRoute = {
  line?: {
    id?: string;
    name?: string;
    modeName?: string;
  };
  stops: ExplorerRouteStop[];
};

export type ExplorerLineDetailsPayload = {
  lineId: string;
  direction: ExplorerDirection;
  route: ExplorerLineRoute;
  status: StatusLine | null;
};
