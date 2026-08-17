import { cacheLife, cacheTag } from "next/cache";
import { getTflClient } from "@/lib/tfl/client";
import type { ExplorerRiverPoint } from "@/lib/tfl/explorer/common";
import { HOME_RIVER_STOP } from "@/lib/tfl/home-arrivals-stops";
import { RIVER_BUS_LINE_IDS, filterRiverBusLineIds } from "@/lib/tfl/river-bus";
import { mapFerryPort } from "@/lib/tfl/river-pier-shape";

/**
 * Cached river-bus pier directory for Points / River.
 * Union of `line.getStopPoints` across live river-bus lines, FerryPorts only.
 */
export async function getExplorerRiverPiers(): Promise<ExplorerRiverPoint[]> {
  "use cache";
  cacheLife({ revalidate: 300 });
  cacheTag("tfl-explorer-river-piers");

  const client = getTflClient();
  const byId = new Map<string, ExplorerRiverPoint>();

  const results = await Promise.all(
    RIVER_BUS_LINE_IDS.map((lineId) => client.line.getStopPoints(lineId)),
  );

  for (const [index, stops] of results.entries()) {
    const lineId = RIVER_BUS_LINE_IDS[index];
    if (!lineId) continue;
    for (const stop of stops) {
      const mapped = mapFerryPort(stop);
      if (!mapped) continue;
      const lines = filterRiverBusLineIds([...mapped.lines, lineId]);
      const existing = byId.get(mapped.id);
      if (existing) {
        existing.lines = filterRiverBusLineIds([
          ...existing.lines,
          ...lines,
        ]);
        continue;
      }
      byId.set(mapped.id, {
        id: mapped.id,
        name: mapped.name,
        lat: mapped.lat,
        lon: mapped.lon,
        lines,
      });
    }
  }

  const seedId = HOME_RIVER_STOP.id;
  return [...byId.values()].sort((a, b) => {
    if (a.id === seedId) return -1;
    if (b.id === seedId) return 1;
    return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
  });
}
