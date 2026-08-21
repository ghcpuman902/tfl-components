import type { Metadata } from "next"
import { Suspense } from "react"
import { LandingFallback, LandingPage } from "@/components/landing/landing-page"
import { pageMetadata, ROUTE_PAGE_META } from "@/lib/site-metadata"

export const metadata: Metadata = pageMetadata({
  ...ROUTE_PAGE_META.home,
  absoluteTitle: true,
})

export default function HomePage() {
  return (
    <Suspense fallback={<LandingFallback />}>
      <LandingPage />
    </Suspense>
  )
}
