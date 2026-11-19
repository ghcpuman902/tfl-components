import type { RealtimePrediction } from "tfl-ts"
import { cleanArrivalRows } from "@/lib/tfl/homepage-live/clean-arrivals"
import { predictionArrivalTime } from "@/lib/tfl/rail-train-tracker"

/** Rows further out than this are timetabled trips, not trains the map can honestly place. */
export const COMPACT_HORIZON_S = 25 * 60
/** A row this long past its ETA is a train that has left. */
const COMPACT_PAST_S = 90

/**
 * One whole-network poll in a form that is cheap to ship to the browser:
 * a string table plus numeric rows. Times are milliseconds relative to `at`.
 */
export type CompactRound = {
  /** Epoch ms the poll was received. */
  at: number
  strings: string[]
  /** [line, vehicle, naptan, platform, direction, destNaptan, destName, location, towards, eta, timestamp, read] */
  rows: number[][]
}

const FIELDS = [
  "lineId",
  "vehicleId",
  "naptanId",
  "platformName",
  "direction",
  "destinationNaptanId",
  "destinationName",
  "currentLocation",
  "towards",
] as const

/** Cleans a poll (next working, duplicate stops, stale reads), drops rows beyond the horizon and packs it. */
export const compactRound = (
  rows: readonly RealtimePrediction[],
  receivedAt: number
): CompactRound => {
  const { rows: cleaned } = cleanArrivalRows(rows, receivedAt)
  const table = new Map<string, number>()
  const strings: string[] = []
  const intern = (value: string | undefined | null) => {
    if (!value) return -1
    let index = table.get(value)
    if (index == null) {
      index = strings.length
      strings.push(value)
      table.set(value, index)
    }
    return index
  }
  const packed: number[][] = []
  for (const row of cleaned) {
    const eta = predictionArrivalTime(row, receivedAt)
    const seconds = (eta - receivedAt) / 1000
    if (seconds > COMPACT_HORIZON_S || seconds < -COMPACT_PAST_S) continue
    const stamp = Date.parse(row.timestamp ?? "")
    const read = Date.parse(row.timing?.read ?? "")
    packed.push([
      ...FIELDS.map((field) => intern(row[field] as string | undefined)),
      eta - receivedAt,
      Number.isFinite(stamp) ? stamp - receivedAt : 0,
      Number.isFinite(read) ? read - receivedAt : 0,
    ])
  }
  return { at: receivedAt, strings, rows: packed }
}

export const expandRound = (round: CompactRound): RealtimePrediction[] =>
  round.rows.map((packed) => {
    const text = (i: number) => (packed[i]! >= 0 ? round.strings[packed[i]!] : undefined)
    const eta = round.at + packed[9]!
    const row: Record<string, unknown> = {
      expectedArrival: new Date(eta).toISOString(),
      timeToStation: Math.round((eta - round.at) / 1000),
    }
    FIELDS.forEach((field, i) => {
      const value = text(i)
      if (value !== undefined) row[field] = value
    })
    if (packed[10]) row.timestamp = new Date(round.at + packed[10]).toISOString()
    if (packed[11]) row.timing = { read: new Date(round.at + packed[11]).toISOString() }
    return row as unknown as RealtimePrediction
  })
