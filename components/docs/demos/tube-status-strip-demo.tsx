import { Suspense } from "react"
import {
  TubeStatusStrip,
  TubeStatusStripSkeleton,
} from "@/components/tfl/status/tube-status-strip"
import { DataSourceLabel } from "@/components/docs/data-source-label"
import { getCachedLineStatuses } from "@/lib/tfl/status-data"

async function TubeStatusStripLive() {
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
    <TubeStatusStrip
      data={data}
      now={fetchedAt}
      units={4}
      error={error}
    />
  )
}

export default function TubeStatusStripDemo() {
  return (
    <div className="space-y-4">
      <Suspense fallback={<TubeStatusStripSkeleton />}>
        <TubeStatusStripLive />
      </Suspense>
      <DataSourceLabel source="cached" />
    </div>
  )
}
