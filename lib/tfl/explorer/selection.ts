import type { RealtimePrediction } from "tfl-ts";

type Identified = {
  id: string;
  aliasIds?: readonly string[];
};

export type ExplorerCachedArrivals = {
  stopPointId: string;
  stopName: string;
  arrivals: RealtimePrediction[];
  fetchedAt: number;
  error?: string;
};

/** TfL line ids are case-insensitive (`N97` ≡ `n97`). Point ids usually match exactly. */
export const explorerIdsEqual = (a: string, b: string): boolean =>
  a === b || a.toLowerCase() === b.toLowerCase();

export const pointMatchesId = (point: Identified, id: string): boolean =>
  explorerIdsEqual(point.id, id) ||
  point.aliasIds?.some((alias) => explorerIdsEqual(alias, id)) === true;

export const cachedArrivalsForPoint = (
  cached: ExplorerCachedArrivals | null | undefined,
  point: Identified,
): ExplorerCachedArrivals | null => {
  if (!cached || cached.error) return null;
  return pointMatchesId(point, cached.stopPointId) ? cached : null;
};

/** First cached seed item, or the requested id when it is in the list. */
export const firstOrMatching = <T extends { id: string }>(
  items: readonly T[],
  requested?: string,
): T | undefined => {
  if (requested) {
    const match = items.find((item) => explorerIdsEqual(item.id, requested));
    if (match) return match;
  }
  return items[0];
};

/** Like {@link firstOrMatching}, also matching `aliasIds` (Tube & rail stations). */
export const firstOrMatchingPoint = <T extends Identified>(
  items: readonly T[],
  requested?: string,
): T | undefined => {
  if (requested) {
    const match = items.find((item) => pointMatchesId(item, requested));
    if (match) return match;
  }
  return items[0];
};
