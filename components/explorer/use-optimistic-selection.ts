"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildExplorerHref,
  type ExplorerDirection,
  type ExplorerState,
} from "@/lib/tfl/explorer-url-state";
import type { ExplorerPoint } from "@/lib/tfl/explorer-point-normalise";
import type { ExplorerLineSummary } from "@/lib/tfl/explorer/common";
import {
  explorerIdsEqual,
  firstOrMatching,
  pointMatchesId,
} from "@/lib/tfl/explorer/selection";

/**
 * Instant line identity from the cached directory; URL/RSC catch up behind.
 * See docs/explorer-inspector-streaming.md.
 */
export const useOptimisticLine = (
  lines: readonly ExplorerLineSummary[],
  state: ExplorerState,
) => {
  const router = useRouter();
  const [optimisticId, setOptimisticId] = useState<string | null>(null);
  const [optimisticDir, setOptimisticDir] = useState<ExplorerDirection | null>(
    null,
  );

  const urlId = state.id ?? lines[0]?.id;
  if (
    optimisticId !== null &&
    urlId != null &&
    explorerIdsEqual(optimisticId, urlId)
  ) {
    setOptimisticId(null);
  }
  if (optimisticDir !== null && optimisticDir === state.dir) {
    setOptimisticDir(null);
  }

  const selectedId = optimisticId ?? urlId;
  const direction = optimisticDir ?? state.dir;
  const selectedLine = firstOrMatching(lines, selectedId) ?? null;
  const detailsPending =
    selectedLine != null &&
    ((urlId != null && !explorerIdsEqual(selectedLine.id, urlId)) ||
      direction !== state.dir);

  const handleSelectLine = (lineId: string) => {
    setOptimisticId(lineId);
    router.push(
      buildExplorerHref({ id: lineId, dir: direction, q: undefined }, state),
      { scroll: false },
    );
  };

  const handleDirectionChange = (nextDir: ExplorerDirection) => {
    setOptimisticDir(nextDir);
  };

  return {
    selectedLine,
    direction,
    detailsPending,
    handleSelectLine,
    handleDirectionChange,
  };
};

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
    id?: string,
  ) => ExplorerPoint | undefined = firstOrMatching,
) => {
  const router = useRouter();
  const [selected, setSelected] = useState<ExplorerPoint | null>(
    () => resolveFromList(points, state.id) ?? null,
  );
  const [seenUrlId, setSeenUrlId] = useState(state.id);

  if (state.id !== seenUrlId) {
    setSeenUrlId(state.id);
    const match = state.id ? resolveFromList(points, state.id) : undefined;
    if (
      match &&
      state.id &&
      pointMatchesId(match, state.id) &&
      selected?.id !== match.id
    ) {
      setSelected(match);
    }
  }

  const urlId = state.id ?? points[0]?.id;
  const detailsPending =
    selected != null && urlId != null && !pointMatchesId(selected, urlId);

  const handleSelectPoint = (point: ExplorerPoint) => {
    setSelected(point);
    router.push(
      buildExplorerHref({ id: point.id, view: state.view }, state),
      { scroll: false },
    );
  };

  return { selected, detailsPending, handleSelectPoint };
};
