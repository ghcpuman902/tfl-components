import type { RealtimePrediction } from "tfl-ts"
import type { RailArrivalsLine } from "@/lib/tfl/arrivals-prepare"
import type { BusBoardRow } from "@/lib/tfl/homepage-live/bus-stop-arrivals"
import { HOMEPAGE_LINE_IDS } from "@/lib/tfl/homepage-live/line-ids"
import { stationHubCanonical } from "@/lib/tfl/vehicle-hop-graph"

/**
 * Adapters from the homepage's shared data to the `RealtimePrediction[]` the
 * live Board's `RailArrivalsBoard` / `BusArrivalsBoard` take. The homepage
 * keeps its one network poll (and its replay frames); the Board components
 * do all the grouping, ordering and drawing.
 */

/** A row this long past its ETA is a train that has left. */
const LEFT_AFTER_S = 20

const HOMEPAGE_LINES: ReadonlySet<string> = new Set(HOMEPAGE_LINE_IDS)

/**
 * The station's rows out of one network poll. `receivedAt` is the TfL read
 * and `ageSec` how long ago that was, so `timeToStation` keeps counting down
 * between polls (0 for a recorded frame). Rows that have left are dropped.
 */
export const stationArrivalsFromSnapshot = ({
  rows,
  stopIds,
  receivedAt,
  ageSec = 0,
  stationName,
}: {
  rows: readonly RealtimePrediction[]
  stopIds: readonly string[]
  receivedAt: number
  ageSec?: number
  stationName?: string
}): RealtimePrediction[] => {
  const here = new Set(stopIds.map(stationHubCanonical))
  const out: RealtimePrediction[] = []
  for (const row of rows) {
    if (!row.lineId || !row.naptanId) continue
    if (!here.has(stationHubCanonical(row.naptanId))) continue
    const eta = Date.parse(row.expectedArrival ?? "")
    if (!Number.isFinite(eta)) continue
    const left = (eta - receivedAt) / 1000 - ageSec
    if (left < -LEFT_AFTER_S) continue
    out.push({
      ...row,
      ...(stationName ? { stationName } : {}),
      timeToStation: Math.max(0, Math.round(left)),
    })
  }
  return out
}

/**
 * The station's serving lines that the network poll carries. A line it does
 * not poll (National Rail, Thameslink) would otherwise sit on the Board as
 * "No arrivals right now", which would be wrong.
 */
export const homepageServingLines = (
  lines: readonly RailArrivalsLine[] | undefined
): RailArrivalsLine[] | undefined => {
  const kept = lines?.filter((line) => HOMEPAGE_LINES.has(line.lineId))
  return kept?.length ? kept : undefined
}

/**
 * The homepage bus read as Board predictions. `at` is the instant the
 * `etaSec` values count from (for `expectedArrival`).
 */
export const busArrivalsFromRows = ({
  rows,
  stopId,
  stopName,
  stopLetter,
  at,
}: {
  rows: readonly BusBoardRow[]
  stopId: string
  stopName?: string
  stopLetter?: string
  at: number
}): RealtimePrediction[] =>
  rows.map((row) => {
    const prediction: Record<string, unknown> = {
      naptanId: stopId,
      lineId: row.route.toLowerCase(),
      lineName: row.route,
      modeName: "bus",
      destinationName: row.destination,
      timeToStation: Math.max(0, Math.round(row.etaSec)),
      expectedArrival: new Date(at + row.etaSec * 1000).toISOString(),
    }
    if (stopName) prediction.stationName = stopName
    if (stopLetter) prediction.platformName = stopLetter
    if (row.towards) prediction.towards = row.towards
    if (row.vehicleId) prediction.vehicleId = row.vehicleId
    return prediction as unknown as RealtimePrediction
  })
