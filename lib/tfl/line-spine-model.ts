import type { DiagramStation } from "@/lib/tfl/diagram-station";

/**
 * Presentational spine payload for LineStrip / demos.
 * Fetching (`getLineSpine`) stays in app loaders — not in this module.
 */
export type LineSpine = {
  lineId: string;
  lineName: string;
  lineColor: string;
  stations: DiagramStation[];
  spineIds: string[];
  routeError?: string;
};

/** Inclusive slice of a spine between two station ids (either order). */
export const sliceLineSpineStations = (
  stations: readonly DiagramStation[],
  fromId: string,
  toId: string,
): DiagramStation[] => {
  const fromIndex = stations.findIndex((s) => s.id === fromId);
  const toIndex = stations.findIndex((s) => s.id === toId);
  if (fromIndex < 0 || toIndex < 0) return [...stations];
  const [start, end] =
    fromIndex <= toIndex ? [fromIndex, toIndex] : [toIndex, fromIndex];
  return stations.slice(start, end + 1);
};
