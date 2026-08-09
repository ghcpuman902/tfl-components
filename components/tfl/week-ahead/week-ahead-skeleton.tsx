import { Skeleton } from "@/components/ui/skeleton";
import { WEEK_AHEAD_LINE_IDS } from "@/lib/tfl/week-ahead-status";

/** Quiet horizontal-line skeleton for one route while its cache fills. */
export const WeekAheadLineSkeleton = ({ lineId }: { lineId?: string }) => (
  <div className="space-y-3" aria-busy aria-label={lineId ? `Loading ${lineId}` : "Loading line"}>
    <Skeleton className="h-5 w-40 max-w-[50%]" />
    <div className="flex items-center gap-1">
      <Skeleton className="h-2 flex-1 rounded-none" />
    </div>
    <div className="flex justify-between gap-1 overflow-hidden">
      {Array.from({ length: 10 }).map((_, index) => (
        <Skeleton key={index} className="size-2 shrink-0 rounded-full" />
      ))}
    </div>
  </div>
);

/** Full-section fallback before request-time connection resolves. */
export const WeekAheadSkeleton = () => (
  <div
    className="w-full min-w-0 space-y-8"
    aria-busy
    aria-label="Loading this week ahead"
  >
    <div className="space-y-3">
      <Skeleton className="h-10 w-64 max-w-full" />
      <Skeleton className="h-4 w-full max-w-md" />
    </div>

    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
      {Array.from({ length: 8 }).map((_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>

    <div className="space-y-10">
      {WEEK_AHEAD_LINE_IDS.map((id) => (
        <WeekAheadLineSkeleton key={id} lineId={id} />
      ))}
    </div>
  </div>
);
