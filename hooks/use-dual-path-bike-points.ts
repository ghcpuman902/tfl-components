"use client"

import { useEffect, useState } from "react"
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

const DEFAULT_POLL_MS = 60_000

type UseDualPathBikePointsOptions = {
  dockIds: readonly string[]
  pollMs?: number
  appKeyOverride?: string | null
  enabled?: boolean
}

export const useDualPathBikePoints = ({
  dockIds,
  pollMs = DEFAULT_POLL_MS,
  appKeyOverride,
  enabled = true,
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

  useEffect(() => {
    if (!enabled || ids.length === 0) {
      setData([])
      setFetchError(null)
      setLoading(false)
      return
    }

    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined

    const poll = async () => {
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
          if (!cancelled) {
            setData(docks)
            setFetchError(null)
            setLoading(false)
          }
        } else {
          const result = await getBikePointsAction(ids)
          if (!cancelled) {
            if (result.ok) {
              setData(result.docks)
              setFetchError(null)
            } else {
              setData([])
              setFetchError(result.error)
            }
            setLoading(false)
          }
        }
      } catch (err) {
        if (!cancelled) {
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
      }
    }

    const tick = () => {
      if (shouldPausePollingForVisibility(document.visibilityState)) return
      void poll()
    }

    void poll()
    timer = setInterval(tick, pollMs)
    const onVisible = () => {
      if (document.visibilityState === "visible") void poll()
    }
    document.addEventListener("visibilitychange", onVisible)

    return () => {
      cancelled = true
      if (timer) clearInterval(timer)
      document.removeEventListener("visibilitychange", onVisible)
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
  ])

  return { data, loading, fetchError, source }
}
