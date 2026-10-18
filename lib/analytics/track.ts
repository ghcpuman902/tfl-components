"use client"

import { track as vercelTrack } from "@vercel/analytics"
import { redactAnalyticsProps } from "@/lib/analytics/redact"
import {
  type AnalyticsEventName,
  type AnalyticsEventProps,
} from "@/lib/analytics/events"
import type {
  HeroEventName,
  HeroVariantId,
} from "@/lib/landing/hero-experiment"

const dispatch = (
  name: AnalyticsEventName,
  props: Record<string, unknown>,
  secrets: readonly string[] = []
) => {
  const safe = redactAnalyticsProps({ ...props }, secrets)
  if (safe.excludeFromResults) return
  try {
    vercelTrack(name, safe)
  } catch {
    // Analytics must never take down the page (preview or production).
  }
}

export const trackSiteEvent = (
  name: AnalyticsEventName,
  props: AnalyticsEventProps,
  secrets: readonly string[] = []
) => dispatch(name, props, secrets)

/**
 * Hero headline test events. The only prop is `variant`, so Vercel Analytics
 * can filter any of the three by it. Callers decide whether a view counts.
 */
export const trackHeroEvent = (name: HeroEventName, variant: HeroVariantId) =>
  dispatch(name, { variant })
