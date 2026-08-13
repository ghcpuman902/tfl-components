import { cacheLife, cacheTag } from "next/cache";
import { compareBusRouteNames } from "@/lib/tfl/arrivals-route-sort";
import { getTflClient } from "@/lib/tfl/client";
import type { ExplorerLineSummary } from "@/lib/tfl/explorer/common";

/**
 * Cached London bus line directory for Lines / Bus.
 * One `line.get({ modes: ["bus"] })` call — same pattern as Tube & rail.
 */
export async function getExplorerBusLines(): Promise<ExplorerLineSummary[]> {
  "use cache";
  cacheLife({ revalidate: 300 });
  cacheTag("tfl-explorer-bus-lines");

  const client = getTflClient();
  const lines = await client.line.get({ modes: ["bus"] });

  return lines
    .filter((line): line is typeof line & { id: string } => Boolean(line.id))
    .map(
      (line): ExplorerLineSummary => ({
        id: line.id,
        name: line.name ?? line.id,
        modeName: line.modeName ?? "bus",
      }),
    )
    .sort((a, b) => compareBusRouteNames(a.name, b.name));
}
