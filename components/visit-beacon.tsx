"use client"

import { useEffect } from "react"

/** Fire-and-forget unique daily visitor beacon. */
export const VisitBeacon = () => {
  useEffect(() => {
    const handleBeacon = () => {
      try {
        void fetch("/api/stats/visit", {
          method: "POST",
          keepalive: true,
          credentials: "same-origin",
        })
      } catch {
        // Soft-fail — stats must never break the page.
      }
    }

    handleBeacon()
  }, [])

  return null
}
