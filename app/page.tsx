import type { Metadata } from "next"
import { HomeContent } from "@/components/landing/home-content"
import { pageMetadata, ROUTE_PAGE_META } from "@/lib/site-metadata"

export const metadata: Metadata = pageMetadata({
  ...ROUTE_PAGE_META.home,
  absoluteTitle: true,
})

/**
 * Normally the proxy rewrites `/` to `/hero-ab/<code>` (see `proxy.ts`).
 * This is the control, uncounted, for any request that skips the proxy.
 */
export default function HomePage() {
  return <HomeContent hero={{ variant: "a", counted: false }} />
}
