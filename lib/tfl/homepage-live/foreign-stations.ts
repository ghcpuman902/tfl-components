import { trainRoutes } from "@/lib/tfl/rail-train-tracker"
import {
  hopGraphForRailLine,
  stationHubCanonical,
} from "@/lib/tfl/vehicle-hop-graph"

/**
 * Circle, Hammersmith & City and Metropolitan share track and one feed carries
 * rows for all three, including rows that belong to another line altogether:
 * a Metropolitan train arriving at Finchley Road gets a prediction at Neasden
 * and Willesden Green, which are Jubilee platforms. Those rows put one train on
 * two lines' stations and made its rows impossible to order.
 */
const FAMILY = ["circle", "hammersmith-city", "metropolitan"] as const
const OUTSIDERS = [
  "bakerloo",
  "central",
  "district",
  "jubilee",
  "northern",
  "piccadilly",
  "victoria",
  "waterloo-city",
] as const

const canonicalIn = (lineId: string, id: string) =>
  stationHubCanonical(hopGraphForRailLine(lineId).canonical(id))

type Table = { routeCount: Map<string, number>; matesServe: Set<string> }
const tables = new Map<string, Table>()
let outsiderStations: Set<string> | undefined

const stationsOf = (lineId: string): Map<string, number> => {
  const count = new Map<string, number>()
  const seenRoutes = new Set<string>()
  for (const route of trainRoutes(lineId)) {
    const ids = route.stations.map((id) => canonicalIn(lineId, id))
    const key = `${route.direction}|${ids.join(",")}`
    if (seenRoutes.has(key)) continue
    seenRoutes.add(key)
    for (const id of new Set(ids)) count.set(id, (count.get(id) ?? 0) + 1)
  }
  return count
}

const tableFor = (lineId: string): Table => {
  const hit = tables.get(lineId)
  if (hit) return hit
  const matesServe = new Set<string>()
  for (const mate of FAMILY)
    if (mate !== lineId) for (const id of stationsOf(mate).keys()) matesServe.add(id)
  const table = { routeCount: stationsOf(lineId), matesServe }
  tables.set(lineId, table)
  return table
}

/**
 * A prediction at a station this line does not call at: on none of its routes,
 * or on a single one while a line outside the family serves it and its family
 * mates do not (Willesden Green sits on one odd Metropolitan pattern).
 * Only the three shared-track lines are judged; every other line's rows are kept.
 */
export const isForeignStation = (lineId: string, canonicalStationId: string): boolean => {
  if (!(FAMILY as readonly string[]).includes(lineId)) return false
  const { routeCount, matesServe } = tableFor(lineId)
  const routes = routeCount.get(canonicalStationId) ?? 0
  if (routes === 0) return true
  if (routes > 1 || matesServe.has(canonicalStationId)) return false
  outsiderStations ??= new Set(
    OUTSIDERS.flatMap((line) => [...stationsOf(line).keys()])
  )
  return outsiderStations.has(canonicalStationId)
}
