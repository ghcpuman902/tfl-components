/**
 * Offline serving-line index for the hosted Board.
 *
 * Built on the server from `getStationCatalog()` so the client never pulls
 * `LINE_STATION_SEQUENCES`. Curated bounds (Oxford Circus today) overlay the
 * membership list. Line IDs are sorted canonically — the catalog sorts
 * alphabetically and must not leak into positional URL mapping.
 */

import { compareArrivalsLines } from "@/lib/tfl/arrivals-line-sort";
import type { ArrivalsBoundId } from "@/lib/tfl/arrivals-bound-sort";
import type {
  RailArrivalsLine,
  RailArrivalsLineGroup,
} from "@/lib/tfl/arrivals-prepare";
import { HOME_RAIL_LINES, HOME_RAIL_STOP } from "@/lib/tfl/home-arrivals-stops";
import { getLineNameTiers, railLineModeName } from "@/lib/tfl/line-names";
import { getStationCatalog } from "@/lib/tfl/station-catalog";

/**
 * Curated compass-bound metadata per stop. Membership still comes from the
 * catalog; this only adds `bounds` (and can refine names/modes).
 */
export const BOARD_STATION_BOUNDS: Readonly<
  Record<string, readonly RailArrivalsLine[]>
> = {
  [HOME_RAIL_STOP.id]: HOME_RAIL_LINES,
};

/**
 * Curated shared-platform merges. Not derived from line-id overlap —
 * Baker Street also carries Circle / H&C / Metropolitan but on different
 * platforms, so it is absent here on purpose.
 */
export type BoardStationLineGroup = RailArrivalsLineGroup & {
  /** Rows per bound for this merged section. Applied via `pageSizeByLine`. */
  pageSize?: number;
};

const LIVERPOOL_STREET_SUBSURFACE: readonly BoardStationLineGroup[] = [
  {
    lines: ["circle", "hammersmith-city", "metropolitan"],
    pageSize: 6,
  },
];

export const BOARD_STATION_LINE_GROUPS: Readonly<
  Record<string, readonly BoardStationLineGroup[]>
> = {
  "940GZZLULVT": LIVERPOOL_STREET_SUBSURFACE,
};

export type BoardStationLinesIndex = Readonly<
  Record<string, readonly RailArrivalsLine[]>
>;

const toRailLine = (lineId: string): RailArrivalsLine => ({
  lineId,
  lineName: getLineNameTiers(lineId).full,
  modeName: railLineModeName(lineId),
});

const sortRailLines = (lines: readonly RailArrivalsLine[]): RailArrivalsLine[] =>
  [...lines].sort((a, b) =>
    compareArrivalsLines(
      { lineId: a.lineId, lineName: a.lineName },
      { lineId: b.lineId, lineName: b.lineName },
    ),
  );

const applyBoundsOverlay = (
  stopId: string,
  membership: readonly RailArrivalsLine[],
): readonly RailArrivalsLine[] => {
  const overlay = BOARD_STATION_BOUNDS[stopId];
  if (!overlay?.length) return membership;

  const byId = new Map(membership.map((line) => [line.lineId, line]));
  for (const curated of overlay) {
    const existing = byId.get(curated.lineId);
    byId.set(curated.lineId, {
      lineId: curated.lineId,
      lineName: curated.lineName,
      modeName: curated.modeName ?? existing?.modeName,
      bounds: curated.bounds as readonly ArrivalsBoundId[] | undefined,
    });
  }
  return sortRailLines([...byId.values()]);
};

/**
 * Compact stop → serving lines map (canonical order, bounds overlaid).
 * Include every catalog id and alias so lookups work either way.
 */
export const buildBoardStationLinesIndex = (): BoardStationLinesIndex => {
  const catalog = getStationCatalog();
  const index: Record<string, readonly RailArrivalsLine[]> = {};

  for (const station of catalog) {
    const membership = sortRailLines(station.lines.map(toRailLine));
    const withBounds = applyBoundsOverlay(station.id, membership);
    index[station.id] = withBounds;
    for (const aliasId of station.aliasIds) {
      if (!index[aliasId]) index[aliasId] = withBounds;
    }
  }

  // Ensure curated stops are present even if the catalog id form differs.
  for (const [stopId, lines] of Object.entries(BOARD_STATION_BOUNDS)) {
    if (!index[stopId]) {
      index[stopId] = sortRailLines([...lines]);
    }
  }

  return index;
};

let indexMemo: BoardStationLinesIndex | undefined;

/** Memoised for the process lifetime (server pages / SSR). */
export const getBoardStationLinesIndex = (): BoardStationLinesIndex => {
  indexMemo ??= buildBoardStationLinesIndex();
  return indexMemo;
};

/** Lookup serving lines for a stop. Undefined when the stop is not in the index. */
export const lookupBoardStationLines = (
  index: BoardStationLinesIndex,
  stopId: string | undefined,
): readonly RailArrivalsLine[] | undefined => {
  const id = stopId?.trim();
  if (!id) return undefined;
  return index[id];
};

/**
 * Shared-platform line groups for a stop. Resolves catalog aliases so the
 * rail sibling (`910GLIVST`) and hub id (`HUBLST`) share the tube-id table.
 */
export const lookupBoardStationLineGroups = (
  stopId: string | undefined,
): readonly BoardStationLineGroup[] | undefined => {
  const id = stopId?.trim();
  if (!id) return undefined;
  const direct = BOARD_STATION_LINE_GROUPS[id];
  if (direct) return direct;

  const station = getStationCatalog().find(
    (row) => row.id === id || row.aliasIds.includes(id),
  );
  if (!station) return undefined;
  for (const candidate of [station.id, ...station.aliasIds]) {
    const groups = BOARD_STATION_LINE_GROUPS[candidate];
    if (groups) return groups;
  }
  return undefined;
};
