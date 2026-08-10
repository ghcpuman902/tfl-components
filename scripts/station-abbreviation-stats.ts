/**
 * One-shot stats for the station-labels abbreviations table.
 *
 *   pnpm exec tsx scripts/station-abbreviation-stats.ts
 *
 * Paste the printed `rows` into `STATION_ABBREVIATION_TABLE` in
 * `lib/tfl/station-abbreviations.ts`. Counts are unique display names from
 * tfl-ts `LINE_STATION_SEQUENCES` for Tube, Elizabeth line, DLR, Overground,
 * and Tram (deduped across lines and modes).
 */

import {
  LINE_STATION_SEQUENCES,
  STATION_SEQUENCES_GENERATED_AT,
} from "tfl-ts";
import { formatStationName } from "../lib/tfl/diagram-station.ts";
import {
  STATION_ABBREVIATION_ENTRIES,
  STATION_AND_ABBREVIATION,
} from "../lib/tfl/station-abbreviations.ts";

const MODES = new Set([
  "tube",
  "elizabeth-line",
  "dlr",
  "overground",
  "tram",
]);

const names = new Set<string>();
const modeCounts = new Map<string, number>();

for (const seq of Object.values(LINE_STATION_SEQUENCES)) {
  if (!MODES.has(seq.modeName)) continue;
  for (const station of seq.stations) {
    const display = formatStationName(station.name);
    const before = names.size;
    names.add(display);
    if (names.size > before) {
      modeCounts.set(seq.modeName, (modeCounts.get(seq.modeName) ?? 0) + 1);
    }
  }
}

const sorted = [...names].sort((a, b) => a.localeCompare(b));
const used = new Set<string>();

const matchesFull = (full: string, name: string): boolean => {
  if (full === "and") {
    // Canonical display uses `&`; exclude digit joins like "2&3".
    return /\s&\s/.test(name);
  }
  return new RegExp(`\\b${full}\\b`, "i").test(name);
};

const rows = [
  ...STATION_ABBREVIATION_ENTRIES.map((entry) => ({
    full: entry.full,
    short: entry.short,
  })),
  {
    full: STATION_AND_ABBREVIATION.full,
    short: STATION_AND_ABBREVIATION.short,
  },
].map(({ full, short }) => {
  const matches = sorted.filter((name) => matchesFull(full, name));
  const examples: string[] = [];
  for (const name of matches) {
    if (used.has(name)) continue;
    examples.push(name);
    used.add(name);
    if (examples.length === 3) break;
  }
  return { full, short, count: matches.length, examples };
});

console.log(
  JSON.stringify(
    {
      generatedFrom: STATION_SEQUENCES_GENERATED_AT,
      modes: [...MODES],
      stationCount: names.size,
      firstSeenByMode: Object.fromEntries(modeCounts),
      rows,
    },
    null,
    2,
  ),
);
