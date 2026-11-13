import type { Metadata } from "next"
import { Suspense } from "react"
import { HomeProduct } from "@/components/home/home-product"
import { getExplorerTubeRailPoints } from "@/lib/tfl/explorer/points-tube-rail"
import { parseReplayParams } from "@/lib/tfl/homepage-live/replay-params"
import { pageMetadata, ROUTE_PAGE_META } from "@/lib/site-metadata"

export const metadata: Metadata = pageMetadata({
  ...ROUTE_PAGE_META.home,
  absoluteTitle: true,
})

/** King's Cross St. Pancras, the station the page opens on. */
const DEFAULT_STATION_ID = "940GZZLUKSX"

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const HomeFromParams = async ({ searchParams }: { searchParams: SearchParams }) => {
  const replay = parseReplayParams(await searchParams)
  return (
    <HomeProduct
      stations={getExplorerTubeRailPoints()}
      defaultStationId={DEFAULT_STATION_ID}
      replay={replay}
    />
  )
}

/** Same footprint as the product, so nothing moves when it arrives. */
const HomeFallback = () => (
  <div className="mx-auto w-full max-w-[96rem] px-4 pt-4 pb-10 sm:px-8" aria-hidden>
    <div className="h-16 border-b-2 border-foreground" />
    <div className="grid gap-6 pt-8 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] lg:gap-8">
      <div className="h-[70svh] min-h-96 animate-pulse rounded-[14px] bg-muted/40 lg:col-start-1 lg:row-start-1 lg:h-[calc(100svh-15rem)]" />
      <div className="space-y-3 lg:col-start-2 lg:row-start-1">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-11 animate-pulse bg-muted/40" />
        ))}
      </div>
    </div>
  </div>
)

/**
 * The product is the homepage: search a station or bus stop, see its live
 * Board beside the trains around it. `?replay=kx&t=300` shows a recorded frame
 * instead of the network, for tests and screenshots.
 */
export default function HomePage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeFromParams searchParams={searchParams} />
    </Suspense>
  )
}
