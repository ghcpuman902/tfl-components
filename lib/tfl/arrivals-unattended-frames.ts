import type {
  ArrivalsLockHeight,
  ArrivalsPageFill,
  ArrivalsPreparedRow,
} from "@/lib/tfl/arrivals-prepare"
import { chunkBoundPages } from "@/lib/tfl/arrivals-prepare"

export type ArrivalsPinAdvance = "slide" | "jump"

export type ArrivalsUnattendedFrame = ArrivalsPageFill & {
  id: string
  /** 1-based ranks in the full ordered list, aligned with `rows`. */
  ranks: readonly number[]
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
 * Unattended arrival frames. Default pins the first arrival and slides the
 * remaining slots by one: 1 2 3 → 1 3 4. `pinAdvance: "jump"` skips a full
 * window: 1 2 3 4 → 1 5 6 7.
 */
export const buildPinnedFrames = (
  rows: readonly ArrivalsPreparedRow[],
  pageSize: number,
  options?: {
    pinFirst?: boolean
    pinAdvance?: ArrivalsPinAdvance
    lockHeight?: ArrivalsLockHeight
  }
): {
  frames: ArrivalsUnattendedFrame[]
  pageCount: number
} => {
  const pinFirst = options?.pinFirst ?? true
  const pinAdvance = options?.pinAdvance ?? "slide"
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
  const windowSize = pageSize - 1
  const lastStart =
    pinAdvance === "jump"
      ? Math.max(0, rotating.length - 1)
      : Math.max(0, rotating.length - windowSize)
  const step = pinAdvance === "jump" ? windowSize : 1
  const frames: ArrivalsUnattendedFrame[] = []
  for (let start = 0; start <= lastStart; start += step) {
    const rest = rotating.slice(start, start + windowSize)
    const visible = [pinned, ...rest]
    const chunked = chunkBoundPages(visible, pageSize, { lockHeight: true })
    const page = chunked.pages[0] ?? {
      rows: visible,
      dashCount: 0,
      showEndMessage: false,
    }
    frames.push({
      id: `rest:${frameId(rest)}`,
      rows: page.rows,
      ranks: page.rows.map((row) => rankOf(rows, row)),
      dashCount: page.dashCount,
      showEndMessage: page.showEndMessage,
    })
  }

  return {
    frames: frames.length > 0 ? frames : [fillFrame([pinned], rows, pageSize, true)],
    pageCount: Math.max(1, frames.length),
  }
}
