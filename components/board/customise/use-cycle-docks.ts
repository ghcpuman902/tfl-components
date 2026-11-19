"use client"

import { useEffect, useState } from "react"
import { getBoardCycleDocks } from "@/lib/tfl/board-place-search-action"
import { formatBikePointId } from "@/lib/tfl/board-panels"
import type { ExplorerPoint } from "@/lib/tfl/explorer-point-normalise"

/** Name and counts of each dock on the board, read once per set of ids. */
export const useCycleDocks = (ids: readonly string[]) => {
  const key = ids.join(",")
  const [read, setRead] = useState<{ key: string; docks: ExplorerPoint[] }>({
    key: "",
    docks: [],
  })
  useEffect(() => {
    if (!key) return
    let live = true
    void getBoardCycleDocks(key.split(",")).then((result) => {
      if (live) setRead({ key, docks: result.ok ? result.docks : [] })
    })
    return () => {
      live = false
    }
  }, [key])
  const byId = new Map(read.docks.map((dock) => [dock.id, dock]))
  return {
    docks: ids.map((id) => byId.get(formatBikePointId(id))),
    ready: !key || read.key === key,
  }
}
