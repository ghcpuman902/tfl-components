import type { StopRow } from "@/lib/tfl/stop-index"

export type SearchCluster = {
  kind: "cluster"
  id: string
  name: string
  stops: StopRow[]
  /** `A–K`, or one letter, or empty when the stops have none. */
  letters: string
  routes: string[]
}

export type SearchItem = { kind: "row"; row: StopRow } | SearchCluster

/** Rows under the sticky best match before "All N stops". */
export const COLLAPSED_ITEMS = 4

export const dayRoutes = (lines: readonly string[]) =>
  lines.filter((line) => !/^n\d/i.test(line))

const byCode = (a: string, b: string) =>
  a.length - b.length || a.localeCompare(b, "en-GB", { numeric: true })

const letterRange = (stops: readonly StopRow[]) => {
  const letters = stops.flatMap((stop) => (stop.letter ? [stop.letter] : [])).sort(byCode)
  const first = letters[0]
  const last = letters.at(-1)
  if (!first || !last) return ""
  return first === last ? first : `${first}–${last}`
}

/**
 * The ranked rows as the search view lists them: the best match on its own,
 * then other stations, then bus stops sharing one name as a single cluster,
 * then the remaining stops in rank order.
 */
export const groupSearchRows = (rows: readonly StopRow[]) => {
  const [best, ...rest] = rows
  const byName = new Map<string, StopRow[]>()
  for (const row of rest) {
    if (row.kind !== "bus") continue
    byName.set(row.name, [...(byName.get(row.name) ?? []), row])
  }
  const clusters: SearchItem[] = []
  const singles: SearchItem[] = []
  for (const [name, stops] of byName) {
    if (stops.length < 2) {
      singles.push({ kind: "row", row: stops[0]! })
      continue
    }
    clusters.push({
      kind: "cluster",
      id: `cluster:${name}`,
      name,
      stops,
      letters: letterRange(stops),
      routes: [...new Set(stops.flatMap((stop) => dayRoutes(stop.lines)))].sort(byCode),
    })
  }
  const stations: SearchItem[] = rest
    .filter((row) => row.kind === "station")
    .map((row) => ({ kind: "row" as const, row }))
  return {
    best,
    items: [...stations, ...clusters, ...singles],
    busCount: rows.filter((row) => row.kind === "bus").length,
  }
}
