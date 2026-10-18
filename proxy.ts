import { NextResponse, type NextRequest } from "next/server"
import {
  hasUnknownTopLevelPath,
  isHomepageRepresentationRequest,
  isPublicStaticAsset,
  mergeVary,
  negotiateHomepageContent,
} from "@/lib/agent/content-negotiation"
import {
  HOME_MARKDOWN,
  HOMEPAGE_DISCOVERY_LINK,
  MARKDOWN_RESPONSE_HEADERS,
  markdownNotFound,
} from "@/lib/agent/machine-content"
import { assignHero } from "@/lib/landing/hero-precompute"
import {
  HERO_AB_PATH,
  HERO_COOKIE_MAX_AGE_SECONDS,
  HERO_VISITOR_COOKIE,
} from "@/lib/landing/hero-experiment"
import {
  EXPLORER_PATH,
  legacyExplorerRedirectHref,
} from "@/lib/tfl/explorer-url-state"

const continueAsHtml = (includeHomepageDiscovery = false) => {
  const response = NextResponse.next()
  response.headers.set(
    "Vary",
    mergeVary(response.headers.get("Vary"), "Accept")
  )
  if (includeHomepageDiscovery) {
    const existing = response.headers.get("Link")
    response.headers.set(
      "Link",
      existing
        ? `${HOMEPAGE_DISCOVERY_LINK}, ${existing}`
        : HOMEPAGE_DISCOVERY_LINK
    )
  }
  return response
}

/**
 * Homepage hero test (flags SDK precompute pattern). Rewrites `/` to the
 * statically generated `/hero-ab/<code>` permutation, so the page stays
 * static: no flicker, no layout shift, no per-request render. Assignment is
 * sticky through the `tfl_hero_vid` cookie; `?hero=a|b|c` and crawlers get
 * an uncounted page and no cookie. Applies to RSC fetches too, so client
 * navigation back to `/` shows the same variant as a fresh load.
 */
const rewriteHomepage = async (
  request: NextRequest,
  includeHomepageDiscovery: boolean
) => {
  const assignment = await assignHero(request)
  const url = request.nextUrl.clone()
  url.pathname = `${HERO_AB_PATH}/${assignment.code}`
  const response = NextResponse.rewrite(url)
  response.headers.set(
    "Vary",
    mergeVary(response.headers.get("Vary"), "Accept")
  )
  if (includeHomepageDiscovery) {
    response.headers.set("Link", HOMEPAGE_DISCOVERY_LINK)
  }
  if (assignment.newVisitorId) {
    response.cookies.set(HERO_VISITOR_COOKIE, assignment.newVisitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: HERO_COOKIE_MAX_AGE_SECONDS,
    })
  }
  return response
}

/**
 * Intercept static registry JSON so we can count installs while keeping
 * public URLs at `/r/<name>.json` (shadcn CLI + docs install commands).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (isPublicStaticAsset(pathname)) {
    return NextResponse.next()
  }

  if (pathname === "/") {
    const isRepresentation = isHomepageRepresentationRequest(
      request.method,
      request.headers.get("Accept"),
      request.headers.get("Sec-Fetch-Dest")
    )
    if (isRepresentation) {
      const negotiated = negotiateHomepageContent(request.headers.get("Accept"))
      if (negotiated === "markdown") {
        return new NextResponse(HOME_MARKDOWN, {
          status: 200,
          headers: MARKDOWN_RESPONSE_HEADERS,
        })
      }
      if (negotiated === "not-acceptable") {
        return new NextResponse(
          "No acceptable representation is available. Request text/html or text/markdown.\n",
          {
            status: 406,
            headers: {
              "Cache-Control": "no-store",
              "Content-Type": "text/plain; charset=utf-8",
              Vary: "Accept",
            },
          }
        )
      }
    }
    if (request.method !== "GET" && request.method !== "HEAD") {
      return NextResponse.next()
    }
    return rewriteHomepage(request, isRepresentation)
  }

  if (hasUnknownTopLevelPath(pathname)) {
    if (
      !isHomepageRepresentationRequest(
        request.method,
        request.headers.get("Accept"),
        request.headers.get("Sec-Fetch-Dest")
      )
    ) {
      return NextResponse.next()
    }
    const negotiated = negotiateHomepageContent(request.headers.get("Accept"))
    if (negotiated === "markdown") {
      return new NextResponse(markdownNotFound(pathname), {
        status: 404,
        headers: MARKDOWN_RESPONSE_HEADERS,
      })
    }
    if (negotiated === "html") {
      return continueAsHtml()
    }
  }

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

  return NextResponse.next()
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|google[^/]+\\.html).*)",
  ],
}
