"use client"

import { useEffect, useState } from "react"
import { sortLinesBySeverityAndOrder } from "tfl-ts"
import { createBrowserTflClient } from "@/lib/tfl/browser-tfl-client"
import { getCachedLineStatusesAction } from "@/lib/tfl/cached-status-action"
import { shouldPausePollingForVisibility } from "@/lib/tfl/dual-path-arrivals"
import type { StatusLine } from "@/lib/tfl/status-types"
import { translateTflClientError } from "@/lib/tfl/tfl-error-translation"

const DEFAULT_POLL_MS = 60_000

/** Keep in sync with `CACHED_STATUS_MODES` / `DEFAULT_STATUS_MODES`. */
const STATUS_MODES = [
  "tube",
  "elizabeth-line",
  "dlr",
  "tram",
  "overground",
] as const

type UseBoardStatusOptions = {
  /** Hash-fragment key. Empty/null uses the site cache once (no poll). */
  appKey: string | null
  pollMs?: number
  enabled?: boolean
}

type UseBoardStatusResult = {
  data: StatusLine[]
  /** Clock for tfl-ts current-row helpers. Null until the first successful load. */
  fetchedAt: number | null
  loading: boolean
  error: string | null
  source: "site" | "user"
}

/**
 * Tube & rail status for the hosted board.
 * User key → browser poll (paused while hidden). No key → one cached fetch.
 */
export const useBoardStatus = ({
  appKey,
  pollMs = DEFAULT_POLL_MS,
  enabled = true,
}: UseBoardStatusOptions): UseBoardStatusResult => {
  const trimmed = appKey?.trim() ?? ""
  const source = trimmed ? "user" : "site"

  const [data, setData] = useState<StatusLine[]>([])
  const [fetchedAt, setFetchedAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let paused = false

    const clearTimer = () => {
      if (timer) {
        clearTimeout(timer)
        timer = undefined
      }
    }

    const applySuccess = (rows: StatusLine[], stamp: number) => {
      if (cancelled) return
      setError(null)
      setData(rows)
      setFetchedAt(stamp)
      setLoading(false)
    }

    const applyFailure = (message: string) => {
      if (cancelled) return
      setError(message)
      setData([])
      setFetchedAt(null)
      setLoading(false)
    }

    const runSiteLoad = async () => {
      try {
        const payload = await getCachedLineStatusesAction()
        applySuccess(payload.data, payload.fetchedAt)
      } catch {
        applyFailure("Failed to load line status.")
      }
    }

    const runUserLoad = async () => {
      if (cancelled || paused) return
      try {
        const client = await createBrowserTflClient(trimmed)
        if (cancelled || paused) return
        const stamp = Date.now()
        const rows = sortLinesBySeverityAndOrder(
          await client.line.getStatus({
            modes: [...STATUS_MODES],
          }),
          { now: stamp }
        )
        applySuccess(rows, stamp)
      } catch (caught) {
        const translated = translateTflClientError(caught, [trimmed])
        applyFailure(translated.message)
        return
      }

      clearTimer()
      if (cancelled || paused) return
      timer = setTimeout(() => {
        void runUserLoad()
      }, pollMs)
    }

    const handleVisibility = () => {
      const hidden = shouldPausePollingForVisibility(document.visibilityState)
      if (hidden) {
        paused = true
        clearTimer()
        return
      }
      paused = false
      if (source === "user") {
        void runUserLoad()
      }
    }

    document.addEventListener("visibilitychange", handleVisibility)

    if (source === "site") {
      void runSiteLoad()
    } else if (shouldPausePollingForVisibility(document.visibilityState)) {
      paused = true
    } else {
      void runUserLoad()
    }

    return () => {
      cancelled = true
      clearTimer()
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [enabled, pollMs, source, trimmed])

  return { data, fetchedAt, loading, error, source }
}
