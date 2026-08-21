import { NextResponse, type NextRequest } from "next/server"
import {
  EXPLORER_PATH,
  legacyExplorerRedirectHref,
} from "@/lib/tfl/explorer-url-state"
import {
  assignLandingVariant,
  deviceClassFromUserAgent,
  deviceClassFromWidth,
  encodeLandingAssignmentHeader,
  isBotUserAgent,
  LANDING_ASSIGNMENT_COOKIE,
  LANDING_ASSIGNMENT_HEADER,
  LANDING_ASSIGNMENT_MAX_AGE_SECONDS,
  LANDING_EXPERIMENT_ENABLED,
  LANDING_OVERRIDE_PARAM,
  parseLandingAssignmentCookie,
  parseLandingVariant,
  serializeLandingAssignmentCookie,
  type LandingDeviceClass,
  type LandingVariant,
} from "@/lib/landing/experiment"

const VISITOR_COOKIE = "tfl_vid"

/**
 * Intercept static registry JSON so we can count installs while keeping
 * public URLs at `/r/<name>.json` (shadcn CLI + docs install commands).
 * Also persist the landing assignment cookie before HTML renders.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === EXPLORER_PATH || pathname.startsWith(`${EXPLORER_PATH}/`)) {
    const href = legacyExplorerRedirectHref(request.nextUrl.searchParams)
    if (href) {
      return NextResponse.redirect(new URL(href, request.url), 308)
    }
  }

  const match = pathname.match(/^\/r\/([a-z0-9]+(?:-[a-z0-9]+)*)\.json$/i)
  if (match) {
    const name = match[1]
    const url = request.nextUrl.clone()
    url.pathname = `/api/registry/${name}`
    return NextResponse.rewrite(url)
  }

  return applyLandingAssignment(request)
}

const applyLandingAssignment = (request: NextRequest) => {
  const userAgent = request.headers.get("user-agent") ?? ""
  const viewportHint = request.headers.get("sec-ch-viewport-width")
  const viewportWidth = viewportHint
    ? Number.parseInt(viewportHint, 10)
    : Number.NaN
  const deviceClass: LandingDeviceClass = Number.isFinite(viewportWidth)
    ? deviceClassFromWidth(viewportWidth)
    : deviceClassFromUserAgent(userAgent)

  const override =
    parseLandingVariant(
      request.nextUrl.searchParams.get(LANDING_OVERRIDE_PARAM)
    ) ??
    parseLandingVariant(request.nextUrl.searchParams.get("flag-landing-variant"))

  const visitorId = request.cookies.get(VISITOR_COOKIE)?.value ?? "anonymous"
  const persisted = parseLandingAssignmentCookie(
    request.cookies.get(LANDING_ASSIGNMENT_COOKIE)?.value
  )
  const vercelEnv = process.env.VERCEL_ENV ?? process.env.NODE_ENV
  const assignment = assignLandingVariant({
    enabled: LANDING_EXPERIMENT_ENABLED,
    deviceClass,
    visitorId,
    override,
    isPreview: vercelEnv !== "production",
    isBot: isBotUserAgent(userAgent),
    persisted,
  })

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set(
    LANDING_ASSIGNMENT_HEADER,
    encodeLandingAssignmentHeader(assignment, deviceClass)
  )

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  })
  response.headers.set("Accept-CH", "Sec-CH-Viewport-Width")
  response.headers.append("Vary", "Sec-CH-Viewport-Width")

  if (
    assignment.persist &&
    (assignment.variant === "room" || assignment.variant === "simple")
  ) {
    response.cookies.set(
      LANDING_ASSIGNMENT_COOKIE,
      serializeLandingAssignmentCookie(assignment.variant as LandingVariant),
      {
        path: "/",
        maxAge: LANDING_ASSIGNMENT_MAX_AGE_SECONDS,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        httpOnly: false,
      }
    )
  }

  return response
}

export const config = {
  matcher: ["/", "/board", "/docs", "/docs/:path*", "/r/:name.json"],
}
