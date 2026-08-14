/**
 * Offline stop → display-name index for the hosted Board.
 *
 * Built from the same `getStationCatalog()` used by `board-station-lines.ts`,
 * so a Stop ID the Board already recognises for serving lines also resolves
 * a human name — the Config form and `/board/view` never need to show a raw
 * NaPTAN id as the station title.
 */

import { getStationCatalog } from "@/lib/tfl/station-catalog";

export type BoardStationNamesIndex = Readonly<Record<string, string>>;

/** Compact stop id (+ aliases) → display name map. */
export const buildBoardStationNamesIndex = (): BoardStationNamesIndex => {
  const index: Record<string, string> = {};

  for (const station of getStationCatalog()) {
    index[station.id] = station.displayName;
    for (const aliasId of station.aliasIds) {
      if (!index[aliasId]) index[aliasId] = station.displayName;
    }
  }

  return index;
};

let indexMemo: BoardStationNamesIndex | undefined;

/** Memoised for the process lifetime (server pages / SSR). */
export const getBoardStationNamesIndex = (): BoardStationNamesIndex => {
  indexMemo ??= buildBoardStationNamesIndex();
  return indexMemo;
};

/** Lookup a stop's display name. Undefined when the stop is not in the index. */
export const lookupBoardStationName = (
  index: BoardStationNamesIndex,
  stopId: string | undefined,
): string | undefined => {
  const id = stopId?.trim();
  if (!id) return undefined;
  return index[id];
};
