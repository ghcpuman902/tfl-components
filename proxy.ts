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

const HTML_UPSTREAM_HEADER = "x-tfl-components-html-upstream"

const fetchHtmlResponse = async (
  request: NextRequest,
  includeHomepageDiscovery = false
) => {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set("Accept", "text/html")
  requestHeaders.set(HTML_UPSTREAM_HEADER, "1")
  requestHeaders.delete("Accept-Encoding")

  const upstream = await fetch(request.url, {
    method: request.method,
    headers: requestHeaders,
    redirect: "manual",
  })
  const responseHeaders = new Headers(upstream.headers)
  responseHeaders.set("Vary", mergeVary(responseHeaders.get("Vary"), "Accept"))
  if (includeHomepageDiscovery) {
    const upstreamLinks = responseHeaders.get("Link")
    responseHeaders.set(
      "Link",
      upstreamLinks
        ? `${HOMEPAGE_DISCOVERY_LINK}, ${upstreamLinks}`
        : HOMEPAGE_DISCOVERY_LINK
    )
  }
  responseHeaders.delete("Content-Length")

  return new NextResponse(request.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  })
}

/**
 * Intercept static registry JSON so we can count installs while keeping
 * public URLs at `/r/<name>.json` (shadcn CLI + docs install commands).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (request.headers.get(HTML_UPSTREAM_HEADER) === "1") {
    return NextResponse.next()
  }

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
    return fetchHtmlResponse(request, true)
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
      return fetchHtmlResponse(request)
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
