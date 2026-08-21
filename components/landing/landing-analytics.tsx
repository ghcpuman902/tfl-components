"use client"

import { useEffect, useRef } from "react"
import { analyticsPropsFromContext, type AnalyticsContext } from "@/lib/analytics/context"
import { trackSiteEvent } from "@/lib/analytics/track"
import type { AnalyticsEventName, AnalyticsEventProps } from "@/lib/analytics/events"
import { recordLandingExposure } from "@/lib/landing/timing"

type LandingAnalyticsProps = {
  context: AnalyticsContext
}

export const LandingAnalytics = ({ context }: LandingAnalyticsProps) => {
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current) return
    sent.current = true
    recordLandingExposure()
    trackSiteEvent("landing_exposure", analyticsPropsFromContext(context))
  }, [context])

  return null
}

export const useLandingTrack = (context: AnalyticsContext) => {
  const base = analyticsPropsFromContext(context)
  return (name: AnalyticsEventName, extra?: Partial<AnalyticsEventProps>) => {
    trackSiteEvent(name, { ...base, ...extra })
  }
}
