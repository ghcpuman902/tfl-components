"use client"

import { useLayoutEffect, useRef } from "react"
import { BusNumberChip } from "@/components/tfl/arrivals/bus-number-chip"
import { cn } from "@/lib/utils"

/** Chips on the last row when `count` chips go `perRow` across. */
const tail = (count: number, perRow: number) =>
  count - perRow * (Math.ceil(count / perRow) - 1)

/**
 * Chips per row for `count` chips that wrap `fit` across: the fewest rows that fit, filled
 * evenly (9 that fit 4 across go 3 + 3 + 3, never 4 + 4 + 1). If that still leaves one chip
 * alone on the last row, one more per row is tried while it fits `limit` across.
 */
export const balancedPerRow = (count: number, fit: number, limit = fit) => {
  if (count < 1 || fit < 1) return Math.max(count, 1)
  const even = Math.ceil(count / Math.ceil(count / fit))
  if (count <= even || tail(count, even) > 1) return even
  for (let across = even + 1; across <= limit; across += 1)
    if (count <= across || tail(count, across) > 1) return across
  return even
}

/** The most of its row the chip column may take, to keep a lone chip off its own line. */
const MAX_COLUMN_SHARE = 0.65

/** Rows a wrapped run of chips fell onto: how many chips share each distinct top edge. */
const rowCounts = (chips: readonly HTMLElement[]) => {
  const rows = new Map<number, number>()
  for (const chip of chips) {
    const top = Math.round(chip.getBoundingClientRect().top)
    rows.set(top, (rows.get(top) ?? 0) + 1)
  }
  return [...rows.values()]
}

/**
 * The right-hand column of bus route chips (search results, the Board's stop editor).
 * It wraps like any flex row, then narrows itself to the balanced count per row, so a
 * lone chip never sits on its own line under a full one.
 */
export const RouteChipColumn = ({
  routes,
  className,
  widen = false,
}: {
  routes: readonly string[]
  className?: string
  /**
   * Let the column take up to this much more of its row to avoid a lone chip. Only for rows
   * whose name wraps; a row that truncates its name (the Board's stop editor) keeps its room.
   */
  widen?: boolean
}) => {
  const ref = useRef<HTMLSpanElement>(null)
  // The list, not the array: parents rebuild the array on every render.
  const list = routes.join(",")
  useLayoutEffect(() => {
    const column = ref.current
    const row = column?.parentElement
    if (!column || !row) return
    const balance = () => {
      column.style.maxWidth = ""
      const chips = [...column.children] as HTMLElement[]
      if (chips.length < 3) return
      const counts = rowCounts(chips)
      if (counts.length < 2) return
      const fit = Math.max(...counts)
      const gap = parseFloat(getComputedStyle(column).columnGap) || 0
      const chipWidth = chips[0]!.getBoundingClientRect().width
      // A widening column may take up to this much of the row.
      const limit = widen
        ? Math.floor((row.clientWidth * MAX_COLUMN_SHARE + gap) / (chipWidth + gap))
        : fit
      const across = balancedPerRow(chips.length, fit, limit)
      if (across === fit) return
      column.style.maxWidth = `${Math.ceil(across * chipWidth + (across - 1) * gap)}px`
    }
    balance()
    const observer = new ResizeObserver(balance)
    observer.observe(row)
    return () => observer.disconnect()
  }, [list, widen])
  return (
    <span
      ref={ref}
      className={cn(
        "flex shrink-0 flex-wrap justify-end gap-1",
        className
      )}
    >
      {(list ? list.split(",") : []).map((route) => (
        <BusNumberChip key={route} label={route} />
      ))}
    </span>
  )
}
