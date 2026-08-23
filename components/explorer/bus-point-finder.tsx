"use client"

import { useEffect, useRef, useState } from "react"
import { TfLPointPicker } from "@/components/explorer/tfl-point-picker"
import { ExplorerPointMapLazy } from "@/components/explorer/explorer-point-map-lazy"
import { readExplorerQueryParam } from "@/components/explorer/use-explorer-chrome"
import {
  getGeolocation,
  useExplorerKeyedQuery,
} from "@/hooks/use-explorer-keyed-query"
import { type ExplorerPoint } from "@/lib/tfl/explorer-point-normalise"
import {
  mapStopPoint,
  mapStopsFromGeoResponse,
} from "@/lib/tfl/bus-stop-shape"
import type { ExplorerView } from "@/lib/tfl/explorer-url-state"
import { MAP_SEARCH_RADIUS_METERS, truncateLatLon } from "@/lib/tfl/geo"
import type TflClient from "tfl-ts"

type BusPointFinderProps = {
  selectedId?: string | null
  onSelect: (point: ExplorerPoint, query?: string) => void
  view: ExplorerView
  onViewChange: (view: ExplorerView) => void
  initialQuery?: string
  /** Featured cached stops — shown until Search / Locate replaces them. */
  initialPoints?: readonly ExplorerPoint[]
  emptyMessage?: string
}

const toExplorerPoint = (
  stop: ReturnType<typeof mapStopPoint>
): ExplorerPoint | null => {
  if (!stop) return null
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
    compassPoint: stop.compassPoint,
    compassBearingDegrees: stop.compassBearingDegrees,
    additionalProperties: stop.additionalProperties,
  }
}

const enrichBoardableStops = async (
  client: TflClient,
  stops: ExplorerPoint[]
): Promise<ExplorerPoint[]> => {
  if (stops.length === 0) return stops
  try {
    const details = await client.stopPoint.get(stops.map((stop) => stop.id))
    const list = Array.isArray(details) ? details : [details]
    const byId = new Map(
      list
        .map((detail) => toExplorerPoint(mapStopPoint(detail)))
        .filter((point): point is ExplorerPoint => point !== null)
        .map((point) => [point.id, point] as const)
    )
    return stops.map((stop) => {
      const detail = byId.get(stop.id)
      if (!detail) return stop
      return {
        ...stop,
        stopLetter: stop.stopLetter ?? detail.stopLetter,
        towards: stop.towards ?? detail.towards,
        lineIds: stop.lineIds?.length ? stop.lineIds : detail.lineIds,
        smsCode: stop.smsCode ?? detail.smsCode,
        lat: stop.lat ?? detail.lat,
        lon: stop.lon ?? detail.lon,
        compassPoint: stop.compassPoint ?? detail.compassPoint,
        compassBearingDegrees:
          stop.compassBearingDegrees ?? detail.compassBearingDegrees,
        additionalProperties:
          detail.additionalProperties ?? stop.additionalProperties,
      }
    })
  } catch {
    return stops
  }
}

export const BusPointFinder = ({
  selectedId,
  onSelect,
  view,
  onViewChange,
  initialQuery = "",
  initialPoints = [],
  emptyMessage = "No matching stops.",
}: BusPointFinderProps) => {
  const { loading, error, setError, runKeyed, ready, hydrated } =
    useExplorerKeyedQuery()
  const [livePoints, setLivePoints] = useState<ExplorerPoint[] | null>(null)
  const [query, setQuery] = useState(
    () => initialQuery || readExplorerQueryParam()
  )
  const [fitSearchKey, setFitSearchKey] = useState(0)
  const [searchOrigin, setSearchOrigin] = useState<{
    lat: number
    lon: number
  } | null>(null)
  const restoredRef = useRef(false)

  const points = livePoints ?? initialPoints

  const hydratePointById = async (id: string) => {
    const result = await runKeyed(async (client) => {
      const details = await client.stopPoint.get({ stopPointIds: [id] })
      const stop = Array.isArray(details) ? details[0] : details
      if (!stop) return null
      // Keep the requested id when TfL remaps a 490G cluster onto a HUB*.
      return toExplorerPoint(mapStopPoint({ ...stop, id }))
    })
    if (!result.ok || !result.data) return false
    const hydrated = result.data
    setLivePoints((current) => {
      const rest = (current ?? initialPoints).filter(
        (point) => point.id !== hydrated.id
      )
      return [hydrated, ...rest]
    })
    onSelect(hydrated)
    return true
  }

  const handleSearchValueChange = (next: string) => {
    setQuery(next)
  }

  const handleSearchSubmit = async (
    nextQuery: string,
    preferId?: string | null
  ) => {
    const trimmed = nextQuery.trim()
    if (trimmed.length < 2) {
      setError("Enter at least 2 characters, or a 5-digit SMS code.")
      return false
    }

    const result = await runKeyed(async (client) => {
      const stops = await client.stopPoint.searchBusStops({
        query: trimmed,
        maxResults: 12,
      })
      const mapped = stops
        .map((stop) => toExplorerPoint(mapStopPoint(stop)))
        .filter((point): point is ExplorerPoint => point !== null)
      return enrichBoardableStops(client, mapped)
    })

    if (!result.ok) return false

    setLivePoints(result.data)
    const match = preferId
      ? result.data.find((point) => point.id === preferId)
      : undefined
    const next = match ?? result.data[0]
    if (next) onSelect(next, trimmed)
    else if (result.data.length === 0) {
      setError("No bus stops matched that search.")
    }
    return true
  }

  useEffect(() => {
    if (restoredRef.current || !hydrated || !ready) return
    restoredRef.current = true
    const q = (initialQuery || readExplorerQueryParam()).trim()
    if (q.length >= 2) {
      void handleSearchSubmit(q, selectedId)
      return
    }
    if (selectedId && !initialPoints.some((point) => point.id === selectedId)) {
      void hydratePointById(selectedId)
    }
    // Restore search hits / deep-linked ids after remount. Wait for the key.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per ready key
  }, [hydrated, ready])

  const handleLocate = async () => {
    try {
      const coords = await getGeolocation()
      const { lat, lon } = truncateLatLon(coords.lat, coords.lon)
      const result = await runKeyed(async (client) => {
        const response = await client.stopPoint.getByGeoPoint({
          lat,
          lon,
          radius: MAP_SEARCH_RADIUS_METERS,
          modes: ["bus"],
          returnLines: true,
        })
        return mapStopsFromGeoResponse(response.stopPoints ?? [], 12)
          .map(toExplorerPoint)
          .filter((point): point is ExplorerPoint => point !== null)
      })

      if (result.ok) {
        setLivePoints(result.data)
        if (result.data[0]) onSelect(result.data[0], query)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read location.")
    }
  }

  const handleSearchHere = async (center: { lat: number; lon: number }) => {
    const { lat, lon } = truncateLatLon(center.lat, center.lon)
    const result = await runKeyed(async (client) => {
      const response = await client.stopPoint.getByGeoPoint({
        lat,
        lon,
        radius: MAP_SEARCH_RADIUS_METERS,
        modes: ["bus"],
        returnLines: true,
      })
      return mapStopsFromGeoResponse(response.stopPoints ?? [], 12)
        .map(toExplorerPoint)
        .filter((point): point is ExplorerPoint => point !== null)
    })

    if (!result.ok) return
    setLivePoints(result.data)
    setSearchOrigin({ lat, lon })
    setFitSearchKey((key) => key + 1)
    if (result.data[0]) onSelect(result.data[0], query)
    else setError("No bus stops in this area.")
  }

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
      searchPlaceholder="Search bus stops or SMS code"
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
  )
}
