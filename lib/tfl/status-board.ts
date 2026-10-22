import {
  getStatusKind,
  getWorstCurrentStatus,
  normalizeLineId,
  sortLinesBySeverityAndOrder,
  type StatusKind,
} from "tfl-ts"
import {
  prepareLineAnnouncements,
  type LineAnnouncement,
  type PrepareLineAnnouncementsOptions,
} from "@/lib/tfl/status-reason"
import type { StatusLine } from "@/lib/tfl/status-types"

export type StatusBoardLine = {
  line: StatusLine
  announcements: readonly LineAnnouncement[]
  kind: StatusKind
}

export type StatusBoardSections = {
  /** Incidents, planned engineering, then timetable-closed (tfl-ts kind order). */
  disruptions: StatusBoardLine[]
  /** Running normally. Access / information notices stay here. */
  goodService: StatusBoardLine[]
}

const sectionForKind = (kind: StatusKind): keyof StatusBoardSections => {
  if (kind === "good" || kind === "info") return "goodService"
  return "disruptions"
}

const announcementKind = (announcement: LineAnnouncement): StatusKind =>
  getStatusKind({
    statusSeverity: announcement.statusSeverity,
    statusSeverityDescription: announcement.statusSeverityDescription,
    disruption: announcement.disruption,
  })

const announcementsForSection = (
  section: keyof StatusBoardSections,
  announcements: readonly LineAnnouncement[]
): readonly LineAnnouncement[] => {
  if (section === "goodService") {
    return announcements.filter(
      (announcement) => announcementKind(announcement) === "info"
    )
  }
  return announcements.filter((announcement) => {
    const kind = announcementKind(announcement)
    return kind !== "good" && kind !== "info"
  })
}

const sortBoardLines = (
  rows: StatusBoardLine[],
  now?: number
): StatusBoardLine[] => {
  if (rows.length <= 1) return rows
  const sorted = sortLinesBySeverityAndOrder(
    rows.map((row) => row.line),
    now !== undefined ? { now } : undefined
  )
  const byKey = new Map(
    rows.map((row) => [row.line.id ?? row.line.name ?? "", row])
  )
  return sorted.flatMap((line) => {
    const key = line.id ?? line.name ?? ""
    const row = byKey.get(key)
    return row ? [row] : []
  })
}

/**
 * Listed lines follow `lineIds` order; unlisted rows keep their slot, so a
 * list already in board order changes nothing.
 */
export const orderByLineIds = (
  rows: StatusBoardLine[],
  lineIds: readonly string[] | undefined
): StatusBoardLine[] => {
  if (!lineIds?.length || rows.length <= 1) return rows
  const rank = new Map<string, number>()
  for (const id of lineIds) {
    const key = normalizeLineId(id)
    if (!rank.has(key)) rank.set(key, rank.size)
  }
  const rankOf = (row: StatusBoardLine) =>
    row.line.id ? rank.get(normalizeLineId(row.line.id)) : undefined
  const listed = rows
    .filter((row) => rankOf(row) !== undefined)
    .sort((a, b) => (rankOf(a) ?? 0) - (rankOf(b) ?? 0))
  let next = 0
  return rows.map((row) => (rankOf(row) === undefined ? row : listed[next++]!))
}

/**
 * Live-board passenger layout. Ranking / “which row is current” stay in tfl-ts.
 * Two sections: disruptions (incident → plannedWork → closed) then good service.
 * Timetable-closed stays in Disruptions, sorted last — not a separate group.
 */
export const partitionStatusBoardLines = (
  lines: readonly StatusLine[],
  options: PrepareLineAnnouncementsOptions & {
    /** The board's chosen line order (`s.lines`), applied within each section. */
    lineOrder?: readonly string[]
  } = {}
): StatusBoardSections => {
  const buckets: StatusBoardSections = {
    disruptions: [],
    goodService: [],
  }
  const statusNow = options.now !== undefined ? { now: options.now } : undefined

  for (const line of lines) {
    const announcements = prepareLineAnnouncements(line.lineStatuses ?? [], {
      ...options,
      line: options.line ?? { name: line.name, modeName: line.modeName },
    })
    const worst = getWorstCurrentStatus(line.lineStatuses, statusNow)
    const kind = worst ? getStatusKind(worst) : "good"
    const section =
      (options.currentOnly ?? true) && announcements.length === 0
        ? "goodService"
        : sectionForKind(kind)
    buckets[section].push({
      line,
      announcements: announcementsForSection(section, announcements),
      kind,
    })
  }

  return {
    disruptions: orderByLineIds(
      sortBoardLines(buckets.disruptions, options.now),
      options.lineOrder
    ),
    goodService: orderByLineIds(
      sortBoardLines(buckets.goodService, options.now),
      options.lineOrder
    ),
  }
}

const lineIdOf = (row: StatusBoardLine): string =>
  row.line.id?.trim() || row.line.name?.trim() || "unknown"

/**
 * Split a already-sorted section into priority vs other without re-sorting.
 * Empty / omitted `priorityLineIds` treats every row as priority.
 */
export const splitByPriority = (
  rows: readonly StatusBoardLine[],
  priorityLineIds: readonly string[] | undefined
): { priority: StatusBoardLine[]; other: StatusBoardLine[] } => {
  if (!priorityLineIds?.length) return { priority: [...rows], other: [] }
  const wanted = new Set(priorityLineIds)
  const priority: StatusBoardLine[] = []
  const other: StatusBoardLine[] = []
  for (const row of rows) {
    ;(wanted.has(lineIdOf(row)) ? priority : other).push(row)
  }
  return { priority, other }
}
