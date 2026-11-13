import type { RealtimePrediction } from "tfl-ts"
import type { VehiclePosition } from "@/lib/tfl/map-vehicles"
import { AnonymousTrainIds } from "@/lib/tfl/rail-train-identity"
import {
  predictionArrivalTime,
  RailTrainTracker,
  trainRoutes,
  type LocationEvidence,
  type RouteChooser,
} from "@/lib/tfl/rail-train-tracker"
import { hopGraphForRailLine } from "@/lib/tfl/vehicle-hop-graph"
import {
  bestRouteFit,
  chooseHomepageRoute,
} from "@/lib/tfl/homepage-live/choose-route"
import {
  cleanArrivalRows,
  type CleanStats,
} from "@/lib/tfl/homepage-live/clean-arrivals"

/**
 * - `placed`: position comes from TfL location text that agrees with the arrival rows.
 * - `beta`: position is estimated from arrival times alone (no location text on the line,
 *   or text we could not use but a close next stop pins the hop). Drawn with a Beta label.
 * - `hidden`: not drawn; `reason` says why.
 */
export type TrainStatus = "placed" | "beta" | "hidden"

export type HiddenReason = "far-eta" | "ambiguous-id" | "stale"

/** Lines whose Arrivals feed carries no `currentLocation` at all (measured, 13 Nov 2026). */
export const ETA_ONLY_LINES: ReadonlySet<string> = new Set([
  "dlr",
  "elizabeth",
  "liberty",
  "lioness",
  "mildmay",
  "suffragette",
  "weaver",
  "windrush",
  "tram",
])

/**
 * Lines whose placement passed the replay gate (see `engine.replay.test.ts`):
 * location text on every row, no wrong-place jumps, branch-distinguishing
 * reports agree, and at most a tenth of nearby trains lost to shared ids.
 * Everything else is drawn with a Beta label. Never add a line here without the gate passing.
 */
export const PLACED_LINES: ReadonlySet<string> = new Set([
  "bakerloo",
  "central",
  "district",
  "jubilee",
  "metropolitan",
  "northern",
  "piccadilly",
  "victoria",
])

/** A train further than this many hop run-times from its next stop has no honest position. */
const FAR_ETA_HOPS = 1.5
const FAR_ETA_DWELL_S = 30

export type LiveTrain = {
  /** `line|vehicleId`: vehicle ids repeat across lines. */
  key: string
  lineId: string
  vehicleId: string
  status: TrainStatus
  reason?: HiddenReason
  /** Present for placed and beta trains. */
  position?: VehiclePosition
  destinationName: string
  towards?: string
  /** Seconds to the stop it is heading for, at `receivedAt`. */
  nextStopId?: string
  nextStopEtaSec?: number
}

export type LiveSnapshot = {
  receivedAt: number
  trains: LiveTrain[]
  clean: CleanStats
}

export const trainKeyOf = (lineId: string, vehicleId: string) =>
  `${lineId}|${vehicleId}`

/**
 * Turns one poll of `/Line/{ids}/Arrivals` (any number of lines) into trains
 * with a status. Pure apart from the tracker's own per-train memory, so the
 * same sequence of polls always gives the same trains.
 */
export class HomepageLiveEngine {
  private readonly evidence = new Map<string, LocationEvidence | undefined>()
  private readonly tracker: RailTrainTracker
  /** Chains DLR-style anonymous rows into trains before keys are built. */
  private readonly anonymous = new AnonymousTrainIds(
    trainRoutes,
    (lineId) => hopGraphForRailLine(lineId).canonical,
    predictionArrivalTime
  )

  constructor() {
    const chooser: RouteChooser = (input) => {
      const chosen = chooseHomepageRoute(input)
      const id = input.rows[0]?.vehicleId
      if (id) this.evidence.set(trainKeyOf(input.lineId, id), chosen?.evidence)
      return chosen
    }
    this.tracker = new RailTrainTracker(chooser)
  }

  ingest(
    predictions: readonly RealtimePrediction[],
    receivedAt: number
  ): LiveSnapshot {
    const cleaned = cleanArrivalRows(predictions, receivedAt)
    const stats = cleaned.stats
    const rows = this.anonymous.assign(cleaned.rows, receivedAt)
    const byTrain = new Map<string, RealtimePrediction[]>()
    const trains: LiveTrain[] = []
    for (const row of rows) {
      const key = trainKeyOf(row.lineId!, row.vehicleId ?? "")
      const list = byTrain.get(key) ?? []
      list.push(row)
      byTrain.set(key, list)
    }
    // One id on two physical trains (rows that no single route holds in order) cannot be placed.
    const ambiguous = new Set<string>()
    for (const [key, list] of byTrain) {
      const fit = bestRouteFit(list[0]!.lineId!, list)
      if (!fit || fit.violations === 0) continue
      ambiguous.add(key)
      byTrain.delete(key)
      trains.push({
        key,
        lineId: list[0]!.lineId!,
        vehicleId: list[0]!.vehicleId ?? "",
        status: "hidden",
        reason: "ambiguous-id",
        destinationName: list[0]!.destinationName ?? "",
      })
    }
    const placeable = rows.filter(
      (row) => !ambiguous.has(trainKeyOf(row.lineId!, row.vehicleId ?? ""))
    )
    for (const position of this.tracker.ingest(placeable, receivedAt)) {
      const motion = position.trainMotion
      if (!motion || !position.vehicleId) continue
      const key = trainKeyOf(position.lineId, position.vehicleId)
      if (ambiguous.has(key)) continue
      const mine = byTrain.get(key)
      const base = {
        key,
        lineId: position.lineId,
        vehicleId: position.vehicleId,
        destinationName: position.destinationName,
        towards: mine?.[0]?.towards,
        nextStopId: position.nextStopId,
        nextStopEtaSec: Math.max(0, (motion.arrivalAt - receivedAt) / 1000),
      }
      if (!mine) {
        // Coasting on a previous report after TfL dropped the rows.
        trains.push({ ...base, status: "hidden", reason: "stale" })
        continue
      }
      const evidence = this.evidence.get(key)
      const i = Math.max(
        1,
        motion.route.metres.findIndex((m) => m >= motion.target)
      )
      const run = motion.route.runSeconds[i - 1] ?? 90
      const far =
        !evidence &&
        base.nextStopEtaSec > run * FAR_ETA_HOPS + FAR_ETA_DWELL_S &&
        motion.phase !== "dwelling"
      if (far) {
        trains.push({ ...base, status: "hidden", reason: "far-eta" })
        continue
      }
      trains.push({
        ...base,
        status: PLACED_LINES.has(position.lineId) && evidence ? "placed" : "beta",
        position,
      })
    }
    return { receivedAt, trains, clean: stats }
  }
}
