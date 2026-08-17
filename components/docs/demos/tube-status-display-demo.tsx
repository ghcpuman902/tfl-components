import { Suspense } from "react"
import {
  TubeStatusDisplay,
  TubeStatusDisplaySkeleton,
} from "@/components/tfl/status/tube-status-display"
import { DataSourceLabel } from "@/components/docs/data-source-label"
import { getCachedLineStatuses } from "@/lib/tfl/status-data"

async function TubeStatusDisplayLive() {
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
    <TubeStatusDisplay
      data={data}
      now={fetchedAt}
      tiles={4}
      error={error}
    />
  )
}

export default function TubeStatusDisplayDemo() {
  return (
    <div className="space-y-4">
      <Suspense fallback={<TubeStatusDisplaySkeleton />}>
        <TubeStatusDisplayLive />
      </Suspense>
      <DataSourceLabel source="cached" />
    </div>
  )
}
