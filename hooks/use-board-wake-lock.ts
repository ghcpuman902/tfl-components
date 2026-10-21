"use client"

import { useEffect, useRef } from "react"

type WakeLockSentinelLike = {
  released: boolean
  release: () => Promise<void>
  addEventListener: (
    type: "release",
    listener: () => void
  ) => void
  removeEventListener: (
    type: "release",
    listener: () => void
  ) => void
}

type WakeLockNavigator = Navigator & {
  wakeLock?: {
    request: (type: "screen") => Promise<WakeLockSentinelLike>
  }
}

const canRequestWakeLock = (): boolean => {
  if (typeof navigator === "undefined") return false
  const nav = navigator as WakeLockNavigator
  return typeof nav.wakeLock?.request === "function"
}

/**
 * Best-effort Screen Wake Lock for unattended / wall displays.
 * Feature-detects, fails quietly, and re-requests when the page is visible
 * again (modelled on `useBoardFullscreen`).
 */
export const useBoardWakeLock = (options: { enabled: boolean }) => {
  const sentinelRef = useRef<WakeLockSentinelLike | null>(null)

  useEffect(() => {
    if (!options.enabled) return
    if (!canRequestWakeLock()) return

    let cancelled = false
    const nav = navigator as WakeLockNavigator

    const clearSentinel = () => {
      const current = sentinelRef.current
      sentinelRef.current = null
      if (!current || current.released) return
      void current.release().catch(() => {
        /* ignore */
      })
    }

    const requestLock = async () => {
      if (cancelled) return
      if (document.visibilityState !== "visible") return
      try {
        clearSentinel()
        const sentinel = await nav.wakeLock!.request("screen")
        if (cancelled) {
          void sentinel.release().catch(() => {
            /* ignore */
          })
          return
        }
        sentinelRef.current = sentinel
        const onRelease = () => {
          if (sentinelRef.current === sentinel) {
            sentinelRef.current = null
          }
        }
        sentinel.addEventListener("release", onRelease)
      } catch {
        /* Unsupported, denied, or transient — fail quietly. */
      }
    }

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        void requestLock()
      }
    }

    void requestLock()
    document.addEventListener("visibilitychange", handleVisibility)

    return () => {
      cancelled = true
      document.removeEventListener("visibilitychange", handleVisibility)
      clearSentinel()
    }
  }, [options.enabled])
}
