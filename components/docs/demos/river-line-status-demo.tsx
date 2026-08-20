import { Suspense } from "react"
import {
  TubeStatusBoard,
  TubeStatusBoardSkeleton,
} from "@/components/tfl/status/tube-status-board"
import { DataSourceLabel } from "@/components/docs/data-source-label"
import { getCachedLineStatuses } from "@/lib/tfl/status-data"
import { RIVER_BUS_LINE_IDS } from "@/lib/tfl/river-bus"

const RiverLineStatusLive = async () => {
  const { data, fetchedAt } = await getCachedLineStatuses(RIVER_BUS_LINE_IDS)

  return <TubeStatusBoard data={data} now={fetchedAt} compact hideHeader />
}

/** Line-wide river status — same board as Tube, filtered to river-bus ids. */
export const RiverLineStatusDemo = () => (
  <div className="my-6 space-y-3">
    <Suspense
      fallback={
        <TubeStatusBoardSkeleton compact lineIds={RIVER_BUS_LINE_IDS} />
      }
    >
      <RiverLineStatusLive />
    </Suspense>
    <DataSourceLabel source="cached" />
  </div>
)
