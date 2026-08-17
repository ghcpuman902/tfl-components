import { Suspense } from "react"
import {
  DEFAULT_CYCLE_HIRE_DOCK_IDS,
  CycleHireDocksBoardSkeleton,
} from "@/components/tfl/cycle-hire/cycle-hire-docks"
import { CycleHireDocksDemoClient } from "@/components/docs/demos/cycle-hire-docks-demo-client"
import { getCachedBikePoints } from "@/lib/tfl/cycle-hire-data"

const CycleHirePreviewFallback = () => (
  <div className="flex flex-col gap-8">
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">Single dock</p>
      <CycleHireDocksBoardSkeleton dockCount={1} />
    </div>
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">Nearby docks</p>
      <div className="h-64 animate-pulse rounded-lg bg-muted" aria-hidden />
    </div>
  </div>
)

async function CycleHireDocksLive() {
  let data: Awaited<ReturnType<typeof getCachedBikePoints>> = []
  let error: string | null = null

  try {
    data = (await getCachedBikePoints(DEFAULT_CYCLE_HIRE_DOCK_IDS)) ?? []
  } catch {
    error =
      "Could not load cycle hire docks. Check TfL credentials and try again."
  }

  if (error) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {error}
      </p>
    )
  }

  return <CycleHireDocksDemoClient data={data} />
}

export default function CycleHireDocksDemo() {
  return (
    <Suspense fallback={<CycleHirePreviewFallback />}>
      <CycleHireDocksLive />
    </Suspense>
  )
}
