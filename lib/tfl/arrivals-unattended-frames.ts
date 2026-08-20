import type {
  ArrivalsLockHeight,
  ArrivalsPageFill,
  ArrivalsPreparedRow,
} from "@/lib/tfl/arrivals-prepare"
import { chunkBoundPages } from "@/lib/tfl/arrivals-prepare"

export type ArrivalsUnattendedFrame = ArrivalsPageFill & {
  id: string
  /** 1-based ranks in the full ordered list, aligned with `rows`. */
  ranks: readonly number[]
}

/**
 * Chunk `items` into windows of `windowSize`. Only the final window shifts
 * back to fill a short remainder — earlier windows never overlap.
 */
export const chunkWithFinalBackfill = <T>(
  items: readonly T[],
  windowSize: number
): T[][] => {
  if (windowSize <= 0 || items.length === 0) {
    return items.length ? [[...items]] : []
  }
  const windowCount = Math.ceil(items.length / windowSize)
  return Array.from({ length: windowCount }, (_, index) => {
    const start =
      index === windowCount - 1
        ? Math.max(0, items.length - windowSize)
        : index * windowSize
    return items.slice(start, start + windowSize)
  })
}

const rankOf = (
  rows: readonly ArrivalsPreparedRow[],
  row: ArrivalsPreparedRow
): number => {
  const index = rows.findIndex((candidate) => candidate.key === row.key)
  return index >= 0 ? index + 1 : 0
}

const frameId = (rows: readonly ArrivalsPreparedRow[]): string =>
  rows.map((row) => row.key).join("|") || "empty"

const fillFrame = (
  visible: readonly ArrivalsPreparedRow[],
  allRows: readonly ArrivalsPreparedRow[],
  pageSize: number,
  lockHeight: boolean
): ArrivalsUnattendedFrame => {
  const pages = chunkBoundPages(visible, pageSize, { lockHeight })
  const page = pages.pages[0] ?? {
    rows: [...visible],
    dashCount: 0,
    showEndMessage: false,
  }
  return {
    id: frameId(page.rows),
    rows: page.rows,
    ranks: page.rows.map((row) => rankOf(allRows, row)),
    dashCount: page.dashCount,
    showEndMessage: page.showEndMessage,
  }
}

/**
 * Unattended arrival frames. Default pins the first arrival and chunks the
 * remaining rows into windows of `pageSize - 1`. Only the final window
 * overlaps when it would otherwise be short:
 *
 *   3 visible, 4 arrivals: 1 2 3 → 1 3 4
 *   3 visible, 5 arrivals: 1 2 3 → 1 4 5
 *   3 visible, 6 arrivals: 1 2 3 → 1 4 5 → 1 5 6
 *   3 visible, 7 arrivals: 1 2 3 → 1 4 5 → 1 6 7
 */
export const buildPinnedFrames = (
  rows: readonly ArrivalsPreparedRow[],
  pageSize: number,
  options?: {
    pinFirst?: boolean
    lockHeight?: ArrivalsLockHeight
  }
): {
  frames: ArrivalsUnattendedFrame[]
  pageCount: number
} => {
  const pinFirst = options?.pinFirst ?? true
  const lockHeight = options?.lockHeight ?? true

  if (pageSize <= 0) {
    const frame = fillFrame(rows, rows, rows.length || 1, false)
    return { frames: [frame], pageCount: 1 }
  }

  if (!pinFirst || pageSize <= 1 || rows.length <= pageSize) {
    const chunked = chunkBoundPages(rows, pageSize, { lockHeight })
    const frames = chunked.pages.map((page) => ({
      id: frameId(page.rows),
      rows: page.rows,
      ranks: page.rows.map((row) => rankOf(rows, row)),
      dashCount: page.dashCount,
      showEndMessage: page.showEndMessage,
    }))
    return { frames, pageCount: frames.length }
  }

  const pinned = rows[0]
  if (!pinned) {
    const frame = fillFrame([], rows, pageSize, true)
    return { frames: [frame], pageCount: 1 }
  }

  const rotating = rows.slice(1)
  const windows = chunkWithFinalBackfill(rotating, pageSize - 1)
  const frames: ArrivalsUnattendedFrame[] = windows.map((rest) => {
    const visible = [pinned, ...rest]
    const chunked = chunkBoundPages(visible, pageSize, { lockHeight: true })
    const page = chunked.pages[0] ?? {
      rows: visible,
      dashCount: 0,
      showEndMessage: false,
    }
    return {
      id: `rest:${frameId(rest)}`,
      rows: page.rows,
      ranks: page.rows.map((row) => rankOf(rows, row)),
      dashCount: page.dashCount,
      showEndMessage: page.showEndMessage,
    }
  })

  return {
    frames:
      frames.length > 0 ? frames : [fillFrame([pinned], rows, pageSize, true)],
    pageCount: Math.max(1, frames.length),
  }
}

/**
 * Keep a frozen frame's order and ranks, but swap in live row values
 * (countdown, location) for matching keys. Missing keys keep the frozen row.
 */
export const refreshFrameRows = (
  frame: ArrivalsUnattendedFrame,
  liveRows: readonly ArrivalsPreparedRow[]
): ArrivalsUnattendedFrame => {
  if (frame.rows.length === 0) return frame
  const byKey = new Map(liveRows.map((row) => [row.key, row]))
  return {
    ...frame,
    rows: frame.rows.map((row) => byKey.get(row.key) ?? row),
  }
}
