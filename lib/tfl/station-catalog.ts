import { cacheLife, cacheTag } from "next/cache";
import { formatStationName } from "@/lib/tfl/diagram-station";
import { getTflClient } from "@/lib/tfl/client";

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

type Accumulator = {
  id: string;
  name: string;
  modes: Set<StationCatalogModeId>;
  lines: Set<string>;
};

/**
 * Deduplicated A–Z station catalogue for Tube, Elizabeth line, DLR,
 * Overground, and Tram — union of published route sequences.
 */
export async function getStationCatalog(): Promise<CatalogStation[]> {
  "use cache";
  cacheLife("days");
  cacheTag("tfl-station-catalog-v3");

  const client = getTflClient();
  const byKey = new Map<string, Accumulator>();

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

            // Prefer stopPointSequences: complete naptan stops with Underground/
            // Rail suffixes. The `stations` hub list uses different IDs/names and
            // duplicates entries (e.g. King's Cross hub vs St. Pancras).
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
              const displayKey = formatStationName(rawName)
                .toLowerCase()
                .replace(/[\u2018\u2019\u02BC]/g, "'");
              const existing = byKey.get(displayKey);
              if (existing) {
                existing.modes.add(modeId);
                existing.lines.add(lineId);
                continue;
              }
              byKey.set(displayKey, {
                id,
                name: rawName,
                modes: new Set([modeId]),
                lines: new Set([lineId]),
              });
            }
          } catch {
            // Skip failed line/direction pairs; catalogue stays partial but usable.
          }
        }
      }),
    );
  }

  return [...byKey.values()]
    .map((entry) => ({
      id: entry.id,
      name: entry.name,
      displayName: formatStationName(entry.name),
      modes: [...entry.modes].sort(),
      lines: [...entry.lines].sort(),
    }))
    .sort((a, b) =>
      a.displayName.localeCompare(b.displayName, "en-GB", {
        sensitivity: "base",
      }),
    );
}
