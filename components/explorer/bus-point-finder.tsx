"use client";

import { useState } from "react";
import { TfLPointPicker } from "@/components/explorer/tfl-point-picker";
import { ExplorerPointMapLazy } from "@/components/explorer/explorer-point-map-lazy";
import {
  getGeolocation,
  useExplorerKeyedQuery,
} from "@/hooks/use-explorer-keyed-query";
import {
  isSmsCodeQuery,
  normaliseStopPoint,
  type ExplorerPoint,
} from "@/lib/tfl/explorer-point-normalise";
import {
  isBoardableBusStopId,
  isBusStop,
  mapStopPoint,
  mapStopsFromGeoResponse,
} from "@/lib/tfl/bus-stop-shape";
import type { ExplorerView } from "@/lib/tfl/explorer-url-state";
import { truncateLatLon } from "@/lib/tfl/geo";

type BusPointFinderProps = {
  selectedId?: string | null;
  onSelect: (point: ExplorerPoint) => void;
  view: ExplorerView;
  onViewChange: (view: ExplorerView) => void;
  initialQuery?: string;
};

const toExplorerPoint = (
  stop: ReturnType<typeof mapStopPoint>,
): ExplorerPoint | null => {
  if (!stop) return null;
  return {
    id: stop.id,
    name: stop.name,
    kind: "stopPoint",
    lat: stop.lat,
    lon: stop.lon,
    modes: ["bus"],
    lineIds: stop.lines,
    stopLetter: stop.stopLetter,
    smsCode: stop.smsCode,
    towards: stop.towards,
    distanceMeters: stop.distance,
  };
};

export const BusPointFinder = ({
  selectedId,
  onSelect,
  view,
  onViewChange,
  initialQuery = "",
}: BusPointFinderProps) => {
  const { loading, error, setError, runKeyed } = useExplorerKeyedQuery();
  const [points, setPoints] = useState<ExplorerPoint[]>([]);
  const [query, setQuery] = useState(initialQuery);

  const handleSearchSubmit = async (nextQuery: string) => {
    const trimmed = nextQuery.trim();
    if (trimmed.length < 2) {
      setError("Enter at least 2 characters, or a 5-digit SMS code.");
      return;
    }

    const result = await runKeyed(async (client) => {
      if (isSmsCodeQuery(trimmed)) {
        const smsResult = await client.stopPoint.getBySms({ id: trimmed });
        const mapped = normaliseStopPoint({
          ...(smsResult as Record<string, unknown>),
          id:
            (smsResult as { id?: string }).id ??
            (smsResult as { naptanId?: string }).naptanId,
          commonName:
            (smsResult as { commonName?: string }).commonName ??
            (smsResult as { name?: string }).name,
        });
        return mapped ? [mapped] : [];
      }

      const response = await client.stopPoint.search({
        query: trimmed,
        modes: ["bus"],
        maxResults: 12,
      });

      const matches = (response.matches ?? []).filter(
        (match) => match.id && isBusStop(match.modes),
      );

      const boardable = matches
        .filter((match) => match.id && isBoardableBusStopId(match.id))
        .map((match) =>
          toExplorerPoint(
            mapStopPoint({
              id: match.id,
              commonName: match.name ?? match.stationName,
              indicator: match.platformName,
              lines: match.lines,
              lat: match.lat,
              lon: match.lon,
            }),
          ),
        )
        .filter((point): point is ExplorerPoint => point !== null);

      if (boardable.length > 0) return boardable.slice(0, 12);

      const expandable = matches.find(
        (match) =>
          typeof match.lat === "number" && typeof match.lon === "number",
      );
      if (expandable?.lat != null && expandable.lon != null) {
        const nearby = await client.stopPoint.getByGeoPoint({
          lat: expandable.lat,
          lon: expandable.lon,
          radius: 400,
          modes: ["bus"],
          returnLines: true,
        });
        return mapStopsFromGeoResponse(nearby.stopPoints ?? [], 12)
          .map(toExplorerPoint)
          .filter((point): point is ExplorerPoint => point !== null);
      }

      return [];
    });

    if (result.ok) {
      setPoints(result.data);
      if (result.data[0]) onSelect(result.data[0]);
      else if (result.data.length === 0) {
        setError("No bus stops matched that search.");
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
          radius: 400,
          modes: ["bus"],
          returnLines: true,
        });
        return mapStopsFromGeoResponse(response.stopPoints ?? [], 12)
          .map(toExplorerPoint)
          .filter((point): point is ExplorerPoint => point !== null);
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
      emptyMessage="Search by stop name or 5-digit SMS code, or use your location. Live queries use your TfL API key."
      view={view}
      onViewChange={onViewChange}
      searchPlaceholder="Search bus stops or SMS code"
      searchValue={query}
      onSearchValueChange={setQuery}
      renderMap={(props) => <ExplorerPointMapLazy {...props} />}
    />
  );
};
