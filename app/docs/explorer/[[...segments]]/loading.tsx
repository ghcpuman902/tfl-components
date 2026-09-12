/** Explorer header lives in the segment layout; only the panel streams. */
export default function Loading() {
  return (
    <div className="space-y-4" aria-busy="true">
      <p className="sr-only">Loading explorer</p>
      <div className="h-10 w-full animate-pulse rounded-md bg-muted" aria-hidden />
      <div className="h-64 w-full animate-pulse rounded-lg bg-muted" aria-hidden />
    </div>
  )
}
