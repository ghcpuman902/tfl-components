/**
 * Instant docs article shell. No time or randomness — safe for
 * `loading.tsx` and Cache Components prerender.
 */
export const DocsRouteLoading = () => (
  <div className="mx-auto w-full max-w-5xl space-y-8" aria-busy="true">
    <p className="sr-only">Loading page</p>
    <div className="space-y-4" aria-hidden>
      <div className="h-4 w-24 animate-pulse rounded-md bg-muted" />
      <div className="h-9 w-2/3 max-w-md animate-pulse rounded-md bg-muted" />
      <div className="h-4 w-full max-w-prose animate-pulse rounded-md bg-muted" />
    </div>
    <div className="space-y-3" aria-hidden>
      <div className="h-5 w-20 animate-pulse rounded-md bg-muted" />
      <div className="h-48 w-full animate-pulse rounded-lg bg-muted" />
    </div>
  </div>
)

/** Generic content shell for non-docs routes. */
export const AppRouteLoading = () => (
  <div className="mx-auto w-full max-w-5xl space-y-4" aria-busy="true">
    <p className="sr-only">Loading page</p>
    <div className="h-8 w-40 animate-pulse rounded-md bg-muted" aria-hidden />
    <div className="h-48 w-full animate-pulse rounded-lg bg-muted" aria-hidden />
  </div>
)
