import { headers } from "next/headers"
import {
  deviceClassFromUserAgent,
  deviceClassFromWidth,
  LANDING_EXPERIMENT_VERSION,
  referrerCategoryFromHost,
  viewportCategoryFromWidth,
  type LandingDeviceClass,
} from "@/lib/landing/experiment"
import type { AnalyticsContext } from "@/lib/analytics/context"
import { SITE_URL } from "@/lib/site"

const siteHost = () => {
  try {
    return new URL(SITE_URL).host
  } catch {
    return "tfl.manglekuo.com"
  }
}

const referrerHostFromHeader = (referrer: string | null): string | null => {
  if (!referrer) return null
  try {
    return new URL(referrer).host
  } catch {
    return null
  }
}

const readDeviceAndViewport = async () => {
  const headerList = await headers()
  const userAgent = headerList.get("user-agent") ?? ""
  const host = headerList.get("host") ?? siteHost()
  const referrerHost = referrerHostFromHeader(headerList.get("referer"))
  const viewportHint = headerList.get("sec-ch-viewport-width")
  const viewportFromCh = viewportHint
    ? Number.parseInt(viewportHint, 10)
    : Number.NaN
  const viewportWidth = Number.isFinite(viewportFromCh) ? viewportFromCh : 1280
  const deviceClass: LandingDeviceClass = Number.isFinite(viewportFromCh)
    ? deviceClassFromWidth(viewportFromCh)
    : deviceClassFromUserAgent(userAgent)

  return { deviceClass, viewportWidth, referrerHost, host }
}

const contextFromRequest = async (): Promise<AnalyticsContext> => {
  const { deviceClass, viewportWidth, referrerHost, host } =
    await readDeviceAndViewport()
  return {
    experimentVersion: LANDING_EXPERIMENT_VERSION,
    variant: "room",
    deviceClass,
    viewportCategory: viewportCategoryFromWidth(viewportWidth),
    referrerCategory: referrerCategoryFromHost(referrerHost, host),
    qa: false,
    excludeFromResults: false,
  }
}

/** Homepage analytics — always the room landing. */
export const readHomepageContext = (): Promise<AnalyticsContext> =>
  contextFromRequest()

/**
 * Attribution for Docs and Board. No landing-assignment cookie.
 */
export const readAttributionContext = (): Promise<AnalyticsContext> =>
  contextFromRequest()
