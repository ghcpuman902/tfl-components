"use client"

import { useMemo } from "react"
import { PointInspector } from "@/components/explorer/entity-inspector/point-inspector"
import { CyclePointFinder } from "@/components/explorer/cycle-point-finder"
import { ExplorerSplit } from "@/components/explorer/explorer-split"
import {
  pushExplorerHref,
  useExplorerChromeState,
} from "@/components/explorer/use-explorer-chrome"
import { useOptimisticPoint } from "@/components/explorer/use-optimistic-selection"
import {
  normaliseBikePoint,
  type ExplorerPoint,
} from "@/lib/tfl/explorer-point-normalise"
import {
  buildExplorerHref,
  type ExplorerState,
} from "@/lib/tfl/explorer-url-state"
import type { ExplorerCyclePoint } from "@/lib/tfl/explorer/common"

type PointsCycleFindProps = {
  state: ExplorerState
  docks: readonly ExplorerCyclePoint[]
}

export const PointsCycleFind = ({
  state: pathState,
  docks,
}: PointsCycleFindProps) => {
  const state = useExplorerChromeState(pathState)
  const initialPoints = useMemo(
    () =>
      docks
        .map((dock) => normaliseBikePoint(dock))
        .filter((point): point is ExplorerPoint => point !== null),
    [docks]
  )
  const { selected, handleSelectPoint } = useOptimisticPoint(
    initialPoints,
    state
  )
  const selectedDock = docks.find((dock) => dock.id === selected?.id) ?? null

  return (
    <ExplorerSplit
      lead={
        <CyclePointFinder
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
          <PointInspector point={selected} cycleDock={selectedDock} />
        ) : null
      }
    />
  )
}
