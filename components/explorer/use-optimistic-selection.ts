"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  buildExplorerHref,
  type ExplorerDirection,
  type ExplorerState,
} from "@/lib/tfl/explorer-url-state";
import type { ExplorerPoint } from "@/lib/tfl/explorer-point-normalise";
import type { ExplorerLineSummary } from "@/lib/tfl/explorer/common";
import {
  firstOrMatching,
  firstOrMatchingPoint,
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
  const selectedId = optimisticId ?? urlId;
  const direction = optimisticDir ?? state.dir;
  const selectedLine = firstOrMatching(lines, selectedId) ?? null;
  const detailsPending =
    selectedLine != null &&
    (selectedLine.id !== urlId || direction !== state.dir);

  useEffect(() => {
    setOptimisticId(null);
    setOptimisticDir(null);
  }, [state.id, state.dir]);

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
 * Back/forward syncs from the seed list when the id is in `points`.
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

  const urlId = state.id ?? points[0]?.id;
  const detailsPending = selected != null && selected.id !== urlId;

  useEffect(() => {
    if (!state.id || selected?.id === state.id) return;
    const match = resolveFromList(points, state.id);
    if (match && match.id === state.id) setSelected(match);
  }, [state.id, points, selected?.id, resolveFromList]);

  const handleSelectPoint = (point: ExplorerPoint) => {
    setSelected(point);
    router.push(
      buildExplorerHref({ id: point.id, view: state.view }, state),
      { scroll: false },
    );
  };

  return { selected, detailsPending, handleSelectPoint };
};
