/**
 * Offline serving-line index for the hosted Board.
 *
 * Built on the server from `getStationCatalog()` so the client never pulls
 * `LINE_STATION_SEQUENCES`. Curated bounds (Oxford Circus today) overlay the
 * membership list. Line IDs are sorted canonically — the catalog sorts
 * alphabetically and must not leak into positional URL mapping.
 *
 * Shared-track merge + identity come from tfl-ts `getSharedTrackSegments`
 * (Circle / H&C / Metropolitan). Baker Street excludes Metropolitan from the
 * merge — those platforms are separate — but still reconciles the three-line
 * identity set.
 */

import { getSharedTrackSegments } from "tfl-ts";
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
 * Shared-platform merges. Derived from Circle / H&C / Met topology, with a
 * Baker Street Metropolitan exclusion (different platforms).
 */
export type BoardStationLineGroup = RailArrivalsLineGroup & {
  /** Rows per bound for this merged section. Applied via `pageSizeByLine`. */
  pageSize?: number;
};

export const SUBSURFACE_SHARED_TRACK_LINES = [
  "circle",
  "hammersmith-city",
  "metropolitan",
] as const;

/** Metropolitan uses different platforms here — merge Circle + H&C only. */
const SHARED_TRACK_MERGE_EXCLUDE: Readonly<
  Record<string, readonly string[]>
> = {
  "940GZZLUBST": ["metropolitan"],
};

const SHARED_TRACK_MERGE_PAGE_SIZE = 6;

const sortLineIds = (ids: readonly string[]): string[] =>
  [...ids].sort((a, b) =>
    compareArrivalsLines(
      { lineId: a, lineName: getLineNameTiers(a).full },
      { lineId: b, lineName: getLineNameTiers(b).full },
    ),
  );

const SHARED_TRACK_SEGMENTS = getSharedTrackSegments(
  SUBSURFACE_SHARED_TRACK_LINES,
);

/** Every naptan on Circle, H&C, or Metropolitan — used to block hub-alias leaks. */
const SUBSURFACE_NAPTAN_IDS = new Set(
  SHARED_TRACK_SEGMENTS.linesByStation.keys(),
);

const attachSafeAliases = <T,>(table: Record<string, T>): void => {
  const catalog = getStationCatalog();
  for (const key of Object.keys(table)) {
    const station = catalog.find(
      (row) => row.id === key || row.aliasIds.includes(key),
    );
    if (!station) continue;
    for (const alias of [station.id, ...station.aliasIds]) {
      if (alias in table) continue;
      if (SUBSURFACE_NAPTAN_IDS.has(alias)) continue;
      table[alias] = table[key];
    }
  }
};

const buildSharedTrackLineGroups = (): Record<
  string,
  readonly BoardStationLineGroup[]
> => {
  const table: Record<string, readonly BoardStationLineGroup[]> = {};
  for (const stationId of SHARED_TRACK_SEGMENTS.shared) {
    const serving = SHARED_TRACK_SEGMENTS.linesByStation.get(stationId) ?? [];
    const exclude = new Set(SHARED_TRACK_MERGE_EXCLUDE[stationId] ?? []);
    const lines = sortLineIds(serving.filter((id) => !exclude.has(id)));
    if (lines.length < 2) continue;
    table[stationId] = [
      {
        lines,
        pageSize: SHARED_TRACK_MERGE_PAGE_SIZE,
      },
    ];
  }
  attachSafeAliases(table);
  return table;
};

const buildSharedTrackLineSets = (): Record<string, readonly string[]> => {
  const table: Record<string, readonly string[]> = {};
  const identity = sortLineIds(SUBSURFACE_SHARED_TRACK_LINES);
  for (const stationId of SHARED_TRACK_SEGMENTS.shared) {
    table[stationId] = identity;
  }
  attachSafeAliases(table);
  return table;
};

export const BOARD_STATION_LINE_GROUPS: Readonly<
  Record<string, readonly BoardStationLineGroup[]>
> = buildSharedTrackLineGroups();

/**
 * Line sets for exclusive-segment identity reconciliation at every shared
 * Circle / H&C / Met station (same three-line network poll).
 */
export const SHARED_TRACK_LINE_SETS: Readonly<
  Record<string, readonly string[]>
> = buildSharedTrackLineSets();

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

const lookupCuratedStopTable = <T>(
  table: Readonly<Record<string, T>>,
  stopId: string | undefined,
): T | undefined => {
  const id = stopId?.trim();
  if (!id) return undefined;
  const direct = table[id];
  if (direct) return direct;
  // A subsurface naptan missing from the table is a deliberate miss
  // (Paddington Circle/District must not inherit the H&C-branch merge).
  if (SUBSURFACE_NAPTAN_IDS.has(id)) return undefined;

  const station = getStationCatalog().find(
    (row) => row.id === id || row.aliasIds.includes(id),
  );
  if (!station) return undefined;
  for (const candidate of [station.id, ...station.aliasIds]) {
    const value = table[candidate];
    if (value) return value;
  }
  return undefined;
};

/**
 * Shared-platform line groups for a stop. Resolves rail/hub aliases so the
 * rail sibling (`910GLIVST`) and hub id (`HUBLST`) share the tube-id table.
 * Does not copy a merge onto a different subsurface naptan.
 */
export const lookupBoardStationLineGroups = (
  stopId: string | undefined,
): readonly BoardStationLineGroup[] | undefined =>
  lookupCuratedStopTable(BOARD_STATION_LINE_GROUPS, stopId);

/** Line ids to reconcile on shared subsurface track at this stop. */
export const lookupSharedTrackLineIds = (
  stopId: string | undefined,
): readonly string[] | undefined =>
  lookupCuratedStopTable(SHARED_TRACK_LINE_SETS, stopId);
