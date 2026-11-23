/**
 * `b.stop` holds one bus stop id or several, comma-separated
 * (`b.stop=490G1,490G2`). A single id is still a one-stop list, so every
 * older link parses to the same board. Pure: no React / browser.
 */

import { compareBusRouteNames } from "@/lib/tfl/arrivals-route-sort"

/** How many of the nearest stops a new board shows. */
export const NEAREST_BUS_STOPS = 2

export const parseBusStopIds = (
  raw: string | readonly string[] | null | undefined
): string[] => {
  const parts = typeof raw === "string" ? raw.split(",") : (raw ?? [])
  return [...new Set(parts.map((id) => id.trim()).filter(Boolean))]
}

/** `undefined` for no stops, so the param is left out of the link. */
export const serializeBusStopIds = (
  ids: string | readonly string[] | null | undefined
): string | undefined => {
  const list = parseBusStopIds(ids)
  return list.length > 0 ? list.join(",") : undefined
}

/**
 * What the Board's bus read asks for. One stop is exactly the old read
 * (`stopPointId` alone, the single-stop path); only two or more stops read
 * each stop and merge.
 */
export const busArrivalsRequest = (
  raw: string | null | undefined
): { stopPointId: string; stopPointIds?: string[]; siteEachStop: boolean } => {
  const ids = parseBusStopIds(raw)
  if (ids.length < 2) return { stopPointId: ids[0] ?? "", siteEachStop: false }
  return { stopPointId: ids[0], stopPointIds: ids, siteEachStop: true }
}

/** `b.routes`: only these routes; none set shows every route. */
export const filterBusRoutes = <
  T extends { lineId?: string; lineName?: string },
>(
  rows: readonly T[],
  routes: readonly string[] | undefined
): readonly T[] => {
  if (!routes?.length) return rows
  const keep = new Set(routes.map((id) => id.toLowerCase()))
  return rows.filter(
    (row) =>
      keep.has((row.lineId ?? "").toLowerCase()) ||
      keep.has((row.lineName ?? "").toLowerCase())
  )
}

type BusPanelRow = { lineId?: string; lineName?: string; naptanId?: string }

const routeKey = (row: BusPanelRow) =>
  (row.lineId || row.lineName || "").toLowerCase()

/**
 * The route order the Board's bus panel shows, as the customise editor lists
 * it: `b.routes` in its dragged order when set; otherwise the routes of the
 * first stop in `b.stop` order, then the next stop's, each stop's routes in
 * number order. Routes `b.routes` leaves out are dropped.
 */
export const busPanelRouteOrder = (
  rows: readonly BusPanelRow[],
  stopIds: readonly string[],
  routes: readonly string[] | undefined
): string[] => {
  if (routes?.length) return routes.map((route) => route.toLowerCase())
  const stopRank = (row: BusPanelRow) => {
    const at = row.naptanId ? stopIds.indexOf(row.naptanId) : -1
    return at < 0 ? stopIds.length : at
  }
  const first = new Map<string, { stop: number; name: string }>()
  for (const row of rows) {
    const key = routeKey(row)
    if (!key) continue
    const stop = stopRank(row)
    const held = first.get(key)
    if (!held || stop < held.stop)
      first.set(key, { stop, name: row.lineName || row.lineId || "" })
  }
  return [...first.entries()]
    .sort(
      ([, a], [, b]) => a.stop - b.stop || compareBusRouteNames(a.name, b.name)
    )
    .map(([key]) => key)
}

/**
 * The Board's bus rows in panel order: filtered to `b.routes`, then grouped by
 * route in `busPanelRouteOrder`, each route's own rows keeping their order.
 * Pair with `groupBy="route"` and `groupSortBy="source"` on BusArrivalsBoard.
 */
export const orderBusPanelRows = <T extends BusPanelRow>(
  rows: readonly T[],
  stopIds: readonly string[],
  routes: readonly string[] | undefined
): T[] => {
  const kept = filterBusRoutes(rows, routes)
  const order = busPanelRouteOrder(kept, stopIds, routes)
  const rank = (row: T) => {
    const byId = order.indexOf((row.lineId ?? "").toLowerCase())
    const at = byId >= 0 ? byId : order.indexOf((row.lineName ?? "").toLowerCase())
    return at < 0 ? order.length : at
  }
  return kept
    .map((row, index) => ({ row, index, rank: rank(row) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ row }) => row)
}

/** Several stops' arrivals as one list, soonest first. */
export const mergeArrivalsByTime = <T extends { timeToStation?: number }>(
  lists: readonly (readonly T[])[]
): T[] =>
  lists
    .flat()
    .sort(
      (a, b) =>
        (a.timeToStation ?? Number.POSITIVE_INFINITY) -
        (b.timeToStation ?? Number.POSITIVE_INFINITY)
    )
