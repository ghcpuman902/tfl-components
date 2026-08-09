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
 * Default diagram behaviour sets `nationalRail: true` (pictogram beside the
 * name) rather than a §9 text flag.
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
   * How to treat National Rail / TOC connections.
   * - `collapse` (default): set `nationalRail: true` on the station (pictogram);
   *   do not emit a §9 text flag
   * - `operators`: keep each TOC name as a connection flag (still drops bus IDs)
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
 * Collapse TOC connections into National Rail metadata + Tube/TfL flags.
 * Drops unknown / bus IDs (`other`). National Rail is never a text flag —
 * callers use `nationalRail` for the pictogram beside the name.
 */
export const normalizeDiagramConnections = (
  connections: DiagramConnection[],
  mode: NationalRailFlagMode = "collapse",
): { connections: DiagramConnection[]; nationalRail: boolean } => {
  let nationalRail = false;
  const kept: DiagramConnection[] = [];

  for (const connection of connections) {
    const group = connectionGroup(connection.id);
    if (group === "other") continue;
    if (group === "national-rail") {
      nationalRail = true;
      if (mode === "operators") kept.push(connection);
      continue;
    }
    kept.push(connection);
  }

  if (mode === "operators") {
    return {
      connections: sortDiagramConnections(kept),
      nationalRail,
    };
  }

  return {
    connections: sortDiagramConnections(kept),
    nationalRail,
  };
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

  const { connections, nationalRail } = normalizeDiagramConnections(
    rawConnections,
    nationalRailFlags,
  );

  return {
    id,
    name: stop.name ?? id,
    interchange: isLikelyInterchange(stop),
    connections: connections.length > 0 ? connections : undefined,
    nationalRail: nationalRail || undefined,
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
