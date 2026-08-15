import { Suspense } from "react"
import {
  TubeStatusBoard,
  TubeStatusBoardSkeleton,
} from "@/components/tfl/status/tube-status-board"
import { DataSourceLabel } from "@/components/docs/data-source-label"
import { getCachedLineStatuses } from "@/lib/tfl/status-data"

const WATCHLIST_LINE_IDS = ["victoria", "northern"] as const

const StatusWatchlistLive = async () => {
  const { data, fetchedAt } = await getCachedLineStatuses(WATCHLIST_LINE_IDS)

  return <TubeStatusBoard data={data} now={fetchedAt} compact hideHeader />
}

/** Two-line watchlist — `compact` drops section tiles and empty Good Service. */
export const StatusWatchlistExample = () => (
  <div className="space-y-3">
    <DataSourceLabel source="cached" />
    <Suspense
      fallback={
        <TubeStatusBoardSkeleton compact lineIds={WATCHLIST_LINE_IDS} />
      }
    >
      <StatusWatchlistLive />
    </Suspense>
  </div>
)
