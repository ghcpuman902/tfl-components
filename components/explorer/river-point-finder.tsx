"use client";

import { useState } from "react";
import { TfLPointPicker } from "@/components/explorer/tfl-point-picker";
import { ExplorerPointMapLazy } from "@/components/explorer/explorer-point-map-lazy";
import {
  getGeolocation,
  useExplorerKeyedQuery,
} from "@/hooks/use-explorer-keyed-query";
import type { ExplorerPoint } from "@/lib/tfl/explorer-point-normalise";
import type { ExplorerView } from "@/lib/tfl/explorer-url-state";
import { MAP_SEARCH_RADIUS_METERS, truncateLatLon } from "@/lib/tfl/geo";
import {
  mapFerryPort,
  type MappedFerryPort,
} from "@/lib/tfl/river-pier-shape";

type RiverPointFinderProps = {
  selectedId?: string | null;
  onSelect: (point: ExplorerPoint) => void;
  view: ExplorerView;
  onViewChange: (view: ExplorerView) => void;
  initialQuery?: string;
  initialPoints?: readonly ExplorerPoint[];
  emptyMessage?: string;
};

const toExplorerPoint = (pier: MappedFerryPort): ExplorerPoint => ({
  id: pier.id,
  name: pier.name,
  kind: "stopPoint",
  lat: pier.lat,
  lon: pier.lon,
  modes: ["river-bus"],
  lineIds: pier.lines,
});

const mapPiers = (stops: readonly unknown[]): ExplorerPoint[] =>
  stops
    .map((stop) => mapFerryPort(stop as Parameters<typeof mapFerryPort>[0]))
    .filter((pier): pier is MappedFerryPort => pier !== null)
    .map(toExplorerPoint);

export const RiverPointFinder = ({
  selectedId,
  onSelect,
  view,
  onViewChange,
  initialQuery = "",
  initialPoints = [],
  emptyMessage = "No matching piers.",
}: RiverPointFinderProps) => {
  const { loading, error, setError, runKeyed } = useExplorerKeyedQuery();
  const [livePoints, setLivePoints] = useState<ExplorerPoint[] | null>(null);
  const [query, setQuery] = useState(initialQuery);
  const [fitSearchKey, setFitSearchKey] = useState(0);
  const [searchOrigin, setSearchOrigin] = useState<{
    lat: number;
    lon: number;
  } | null>(null);

  const points = livePoints ?? initialPoints;

  const handleSearchValueChange = (next: string) => {
    setQuery(next);
  };

  const handleSearchSubmit = async (nextQuery: string) => {
    const trimmed = nextQuery.trim();
    if (trimmed.length < 2) {
      setError("Enter at least 2 characters.");
      return;
    }

    const result = await runKeyed(async (client) => {
      const response = await client.stopPoint.search({
        query: trimmed,
        modes: ["river-bus"],
        maxResults: 12,
      });

      const ports = mapPiers(response.matches ?? []).slice(0, 12);
      if (ports.length > 0) return ports;

      const expandable = (response.matches ?? []).find(
        (match) =>
          typeof match.lat === "number" && typeof match.lon === "number",
      );
      if (expandable?.lat != null && expandable.lon != null) {
        const nearby = await client.stopPoint.getByGeoPoint({
          lat: expandable.lat,
          lon: expandable.lon,
          radius: MAP_SEARCH_RADIUS_METERS,
          modes: ["river-bus"],
          stoptypes: ["NaptanFerryPort"] as never,
          returnLines: true,
        });
        return mapPiers(nearby.stopPoints ?? []);
      }

      return [];
    });

    if (result.ok) {
      setLivePoints(result.data);
      if (result.data[0]) onSelect(result.data[0]);
      else if (result.data.length === 0) {
        setError("No piers matched that search.");
      }
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
          radius: MAP_SEARCH_RADIUS_METERS,
          modes: ["river-bus"],
          stoptypes: ["NaptanFerryPort"] as never,
          returnLines: true,
        });
        return mapPiers(response.stopPoints ?? []);
      });

      if (result.ok) {
        setLivePoints(result.data);
        if (result.data[0]) onSelect(result.data[0]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read location.");
    }
  };

  const handleSearchHere = async (center: { lat: number; lon: number }) => {
    const { lat, lon } = truncateLatLon(center.lat, center.lon);
    const result = await runKeyed(async (client) => {
      const response = await client.stopPoint.getByGeoPoint({
        lat,
        lon,
        radius: MAP_SEARCH_RADIUS_METERS,
        modes: ["river-bus"],
        stoptypes: ["NaptanFerryPort"] as never,
        returnLines: true,
      });
      return mapPiers(response.stopPoints ?? []);
    });

    if (!result.ok) return;
    setLivePoints(result.data);
    setSearchOrigin({ lat, lon });
    setFitSearchKey((key) => key + 1);
    if (result.data[0]) onSelect(result.data[0]);
    else setError("No piers in this area.");
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
      searchPlaceholder="Search river bus piers"
      searchValue={query}
      onSearchValueChange={handleSearchValueChange}
      showDistance={false}
      renderMap={(props) => (
        <ExplorerPointMapLazy
          {...props}
          onSearchHere={handleSearchHere}
          searchRadiusMeters={MAP_SEARCH_RADIUS_METERS}
          searchHereLoading={loading}
          fitSearchKey={fitSearchKey}
          searchOrigin={searchOrigin}
        />
      )}
    />
  );
};
