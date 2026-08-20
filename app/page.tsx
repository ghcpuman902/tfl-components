import type { Metadata } from "next"
import { Suspense } from "react"
import {
  LandingControlFallback,
  LandingPage,
} from "@/components/landing/landing-page"
import { pageMetadata, ROUTE_PAGE_META } from "@/lib/site-metadata"

export const metadata: Metadata = pageMetadata({
  ...ROUTE_PAGE_META.home,
  absoluteTitle: true,
})

type HomePageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const HomeFromParams = async ({ searchParams }: HomePageProps) => {
  const params = await searchParams
  return <LandingPage searchParams={params} />
}

export default function HomePage({ searchParams }: HomePageProps) {
  return (
    <Suspense fallback={<LandingControlFallback />}>
      <HomeFromParams searchParams={searchParams} />
    </Suspense>
  )
}
