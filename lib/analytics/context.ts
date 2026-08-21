import type {
  AnalyticsDeviceClass,
  AnalyticsEventProps,
  AnalyticsLandingVariant,
  AnalyticsReferrerCategory,
  AnalyticsViewportCategory,
} from "@/lib/analytics/events"
import { LANDING_EXPERIMENT_VERSION } from "@/lib/landing/experiment"

export type AnalyticsContext = {
  experimentVersion: string
  variant: AnalyticsLandingVariant
  deviceClass: AnalyticsDeviceClass
  viewportCategory: AnalyticsViewportCategory
  referrerCategory: AnalyticsReferrerCategory
  qa: boolean
  excludeFromResults: boolean
}

export const analyticsPropsFromContext = (
  context: AnalyticsContext
): AnalyticsEventProps => ({
  experimentVersion: context.experimentVersion,
  variant: context.variant,
  deviceClass: context.deviceClass,
  viewportCategory: context.viewportCategory,
  referrerCategory: context.referrerCategory,
  qa: context.qa || undefined,
  excludeFromResults: context.excludeFromResults || undefined,
})

export const defaultAnalyticsContext = (
  variant: AnalyticsLandingVariant = "room"
): AnalyticsContext => ({
  experimentVersion: LANDING_EXPERIMENT_VERSION,
  variant,
  deviceClass: "desktop",
  viewportCategory: "desktop",
  referrerCategory: "direct",
  qa: false,
  excludeFromResults: false,
})
