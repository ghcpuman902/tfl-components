"use client"

import { useEffect, useState, useSyncExternalStore } from "react"
import {
  resolveArrivalsEmptyKind,
  type ArrivalsEmptyKind,
} from "@/lib/tfl/arrivals-empty"

const LOAD_ERROR = "Couldn't load arrivals."

type ArrivalsBoardUiState = {
  error: string | null
  emptyKind: ArrivalsEmptyKind
}

const NOON_SENTINEL_MS = Date.UTC(2020, 0, 1, 12, 0, 0)

// `useSyncExternalStore`'s snapshot must be a *stable* cached value — it is
// re-read on every render, and `Date.now()` returns a new value on every
// call. Reading it directly here would make React see the store as "changed"
// on every render, forcing another render, forever (Maximum update depth
// exceeded). Instead, only mutate the cache inside the subscribe callback,
// which React guarantees runs client-side only, never during SSR/prerender.
let cachedNowMs = NOON_SENTINEL_MS

const subscribeToMinuteClock = (onStoreChange: () => void) => {
  const sync = () => {
    cachedNowMs = Date.now()
    onStoreChange()
  }
  sync()
  const id = window.setInterval(sync, 60_000)
  return () => window.clearInterval(id)
}

const getClockSnapshot = () => cachedNowMs
const getServerClockSnapshot = () => NOON_SENTINEL_MS

/**
 * Client-side empty/error presentation for live demos and polling boards.
 * Distinguishes offline vs fetch failure vs night-ended vs plain empty.
 */
export const useArrivalsBoardUiState = (
  rowCount: number,
  fetchError: string | null,
  domain: "rail" | "bus" | "river" = "rail",
  lineIds?: readonly string[]
): ArrivalsBoardUiState => {
  const [offline, setOffline] = useState(false)
  const nowMs = useSyncExternalStore(
    subscribeToMinuteClock,
    getClockSnapshot,
    getServerClockSnapshot
  )

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine)
    queueMicrotask(sync)
    window.addEventListener("online", sync)
    window.addEventListener("offline", sync)
    return () => {
      window.removeEventListener("online", sync)
      window.removeEventListener("offline", sync)
    }
  }, [])

  if (fetchError && !offline) {
    return { error: LOAD_ERROR, emptyKind: "empty" }
  }

  return {
    error: null,
    emptyKind:
      resolveArrivalsEmptyKind({
        rowCount,
        offline: offline && rowCount === 0,
        domain,
        nowMs,
        lineIds,
      }) ?? "empty",
  }
}
