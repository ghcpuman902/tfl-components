/** Instant shell while a docs page streams. */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4" aria-hidden>
      <div className="h-8 w-40 animate-pulse rounded-md bg-muted" />
      <div className="h-10 w-2/3 max-w-md animate-pulse rounded-md bg-muted" />
      <div className="h-4 w-full max-w-prose animate-pulse rounded-md bg-muted" />
      <div className="h-4 w-5/6 max-w-prose animate-pulse rounded-md bg-muted" />
      <div className="mt-6 h-48 w-full animate-pulse rounded-lg bg-muted" />
    </div>
  )
}
