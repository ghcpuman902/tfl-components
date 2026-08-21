import { NextResponse, type NextRequest } from "next/server"
import {
  EXPLORER_PATH,
  legacyExplorerRedirectHref,
} from "@/lib/tfl/explorer-url-state"

/**
 * Intercept static registry JSON so we can count installs while keeping
 * public URLs at `/r/<name>.json` (shadcn CLI + docs install commands).
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

  return NextResponse.next()
}

export const config = {
  matcher: ["/docs/explorer", "/docs/explorer/:path*", "/r/:name.json"],
}
