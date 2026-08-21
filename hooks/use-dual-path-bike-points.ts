"use client"

import { useCallback, useEffect, useState } from "react"
import { useUserTflCredentials } from "@/components/user-tfl-credentials-provider"
import { getBikePointsAction } from "@/lib/tfl/board-bike-points-action"
import { formatBikePointId } from "@/lib/tfl/board-panels"
import { createBrowserTflClient } from "@/lib/tfl/browser-tfl-client"
import { translateTflClientError } from "@/lib/tfl/tfl-error-translation"
import type { CycleHireDock } from "@/lib/tfl/cycle-hire-types"
import {
  selectArrivalsDataPath,
  shouldPausePollingForVisibility,
  type DualPathSource,
} from "@/lib/tfl/dual-path-arrivals"

export const BIKE_POLL_MS = 60_000
const DEFAULT_POLL_MS = BIKE_POLL_MS

type UseDualPathBikePointsOptions = {
  dockIds: readonly string[]
  pollMs?: number
  appKeyOverride?: string | null
  enabled?: boolean
  /** Changing this tears down the current poller (hash-only board updates). */
  resetKey?: string
}

export const useDualPathBikePoints = ({
  dockIds,
  pollMs = DEFAULT_POLL_MS,
  appKeyOverride,
  enabled = true,
  resetKey,
}: UseDualPathBikePointsOptions) => {
  const { status, getAppKey, markInvalid } = useUserTflCredentials()
  const usingOverride = appKeyOverride !== undefined
  const overrideKey = usingOverride ? appKeyOverride?.trim() || null : null
  const source: DualPathSource = usingOverride
    ? overrideKey
      ? "user"
      : "site"
    : selectArrivalsDataPath(status)

  const ids = [
    ...new Set(dockIds.map((id) => formatBikePointId(id)).filter(Boolean)),
  ]
  const idKey = ids.join(",")

  const [data, setData] = useState<CycleHireDock[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [fetchedAt, setFetchedAt] = useState<number | null>(null)
  const [refreshNonce, setRefreshNonce] = useState(0)

  const refresh = useCallback(() => {
    setLoading(true)
    setRefreshNonce((n) => n + 1)
  }, [])

  useEffect(() => {
    if (!enabled || ids.length === 0) {
      setData([])
      setFetchError(null)
      setFetchedAt(null)
      setLoading(false)
      return
    }

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    let paused = false

    const clearTimer = () => {
      if (timer) {
        clearTimeout(timer)
        timer = undefined
      }
    }

    const poll = async () => {
      if (cancelled || paused) return
      try {
        if (source === "user") {
          const key = usingOverride ? overrideKey : getAppKey()
          if (!key) {
            throw new Error("Missing TfL API key.")
          }
          const client = await createBrowserTflClient(key)
          const docks = await Promise.all(
            ids.map((id) => client.bikePoint.getById(id))
          )
          if (cancelled || paused) return
          setData(docks)
          setFetchError(null)
          setFetchedAt(Date.now())
          setLoading(false)
        } else {
          const result = await getBikePointsAction(ids)
          if (cancelled || paused) return
          if (result.ok) {
            setData(result.docks)
            setFetchError(null)
            setFetchedAt(Date.now())
          } else {
            setData([])
            setFetchError(result.error)
            setFetchedAt(null)
          }
          setLoading(false)
        }
      } catch (err) {
        if (cancelled) return
        const translated = translateTflClientError(err)
        if (source === "user" && !usingOverride) markInvalid(translated)
        setFetchError(
          source === "user"
            ? translated.message
            : err instanceof Error
              ? err.message
              : "Failed to fetch cycle hire docks."
        )
        setLoading(false)
      }
      clearTimer()
      if (cancelled || paused) return
      timer = setTimeout(() => {
        void poll()
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
      void poll()
    }

    document.addEventListener("visibilitychange", handleVisibility)

    if (shouldPausePollingForVisibility(document.visibilityState)) {
      paused = true
    } else {
      void poll()
    }

    return () => {
      cancelled = true
      clearTimer()
      document.removeEventListener("visibilitychange", handleVisibility)
    }
  }, [
    enabled,
    idKey,
    source,
    usingOverride,
    overrideKey,
    pollMs,
    getAppKey,
    markInvalid,
    refreshNonce,
    resetKey,
  ])

  return { data, loading, fetchError, fetchedAt, refresh, source }
}
