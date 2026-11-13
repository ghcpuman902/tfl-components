/**
 * The one place the app touches `tfl-ts/meta/stops`. Everything else imports
 * this adapter, so publishing tfl-ts later is a one-line change here.
 *
 * The index is a large static chunk: it is loaded with a dynamic import on
 * search focus or idle time, never in the first paint bundle.
 */
import type { StopIndexData } from "tfl-ts/meta/stops"
import { bundleIsStale, servedIsNewer } from "@/lib/tfl/stop-index-served"

export type {
  LiveStopHit,
  StopIndex,
  StopKind,
  StopRow,
} from "tfl-ts/meta/stops"

type StopsModule = typeof import("tfl-ts/meta/stops")

export type StopSearchKit = {
  index: StopsModule["STOP_INDEX"]
  searchStops: StopsModule["searchStops"]
  mergeLiveResults: StopsModule["mergeLiveResults"]
  findHighlightedIndex: StopsModule["findHighlightedIndex"]
}

let loading: Promise<StopSearchKit> | undefined

/** Loads the bundled snapshot once; a failed load is retried on the next call. */
export const loadStopSearch = (): Promise<StopSearchKit> => {
  loading ??= import("tfl-ts/meta/stops").then(
    (mod) => ({
      index: mod.STOP_INDEX,
      searchStops: mod.searchStops,
      mergeLiveResults: mod.mergeLiveResults,
      findHighlightedIndex: mod.findHighlightedIndex,
    }),
    (error: unknown) => {
      loading = undefined
      throw error
    }
  )
  return loading
}

/**
 * When the bundled snapshot is more than a day and a half old, swaps in the
 * daily-refreshed copy if it is newer. Any failure keeps the bundled snapshot.
 * Returns whether the index changed.
 */
export const adoptServedStopIndex = async (
  kit: StopSearchKit,
  fetchServed: typeof fetch = fetch
): Promise<boolean> => {
  if (!bundleIsStale(kit.index.generatedAt, Date.now())) return false
  try {
    const response = await fetchServed("/api/stop-index")
    if (!response.ok) return false
    const mod = await import("tfl-ts/meta/stops")
    const served = (await response.json()) as StopIndexData
    if (!servedIsNewer(kit.index.generatedAt, served.generatedAt)) return false
    if (mod.validateStopIndexData(served).length > 0) return false
    kit.index = mod.createStopIndex(served)
    return true
  } catch {
    return false
  }
}

/** Starts the load when the browser is idle. */
export const preloadStopSearch = () => {
  const start = () => void loadStopSearch().catch(() => undefined)
  if (typeof requestIdleCallback === "function") requestIdleCallback(start)
  else setTimeout(start, 200)
}
