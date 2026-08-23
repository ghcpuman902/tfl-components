import { NextResponse, type NextRequest } from "next/server"
import {
  hasUnknownTopLevelPath,
  isHomepageRepresentationRequest,
  mergeVary,
  negotiateHomepageContent,
} from "@/lib/agent/content-negotiation"
import {
  HOME_MARKDOWN,
  HOMEPAGE_DISCOVERY_LINK,
  MARKDOWN_RESPONSE_HEADERS,
  markdownNotFound,
} from "@/lib/agent/machine-content"
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
 * Intercept static registry JSON so we can count installs while keeping
 * public URLs at `/r/<name>.json` (shadcn CLI + docs install commands).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === "/") {
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
    return continueAsHtml(true)
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
  matcher: ["/((?!_next/static|_next/image).*)"],
}
