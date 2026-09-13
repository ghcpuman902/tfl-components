/** Instant shell while a Labs page streams. */
export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-4" aria-hidden>
      <div className="h-8 w-28 animate-pulse rounded-md bg-muted" />
      <div className="h-40 w-full animate-pulse rounded-lg bg-muted" />
    </div>
  )
}
