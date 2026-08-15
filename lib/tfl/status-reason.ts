import {
  getCurrentLineStatuses,
  getStatusKind,
  getWorstCurrentStatus,
} from "tfl-ts"

export type DisruptionStatus = {
  statusSeverity?: number
  statusSeverityDescription?: string
  reason?: string
  disruption?: {
    category?: string
    categoryDescription?: string
  }
  validityPeriods?: {
    isNow?: boolean
    fromDate?: string
    toDate?: string
  }[]
}

const MODE_REASON_PREFIXES = [
  "London Trams",
  "London Tram",
  "London Overground",
  "Docklands Light Railway",
  "Elizabeth line",
  "Elizabeth Line",
  "DLR",
] as const

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const lineReasonPrefixes = (line?: {
  name?: string
  modeName?: string
}): string[] => {
  const prefixes: string[] = [...MODE_REASON_PREFIXES]
  const name = line?.name?.trim()
  if (name) {
    const andName = name.replace(/&/g, "and")
    const ampName = name.replace(/\band\b/gi, "&")
    prefixes.push(name, andName, ampName)
    prefixes.push(`London ${name}`, `London ${andName}`, `London ${name}s`)
  }
  const modeName = line?.modeName?.trim().replace(/-/g, " ")
  if (modeName) {
    prefixes.push(modeName, `${modeName} line`)
  }
  return prefixes
}

/** Drop TfL mode / line prefixes that repeat the card title. */
export const stripStatusReason = (
  reason: string,
  line?: { name?: string; modeName?: string }
): string => {
  const prefixes = [...new Set(lineReasonPrefixes(line))].sort(
    (a, b) => b.length - a.length
  )
  const pattern = new RegExp(
    `^(?:${prefixes.map(escapeRegExp).join("|")})(?:\\s+LINE)?\\s*:\\s*`,
    "i"
  )
  return reason.trim().replace(pattern, "")
}

/** Planned / part closure that replaces a service people expected (`PlannedWork`). */
export const isScheduledEngineeringWork = (status: DisruptionStatus): boolean =>
  getStatusKind(status) === "plannedWork"

const periodOverlapsNow = (
  period: NonNullable<DisruptionStatus["validityPeriods"]>[number],
  now: number
): boolean => {
  const from = period.fromDate
    ? Date.parse(period.fromDate)
    : Number.NEGATIVE_INFINITY
  const to = period.toDate
    ? Date.parse(period.toDate)
    : Number.POSITIVE_INFINITY
  if (Number.isNaN(from) || Number.isNaN(to)) return true
  return now >= from && now <= to
}

/**
 * Live-board operative row: RealTime, no validity window, or a window that
 * overlaps `now`. Not `validityPeriods[].isNow` — that tracks RealTime, so a
 * tram Part Closure can be in force today with `isNow: false`.
 *
 * Pass `now` from cache `fetchedAt`. Omit it only when there is no clock
 * (fixtures / tests that do not care about windows).
 */
export const isCurrentAnnouncement = (
  status: DisruptionStatus,
  now?: number
): boolean => {
  if (status.disruption?.category === "RealTime") return true
  const periods = status.validityPeriods ?? []
  if (periods.length === 0) return true
  if (now === undefined) return true
  return periods.some((period) => periodOverlapsNow(period, now))
}

/** Drop standing hours copy once a RealTime Service Closed row is on the card. */
const dropHoursNoticeWhenClosed = (
  statuses: readonly DisruptionStatus[]
): DisruptionStatus[] => {
  const hasClosedRealtime = statuses.some(
    (status) =>
      status.disruption?.category === "RealTime" &&
      getStatusKind(status) === "closed"
  )
  if (!hasClosedRealtime) return [...statuses]
  return statuses.filter(
    (status) => status.disruption?.category !== "Information"
  )
}

const selectAnnouncementStatuses = (
  statuses: readonly DisruptionStatus[],
  options: { currentOnly: boolean; now?: number }
): DisruptionStatus[] => {
  if (!options.currentOnly) return [...statuses]
  const current = getCurrentLineStatuses(
    statuses,
    options.now !== undefined ? { now: options.now } : undefined
  )
  return dropHoursNoticeWhenClosed(
    current.filter((status) => isCurrentAnnouncement(status, options.now))
  )
}

export type LineAnnouncement = {
  /** Paragraph to render (prefix-stripped unless rawReason). */
  text: string
  /** Worst severity in the merged group — drives chip colour. */
  statusSeverity?: number
  statusSeverityDescription?: string
  disruption?: DisruptionStatus["disruption"]
  /** How many TfL rows collapsed into this paragraph. */
  sourceCount: number
}

export type PrepareLineAnnouncementsOptions = {
  line?: { name?: string; modeName?: string }
  /**
   * Keep operative rows from `getCurrentLineStatuses` (default true).
   * Not `isNow`. Pass `now` from cache `fetchedAt`.
   */
  currentOnly?: boolean
  /** Collapse equal / contained paragraphs. Default true. */
  dedupe?: boolean
  /** Keep TfL's unstripped `reason` string. Default false. */
  rawReason?: boolean
  /** Clock for validity windows. Same stamp as tfl-ts `{ now: fetchedAt }`. */
  now?: number
}

const normalizeAnnouncementKey = (text: string): string =>
  text.toLowerCase().replace(/\s+/g, " ").trim()

const resolveAnnouncementText = (
  status: DisruptionStatus,
  options: { line?: { name?: string; modeName?: string }; rawReason: boolean }
): string => {
  const reason = status.reason?.trim()
  if (reason) {
    return options.rawReason ? reason : stripStatusReason(reason, options.line)
  }
  return status.statusSeverityDescription?.trim() || "Status update"
}

type DraftAnnouncement = LineAnnouncement & {
  key: string
}

const toStatusLike = (draft: DraftAnnouncement): DisruptionStatus => ({
  statusSeverity: draft.statusSeverity,
  statusSeverityDescription: draft.statusSeverityDescription,
  disruption: draft.disruption,
})

/**
 * Passenger-facing announcement list for one line: current filter → text
 * resolution → containment dedupe. All three steps are opt-out via options.
 */
export const prepareLineAnnouncements = (
  statuses: readonly DisruptionStatus[],
  options: PrepareLineAnnouncementsOptions = {}
): readonly LineAnnouncement[] => {
  const currentOnly = options.currentOnly ?? true
  const dedupe = options.dedupe ?? true
  const rawReason = options.rawReason ?? false
  const statusNow =
    options.now !== undefined ? { now: options.now } : undefined

  const resolved = selectAnnouncementStatuses(statuses, {
    currentOnly,
    now: options.now,
  }).map((status) => {
    const text = resolveAnnouncementText(status, {
      line: options.line,
      rawReason,
    })
    return {
      text,
      key: normalizeAnnouncementKey(text),
      statusSeverity: status.statusSeverity,
      statusSeverityDescription: status.statusSeverityDescription,
      disruption: status.disruption,
      sourceCount: 1,
    } satisfies DraftAnnouncement
  })

  const toAnnouncement = (draft: DraftAnnouncement): LineAnnouncement => ({
    text: draft.text,
    statusSeverity: draft.statusSeverity,
    statusSeverityDescription: draft.statusSeverityDescription,
    disruption: draft.disruption,
    sourceCount: draft.sourceCount,
  })

  if (!dedupe) {
    return resolved.map(toAnnouncement)
  }

  const kept: DraftAnnouncement[] = []

  for (const item of resolved) {
    const matchIndex = kept.findIndex(
      (existing) =>
        existing.key === item.key ||
        existing.key.includes(item.key) ||
        item.key.includes(existing.key)
    )

    if (matchIndex === -1) {
      kept.push(item)
      continue
    }

    const existing = kept[matchIndex]!
    const itemLike = toStatusLike(item)
    const existingLike = toStatusLike(existing)
    const preferIncoming =
      item.key.length > existing.key.length ||
      (item.key.length === existing.key.length &&
        getWorstCurrentStatus([itemLike, existingLike], statusNow) ===
          itemLike)

    const winner = preferIncoming ? item : existing
    const loser = preferIncoming ? existing : item
    const winnerLike = preferIncoming ? itemLike : existingLike
    const loserLike = preferIncoming ? existingLike : itemLike
    const worst =
      getWorstCurrentStatus([winnerLike, loserLike], statusNow) ?? winnerLike

    kept[matchIndex] = {
      text: winner.text,
      key: winner.key,
      statusSeverity: worst.statusSeverity,
      statusSeverityDescription: worst.statusSeverityDescription,
      disruption: worst.disruption,
      sourceCount: winner.sourceCount + loser.sourceCount,
    }
  }

  return kept.map(toAnnouncement)
}
