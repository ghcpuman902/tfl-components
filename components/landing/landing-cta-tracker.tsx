"use client"

import { cloneElement, isValidElement, type ReactElement } from "react"
import { useLandingTrack } from "@/components/landing/landing-analytics"
import type { AnalyticsContext } from "@/lib/analytics/context"

type LandingCtaTrackerProps = {
  context: AnalyticsContext
  children: ReactElement<{ onCtaClick?: () => void }>
}

export const LandingCtaTracker = ({
  context,
  children,
}: LandingCtaTrackerProps) => {
  const track = useLandingTrack(context)
  if (!isValidElement(children)) return children
  return cloneElement(children, {
    onCtaClick: () => track("landing_cta_click"),
  })
}
