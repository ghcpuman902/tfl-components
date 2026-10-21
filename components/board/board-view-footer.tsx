"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { SITE_AUTHOR } from "@/lib/site"
import { useFontsReady } from "@/lib/use-fonts-ready"
import { cn } from "@/lib/utils"

const TFL_TS_URL = "https://www.npmjs.com/package/tfl-ts"
const TFL_OPEN_DATA_URL = "https://tfl.gov.uk/info-for/open-data-users/"

const FooterLink = ({ href, children }: { href: string; children: string }) => (
  <a
    href={href}
    className="whitespace-nowrap underline-offset-4 hover:text-foreground hover:underline"
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

/**
 * Glance footer: freshness only — when the board last updated, how far into
 * the poll it is (the bar fills towards the next fetch), Refresh on touch
 * boards, and the TfL credit. One fixed-height row so nothing moves.
 */
const GlanceFooter = ({
  fetchedAt,
  dueAt,
  now,
  stale,
  onRefresh,
  refreshing,
  fullscreenError,
}: {
  fetchedAt: number | null
  dueAt: number | null
  now: number | null
  stale: boolean
  onRefresh?: () => void
  refreshing: boolean
  fullscreenError?: string | null
}) => {
  const fontsReady = useFontsReady()
  const span = fetchedAt != null && dueAt != null ? dueAt - fetchedAt : 0
  const elapsed = stale
    ? 1
    : span > 0 && now != null && fetchedAt != null
      ? Math.min(1, Math.max(0, (now - fetchedAt) / span))
      : 0
  return (
    <footer
      data-slot="board-glance-footer"
      className={cn(
        "board-glance-scale @container/glance-foot flex h-12 shrink-0 items-center gap-x-[length:var(--glance-foot)] text-[length:var(--glance-foot)] whitespace-nowrap text-muted-foreground tabular-nums",
        !fontsReady && "invisible"
      )}
    >
      {/* Same width before and after the first fetch; stale shows as a full bar. */}
      <span
        className={fetchedAt != null ? undefined : "invisible"}
        aria-hidden={fetchedAt == null || undefined}
        aria-label={stale ? "Updating" : undefined}
      >
        Updated{" "}
        <span className="inline-block w-[2.9em]">
          {fetchedAt != null ? formatUpdatedClock(fetchedAt) : "00:00"}
        </span>
      </span>
      <span
        className="relative h-1 w-[calc(var(--glance-foot)*3)] shrink-0 overflow-hidden bg-foreground/15"
        aria-hidden
      >
        <span
          className="absolute inset-0 origin-left bg-foreground/50"
          style={{ transform: `scaleX(${elapsed})` }}
        />
      </span>
      {onRefresh ? (
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          aria-busy={refreshing || undefined}
          className="inline-flex min-h-12 items-center underline-offset-4 hover:text-foreground hover:underline disabled:cursor-progress disabled:no-underline"
        >
          Refresh
        </button>
      ) : null}
      {fullscreenError ? (
        <span className="min-w-0 truncate" role="alert">
          {fullscreenError}
        </span>
      ) : null}
      <span className="ml-auto">
        <span className="hidden @min-[24rem]/glance-foot:inline">
          Powered by{" "}
        </span>
        <FooterLink href={TFL_OPEN_DATA_URL}>TfL Open Data</FooterLink>.
      </span>
    </footer>
  )
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
    if (fetchedAt == null && dueAt == null) return
    const tick = () => {
      setNow(Date.now())
    }
    tick()
    const id = window.setInterval(tick, 1_000)
    return () => window.clearInterval(id)
  }, [dueAt, fetchedAt])

  const ticking = fetchedAt != null || dueAt != null
  const remainingSec =
    dueAt != null && ticking && now != null
      ? Math.max(0, Math.ceil((dueAt - now) / 1_000))
      : null

  if (compact) {
    return (
      <GlanceFooter
        fetchedAt={fetchedAt}
        dueAt={dueAt}
        now={now}
        stale={stale}
        onRefresh={onRefresh}
        refreshing={refreshing}
        fullscreenError={fullscreenError}
      />
    )
  }

  const actionClass =
    "underline-offset-4 hover:text-foreground hover:underline disabled:cursor-progress disabled:no-underline"

  return (
    <footer className="mt-[calc(var(--arrivals-row)/2)] max-w-3xl text-sm text-muted-foreground">
      <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {stale ? (
          <span
            className="font-medium text-amber-600 dark:text-amber-400"
            role="status"
          >
            Updating…
          </span>
        ) : null}
        {fetchedAt != null ? (
          <span>
            {stale ? "Last updated" : "Updated"} {formatUpdatedClock(fetchedAt)}
          </span>
        ) : null}
        {!stale && remainingSec != null ? (
          <span>
            Next in{" "}
            <span className="inline-block min-w-[3ch]">{remainingSec}s</span>
          </span>
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
          <button type="button" onClick={onFullscreen} className={actionClass}>
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
      <p>
        Powered by{" "}
        <FooterLink href={TFL_OPEN_DATA_URL}>TfL Open Data</FooterLink>.
        Contains OS data © Crown copyright and database rights.
      </p>
      <p>
        Not affiliated with or endorsed by Transport for London. Built with{" "}
        <FooterLink href={TFL_TS_URL}>tfl-ts</FooterLink>. Made by{" "}
        <FooterLink href={SITE_AUTHOR.url}>{SITE_AUTHOR.name}</FooterLink>.{" "}
        <FooterLink href={SITE_AUTHOR.coffeeUrl}>Buy me a coffee ☕</FooterLink>
      </p>
    </footer>
  )
}
