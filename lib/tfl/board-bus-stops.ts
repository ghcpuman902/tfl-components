/**
 * `b.stop` holds one bus stop id or several, comma-separated
 * (`b.stop=490G1,490G2`). A single id is still a one-stop list, so every
 * older link parses to the same board. Pure: no React / browser.
 */

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
