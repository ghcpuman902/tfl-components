/**
 * Offline serving-line index for the hosted Board.
 *
 * Built on the server from `getStationCatalog()` so the client never pulls
 * `LINE_STATION_SEQUENCES`. Curated bounds (Oxford Circus today) overlay the
 * membership list. Line IDs are sorted canonically — the catalog sorts
 * alphabetically and must not leak into positional URL mapping.
 *
 * Shared-track merge + identity come from tfl-ts `getSharedTrackSegments`.
 * Families stay separate so Circle exclusive-segment evidence (Cannon Street)
 * is not wiped by adding District (which shares Victoria). Baker Street
 * excludes Metropolitan from the merge — those platforms are separate.
 */

import { getSharedTrackSegments } from "tfl-ts";
import { RAIL_ARRIVALS_MERGED_PAGE_SIZE } from "@/lib/tfl/arrivals-defaults";
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

/**
 * Separate families so exclusive-segment maps stay honest.
 * Circle + District must not sit in the same set as H&C / Met — Victoria
 * would become "shared" and Circle loop trains would lose exclusive evidence.
 */
export const SHARED_TRACK_IDENTITY_FAMILIES = [
  SUBSURFACE_SHARED_TRACK_LINES,
  ["circle", "district"],
  ["district", "hammersmith-city"],
] as const;

/** Metropolitan uses different platforms here — merge Circle + H&C only. */
const SHARED_TRACK_MERGE_EXCLUDE: Readonly<
  Record<string, readonly string[]>
> = {
  "940GZZLUBST": ["metropolitan"],
};

/**
 * Live-observed shared-track facts tfl-ts's static route topology doesn't
 * encode, so `getSharedTrackSegments` never flags these stations as shared
 * for that line pair. Confirmed by repeated live polling (not a one-off
 * diversion): Hammersmith & City predictions — including vehicles dual-listed
 * with District — repeatedly appear on Paddington Circle's own local-line
 * platforms ("Inner Rail - Platform 1" / "Outer Rail - Platform 2"), the same
 * platforms District and Circle already share there. TfL's own station page
 * for 940GZZLUPAC shows the same District-on-Inner-Rail pattern. Without this
 * override, H&C renders as an unmerged, duplicate-looking third section on
 * the exact platforms already shown under Circle + District — see
 * docs/arrivals-shared-platforms.md.
 */
const SHARED_TRACK_MERGE_INCLUDE: Readonly<
  Record<string, readonly string[]>
> = {
  "940GZZLUPAC": ["hammersmith-city"],
};

const SHARED_TRACK_MERGE_PAGE_SIZE = RAIL_ARRIVALS_MERGED_PAGE_SIZE;

const sortLineIds = (ids: readonly string[]): string[] =>
  [...ids].sort((a, b) =>
    compareArrivalsLines(
      { lineId: a, lineName: getLineNameTiers(a).full },
      { lineId: b, lineName: getLineNameTiers(b).full },
    ),
  );

const ALL_SHARED_TRACK_LINES = sortLineIds([
  ...new Set(SHARED_TRACK_IDENTITY_FAMILIES.flat()),
]);

const ALL_SHARED_TRACK_SEGMENTS = getSharedTrackSegments(ALL_SHARED_TRACK_LINES);

/** Every naptan on any shared-track family line — blocks hub-alias leaks. */
const SHARED_TRACK_NAPTAN_IDS = new Set(
  ALL_SHARED_TRACK_SEGMENTS.linesByStation.keys(),
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
      if (SHARED_TRACK_NAPTAN_IDS.has(alias)) continue;
      table[alias] = table[key];
    }
  }
};

type SharedTrackTables = {
  groups: Record<string, readonly BoardStationLineGroup[]>;
  identity: Record<string, readonly string[]>;
  families: Record<string, readonly (readonly string[])[]>;
};

const buildSharedTrackTables = (): SharedTrackTables => {
  const mergeByStation = new Map<string, Set<string>>();
  const identityByStation = new Map<string, Set<string>>();
  const familiesByStation = new Map<string, string[][]>();

  for (const family of SHARED_TRACK_IDENTITY_FAMILIES) {
    const segments = getSharedTrackSegments(family);
    const familyIds = sortLineIds(family);
    for (const stationId of segments.shared) {
      const serving = segments.linesByStation.get(stationId) ?? [];
      const exclude = new Set(SHARED_TRACK_MERGE_EXCLUDE[stationId] ?? []);
      const merge = mergeByStation.get(stationId) ?? new Set<string>();
      for (const id of serving) {
        if (!exclude.has(id)) merge.add(id);
      }
      mergeByStation.set(stationId, merge);

      const identity = identityByStation.get(stationId) ?? new Set<string>();
      for (const id of familyIds) identity.add(id);
      identityByStation.set(stationId, identity);

      const families = familiesByStation.get(stationId) ?? [];
      families.push(familyIds);
      familiesByStation.set(stationId, families);
    }
  }

  for (const [stationId, extra] of Object.entries(SHARED_TRACK_MERGE_INCLUDE)) {
    const merge = mergeByStation.get(stationId) ?? new Set<string>();
    for (const id of extra) merge.add(id);
    mergeByStation.set(stationId, merge);

    const identity = identityByStation.get(stationId) ?? new Set<string>();
    for (const id of extra) identity.add(id);
    identityByStation.set(stationId, identity);

    // Replace the auto-derived family (e.g. plain Circle/District) with the
    // superset — one family per station, matching the Liverpool Street shape.
    familiesByStation.set(stationId, [sortLineIds([...identity])]);
  }

  const groups: Record<string, readonly BoardStationLineGroup[]> = {};
  const identity: Record<string, readonly string[]> = {};
  const families: Record<string, readonly (readonly string[])[]> = {};

  for (const [stationId, lines] of mergeByStation) {
    const sorted = sortLineIds([...lines]);
    if (sorted.length < 2) continue;
    groups[stationId] = [
      { lines: sorted, pageSize: SHARED_TRACK_MERGE_PAGE_SIZE },
    ];
  }
  for (const [stationId, lines] of identityByStation) {
    identity[stationId] = sortLineIds([...lines]);
  }
  for (const [stationId, familyList] of familiesByStation) {
    families[stationId] = familyList;
  }

  attachSafeAliases(groups);
  attachSafeAliases(identity);
  attachSafeAliases(families);
  return { groups, identity, families };
};

const SHARED_TRACK_TABLES = buildSharedTrackTables();

export const BOARD_STATION_LINE_GROUPS: Readonly<
  Record<string, readonly BoardStationLineGroup[]>
> = SHARED_TRACK_TABLES.groups;

/**
 * Union of identity families at this stop — the network-wide poll.
 * Apply each family separately via `lookupSharedTrackFamilies`.
 */
export const SHARED_TRACK_LINE_SETS: Readonly<
  Record<string, readonly string[]>
> = SHARED_TRACK_TABLES.identity;

export const SHARED_TRACK_FAMILIES_BY_STOP: Readonly<
  Record<string, readonly (readonly string[])[]>
> = SHARED_TRACK_TABLES.families;

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
  if (SHARED_TRACK_NAPTAN_IDS.has(id)) return undefined;

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

/** Line ids to reconcile on shared track at this stop (union of families). */
export const lookupSharedTrackLineIds = (
  stopId: string | undefined,
): readonly string[] | undefined =>
  lookupCuratedStopTable(SHARED_TRACK_LINE_SETS, stopId);

/** Per-family line sets so exclusive-segment maps stay honest. */
export const lookupSharedTrackFamilies = (
  stopId: string | undefined,
): readonly (readonly string[])[] | undefined =>
  lookupCuratedStopTable(SHARED_TRACK_FAMILIES_BY_STOP, stopId);
