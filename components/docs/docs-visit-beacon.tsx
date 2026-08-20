"use client"

import { useEffect, useRef } from "react"
import { defaultAnalyticsContext } from "@/lib/analytics/context"
import { analyticsPropsFromContext } from "@/lib/analytics/context"
import { trackSiteEvent } from "@/lib/analytics/track"

export const DocsVisitBeacon = () => {
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current) return
    const referrer = document.referrer
    if (!referrer) return
    try {
      const url = new URL(referrer)
      if (url.origin !== window.location.origin) return
      if (url.pathname !== "/") return
    } catch {
      return
    }
    sent.current = true
    trackSiteEvent(
      "landing_docs_visit",
      analyticsPropsFromContext(defaultAnalyticsContext("control"))
    )
  }, [])

  return null
}
