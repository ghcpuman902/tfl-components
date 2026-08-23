"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { pushExplorerHref } from "@/components/explorer/use-explorer-chrome"
import {
  buildExplorerHref,
  type ExplorerDirection,
  type ExplorerState,
} from "@/lib/tfl/explorer-url-state"
import type { ExplorerPoint } from "@/lib/tfl/explorer-point-normalise"
import type { ExplorerLineSummary } from "@/lib/tfl/explorer/common"
import {
  explorerIdsEqual,
  findPointById,
  firstOrMatching,
  pointMatchesId,
} from "@/lib/tfl/explorer/selection"

/**
 * Instant line identity from the cached directory; URL/RSC catch up behind.
 * See docs/explorer-inspector-streaming.md.
 */
export const useOptimisticLine = (
  lines: readonly ExplorerLineSummary[],
  state: ExplorerState
) => {
  const router = useRouter()
  const [optimisticId, setOptimisticId] = useState<string | null>(null)
  const [optimisticDir, setOptimisticDir] = useState<ExplorerDirection | null>(
    null
  )

  const urlId = state.id ?? lines[0]?.id
  if (
    optimisticId !== null &&
    urlId != null &&
    explorerIdsEqual(optimisticId, urlId)
  ) {
    setOptimisticId(null)
  }
  if (optimisticDir !== null && optimisticDir === state.dir) {
    setOptimisticDir(null)
  }

  const selectedId = optimisticId ?? urlId
  const direction = optimisticDir ?? state.dir
  const selectedLine = firstOrMatching(lines, selectedId) ?? null
  const detailsPending =
    selectedLine != null &&
    ((urlId != null && !explorerIdsEqual(selectedLine.id, urlId)) ||
      direction !== state.dir)

  const handleSelectLine = (lineId: string) => {
    setOptimisticId(lineId)
    router.push(
      buildExplorerHref({ id: lineId, dir: direction, q: undefined }, state),
      { scroll: false }
    )
  }

  const handleDirectionChange = (nextDir: ExplorerDirection) => {
    setOptimisticDir(nextDir)
  }

  return {
    selectedLine,
    direction,
    detailsPending,
    handleSelectLine,
    handleDirectionChange,
  }
}

/**
 * Instant point identity from the seed list or a search hit; URL catches up.
 * Back/forward adopts the URL id when it is in `points`, without clobbering a
 * Find hit that is still waiting for the URL.
 */
export const useOptimisticPoint = (
  points: readonly ExplorerPoint[],
  state: ExplorerState,
  resolveFromList: (
    items: readonly ExplorerPoint[],
    id?: string
  ) => ExplorerPoint | undefined = firstOrMatching
) => {
  const router = useRouter()
  const [selected, setSelected] = useState<ExplorerPoint | null>(() => {
    if (state.id) return findPointById(points, state.id) ?? null
    return resolveFromList(points) ?? null
  })
  const [seenUrlId, setSeenUrlId] = useState(state.id)

  if (state.id !== seenUrlId) {
    setSeenUrlId(state.id)
    const match = findPointById(points, state.id)
    if (match && selected?.id !== match.id) {
      setSelected(match)
    }
  }

  const urlId = state.id ?? points[0]?.id
  const detailsPending =
    selected != null && urlId != null && !pointMatchesId(selected, urlId)

  const handleSelectPoint = (point: ExplorerPoint, q?: string) => {
    setSelected(point)
    const nextQ = (q ?? state.q)?.trim() || undefined
    const href = buildExplorerHref(
      { id: point.id, view: state.view, q: nextQ },
      state
    )
    const inSeed = points.some((item) => pointMatchesId(item, point.id))
    if (inSeed) {
      router.push(href, { scroll: false })
      return
    }
    // Search / locate hits are not in the featured seed. `router.push`
    // remounts the finder onto Trafalgar Square; keep results via pushState.
    pushExplorerHref(href)
  }

  return { selected, detailsPending, handleSelectPoint }
}
