"use client"

import { useMemo } from "react"
import { PointInspectorDeferred } from "@/components/explorer/entity-inspector/point-inspector"
import { ExplorerSplit } from "@/components/explorer/explorer-split"
import { TubeRailPointFinder } from "@/components/explorer/tube-rail-point-finder"
import {
  pushExplorerHref,
  useExplorerChromeState,
} from "@/components/explorer/use-explorer-chrome"
import { useOptimisticPoint } from "@/components/explorer/use-optimistic-selection"
import { normaliseRailPoint } from "@/lib/tfl/explorer-point-normalise"
import {
  buildExplorerHref,
  type ExplorerState,
} from "@/lib/tfl/explorer-url-state"
import {
  firstOrMatchingPoint,
  type ExplorerCachedArrivals,
} from "@/lib/tfl/explorer/selection"
import type { ExplorerTubeRailPoint } from "@/lib/tfl/explorer/common"

type PointsTubeRailFindProps = {
  state: ExplorerState
  stations: readonly ExplorerTubeRailPoint[]
  cachedArrivalsPromise?: Promise<ExplorerCachedArrivals | null>
}

export const PointsTubeRailFind = ({
  state: pathState,
  stations,
  cachedArrivalsPromise,
}: PointsTubeRailFindProps) => {
  const state = useExplorerChromeState(pathState)
  const initialPoints = useMemo(
    () => stations.map(normaliseRailPoint),
    [stations]
  )
  const { selected, detailsPending, handleSelectPoint } = useOptimisticPoint(
    initialPoints,
    state,
    firstOrMatchingPoint
  )

  return (
    <ExplorerSplit
      lead={
        <TubeRailPointFinder
          selectedId={selected?.id ?? state.id}
          view={state.view}
          onViewChange={(view) =>
            pushExplorerHref(buildExplorerHref({ view }, state))
          }
          initialQuery={state.q}
          initialPoints={initialPoints}
          onSelect={handleSelectPoint}
        />
      }
      inspector={
        selected ? (
          <PointInspectorDeferred
            point={selected}
            cachedArrivalsPromise={cachedArrivalsPromise}
            detailsPending={detailsPending}
          />
        ) : null
      }
    />
  )
}
