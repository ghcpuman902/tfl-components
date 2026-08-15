import { Suspense } from "react"
import {
  TubeStatusBoard,
  TubeStatusBoardSkeleton,
} from "@/components/tfl/status/tube-status-board"
import { DataSourceLabel } from "@/components/docs/data-source-label"
import { getCachedLineStatuses } from "@/lib/tfl/status-data"

async function TubeStatusBoardLive() {
  let data: Awaited<ReturnType<typeof getCachedLineStatuses>>["data"] = []
  let fetchedAt: number | undefined
  let error: string | null = null

  try {
    const payload = await getCachedLineStatuses()
    data = payload.data ?? []
    fetchedAt = payload.fetchedAt
  } catch {
    error = "Could not load line status. Check TfL credentials and try again."
  }

  return (
    <>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
      <TubeStatusBoard data={data} now={fetchedAt} hideHeader />
    </>
  )
}

/** Fetch in the docs layer; board only receives `data`. */
export default function TubeStatusBoardDemo() {
  return (
    <div className="space-y-4">
      <Suspense fallback={<TubeStatusBoardSkeleton />}>
        <TubeStatusBoardLive />
      </Suspense>
      <DataSourceLabel source="cached" />
    </div>
  )
}
