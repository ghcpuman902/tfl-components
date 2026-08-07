import { getLineColor } from "tfl-ts";
import {
  formatStationName,
  isLikelyInterchange,
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

/** Map a TfL MatchedStop / StopPoint into diagram station props. */
export const toDiagramStation = (
  stop: StopLike,
  hostLineId?: string,
): DiagramStation => {
  const id = stop.id ?? stop.name ?? cryptoRandomId();
  const host = hostLineId?.toLowerCase();
  const connections =
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
