"use server";

import { searchBusStops } from "@/lib/tfl/actions";
import { filterNamedPlaces } from "@/lib/tfl/board-nearby";
import { formatBikePointId } from "@/lib/tfl/board-panels";
import { getTflClient } from "@/lib/tfl/client";
import { getExplorerRiverPiers } from "@/lib/tfl/explorer/points-river";
import { normaliseBikePoint } from "@/lib/tfl/explorer-point-normalise";

export type BoardPlaceKind = "bus" | "river" | "cycle";

export type BoardPlaceHit = {
  id: string;
  name: string;
  context?: string;
};

export type SearchBoardPlacesResult =
  | { ok: true; places: BoardPlaceHit[] }
  | { ok: false; error: string };

/**
 * Discover a bus stop, river pier, or cycle dock for the Board builder.
 * Pins go into the hash; `/board/view` does not search.
 */
export async function searchBoardPlaces(
  kind: BoardPlaceKind,
  query: string,
): Promise<SearchBoardPlacesResult> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return { ok: false, error: "Enter at least 2 characters to search." };
  }

  try {
    if (kind === "bus") {
      const result = await searchBusStops(trimmed);
      if (!result.ok) return result;
      return {
        ok: true,
        places: result.stops.map((stop) => ({
          id: stop.id,
          name: stop.name,
          context: [stop.stopLetter, stop.towards ? `towards ${stop.towards}` : null]
            .filter(Boolean)
            .join(" · "),
        })),
      };
    }

    if (kind === "river") {
      const piers = await getExplorerRiverPiers();
      return {
        ok: true,
        places: filterNamedPlaces(piers, trimmed).map((pier) => ({
          id: pier.id,
          name: pier.name,
          context: pier.lines.join(", "),
        })),
      };
    }

    const client = getTflClient();
    const docks = await client.bikePoint.search({ query: trimmed });
    const places: BoardPlaceHit[] = [];
    const seen = new Set<string>();
    for (const dock of docks) {
      const point = normaliseBikePoint(dock);
      if (!point) continue;
      const id = formatBikePointId(point.id);
      if (!id || seen.has(id)) continue;
      seen.add(id);
      places.push({ id, name: point.name });
      if (places.length >= 8) break;
    }
    return { ok: true, places };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Search failed.";
    return { ok: false, error: message };
  }
}
