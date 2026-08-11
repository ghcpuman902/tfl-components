import { NextResponse, type NextRequest } from "next/server";

/**
 * Intercept static registry JSON so we can count installs while keeping
 * public URLs at `/r/<name>.json` (shadcn CLI + docs install commands).
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const match = pathname.match(/^\/r\/([a-z0-9]+(?:-[a-z0-9]+)*)\.json$/i);
  if (!match) {
    return NextResponse.next();
  }

  const name = match[1];
  const url = request.nextUrl.clone();
  url.pathname = `/api/registry/${name}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/r/:name.json"],
};
