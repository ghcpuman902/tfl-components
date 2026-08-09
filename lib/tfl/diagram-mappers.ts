import { getLineColor } from "tfl-ts";
import {
  formatStationName,
  isLikelyInterchange,
  type DiagramConnection,
  type DiagramStation,
} from "@/lib/tfl/diagram-station";

type StopLike = {
  id?: string | null;
  name?: string | null;
  lines?: { id?: string | null; name?: string | null }[] | null;
  modes?: string[] | null;
};

const DARK_TEXT_LINES = new Set([
  "circle",
  "hammersmith-city",
  "waterloo-city",
]);

/** Classic Underground line IDs (flag group 1 in §9). */
const UNDERGROUND_LINE_IDS = new Set([
  "bakerloo",
  "central",
  "circle",
  "district",
  "hammersmith-city",
  "jubilee",
  "metropolitan",
  "northern",
  "piccadilly",
  "victoria",
  "waterloo-city",
]);

/**
 * National Rail / TOC identifiers that TfL attaches as connecting "lines".
 * Default diagram behaviour collapses these to a single "National Rail" flag
 * (§9 — humans expect the NR brand, not Greater Anglia / c2c / …).
 */
export const NATIONAL_RAIL_LINE_IDS = new Set([
  "national-rail",
  "nationalrail",
  "c2c",
  "greater-anglia",
  "thameslink",
  "southern",
  "southeastern",
  "south-western-railway",
  "southwestern-railway",
  "great-northern",
  "great-western",
  "gatwick-express",
  "heathrow-express",
  "heathrow-connect",
  "london-northwestern-railway",
  "chiltern-railways",
  "east-midlands-railway",
  "cross-country",
  "scotrail",
  "tfl-rail",
]);

const TFL_MODE_LINE_IDS = new Set([
  "dlr",
  "elizabeth",
  "elizabeth-line",
  "tram",
  "london-cable-car",
  "emirates-airline",
  "liberty",
  "lioness",
  "mildmay",
  "suffragette",
  "weaver",
  "windrush",
  "overground",
]);

export type NationalRailFlagMode = "collapse" | "operators";

export type DiagramStationMapOptions = {
  /**
   * How to render National Rail / TOC connections on §9 flags.
   * - `collapse` (default): Greater Anglia, c2c, … → one "National Rail" flag
   * - `operators`: keep each TOC name as returned by TfL
   */
  nationalRailFlags?: NationalRailFlagMode;
};

const isNationalRailId = (lineId: string): boolean => {
  const id = lineId.toLowerCase();
  if (NATIONAL_RAIL_LINE_IDS.has(id)) return true;
  if (id.includes("national-rail") || id.includes("nationalrail")) return true;
  // Heuristic: many TOCs appear as mode national-rail with custom ids
  return false;
};

const connectionGroup = (
  lineId: string,
): "underground" | "tfl-mode" | "national-rail" | "other" => {
  if (UNDERGROUND_LINE_IDS.has(lineId)) return "underground";
  if (isNationalRailId(lineId)) return "national-rail";
  if (TFL_MODE_LINE_IDS.has(lineId)) return "tfl-mode";
  return "other";
};

const GROUP_ORDER: Record<ReturnType<typeof connectionGroup>, number> = {
  underground: 0,
  "tfl-mode": 1,
  other: 2,
  "national-rail": 3,
};

/** §9 flag order: Tube α → other TfL modes α → National Rail. */
export const sortDiagramConnections = (
  connections: DiagramConnection[],
): DiagramConnection[] =>
  [...connections].sort((a, b) => {
    const ga = GROUP_ORDER[connectionGroup(a.id)];
    const gb = GROUP_ORDER[connectionGroup(b.id)];
    if (ga !== gb) return ga - gb;
    return a.name.localeCompare(b.name, "en-GB");
  });

/**
 * Collapse TOC connections into a single National Rail flag when requested.
 */
export const normalizeDiagramConnections = (
  connections: DiagramConnection[],
  mode: NationalRailFlagMode = "collapse",
): DiagramConnection[] => {
  if (mode === "operators") return sortDiagramConnections(connections);

  const kept: DiagramConnection[] = [];
  let nationalRail: DiagramConnection | null = null;

  for (const connection of connections) {
    if (isNationalRailId(connection.id)) {
      if (!nationalRail) {
        nationalRail = {
          id: "national-rail",
          name: "National Rail",
          color: "#FFFFFF",
          darkText: true,
        };
      }
      continue;
    }
    kept.push(connection);
  }

  if (nationalRail) kept.push(nationalRail);
  return sortDiagramConnections(kept);
};

/** Map a TfL MatchedStop / StopPoint into diagram station props. */
export const toDiagramStation = (
  stop: StopLike,
  hostLineId?: string,
  options?: DiagramStationMapOptions,
): DiagramStation => {
  const id = stop.id ?? stop.name ?? cryptoRandomId();
  const host = hostLineId?.toLowerCase();
  const nationalRailFlags = options?.nationalRailFlags ?? "collapse";

  const rawConnections =
    stop.lines
      ?.filter((l) => l.id && l.id.toLowerCase() !== host)
      .map((l) => {
        const lineId = (l.id ?? "").toLowerCase();
        const color = getLineColor(lineId);
        return {
          id: lineId,
          name: l.name ?? lineId,
          color: color.hex,
          darkText: DARK_TEXT_LINES.has(lineId),
        };
      }) ?? [];

  const connections = normalizeDiagramConnections(
    rawConnections,
    nationalRailFlags,
  );

  return {
    id,
    name: stop.name ?? id,
    interchange: isLikelyInterchange(stop),
    connections: connections.length > 0 ? connections : undefined,
  };
};

/** Slice stations from `fromId` to `toId` (inclusive). Returns null if not found in order. */
export const sliceJourney = (
  stations: DiagramStation[],
  fromId: string,
  toId: string,
): {
  from: DiagramStation;
  to: DiagramStation;
  intermediates: DiagramStation[];
} | null => {
  const fromIndex = stations.findIndex((s) => s.id === fromId);
  const toIndex = stations.findIndex((s) => s.id === toId);
  if (fromIndex < 0 || toIndex < 0) return null;

  const [start, end] =
    fromIndex <= toIndex ? [fromIndex, toIndex] : [toIndex, fromIndex];
  const slice = stations.slice(start, end + 1);
  if (slice.length < 2) return null;

  const forward = fromIndex <= toIndex;
  const ordered = forward ? slice : [...slice].reverse();
  return {
    from: ordered[0]!,
    to: ordered[ordered.length - 1]!,
    intermediates: ordered.slice(1, -1),
  };
};

export { formatStationName, isLikelyInterchange };

const cryptoRandomId = (): string =>
  `stop-${Math.random().toString(36).slice(2, 10)}`;
