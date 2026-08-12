import { cacheLife, cacheTag } from "next/cache";
import { getTflClient } from "@/lib/tfl/client";
import type { ExplorerLineSummary } from "@/lib/tfl/explorer/common";

/**
 * Curated central London bus routes for Lines / Bus / Browse.
 *
 * A complete London bus directory is ~700 routes and too large for a free
 * cached Browse list. Arbitrary lookup by route number is a keyed Find op.
 * These IDs match routes commonly seen at the Trafalgar Square fixture.
 */
export const EXPLORER_FEATURED_BUS_LINE_IDS = [
  "9",
  "11",
  "15",
  "24",
  "29",
  "88",
  "91",
  "139",
  "176",
  "453",
] as const;

/**
 * Cached curated bus line directory for Lines / Bus / Browse.
 */
export async function getExplorerCuratedBusLines(): Promise<
  ExplorerLineSummary[]
> {
  "use cache";
  cacheLife({ revalidate: 300 });
  cacheTag("tfl-explorer-curated-bus-lines");

  const client = getTflClient();
  const lines = await client.line.get({
    lineIds: [...EXPLORER_FEATURED_BUS_LINE_IDS],
  });

  return lines
    .filter((line): line is typeof line & { id: string } => Boolean(line.id))
    .map((line) => ({
      id: line.id,
      name: line.name ?? line.id,
      modeName: line.modeName ?? "bus",
    }));
}
