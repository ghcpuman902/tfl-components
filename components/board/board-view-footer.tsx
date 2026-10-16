"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { SITE_AUTHOR } from "@/lib/site"

const TFL_TS_URL = "https://www.npmjs.com/package/tfl-ts"
const TFL_OPEN_DATA_URL = "https://tfl.gov.uk/info-for/open-data-users/"

const FooterLink = ({
  href,
  children,
}: {
  href: string
  children: string
}) => (
  <a
    href={href}
    className="underline-offset-4 hover:text-foreground hover:underline"
    target="_blank"
    rel="noreferrer"
  >
    {children}
  </a>
)

export type BoardPollSource = {
  fetchedAt: number | null
  pollMs: number
  enabled: boolean
  /** False when the source loaded once and does not schedule a next poll. */
  polls?: boolean
}

type BoardViewFooterProps = {
  sources?: readonly BoardPollSource[]
  onRefresh?: () => void
  refreshing?: boolean
  /** True after wake/visibility until a newer fetch lands. */
  stale?: boolean
  /** Square / room-distance chrome — larger tap targets, quieter credit. */
  compact?: boolean
  editHref?: string
  fullscreenLabel?: "Full screen" | "Exit full screen"
  onFullscreen?: () => void
  fullscreenError?: string | null
  onAddToHomeScreen?: () => void
  onChromiumInstall?: () => void
}

const formatUpdatedClock = (fetchedAt: number) =>
  new Date(fetchedAt).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  })

const latestFetchedAt = (sources: readonly BoardPollSource[]) => {
  let latest: number | null = null
  for (const source of sources) {
    if (!source.enabled || source.fetchedAt == null) continue
    if (latest == null || source.fetchedAt > latest) latest = source.fetchedAt
  }
  return latest
}

const nextRefreshAt = (sources: readonly BoardPollSource[]) => {
  let soonest: number | null = null
  for (const source of sources) {
    if (!source.enabled || source.polls === false || source.fetchedAt == null) {
      continue
    }
    const due = source.fetchedAt + source.pollMs
    if (soonest == null || due < soonest) soonest = due
  }
  return soonest
}

/** Page-level credit under the live board — not a status-board tile. */
export const BoardViewFooter = ({
  sources = [],
  onRefresh,
  refreshing = false,
  stale = false,
  compact = false,
  editHref,
  fullscreenLabel,
  onFullscreen,
  fullscreenError,
  onAddToHomeScreen,
  onChromiumInstall,
}: BoardViewFooterProps) => {
  const [now, setNow] = useState<number | null>(null)
  const fetchedAt = latestFetchedAt(sources)
  const dueAt = nextRefreshAt(sources)

  useEffect(() => {
    if (fetchedAt == null && dueAt == null) {
      setNow(null)
      return
    }
    const tick = () => {
      setNow(Date.now())
    }
    tick()
    const id = window.setInterval(tick, 1_000)
    return () => window.clearInterval(id)
  }, [dueAt, fetchedAt])

  const remainingSec =
    dueAt != null && now != null ? Math.max(0, Math.ceil((dueAt - now) / 1_000)) : null

  const actionClass = compact
    ? "inline-flex min-h-12 min-w-12 items-center justify-center px-3 underline-offset-4 hover:text-foreground hover:underline disabled:cursor-progress disabled:no-underline"
    : "underline-offset-4 hover:text-foreground hover:underline disabled:cursor-progress disabled:no-underline"

  return (
    <footer
      className={
        compact
          ? "mt-auto shrink-0 pt-3 text-xl tabular-nums text-muted-foreground"
          : "mt-[calc(var(--arrivals-row)/2)] max-w-3xl text-sm text-muted-foreground"
      }
    >
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {stale ? (
          <span className="font-medium text-amber-600 dark:text-amber-400" role="status">
            Updating…
          </span>
        ) : null}
        {fetchedAt != null ? (
          <span>
            {stale ? "Last updated" : "Updated"} {formatUpdatedClock(fetchedAt)}
          </span>
        ) : null}
        {!stale && remainingSec != null ? (
          <span>Next in {remainingSec}s</span>
        ) : null}
        {onRefresh ? (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            aria-busy={refreshing || undefined}
            className={actionClass}
          >
            Refresh
          </button>
        ) : null}
        {editHref ? (
          <Link href={editHref} className={actionClass}>
            Edit board
          </Link>
        ) : null}
        {onFullscreen && fullscreenLabel ? (
          <button
            type="button"
            onClick={onFullscreen}
            className={actionClass}
          >
            {fullscreenLabel}
          </button>
        ) : null}
        {onAddToHomeScreen ? (
          <button
            type="button"
            onClick={onAddToHomeScreen}
            className={actionClass}
          >
            Add to Home Screen
          </button>
        ) : null}
        {onChromiumInstall ? (
          <button
            type="button"
            onClick={onChromiumInstall}
            className={actionClass}
          >
            Install
          </button>
        ) : null}
      </p>
      {fullscreenError ? (
        <p className="mt-1" role="alert">
          {fullscreenError}
        </p>
      ) : null}
      {compact ? (
        <p className="mt-1 text-base">
          Powered by{" "}
          <FooterLink href={TFL_OPEN_DATA_URL}>TfL Open Data</FooterLink>.
        </p>
      ) : (
        <>
          <p>
            Powered by{" "}
            <FooterLink href={TFL_OPEN_DATA_URL}>TfL Open Data</FooterLink>.
            Contains OS data © Crown copyright and database rights.
          </p>
          <p>
            Not affiliated with or endorsed by Transport for London. Built with{" "}
            <FooterLink href={TFL_TS_URL}>tfl-ts</FooterLink>. Made by{" "}
            <FooterLink href={SITE_AUTHOR.url}>{SITE_AUTHOR.name}</FooterLink>.
          </p>
        </>
      )}
    </footer>
  )
}
