import type { ExplorerRouteStop } from "@/lib/tfl/explorer/common"

type NamedStop = { id?: string; name?: string }

const indexStopNames = (sequence: {
  stations?: NamedStop[]
  stopPointSequences?: Array<{ stopPoint?: NamedStop[] }>
}): Map<string, string> => {
  const names = new Map<string, string>()
  const add = (stop?: NamedStop) => {
    if (!stop?.id) return
    const name = stop.name?.trim()
    if (name) names.set(stop.id, name)
  }
  for (const stop of sequence.stations ?? []) add(stop)
  for (const branch of sequence.stopPointSequences ?? []) {
    for (const stop of branch.stopPoint ?? []) add(stop)
  }
  return names
}

type OrderedRoute = { name?: string; naptanIds?: string[] }

/** Longer first; equal lengths by route name, then by ids, so TfL's order never decides. */
const spineOrder = (a: OrderedRoute, b: OrderedRoute): number =>
  (b.naptanIds?.length ?? 0) - (a.naptanIds?.length ?? 0) ||
  (a.name ?? "").trim().localeCompare((b.name ?? "").trim(), "en") ||
  (a.naptanIds ?? []).join(",").localeCompare((b.naptanIds ?? []).join(","), "en")

/**
 * RB1 inbound is many short two-stop branches. The longest ordered route
 * is the readable spine — flattened `stopPointSequences` is not.
 */
export const stopsFromRiverOrderedRoutes = (sequence: {
  mode?: string
  orderedLineRoutes?: OrderedRoute[]
  stations?: NamedStop[]
  stopPointSequences?: Array<{ stopPoint?: NamedStop[] }>
}): ExplorerRouteStop[] | null => {
  if (sequence.mode !== "river-bus") return null
  const routes = sequence.orderedLineRoutes ?? []
  if (routes.length === 0) return null
  const [longest] = [...routes].sort(spineOrder)
  const ids = longest.naptanIds ?? []
  if (ids.length === 0) return null
  const names = indexStopNames(sequence)
  return ids.map((id) => ({ id, name: names.get(id) ?? id }))
}
