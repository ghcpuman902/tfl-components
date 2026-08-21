import { cookies, headers } from "next/headers"
import { VISITOR_COOKIE } from "@/lib/site-stats"
import {
  assignLandingVariant,
  decodeLandingAssignmentHeader,
  deviceClassFromUserAgent,
  deviceClassFromWidth,
  isBotUserAgent,
  LANDING_ASSIGNMENT_COOKIE,
  LANDING_ASSIGNMENT_HEADER,
  LANDING_EXPERIMENT_ENABLED,
  LANDING_EXPERIMENT_VERSION,
  LANDING_OVERRIDE_PARAM,
  parseLandingAssignmentCookie,
  parseLandingVariant,
  referrerCategoryFromHost,
  viewportCategoryFromWidth,
  type LandingAssignment,
  type LandingDeviceClass,
} from "@/lib/landing/experiment"
import type { AnalyticsContext } from "@/lib/analytics/context"
import { defaultAnalyticsContext } from "@/lib/analytics/context"
import { SITE_URL } from "@/lib/site"

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

const referrerHostFromHeader = (referrer: string | null): string | null => {
  if (!referrer) return null
  try {
    return new URL(referrer).host
  } catch {
    return null
  }
}

const isPreviewEnv = (): boolean => {
  const vercelEnv = process.env.VERCEL_ENV ?? process.env.NODE_ENV
  return vercelEnv !== "production"
}

export type LandingPageAssignment = LandingAssignment & {
  context: AnalyticsContext
  visitorId: string
}

export const contextFromAssignment = (input: {
  assignment: LandingAssignment
  deviceClass: LandingDeviceClass
  viewportWidth: number
  referrerHost: string | null
  host: string
}): AnalyticsContext => ({
  experimentVersion: LANDING_EXPERIMENT_VERSION,
  variant: input.assignment.variant,
  deviceClass: input.deviceClass,
  viewportCategory: viewportCategoryFromWidth(input.viewportWidth),
  referrerCategory: referrerCategoryFromHost(input.referrerHost, input.host),
  qa: input.assignment.qa,
  excludeFromResults: input.assignment.excludeFromResults,
})

export const readLandingAssignment = async (input: {
  searchParams: Record<string, string | string[] | undefined>
  viewportWidth?: number
}): Promise<LandingPageAssignment> => {
  const headerList = await headers()
  const cookieStore = await cookies()
  const userAgent = headerList.get("user-agent") ?? ""
  const host = headerList.get("host") ?? siteHost()
  const referrerHost = referrerHostFromHeader(headerList.get("referer"))

  const override =
    parseLandingVariant(
      firstSearchValue(input.searchParams[LANDING_OVERRIDE_PARAM])
    ) ??
    parseLandingVariant(
      firstSearchValue(input.searchParams["flag-landing-variant"])
    )

  const visitorId = cookieStore.get(VISITOR_COOKIE)?.value ?? "anonymous"
  const persisted = parseLandingAssignmentCookie(
    cookieStore.get(LANDING_ASSIGNMENT_COOKIE)?.value
  )
  const viewportHint = headerList.get("sec-ch-viewport-width")
  const viewportFromCh = viewportHint
    ? Number.parseInt(viewportHint, 10)
    : Number.NaN
  const viewportWidth = Number.isFinite(viewportFromCh)
    ? viewportFromCh
    : (input.viewportWidth ?? 1280)
  const deviceClass: LandingDeviceClass = Number.isFinite(viewportFromCh)
    ? deviceClassFromWidth(viewportFromCh)
    : input.viewportWidth
      ? deviceClassFromWidth(input.viewportWidth)
      : deviceClassFromUserAgent(userAgent)

  const forwarded = decodeLandingAssignmentHeader(
    headerList.get(LANDING_ASSIGNMENT_HEADER)
  )
  const assignment =
    forwarded && !override
      ? {
          variant: forwarded.variant,
          qa: forwarded.qa,
          excludeFromResults: forwarded.excludeFromResults,
          persist: forwarded.persist,
        }
      : assignLandingVariant({
          enabled: LANDING_EXPERIMENT_ENABLED,
          deviceClass,
          visitorId,
          override,
          isPreview: isPreviewEnv(),
          isBot: isBotUserAgent(userAgent),
          persisted,
        })

  return {
    ...assignment,
    visitorId,
    context: contextFromAssignment({
      assignment,
      deviceClass: forwarded?.deviceClass ?? deviceClass,
      viewportWidth,
      referrerHost,
      host,
    }),
  }
}

/**
 * Read-only attribution for Docs and Board. Reuses the persisted assignment
 * and never re-buckets.
 */
export const readAttributionContext = async (): Promise<AnalyticsContext> => {
  const headerList = await headers()
  const cookieStore = await cookies()
  const host = headerList.get("host") ?? siteHost()
  const referrerHost = referrerHostFromHeader(headerList.get("referer"))
  const userAgent = headerList.get("user-agent") ?? ""
  const viewportHint = headerList.get("sec-ch-viewport-width")
  const viewportFromCh = viewportHint
    ? Number.parseInt(viewportHint, 10)
    : Number.NaN
  const viewportWidth = Number.isFinite(viewportFromCh) ? viewportFromCh : 1280
  const deviceClass = Number.isFinite(viewportFromCh)
    ? deviceClassFromWidth(viewportFromCh)
    : deviceClassFromUserAgent(userAgent)

  const forwarded = decodeLandingAssignmentHeader(
    headerList.get(LANDING_ASSIGNMENT_HEADER)
  )
  const persisted = parseLandingAssignmentCookie(
    cookieStore.get(LANDING_ASSIGNMENT_COOKIE)?.value
  )

  if (forwarded) {
    return contextFromAssignment({
      assignment: forwarded,
      deviceClass: forwarded.deviceClass,
      viewportWidth,
      referrerHost,
      host,
    })
  }

  if (persisted) {
    return contextFromAssignment({
      assignment: {
        variant: persisted,
        qa: false,
        excludeFromResults: false,
        persist: true,
      },
      deviceClass,
      viewportWidth,
      referrerHost,
      host,
    })
  }

  return defaultAnalyticsContext("control")
}
