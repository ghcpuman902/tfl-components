"use client";

import { useState } from "react";
import { TfLPointPicker } from "@/components/explorer/tfl-point-picker";
import { ExplorerPointMapLazy } from "@/components/explorer/explorer-point-map-lazy";
import {
  getGeolocation,
  useExplorerKeyedQuery,
} from "@/hooks/use-explorer-keyed-query";
import {
  normaliseBikePoint,
  type ExplorerPoint,
} from "@/lib/tfl/explorer-point-normalise";
import type { ExplorerView } from "@/lib/tfl/explorer-url-state";
import { truncateLatLon } from "@/lib/tfl/geo";

type CyclePointFinderProps = {
  selectedId?: string | null;
  onSelect: (point: ExplorerPoint) => void;
  view: ExplorerView;
  onViewChange: (view: ExplorerView) => void;
  initialQuery?: string;
};

export const CyclePointFinder = ({
  selectedId,
  onSelect,
  view,
  onViewChange,
  initialQuery = "",
}: CyclePointFinderProps) => {
  const { loading, error, setError, runKeyed } = useExplorerKeyedQuery();
  const [points, setPoints] = useState<ExplorerPoint[]>([]);
  const [query, setQuery] = useState(initialQuery);

  const handleSearchSubmit = async (nextQuery: string) => {
    const trimmed = nextQuery.trim();
    if (trimmed.length < 2) {
      setError("Enter at least 2 characters to search.");
      return;
    }

    const result = await runKeyed(async (client) => {
      const searchResults = await client.bikePoint.search({ query: trimmed });
      return searchResults
        .map((dock) => normaliseBikePoint(dock))
        .filter((point): point is ExplorerPoint => point !== null)
        .slice(0, 25);
    });

    if (result.ok) {
      setPoints(result.data);
      if (result.data[0]) onSelect(result.data[0]);
    }
  };

  const handleLocate = async () => {
    try {
      const coords = await getGeolocation();
      const { lat, lon } = truncateLatLon(coords.lat, coords.lon);
      const result = await runKeyed(async (client) => {
        const nearby = await client.bikePoint.getByRadius({
          lat,
          lon,
          radius: 500,
        });
        return nearby.places
          .map((dock) => normaliseBikePoint(dock))
          .filter((point): point is ExplorerPoint => point !== null)
          .slice(0, 25);
      });

      if (result.ok) {
        setPoints(result.data);
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
      emptyMessage="Search by dock name or use your location. Live queries use your TfL API key."
      view={view}
      onViewChange={onViewChange}
      searchPlaceholder="Search cycle hire docks"
      searchValue={query}
      onSearchValueChange={setQuery}
      renderMap={(props) => <ExplorerPointMapLazy {...props} />}
    />
  );
};
