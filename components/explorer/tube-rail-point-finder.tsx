"use client"

import { useMemo, useState } from "react"
import { TfLPointPicker } from "@/components/explorer/tfl-point-picker"
import { ExplorerPointMapLazy } from "@/components/explorer/explorer-point-map-lazy"
import { getGeolocation } from "@/hooks/use-explorer-keyed-query"
import type { ExplorerPoint } from "@/lib/tfl/explorer-point-normalise"
import type { ExplorerView } from "@/lib/tfl/explorer-url-state"
import {
  filterExplorerTubeRailPoints,
  nearbyExplorerTubeRailPoints,
} from "@/lib/tfl/explorer-tube-rail-search"

type TubeRailPointFinderProps = {
  selectedId?: string | null
  onSelect: (point: ExplorerPoint) => void
  view: ExplorerView
  onViewChange: (view: ExplorerView) => void
  initialQuery?: string
  /** Full cached catalogue — filtered locally as you type. */
  initialPoints?: readonly ExplorerPoint[]
  emptyMessage?: string
}

export const TubeRailPointFinder = ({
  selectedId,
  onSelect,
  view,
  onViewChange,
  initialQuery = "",
  initialPoints = [],
  emptyMessage = "No matching stations.",
}: TubeRailPointFinderProps) => {
  const [query, setQuery] = useState(initialQuery)
  const [nearbyPoints, setNearbyPoints] = useState<ExplorerPoint[] | null>(null)
  const [locating, setLocating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const points = useMemo(() => {
    if (nearbyPoints !== null) return nearbyPoints
    return filterExplorerTubeRailPoints(initialPoints, query)
  }, [nearbyPoints, initialPoints, query])

  const handleSearchValueChange = (next: string) => {
    setQuery(next)
    if (nearbyPoints !== null) {
      setNearbyPoints(null)
      setError(null)
    }
  }

  const handleLocate = async () => {
    setLocating(true)
    setError(null)
    try {
      const origin = await getGeolocation()
      const nearby = nearbyExplorerTubeRailPoints(initialPoints, origin)
      if (nearby.length === 0) {
        setNearbyPoints(null)
        setError("No stations nearby.")
        return
      }
      setNearbyPoints(nearby)
      onSelect(nearby[0]!)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read location.")
    } finally {
      setLocating(false)
    }
  }

  return (
    <TfLPointPicker
      points={points}
      selectedId={selectedId}
      onSelect={onSelect}
      onLocate={handleLocate}
      loading={locating}
      error={error}
      emptyMessage={emptyMessage}
      view={view}
      onViewChange={onViewChange}
      searchPlaceholder="Search Tube & rail stations"
      searchValue={query}
      onSearchValueChange={handleSearchValueChange}
      renderMap={(props) => <ExplorerPointMapLazy {...props} />}
    />
  )
}
