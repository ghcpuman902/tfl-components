import { LINE_STATION_SEQUENCES } from "tfl-ts";
import { formatStationName } from "@/lib/tfl/diagram-station";
import {
  stationLabelKey,
  upsertStationRecord,
  type StationRecord,
} from "@/lib/tfl/station-index";

export const STATION_CATALOG_MODES = [
  { id: "tube", label: "Tube" },
  { id: "elizabeth-line", label: "Elizabeth line" },
  { id: "dlr", label: "DLR" },
  { id: "overground", label: "Overground" },
  { id: "tram", label: "Tram" },
] as const;

export type StationCatalogModeId = (typeof STATION_CATALOG_MODES)[number]["id"];

export type CatalogStation = {
  id: string;
  /** Additional Naptan / hub IDs that refer to the same stop. */
  aliasIds: string[];
  name: string;
  displayName: string;
  modes: StationCatalogModeId[];
  lines: string[];
};

const CATALOG_MODE_IDS = new Set<string>(
  STATION_CATALOG_MODES.map((mode) => mode.id),
);

const toCatalogStation = (record: StationRecord): CatalogStation => ({
  id: record.id,
  aliasIds: record.aliasIds,
  name: record.name,
  displayName: record.displayName,
  modes: [...record.modeIds].sort() as StationCatalogModeId[],
  lines: [...record.lineIds].sort(),
});

/**
 * Deduplicated A–Z station catalogue for Tube, Elizabeth line, DLR,
 * Overground, and Tram — built from tfl-ts `LINE_STATION_SEQUENCES`
 * (offline topology; refresh by bumping tfl-ts).
 */
export const buildStationCatalog = (): CatalogStation[] => {
  const byId = new Map<string, StationRecord>();
  const byDisplayKey = new Map<string, string>();

  for (const sequence of Object.values(LINE_STATION_SEQUENCES)) {
    if (!CATALOG_MODE_IDS.has(sequence.modeName)) continue;
    const modeId = sequence.modeName as StationCatalogModeId;

    for (const stop of sequence.stations) {
      const rawName = stop.name.trim();
      if (!rawName) continue;
      const id = stop.id.trim() || rawName;
      upsertStationRecord(
        { byId, byDisplayKey },
        {
          id,
          name: rawName,
          lineId: sequence.lineId,
          modeId,
        },
        { mergeHomonyms: true },
      );
    }
  }

  const seen = new Set<string>();
  const stations: CatalogStation[] = [];
  for (const record of byId.values()) {
    if (seen.has(record.id)) continue;
    seen.add(record.id);
    stations.push(toCatalogStation(record));
  }

  return stations.sort((a, b) =>
    a.displayName.localeCompare(b.displayName, "en-GB", {
      sensitivity: "base",
    }),
  );
};

let catalogMemo: CatalogStation[] | undefined;

/** Same as {@link buildStationCatalog}, memoised for the process lifetime. */
export const getStationCatalog = (): CatalogStation[] => {
  catalogMemo ??= buildStationCatalog();
  return catalogMemo;
};

/** Build a display-key lookup for tests / tools. */
export const catalogDisplayKey = (name: string): string =>
  stationLabelKey(formatStationName(name));
