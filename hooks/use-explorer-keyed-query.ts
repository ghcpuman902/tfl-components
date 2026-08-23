"use client"

import { useCallback, useRef, useState } from "react"
import { useRequireUserTflKey } from "@/hooks/use-require-user-tfl-key"
import { useUserTflCredentials } from "@/components/user-tfl-credentials-provider"
import { createBrowserTflClient } from "@/lib/tfl/browser-tfl-client"
import { translateTflClientError } from "@/lib/tfl/tfl-error-translation"
import type TflClient from "tfl-ts"

const KEY_REQUIRED_MESSAGE =
  "Add a TfL API key to run this live query against your own quota. It stays in this browser and is never sent to our server."

type KeyedQueryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; gated?: boolean; stale?: boolean }

/**
 * Shared keyed browser→TfL helper for Explorer Find adapters.
 * Never falls back to a site-key Server Action.
 */
export const useExplorerKeyedQuery = () => {
  const { ready, hydrated, openDialog } = useRequireUserTflKey()
  const { getAppKey, markInvalid } = useUserTflCredentials()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestSeq = useRef(0)

  const runKeyed = useCallback(
    async <T>(
      operation: (client: TflClient) => Promise<T>
    ): Promise<KeyedQueryResult<T>> => {
      if (!hydrated) {
        return { ok: false, error: "Checking for a TfL API key…", gated: true }
      }

      if (!ready) {
        openDialog()
        setError(KEY_REQUIRED_MESSAGE)
        return { ok: false, error: KEY_REQUIRED_MESSAGE, gated: true }
      }

      const appKey = getAppKey()
      if (!appKey) {
        openDialog()
        setError(KEY_REQUIRED_MESSAGE)
        return { ok: false, error: KEY_REQUIRED_MESSAGE, gated: true }
      }

      const seq = ++requestSeq.current
      setLoading(true)
      setError(null)

      try {
        const client = await createBrowserTflClient(appKey)
        const data = await operation(client)
        if (seq !== requestSeq.current) {
          return { ok: false, error: "", stale: true }
        }
        setLoading(false)
        return { ok: true, data }
      } catch (err) {
        if (seq !== requestSeq.current) {
          return { ok: false, error: "", stale: true }
        }
        const translated = translateTflClientError(err, [appKey])
        if (
          translated.kind === "invalid-key" ||
          translated.kind === "rate-limited"
        ) {
          markInvalid(translated)
        }
        setError(translated.message)
        setLoading(false)
        return { ok: false, error: translated.message }
      }
    },
    [hydrated, ready, openDialog, getAppKey, markInvalid]
  )

  return {
    ready,
    hydrated,
    loading,
    error,
    setError,
    openDialog,
    runKeyed,
  }
}

export const getGeolocation = (): Promise<{ lat: number; lon: number }> =>
  new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && !window.isSecureContext) {
      reject(
        new Error(
          "Location needs a secure origin. Open via http://localhost (not a LAN IP)."
        )
      )
      return
    }
    if (!navigator.geolocation) {
      reject(new Error("Geolocation is not supported in this browser."))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        })
      },
      (geoError) => {
        const message =
          geoError.code === 1
            ? "Location is blocked for this site. Allow location, then try again."
            : geoError.code === 3
              ? "Location request timed out. Try again."
              : "Could not read your location."
        reject(new Error(message))
      },
      {
        enableHighAccuracy: false,
        timeout: 12_000,
        maximumAge: 60_000,
      }
    )
  })
