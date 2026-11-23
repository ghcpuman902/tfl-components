import {
  getStatusKind,
  getWorstCurrentStatus,
  type CurrentStatusOptions,
  type LineStatusLike,
} from "tfl-ts"

/**
 * In-chip status mark for a disrupted line. `minor` = warning triangle,
 * `severe` = solid alert disc. Good service and timetable closures get none.
 */
export type StatusChipAlert = "minor" | "severe"

/**
 * TfL severities that stop or badly cut the service: Closed (1), Suspended
 * (2), Part Suspended (3), Planned Closure (4), Part Closure (5), Severe
 * Delays (6), Part Closed (11), Not Running (16).
 */
const SEVERE_LEVELS: ReadonlySet<number> = new Set([1, 2, 3, 4, 5, 6, 11, 16])

/** Chip mark for one status row, or `undefined` when nothing should show. */
export const statusChipAlertFor = (
  status: LineStatusLike | undefined
): StatusChipAlert | undefined => {
  if (!status) return undefined
  const kind = getStatusKind(status)
  // `closed` is the overnight timetable closure — quiet on the Board.
  if (kind === "good" || kind === "info" || kind === "closed") return undefined
  const level = status.statusSeverity ?? status.severity
  return level !== undefined && SEVERE_LEVELS.has(level) ? "severe" : "minor"
}

/** Chip mark for a line from its worst operative status. */
export const statusChipAlertForLine = (
  statuses: readonly LineStatusLike[] | undefined,
  options?: CurrentStatusOptions
): StatusChipAlert | undefined =>
  statusChipAlertFor(getWorstCurrentStatus(statuses ?? [], options))

type AlertLineRow = {
  line: {
    id?: string | null
    name?: string | null
    lineStatuses?: readonly LineStatusLike[] | null
  }
}

/** Line id → chip mark, for the rows a status display lists as disrupted. */
export const statusChipAlertsById = (
  rows: readonly AlertLineRow[],
  options?: CurrentStatusOptions
): ReadonlyMap<string, StatusChipAlert> => {
  const alerts = new Map<string, StatusChipAlert>()
  for (const { line } of rows) {
    const id = line.id?.trim() || line.name?.trim()
    const alert = statusChipAlertForLine(line.lineStatuses ?? [], options)
    if (id && alert) alerts.set(id, alert)
  }
  return alerts
}
