"use client"

import { useEffect, useRef } from "react"
import { analyticsPropsFromContext, type AnalyticsContext } from "@/lib/analytics/context"
import { trackHeroEvent, trackSiteEvent } from "@/lib/analytics/track"
import type { AnalyticsEventName, AnalyticsEventProps } from "@/lib/analytics/events"
import { markHeroExposure } from "@/lib/landing/hero-client"
import type { HeroExposure } from "@/lib/landing/hero-experiment"
import { recordLandingExposure } from "@/lib/landing/timing"

type LandingAnalyticsProps = {
  context: AnalyticsContext
  hero?: HeroExposure
}

export const LandingAnalytics = ({ context, hero }: LandingAnalyticsProps) => {
  const sent = useRef(false)

  useEffect(() => {
    if (sent.current) return
    sent.current = true
    recordLandingExposure()
    trackSiteEvent("landing_exposure", analyticsPropsFromContext(context))
    // `?hero=` previews and crawlers are not counted and leave no cookie.
    if (hero?.counted) {
      markHeroExposure(hero.variant)
      trackHeroEvent("hero_view", hero.variant)
    }
  }, [context, hero])

  return null
}

export const useLandingTrack = (context: AnalyticsContext) => {
  const base = analyticsPropsFromContext(context)
  return (name: AnalyticsEventName, extra?: Partial<AnalyticsEventProps>) => {
    trackSiteEvent(name, { ...base, ...extra })
  }
}
