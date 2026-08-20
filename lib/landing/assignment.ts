import { cookies, headers } from "next/headers"
import { VISITOR_COOKIE } from "@/lib/site-stats"
import {
  assignLandingVariant,
  deviceClassFromWidth,
  isBotUserAgent,
  LANDING_ASSIGNMENT_COOKIE,
  LANDING_EXPERIMENT_ENABLED,
  LANDING_OVERRIDE_PARAM,
  parseLandingVariant,
  referrerCategoryFromHost,
  viewportCategoryFromWidth,
  type LandingAssignment,
  type LandingDeviceClass,
  type LandingVariant,
} from "@/lib/landing/experiment"
import type { AnalyticsContext } from "@/lib/analytics/context"
import { LANDING_EXPERIMENT_VERSION } from "@/lib/landing/experiment"
import { SITE_URL } from "@/lib/site"

const parseCookieAssignment = (
  raw: string | undefined
): LandingVariant | null => {
  if (!raw) return null
  try {
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "variant" in parsed &&
      "v" in parsed &&
      parsed.v === LANDING_EXPERIMENT_VERSION
    ) {
      return parseLandingVariant(String(parsed.variant))
    }
  } catch {
    return parseLandingVariant(raw)
  }
  return parseLandingVariant(raw)
}

const siteHost = () => {
  try {
    return new URL(SITE_URL).host
  } catch {
    return "tfl.manglekuo.com"
  }
}

const firstSearchValue = (
  value: string | string[] | undefined
): string | undefined => (Array.isArray(value) ? value[0] : value)

export type LandingPageAssignment = LandingAssignment & {
  context: AnalyticsContext
  visitorId: string
}

export const readLandingAssignment = async (input: {
  searchParams: Record<string, string | string[] | undefined>
  viewportWidth?: number
}): Promise<LandingPageAssignment> => {
  const headerList = await headers()
  const cookieStore = await cookies()
  const userAgent = headerList.get("user-agent") ?? ""
  const host = headerList.get("host") ?? siteHost()
  const referrer = headerList.get("referer")
  let referrerHost: string | null = null
  if (referrer) {
    try {
      referrerHost = new URL(referrer).host
    } catch {
      referrerHost = null
    }
  }

  const override =
    parseLandingVariant(firstSearchValue(input.searchParams[LANDING_OVERRIDE_PARAM])) ??
    parseLandingVariant(firstSearchValue(input.searchParams["flag-landing-variant"]))

  const visitorId = cookieStore.get(VISITOR_COOKIE)?.value ?? "anonymous"
  const persisted = parseCookieAssignment(
    cookieStore.get(LANDING_ASSIGNMENT_COOKIE)?.value
  )
  const viewportWidth = input.viewportWidth ?? 1280
  const deviceClass: LandingDeviceClass = deviceClassFromWidth(viewportWidth)
  const vercelEnv = process.env.VERCEL_ENV ?? process.env.NODE_ENV
  const isPreview = vercelEnv !== "production"

  const assignment = assignLandingVariant({
    enabled: LANDING_EXPERIMENT_ENABLED,
    deviceClass,
    visitorId,
    override,
    isPreview,
    isBot: isBotUserAgent(userAgent),
    persisted,
  })

  return {
    ...assignment,
    visitorId,
    context: {
      experimentVersion: LANDING_EXPERIMENT_VERSION,
      variant: assignment.variant,
      deviceClass,
      viewportCategory: viewportCategoryFromWidth(viewportWidth),
      referrerCategory: referrerCategoryFromHost(referrerHost, host),
      qa: assignment.qa,
      excludeFromResults: assignment.excludeFromResults,
    },
  }
}
