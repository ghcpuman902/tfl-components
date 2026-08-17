import { cacheLife, cacheTag } from "next/cache";
import { compareBusRouteNames } from "@/lib/tfl/arrivals-route-sort";
import { getTflClient } from "@/lib/tfl/client";
import type { ExplorerLineSummary } from "@/lib/tfl/explorer/common";

/**
 * Cached river-bus line directory for Lines / River.
 * One `line.get({ modes: ["river-bus"] })` call.
 */
export async function getExplorerRiverLines(): Promise<ExplorerLineSummary[]> {
  "use cache";
  cacheLife({ revalidate: 300 });
  cacheTag("tfl-explorer-river-lines");

  const client = getTflClient();
  const lines = await client.line.get({ modes: ["river-bus"] });

  return lines
    .filter((line): line is typeof line & { id: string } => Boolean(line.id))
    .map(
      (line): ExplorerLineSummary => ({
        id: line.id,
        name: line.name ?? line.id,
        modeName: line.modeName ?? "river-bus",
      }),
    )
    .sort((a, b) => compareBusRouteNames(a.name, b.name));
}
