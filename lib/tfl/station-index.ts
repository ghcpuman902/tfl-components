import { formatStationName } from "@/lib/tfl/diagram-station";

/**
 * Lowercase + apostrophe fold for recipe / catalog lookup.
 * Apostrophes are stripped so "Queen's Park" and "Queens Park" share a key.
 */
export const stationLabelKey = (name: string): string =>
  name
    .toLowerCase()
    .replace(/[\u2018\u2019\u02BC']/g, "")
    .trim();

/**
 * Canonical station identity for diagrams, catalogs, and future multi-line maps.
 * Primary key is Naptan; aliases cover hub/child ID variants from TfL payloads.
 */
export type StationRecord = {
  id: string;
  aliasIds: string[];
  name: string;
  displayName: string;
  lineIds: string[];
  modeIds: string[];
};

/**
 * Visual packing recipe for a station label on crowded diagrams.
 * Prefer `stationId`; `nameKey` is the fallback for demos / missing IDs.
 */
export type StationLabelRecipe = {
  stationId?: string;
  /** Extra Naptans that share this recipe (homonyms on different lines). */
  stationIds?: readonly string[];
  /** Normalised display-name key from `stationLabelKey`. */
  nameKey?: string;
  lines: readonly string[];
  abbreviated?: boolean;
};

export type StationIndex = {
  byId: ReadonlyMap<string, StationRecord>;
  /** displayName key → primary id (first seen). */
  byDisplayKey: ReadonlyMap<string, string>;
};

export const emptyStationIndex = (): StationIndex => ({
  byId: new Map(),
  byDisplayKey: new Map(),
});

/**
 * Merge a stop into an accumulating index keyed by Naptan.
 * Same display name with a different ID becomes an alias on the first record
 * when `mergeHomonyms` is true; otherwise a separate record is kept.
 * For serving lines and arrivals fetch targets use `STATION_HUBS` via
 * `station-catalog.ts`, not this name merge.
 */
export const upsertStationRecord = (
  index: {
    byId: Map<string, StationRecord>;
    byDisplayKey: Map<string, string>;
  },
  input: {
    id: string;
    name: string;
    lineId?: string;
    modeId?: string;
    aliasIds?: string[];
  },
  options: { mergeHomonyms?: boolean } = {},
): void => {
  const { mergeHomonyms = true } = options;
  const id = input.id.trim();
  if (!id) return;

  const displayName = formatStationName(input.name);
  const displayKey = stationLabelKey(displayName);
  const existingById = index.byId.get(id);

  if (existingById) {
    if (input.lineId) existingById.lineIds = uniqPush(existingById.lineIds, input.lineId);
    if (input.modeId) existingById.modeIds = uniqPush(existingById.modeIds, input.modeId);
    for (const alias of input.aliasIds ?? []) {
      existingById.aliasIds = uniqPush(existingById.aliasIds, alias);
      index.byId.set(alias, existingById);
    }
    return;
  }

  const primaryForName = index.byDisplayKey.get(displayKey);
  if (mergeHomonyms && primaryForName) {
    const primary = index.byId.get(primaryForName);
    if (primary) {
      primary.aliasIds = uniqPush(primary.aliasIds, id);
      index.byId.set(id, primary);
      if (input.lineId) primary.lineIds = uniqPush(primary.lineIds, input.lineId);
      if (input.modeId) primary.modeIds = uniqPush(primary.modeIds, input.modeId);
      return;
    }
  }

  const record: StationRecord = {
    id,
    aliasIds: [...new Set((input.aliasIds ?? []).filter(Boolean))],
    name: input.name,
    displayName,
    lineIds: input.lineId ? [input.lineId] : [],
    modeIds: input.modeId ? [input.modeId] : [],
  };
  index.byId.set(id, record);
  for (const alias of record.aliasIds) {
    index.byId.set(alias, record);
  }
  if (!index.byDisplayKey.has(displayKey)) {
    index.byDisplayKey.set(displayKey, id);
  }
};

export const resolveStationRecord = (
  index: StationIndex,
  idOrName: string,
): StationRecord | undefined => {
  const byId = index.byId.get(idOrName);
  if (byId) return byId;
  const key = stationLabelKey(formatStationName(idOrName));
  const primary = index.byDisplayKey.get(key);
  return primary ? index.byId.get(primary) : undefined;
};

/** IDs that should match the same physical stop in disruption payloads. */
export const stationRecordIdentityIds = (record: StationRecord): string[] =>
  [...new Set([record.id, ...record.aliasIds])];

const uniqPush = (list: string[], value: string): string[] =>
  list.includes(value) ? list : [...list, value];
