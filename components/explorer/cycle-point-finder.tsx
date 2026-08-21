"use client"

import { useState } from "react"
import { TfLPointPicker } from "@/components/explorer/tfl-point-picker"
import { ExplorerPointMapLazy } from "@/components/explorer/explorer-point-map-lazy"
import {
  getGeolocation,
  useExplorerKeyedQuery,
} from "@/hooks/use-explorer-keyed-query"
import {
  normaliseBikePoint,
  type ExplorerPoint,
} from "@/lib/tfl/explorer-point-normalise"
import type { ExplorerView } from "@/lib/tfl/explorer-url-state"
import { MAP_SEARCH_RADIUS_METERS, truncateLatLon } from "@/lib/tfl/geo"

type CyclePointFinderProps = {
  selectedId?: string | null
  onSelect: (point: ExplorerPoint) => void
  view: ExplorerView
  onViewChange: (view: ExplorerView) => void
  initialQuery?: string
  /** Featured cached docks — shown until Search / Locate replaces them. */
  initialPoints?: readonly ExplorerPoint[]
  emptyMessage?: string
  /** Select the first hit after Search / Locate. Default true. */
  autoSelectFirst?: boolean
  /** Docks already on the board — list shows as added. */
  addedIds?: readonly string[]
  addable?: boolean
}

export const CyclePointFinder = ({
  selectedId,
  onSelect,
  view,
  onViewChange,
  initialQuery = "",
  initialPoints = [],
  emptyMessage = "No matching docks.",
  autoSelectFirst = true,
  addedIds,
  addable = false,
}: CyclePointFinderProps) => {
  const { loading, error, setError, runKeyed } = useExplorerKeyedQuery()
  const [points, setPoints] = useState<ExplorerPoint[]>(() => [
    ...initialPoints,
  ])
  const [query, setQuery] = useState(initialQuery)
  const [fitSearchKey, setFitSearchKey] = useState(0)
  const [searchOrigin, setSearchOrigin] = useState<{
    lat: number
    lon: number
  } | null>(null)

  const handleSearchSubmit = async (nextQuery: string) => {
    const trimmed = nextQuery.trim()
    if (trimmed.length < 2) {
      setError("Enter at least 2 characters to search.")
      return
    }

    const result = await runKeyed(async (client) => {
      const searchResults = await client.bikePoint.search({ query: trimmed })
      return searchResults
        .map((dock) => normaliseBikePoint(dock))
        .filter((point): point is ExplorerPoint => point !== null)
        .slice(0, 25)
    })

    if (result.ok) {
      setPoints(result.data)
      if (autoSelectFirst && result.data[0]) onSelect(result.data[0])
    }
  }

  const handleLocate = async () => {
    try {
      const coords = await getGeolocation()
      const { lat, lon } = truncateLatLon(coords.lat, coords.lon)
      const result = await runKeyed(async (client) => {
        const nearby = await client.bikePoint.getByRadius({
          lat,
          lon,
          radius: MAP_SEARCH_RADIUS_METERS,
        })
        return nearby.places
          .map((dock) => normaliseBikePoint(dock))
          .filter((point): point is ExplorerPoint => point !== null)
          .slice(0, 25)
      })

      if (result.ok) {
        setPoints(result.data)
        if (autoSelectFirst && result.data[0]) onSelect(result.data[0])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read location.")
    }
  }

  const handleSearchHere = async (center: { lat: number; lon: number }) => {
    const { lat, lon } = truncateLatLon(center.lat, center.lon)
    const result = await runKeyed(async (client) => {
      const nearby = await client.bikePoint.getByRadius({
        lat,
        lon,
        radius: MAP_SEARCH_RADIUS_METERS,
      })
      return nearby.places
        .map((dock) => normaliseBikePoint(dock))
        .filter((point): point is ExplorerPoint => point !== null)
        .slice(0, 25)
    })

    if (!result.ok) return
    setPoints(result.data)
    setSearchOrigin({ lat, lon })
    setFitSearchKey((key) => key + 1)
    if (autoSelectFirst && result.data[0]) onSelect(result.data[0])
    else if (!result.data[0]) setError("No docks in this area.")
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
      searchPlaceholder="Search cycle hire docks"
      searchValue={query}
      onSearchValueChange={setQuery}
      addedIds={addedIds}
      addable={addable}
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
