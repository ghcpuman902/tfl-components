"use client"

import { useMemo } from "react"
import { useRouter } from "next/navigation"
import { PointInspectorDeferred } from "@/components/explorer/entity-inspector/point-inspector"
import { RiverPointFinder } from "@/components/explorer/river-point-finder"
import { ExplorerSplit } from "@/components/explorer/explorer-split"
import { useOptimisticPoint } from "@/components/explorer/use-optimistic-selection"
import type { ExplorerPoint } from "@/lib/tfl/explorer-point-normalise"
import {
  buildExplorerHref,
  type ExplorerState,
} from "@/lib/tfl/explorer-url-state"
import type { ExplorerRiverPoint } from "@/lib/tfl/explorer/common"
import type { ExplorerCachedArrivals } from "@/lib/tfl/explorer/selection"

const toPoint = (pier: ExplorerRiverPoint): ExplorerPoint => ({
  id: pier.id,
  name: pier.name,
  kind: "stopPoint",
  lat: pier.lat,
  lon: pier.lon,
  modes: ["river-bus"],
  lineIds: pier.lines,
})

type PointsRiverFindProps = {
  state: ExplorerState
  piers: readonly ExplorerRiverPoint[]
  cachedArrivalsPromise?: Promise<ExplorerCachedArrivals | null>
}

export const PointsRiverFind = ({
  state,
  piers,
  cachedArrivalsPromise,
}: PointsRiverFindProps) => {
  const router = useRouter()
  const initialPoints = useMemo(() => piers.map(toPoint), [piers])
  const { selected, detailsPending, handleSelectPoint } = useOptimisticPoint(
    initialPoints,
    state
  )

  return (
    <ExplorerSplit
      lead={
        <RiverPointFinder
          selectedId={selected?.id ?? state.id}
          view={state.view}
          onViewChange={(view) =>
            router.push(buildExplorerHref({ view }, state), { scroll: false })
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
