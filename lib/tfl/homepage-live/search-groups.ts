import type { StopRow } from "@/lib/tfl/stop-index"

export type SearchItem = { kind: "row"; row: StopRow }

/** Rows under the sticky best match before "All N stops". */
export const COLLAPSED_ITEMS = 4

export const dayRoutes = (lines: readonly string[]) =>
  lines.filter((line) => !/^n\d/i.test(line))

/**
 * The ranked rows as the search view lists them: the best match on its own, then each
 * stop on its own in rank order (nearest first), then other stations and places. Stops of
 * one place are never gathered into a hub row: they can lie too far apart to walk between.
 */
export const groupSearchRows = (rows: readonly StopRow[]) => {
  const [best, ...rest] = rows
  const singles: SearchItem[] = rest
    .filter((row) => row.kind === "bus")
    .map((row) => ({ kind: "row" as const, row }))
  const stations: SearchItem[] = rest
    .filter((row) => row.kind === "station")
    .map((row) => ({ kind: "row" as const, row }))
  return {
    best,
    items: [...singles, ...stations],
    busCount: rows.filter((row) => row.kind === "bus").length,
  }
}
