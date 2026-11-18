import type { RealtimePrediction } from "tfl-ts"
import {
  trainKeyOf,
  type LiveTrain,
} from "@/lib/tfl/homepage-live/engine"
import { stationHubCanonical } from "@/lib/tfl/vehicle-hop-graph"

/** Trains to draw around a station: those due within `windowSec`, and those that left in the last two minutes. */
export const trainsAroundStation = ({
  rows,
  trains,
  stopIds,
  receivedAt,
  windowSec = 600,
}: {
  rows: readonly RealtimePrediction[]
  trains: readonly LiveTrain[]
  stopIds: readonly string[]
  receivedAt: number
  windowSec?: number
}): LiveTrain[] => {
  const here = new Set(stopIds.map(stationHubCanonical))
  const near = new Set<string>()
  for (const row of rows) {
    if (!row.lineId || !row.vehicleId || !row.naptanId) continue
    if (!here.has(stationHubCanonical(row.naptanId))) continue
    const seconds = (Date.parse(row.expectedArrival ?? "") - receivedAt) / 1000
    if (seconds <= windowSec && seconds >= -120)
      near.add(trainKeyOf(row.lineId, row.vehicleId))
  }
  return trains.filter(
    (train) => train.status !== "hidden" && near.has(train.key)
  )
}

/** Buses due at one stop within `windowSec`; a bus listed twice for the stop counts once. */
export const busesDueWithin = (
  rows: readonly { route: string; vehicleId?: string; etaSec: number }[],
  windowSec = 600
): number => {
  const seen = new Set<string>()
  let anonymous = 0
  for (const row of rows) {
    if (row.etaSec > windowSec || row.etaSec < 0) continue
    if (row.vehicleId) seen.add(`${row.route}|${row.vehicleId}`)
    else anonymous += 1
  }
  return seen.size + anonymous
}
