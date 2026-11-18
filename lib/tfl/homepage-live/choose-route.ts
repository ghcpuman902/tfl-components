import type { RealtimePrediction } from "tfl-ts"
import {
  predictionArrivalTime,
  trainRoutes,
  type LocationEvidence,
  type RouteChooser,
  type TrainRoute,
} from "@/lib/tfl/rail-train-tracker"
import { hopGraphForRailLine } from "@/lib/tfl/vehicle-hop-graph"

type Fit = {
  route: TrainRoute
  matched: number
  unmatched: number
  violations: number
  evidence: LocationEvidence | undefined
  score: number
}

const sequenceKey = (route: TrainRoute, canon: (id: string) => string) =>
  `${route.direction}|${route.stations.map(canon).join(",")}`

const distinctCache = new Map<string, TrainRoute[]>()
/** Night and Regular patterns often list the same stations; one of each is enough. */
const distinctRoutes = (lineId: string): TrainRoute[] => {
  const cached = distinctCache.get(lineId)
  if (cached) return cached
  const canon = hopGraphForRailLine(lineId).canonical
  const seen = new Set<string>()
  const routes = trainRoutes(lineId).filter((route) => {
    const key = sequenceKey(route, canon)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  distinctCache.set(lineId, routes)
  return routes
}

/**
 * `Between A and B` names the two stations either side of the train but not
 * which one it is heading for, so it can only be resolved against a route:
 * the later station in route order is the one ahead. Evidence the route cannot
 * hold (two stations that are not neighbours on it) is dropped, never trusted
 * over the arrival rows.
 */
export const evidenceOnRoute = (
  route: TrainRoute,
  evidence: LocationEvidence | undefined,
  canon: (id: string) => string
): LocationEvidence | undefined => {
  if (!evidence) return undefined
  const ids = route.stations.map(canon)
  const to = ids.indexOf(canon(evidence.to))
  if (to < 0) return undefined
  if (evidence.kind !== "between" || !evidence.from) return evidence
  const from = ids.indexOf(canon(evidence.from))
  if (from < 0 || Math.abs(from - to) !== 1) return undefined
  return from < to
    ? evidence
    : { kind: "between", from: evidence.to, to: evidence.from }
}

type OrderedRow = {
  at: number
  station: string
  destination: string
  direction: string
}

/** The tracker looks this many stations downstream of a location report for the next prediction. */
const EVIDENCE_LOOKAHEAD = 3

/**
 * Location text is a free-text snapshot that can lag or belong to another
 * working. It is only believed when the train's next upcoming prediction is at
 * or a few stops beyond the place it names.
 */
const believedEvidence = (
  route: TrainRoute,
  evidence: LocationEvidence | undefined,
  ordered: readonly OrderedRow[],
  receivedAt: number,
  canon: (id: string) => string
): LocationEvidence | undefined => {
  const fitted = evidenceOnRoute(route, evidence, canon)
  if (!fitted) return undefined
  const ids = route.stations.map(canon)
  const place = ids.indexOf(canon(fitted.to))
  const next = ordered.find(
    (row) => row.at >= receivedAt - 5000 && ids.includes(row.station)
  )
  if (!next) return fitted
  const ahead = ids.indexOf(next.station) - place
  return ahead >= 0 && ahead <= EVIDENCE_LOOKAHEAD ? fitted : undefined
}

const fitRoute = (
  route: TrainRoute,
  ordered: readonly OrderedRow[],
  evidence: LocationEvidence | undefined,
  receivedAt: number,
  canon: (id: string) => string
): Fit => {
  const ids = route.stations.map(canon)
  const last = ids.at(-1)
  let matched = 0
  let unmatched = 0
  let violations = 0
  let highest = -1
  let score = 0
  for (const row of ordered) {
    const i = ids.indexOf(row.station)
    if (i < 0) {
      unmatched++
      continue
    }
    matched++
    if (i < highest) violations++
    highest = Math.max(highest, i)
    if (row.direction && row.direction === route.direction) score += 1
    if (row.destination && row.destination === last) score += 2
  }
  const fitted = believedEvidence(route, evidence, ordered, receivedAt, canon)
  if (fitted) score += 3
  score += matched * 2 - violations * 6 - unmatched * 3
  return { route, matched, unmatched, violations, evidence: fitted, score }
}

/** How well the best route holds a set of rows: 0 violations and 0 unmatched means one train. */
export const bestRouteFit = (
  lineId: string,
  rows: readonly RealtimePrediction[]
): { matched: number; unmatched: number; violations: number } | undefined => {
  const canon = hopGraphForRailLine(lineId).canonical
  const ordered: OrderedRow[] = rows
    .map((row) => ({
      at: predictionArrivalTime(row, Infinity),
      station: canon(row.naptanId ?? ""),
      destination: row.destinationNaptanId ? canon(row.destinationNaptanId) : "",
      direction: row.direction ?? "",
    }))
    .sort((a, b) => a.at - b.at)
  const fits = distinctRoutes(lineId)
    .map((route) => fitRoute(route, ordered, undefined, 0, canon))
    .filter((fit) => fit.matched > 0)
  if (fits.length === 0) return undefined
  return fits.reduce((a, b) => (b.score > a.score ? b : a))
}

/**
 * Route choice for one train, strongest evidence first:
 * 1. a route the train's own arrival rows fit (in order, on the route);
 * 2. the route it was on last poll, as long as it still fits;
 * 3. otherwise the best-scoring route (destination, direction, location text).
 * A train never changes route because of one poll's location text.
 */
export const chooseHomepageRoute: RouteChooser = ({
  lineId,
  rows,
  evidence,
  previous,
  receivedAt,
}) => {
  const canon = hopGraphForRailLine(lineId).canonical
  const ordered: OrderedRow[] = rows
    .map((row) => ({
      at: predictionArrivalTime(row, Infinity),
      station: canon(row.naptanId ?? ""),
      destination: row.destinationNaptanId ? canon(row.destinationNaptanId) : "",
      direction: row.direction ?? "",
    }))
    .sort((a, b) => a.at - b.at)
  const fits = distinctRoutes(lineId)
    .map((route) => fitRoute(route, ordered, evidence, receivedAt, canon))
    .filter((fit) => fit.matched > 0)
  if (fits.length === 0) return undefined
  const best = fits.reduce((a, b) => (b.score > a.score ? b : a))
  const kept = previous
    ? fits.find(
        (fit) =>
          sequenceKey(fit.route, canon) === sequenceKey(previous, canon)
      )
    : undefined
  const stays =
    kept &&
    kept.violations === 0 &&
    kept.unmatched <= best.unmatched &&
    kept.matched >= best.matched
  const chosen = stays ? kept : best
  // Same stations as last poll: keep that route object so ids stay stable.
  const route =
    previous && sequenceKey(chosen.route, canon) === sequenceKey(previous, canon)
      ? previous
      : chosen.route
  return { route, evidence: chosen.evidence }
}
