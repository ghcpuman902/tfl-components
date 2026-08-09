import { Skeleton } from "@/components/ui/skeleton";

/** Full-page skeletons for `loading.tsx` (header + content). */
export const ExplorePageSkeleton = () => (
  <div className="w-full space-y-8" aria-busy aria-label="Loading modes">
    <div className="space-y-2">
      <Skeleton className="h-9 w-48 max-w-full" />
      <Skeleton className="h-4 w-full max-w-md" />
    </div>
    <ExploreBodySkeleton />
  </div>
);

/** Body-only skeleton for in-page Suspense (title already rendered). */
export const ExploreBodySkeleton = () => (
  <div className="space-y-6" aria-busy aria-label="Loading modes">
    {Array.from({ length: 3 }).map((_, i) => (
      <Skeleton key={i} className="h-40 w-full" />
    ))}
  </div>
);

export const RoutePageSkeleton = () => (
  <div className="w-full space-y-6" aria-busy aria-label="Loading route">
    <div className="space-y-3">
      <Skeleton className="h-9 w-64 max-w-full" />
      <Skeleton className="h-1.5 w-full max-w-md" />
      <Skeleton className="h-4 w-40" />
    </div>
    <RouteBodySkeleton />
  </div>
);

export const RouteBodySkeleton = () => (
  <div className="space-y-1" aria-busy aria-label="Loading route stops">
    {Array.from({ length: 12 }).map((_, i) => (
      <Skeleton key={i} className="h-10 w-full" />
    ))}
  </div>
);

export const TypographyBodySkeleton = () => (
  <div className="space-y-6" aria-busy aria-label="Loading station typography">
    <Skeleton className="h-40 w-full" />
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full" />
      ))}
    </div>
  </div>
);
