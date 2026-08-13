"use client";

import { useMemo, useState } from "react";
import { TfLPointPicker } from "@/components/explorer/tfl-point-picker";
import { ExplorerPointMapLazy } from "@/components/explorer/explorer-point-map-lazy";
import {
  getGeolocation,
  useExplorerKeyedQuery,
} from "@/hooks/use-explorer-keyed-query";
import {
  normaliseStopPoint,
  type ExplorerPoint,
} from "@/lib/tfl/explorer-point-normalise";
import type { ExplorerView } from "@/lib/tfl/explorer-url-state";
import { truncateLatLon } from "@/lib/tfl/geo";

const RAIL_MODES = [
  "tube",
  "elizabeth-line",
  "dlr",
  "overground",
  "tram",
] as const;

type TubeRailPointFinderProps = {
  selectedId?: string | null;
  onSelect: (point: ExplorerPoint) => void;
  view: ExplorerView;
  onViewChange: (view: ExplorerView) => void;
  initialQuery?: string;
  /** Cached catalog — shown until Search / Locate replaces with live results. */
  initialPoints?: readonly ExplorerPoint[];
  emptyMessage?: string;
};

const filterCachedPoints = (
  points: readonly ExplorerPoint[],
  query: string,
): ExplorerPoint[] => {
  const q = query.trim().toLowerCase();
  if (!q) return [...points];
  return points.filter(
    (point) =>
      point.name.toLowerCase().includes(q) ||
      point.id.toLowerCase().includes(q) ||
      point.lineIds?.some((lineId) => lineId.toLowerCase().includes(q)) ||
      point.modes?.some((mode) => mode.toLowerCase().includes(q)),
  );
};

export const TubeRailPointFinder = ({
  selectedId,
  onSelect,
  view,
  onViewChange,
  initialQuery = "",
  initialPoints = [],
  emptyMessage = "Filter the cached catalog locally, or Search / Locate with your TfL API key.",
}: TubeRailPointFinderProps) => {
  const { loading, error, setError, runKeyed } = useExplorerKeyedQuery();
  const [livePoints, setLivePoints] = useState<ExplorerPoint[] | null>(null);
  const [query, setQuery] = useState(initialQuery);

  const points = useMemo(() => {
    if (livePoints !== null) return livePoints;
    return filterCachedPoints(initialPoints, query);
  }, [livePoints, initialPoints, query]);

  const handleSearchValueChange = (next: string) => {
    setQuery(next);
    // Typing filters the cached catalog; leave live results until Search/Locate.
    if (livePoints !== null) {
      setLivePoints(null);
      setError(null);
    }
  };

  const handleSearchSubmit = async (nextQuery: string) => {
    const trimmed = nextQuery.trim();
    if (trimmed.length < 2) {
      setError("Enter at least 2 characters to search.");
      return;
    }

    const result = await runKeyed(async (client) => {
      const response = await client.stopPoint.search({
        query: trimmed,
        modes: [...RAIL_MODES],
        maxResults: 25,
      });
      return (response.matches ?? [])
        .map((match) =>
          normaliseStopPoint({
            id: match.id,
            name: match.name ?? match.stationName,
            lat: match.lat,
            lon: match.lon,
            modes: match.modes,
            lines: match.lines,
            platformName: match.platformName,
          }),
        )
        .filter((point): point is ExplorerPoint => point !== null);
    });

    if (result.ok) {
      setLivePoints(result.data);
      if (result.data[0]) onSelect(result.data[0]);
    }
  };

  const handleLocate = async () => {
    try {
      const coords = await getGeolocation();
      const { lat, lon } = truncateLatLon(coords.lat, coords.lon);
      const result = await runKeyed(async (client) => {
        const response = await client.stopPoint.getByGeoPoint({
          lat,
          lon,
          radius: 800,
          modes: [...RAIL_MODES],
          returnLines: true,
        });
        return (response.stopPoints ?? [])
          .map((stop) => normaliseStopPoint(stop))
          .filter((point): point is ExplorerPoint => point !== null)
          .slice(0, 25);
      });

      if (result.ok) {
        setLivePoints(result.data);
        if (result.data[0]) onSelect(result.data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read location.");
    }
  };

  return (
    <TfLPointPicker
      points={points}
      selectedId={selectedId}
      onSelect={onSelect}
      onSearchSubmit={handleSearchSubmit}
      onLocate={handleLocate}
      loading={loading}
      error={error}
      emptyMessage={emptyMessage}
      view={view}
      onViewChange={onViewChange}
      searchPlaceholder="Search Tube & rail stations"
      searchValue={query}
      onSearchValueChange={handleSearchValueChange}
      renderMap={(props) => <ExplorerPointMapLazy {...props} />}
    />
  );
};
