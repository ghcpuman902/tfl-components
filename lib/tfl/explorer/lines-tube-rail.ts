import { cacheLife, cacheTag } from "next/cache";
import { getTflClient } from "@/lib/tfl/client";
import type {
  ExplorerLineRoute,
  ExplorerModeGroup,
} from "@/lib/tfl/explorer/common";
import type { ExplorerDirection } from "@/lib/tfl/explorer-url-state";

const TUBE_RAIL_MODES = [
  { id: "tube", label: "Tube" },
  { id: "elizabeth-line", label: "Elizabeth line" },
  { id: "dlr", label: "DLR" },
  { id: "overground", label: "Overground" },
  { id: "tram", label: "Tram" },
] as const;

/**
 * Cached Tube & rail line directory for Lines / Tube & rail / Browse.
 * Moved from the legacy `/explore/lines` page.
 */
export async function getExplorerTubeRailLineGroups(): Promise<
  ExplorerModeGroup[]
> {
  "use cache";
  cacheLife({ revalidate: 300 });
  cacheTag("tfl-explore-modes");

  const client = getTflClient();
  return Promise.all(
    TUBE_RAIL_MODES.map(async (mode) => {
      const lines = await client.line.get({ modes: [mode.id] });
      return {
        mode,
        lines: lines
          .filter((line): line is typeof line & { id: string } =>
            Boolean(line.id),
          )
          .map((line) => ({
            id: line.id,
            name: line.name ?? line.id,
            modeName: line.modeName ?? mode.id,
          })),
      };
    }),
  );
}

/**
 * Cached route sequence for a line + direction.
 * Moved from the legacy `/explore/routes` page.
 */
export async function getExplorerLineRoute(
  lineId: string,
  direction: ExplorerDirection,
): Promise<ExplorerLineRoute> {
  "use cache";
  cacheLife({ revalidate: 300 });
  cacheTag("tfl-route", `tfl-route-${lineId}-${direction}`);

  const client = getTflClient();
  const [lines, sequence] = await Promise.all([
    client.line.get({ lineIds: [lineId] }),
    client.line.getRouteSequence({ id: lineId, direction }),
  ]);

  return {
    line: lines[0]
      ? {
          id: lines[0].id,
          name: lines[0].name,
          modeName: lines[0].modeName,
        }
      : { id: lineId },
    stops:
      sequence.stopPointSequences?.flatMap((seq) => seq.stopPoint ?? []) ?? [],
  };
}
