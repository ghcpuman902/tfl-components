import { lineLengthM, type LngLat } from "@/lib/tfl/geometry/hop-track-patch"
import type { RoutePolyline } from "@/lib/tfl/vehicle-progress"

/**
 * Timetable hop minutes can be nonsense: Piccadilly King's Cross to Russell
 * Square is 17 minutes for 1.1 km, and the whole Piccadilly table runs slow
 * (median hop 6 minutes where every other tube line is 2). A hop is an outlier
 * when it is at least `MIN_OUTLIER_MINUTES` and more than `OUTLIER_FACTOR` times
 * what its own track length takes at the line's speed; its minutes then come from
 * length ÷ line speed instead.
 *
 * The line's speed is the faster of its own median hop speed and the typical
 * speed of its mode, because a line whose table is mostly wrong (Piccadilly)
 * cannot be judged by its own median. The rule "more than 4 times the line's
 * median hop" misses it: the Piccadilly median is 6 minutes, so nothing under
 * 24 would count.
 */
export const OUTLIER_FACTOR = 2
export const MIN_OUTLIER_MINUTES = 4

/** Typical in-service speeds measured from the other lines of each mode (km/h). */
export const MODE_REFERENCE_KMH: Readonly<Record<string, number>> = {
  tube: 30,
  overground: 30,
  elizabeth: 45,
  dlr: 27,
  tram: 20,
}
const MIN_HOP_KM = 0.2

export type HopMinutesCorrection = {
  fromStationId: string
  toStationId: string
  was: number
  now: number
}

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2
}

export const correctHopMinutes = (
  polylines: readonly RoutePolyline[],
  mode = "tube"
): { polylines: RoutePolyline[]; corrections: HopMinutesCorrection[] } => {
  const km = (row: RoutePolyline) => lineLengthM(row.line.coordinates as LngLat[]) / 1000
  const timed = polylines.filter(
    (row) => row.fromStationId && row.hopMinutes && row.hopMinutes > 0 && km(row) >= MIN_HOP_KM
  )
  if (timed.length < 5) return { polylines: [...polylines], corrections: [] }
  const kmPerMinute =
    Math.max(
      median(timed.map((row) => km(row) / row.hopMinutes!)) * 60,
      MODE_REFERENCE_KMH[mode] ?? 30
    ) / 60
  const corrections: HopMinutesCorrection[] = []
  const fixed = polylines.map((row) => {
    if (!row.fromStationId || !row.toStationId || !row.hopMinutes || km(row) < MIN_HOP_KM) return row
    const expected = Math.max(1, km(row) / kmPerMinute)
    if (row.hopMinutes < MIN_OUTLIER_MINUTES || row.hopMinutes <= OUTLIER_FACTOR * expected) return row
    const now = Math.round(expected * 10) / 10
    corrections.push({
      fromStationId: row.fromStationId,
      toStationId: row.toStationId,
      was: row.hopMinutes,
      now,
    })
    return { ...row, hopMinutes: now }
  })
  return { polylines: fixed, corrections }
}
