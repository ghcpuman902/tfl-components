import type { RealtimePrediction } from "tfl-ts"
import { isForeignStation } from "@/lib/tfl/homepage-live/foreign-stations"
import {
  predictionArrivalTime,
  predictionSourceTime,
} from "@/lib/tfl/rail-train-tracker"
import {
  hopGraphForRailLine,
  stationHubCanonical,
} from "@/lib/tfl/vehicle-hop-graph"

/** Two rows for one train at one station (both platforms, or both hub ids) this close are one prediction. */
const SAME_STOP_MS = 20_000
/** A source `read` this much older than the row's `timestamp` is a stale cache stamp (tram: ~9 min). */
const STALE_READ_MS = 120_000

export const isAnonymousVehicle = (id?: string | null) =>
  !id?.trim() || id === "000"

/** `vehicleId` is only unique within a line, so every cross-row key carries the line. */
export const trainKey = (row: Pick<RealtimePrediction, "lineId" | "vehicleId">) =>
  `${row.lineId}|${row.vehicleId}`

export type CleanStats = {
  rows: number
  dedupedStops: number
  nextWorkingRows: number
  staleReads: number
  /** Rows at stations the shared-track line does not call at (see `foreign-stations.ts`). */
  foreignRows: number
}

const canonicalStation = (lineId: string, id: string | undefined) =>
  stationHubCanonical(hopGraphForRailLine(lineId).canonical(id ?? ""))

/**
 * Normalises one poll of `/Line/.../Arrivals` before placement:
 * - a stale `timing.read` (tram) is dropped so the row ages from `timestamp`;
 * - duplicate rows for one stop (two platforms, hub aliases) collapse to one;
 * - each identified train's rows are cut at its destination, so the "next
 *   working" TfL appends after a terminus never reaches the placement step.
 * Anonymous rows (DLR) are chained into trains elsewhere and pass through.
 */
export const cleanArrivalRows = (
  rows: readonly RealtimePrediction[],
  receivedAt: number
): { rows: RealtimePrediction[]; stats: CleanStats } => {
  const stats: CleanStats = {
    rows: rows.length,
    dedupedStops: 0,
    nextWorkingRows: 0,
    staleReads: 0,
    foreignRows: 0,
  }
  const groups = new Map<string, RealtimePrediction[]>()
  const output: RealtimePrediction[] = []
  for (const original of rows) {
    if (!original.lineId || !original.naptanId) continue
    let row = original
    const read = Date.parse(row.timing?.read ?? "")
    const stamp = Date.parse(row.timestamp ?? "")
    if (
      Number.isFinite(read) &&
      Number.isFinite(stamp) &&
      stamp - read > STALE_READ_MS
    ) {
      stats.staleReads++
      row = { ...row, timing: { ...row.timing, read: row.timestamp } }
    }
    if (isAnonymousVehicle(row.vehicleId)) {
      output.push(row)
      continue
    }
    const key = trainKey(row)
    const group = groups.get(key)
    if (group) group.push(row)
    else groups.set(key, [row])
  }
  for (const train of groups.values()) {
    const lineId = train[0]!.lineId!
    const ordered = train
      .map((row) => ({
        row,
        at: predictionArrivalTime(row, receivedAt),
        station: canonicalStation(lineId, row.naptanId),
      }))
      .filter((entry) => {
        if (!isForeignStation(lineId, entry.station)) return true
        stats.foreignRows++
        return false
      })
      .sort((a, b) => a.at - b.at)
    const seen = new Map<string, number>()
    const kept: typeof ordered = []
    let duplicates = 0
    // The terminus row and every row after it carry no destination or direction.
    const destinationId = ordered.find((e) => e.row.destinationNaptanId)?.row
      .destinationNaptanId
    const destination = canonicalStation(lineId, destinationId)
    for (const entry of ordered) {
      const last = seen.get(entry.station)
      if (last != null) {
        if (entry.at - last <= SAME_STOP_MS) {
          duplicates++
          stats.dedupedStops++
          // The fresher report of the same stop wins the location evidence.
          const index = kept.findIndex((k) => k.station === entry.station)
          const held = kept[index]!
          if (
            predictionSourceTime(entry.row, receivedAt) >
            predictionSourceTime(held.row, receivedAt)
          )
            kept[index] = { ...entry, at: held.at }
          continue
        }
        // The same stop again much later is a second working, not this train's path.
        break
      }
      if (
        destination &&
        entry.station !== destination &&
        !entry.row.direction &&
        !entry.row.destinationNaptanId
      )
        break
      seen.set(entry.station, entry.at)
      kept.push(entry)
      if (destination && entry.station === destination) break
    }
    // Rows neither kept nor collapsed were cut away.
    const seenAll = kept.length + duplicates
    stats.nextWorkingRows += Math.max(
      0,
      ordered.length - seenAll
    )
    for (const entry of kept) output.push(entry.row)
  }
  return { rows: output, stats }
}
