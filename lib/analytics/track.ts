"use client"

import { track as vercelTrack } from "@vercel/analytics"
import { redactAnalyticsProps } from "@/lib/analytics/redact"
import {
  type AnalyticsEventName,
  type AnalyticsEventProps,
} from "@/lib/analytics/events"

export const trackSiteEvent = (
  name: AnalyticsEventName,
  props: AnalyticsEventProps,
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
