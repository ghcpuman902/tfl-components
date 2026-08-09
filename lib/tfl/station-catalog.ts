import { cacheLife, cacheTag } from "next/cache";
import { formatStationName } from "@/lib/tfl/diagram-station";
import { getTflClient } from "@/lib/tfl/client";
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

const DIRECTIONS = ["inbound", "outbound"] as const;
const BATCH_SIZE = 4;

const chunk = <T,>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
};

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
 * Overground, and Tram — union of published route sequences.
 * Indexed by Naptan; homonyms merge via aliasIds on the first-seen record.
 */
export async function getStationCatalog(): Promise<CatalogStation[]> {
  "use cache";
  cacheLife("days");
  cacheTag("tfl-station-catalog-v4");

  const client = getTflClient();
  const byId = new Map<string, StationRecord>();
  const byDisplayKey = new Map<string, string>();

  const modeLinePairs = (
    await Promise.all(
      STATION_CATALOG_MODES.map(async (mode) => {
        const lines = await client.line.get({ modes: [mode.id] });
        return lines
          .map((line) => line.id)
          .filter((id): id is string => Boolean(id))
          .map((lineId) => ({ modeId: mode.id, lineId }));
      }),
    )
  ).flat();

  for (const batch of chunk(modeLinePairs, BATCH_SIZE)) {
    await Promise.all(
      batch.map(async ({ modeId, lineId }) => {
        for (const direction of DIRECTIONS) {
          try {
            const sequence = await client.line.getRouteSequence({
              id: lineId,
              direction,
            });

            const fromSequences =
              sequence.stopPointSequences?.flatMap(
                (seq) => seq.stopPoint ?? [],
              ) ?? [];
            const stops =
              fromSequences.length > 0
                ? fromSequences
                : (sequence.stations ?? []);

            for (const stop of stops) {
              const rawName = stop.name?.trim();
              if (!rawName) continue;
              const id = stop.id?.trim() || rawName;
              upsertStationRecord(
                { byId, byDisplayKey },
                {
                  id,
                  name: rawName,
                  lineId,
                  modeId,
                },
                { mergeHomonyms: true },
              );
            }
          } catch {
            // Skip failed line/direction pairs; catalogue stays partial but usable.
          }
        }
      }),
    );
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
}

/** Build a display-key lookup for tests / tools. */
export const catalogDisplayKey = (name: string): string =>
  stationLabelKey(formatStationName(name));
