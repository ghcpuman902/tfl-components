import type { Metadata } from "next"
import { Suspense } from "react"
import { HomeProduct } from "@/components/home/home-product"
import { getBoardStationLinesIndex } from "@/lib/tfl/board-station-lines"
import { getExplorerTubeRailPoints } from "@/lib/tfl/explorer/points-tube-rail"
import { buildHubStationIds } from "@/lib/tfl/homepage-live/hub-stations"
import { parseReplayParams } from "@/lib/tfl/homepage-live/replay-params"
import { pageMetadata, ROUTE_PAGE_META } from "@/lib/site-metadata"

export const metadata: Metadata = pageMetadata({
  ...ROUTE_PAGE_META.home,
  absoluteTitle: true,
})

/** King's Cross St. Pancras, the station the page opens on. */
const DEFAULT_STATION_ID = "940GZZLUKSX"

type SearchParams = Promise<Record<string, string | string[] | undefined>>

const HomeFromParams = async ({
  searchParams,
}: {
  searchParams: SearchParams
}) => {
  const replay = parseReplayParams(await searchParams)
  const stations = getExplorerTubeRailPoints()
  return (
    <HomeProduct
      stations={stations}
      hubStationIds={buildHubStationIds(stations)}
      stationLines={getBoardStationLinesIndex()}
      defaultStationId={DEFAULT_STATION_ID}
      replay={replay}
    />
  )
}

/** Same footprint as the product (search, then Board), so nothing moves when it arrives. */
const HomeFallback = () => (
  <div
    className="mx-auto w-full max-w-3xl px-4 pt-6 pb-10 sm:px-8 lg:pt-10"
    aria-hidden
  >
    <div className="h-[4.5rem] border-b border-foreground sm:h-[5.5rem]" />
    <div className="space-y-3 pt-12">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="h-11 animate-pulse bg-muted/40" />
      ))}
    </div>
  </div>
)

/**
 * The product is the homepage: search a station or bus stop, see its live
 * Board below. The showcase that used to live here is on `/docs`.
 * `?replay=kx&t=300` shows a recorded frame instead of the network, for tests
 * and screenshots.
 */
export default function HomePage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  return (
    <Suspense fallback={<HomeFallback />}>
      <HomeFromParams searchParams={searchParams} />
    </Suspense>
  )
}
