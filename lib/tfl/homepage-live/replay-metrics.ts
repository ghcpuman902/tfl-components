import type { RealtimePrediction } from "tfl-ts"
import {
  cleanArrivalRows,
  isAnonymousVehicle,
} from "@/lib/tfl/homepage-live/clean-arrivals"
import {
  ETA_ONLY_LINES,
  HomepageLiveEngine,
  trainKeyOf,
  type LiveTrain,
} from "@/lib/tfl/homepage-live/engine"
import type { ReplayRound } from "@/lib/tfl/homepage-live/fixture"
import type { VehiclePosition } from "@/lib/tfl/map-vehicles"
import {
  parseTrainLocation,
  predictionSourceTime,
  routeDistanceIndex,
  trainRoutes,
} from "@/lib/tfl/rail-train-tracker"
import { hopGraphForRailLine } from "@/lib/tfl/vehicle-hop-graph"

export type LineMetrics = {
  lineId: string
  /** Mean trains with a vehicle id (or chain id) per poll. */
  trainsPerPoll: number
  /** Share of train-polls by status. */
  placed: number
  beta: number
  hidden: number
  hiddenByReason: Record<string, number>
  /** Train-polls that moved more than `JUMP_M` between consecutive polls. */
  jumps: number
  steps: number
  worstStepM: number
  /** Station reports "At X" later seen for a train, where X can only be on one branch. */
  branchChecks: number
  branchCorrect: number
}

/** A Tube train covers about 600 m in 30 s; more than this is a wrong place, not fast running. */
export const JUMP_M = 1500

/**
 * Why a line may not be drawn as exact. An empty list means the line passes
 * every gate on the recording. Mirrors `PLACED_LINES`; a test keeps them equal.
 */
export const lineGate = (m: LineMetrics): string[] => {
  const failures: string[] = []
  if (ETA_ONLY_LINES.has(m.lineId)) failures.push("no location text")
  if (m.steps < 100) failures.push("too few trains to judge")
  if (m.steps && m.jumps / m.steps > 0.001) failures.push("wrong-place jumps")
  if (m.branchChecks && m.branchCorrect / m.branchChecks < 0.99)
    failures.push("branch reports disagree")
  const ambiguous = m.hiddenByReason["ambiguous-id"] ?? 0
  const near = m.placed + m.beta + ambiguous
  if (near && ambiguous / near > 0.1) failures.push("shared vehicle ids")
  return failures
}

const metres = (
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
) => {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLon = (b.lon - a.lon) * rad
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLon / 2) ** 2
  return 2 * 6371000 * Math.asin(Math.sqrt(h))
}

/** Length in metres of the hop a train is on. */
const hopMetres = (position: VehiclePosition) => {
  const motion = position.trainMotion
  if (!motion) return 0
  const i = routeDistanceIndex(motion.route, motion.distance)
  return motion.route.metres[i]! - motion.route.metres[i - 1]!
}

type Report = { key: string; at: number; station: string }

/** Freshest platform report per train per poll. */
const platformReports = (
  rows: readonly RealtimePrediction[],
  receivedAt: number
): Report[] => {
  const byTrain = new Map<string, RealtimePrediction[]>()
  for (const row of rows) {
    if (isAnonymousVehicle(row.vehicleId)) continue
    const key = trainKeyOf(row.lineId!, row.vehicleId!)
    byTrain.set(key, [...(byTrain.get(key) ?? []), row])
  }
  const reports: Report[] = []
  for (const [key, list] of byTrain) {
    list.sort(
      (a, b) =>
        predictionSourceTime(b, receivedAt) -
        predictionSourceTime(a, receivedAt)
    )
    const best =
      list.find((r) => parseTrainLocation(r.lineId!, r.currentLocation ?? "")) ??
      list[0]!
    const evidence = parseTrainLocation(best.lineId!, best.currentLocation ?? "")
    if (evidence?.kind !== "at") continue
    reports.push({
      key,
      at: predictionSourceTime(best, receivedAt),
      station: hopGraphForRailLine(best.lineId!).canonical(evidence.to),
    })
  }
  return reports
}

type Placement = { key: string; t: number; direction: string; stations: Set<string> }

/**
 * Replays every round through a fresh engine and scores each line.
 * `rounds` are in time order.
 */
export const measureReplay = (
  rounds: readonly ReplayRound[],
  lines: readonly string[]
): { lines: Map<string, LineMetrics>; trains: LiveTrain[][] } => {
  const engine = new HomepageLiveEngine()
  const perRound: LiveTrain[][] = []
  const prev = new Map<string, { lat: number; lon: number; hop: number }>()
  const stats = new Map<string, LineMetrics>()
  const placements = new Map<string, Placement[]>()
  const reports = new Map<string, Report[]>()
  for (const line of lines)
    stats.set(line, {
      lineId: line,
      trainsPerPoll: 0,
      placed: 0,
      beta: 0,
      hidden: 0,
      hiddenByReason: {},
      jumps: 0,
      steps: 0,
      worstStepM: 0,
      branchChecks: 0,
      branchCorrect: 0,
    })
  for (const round of rounds) {
    const snapshot = engine.ingest(round.rows, round.receivedAt)
    perRound.push(snapshot.trains)
    const cleaned = cleanArrivalRows(round.rows, round.receivedAt).rows
    for (const report of platformReports(cleaned, round.receivedAt)) {
      const list = reports.get(report.key) ?? []
      list.push(report)
      reports.set(report.key, list)
    }
    for (const train of snapshot.trains) {
      const m = stats.get(train.lineId)
      if (!m) continue
      m[train.status]++
      if (train.reason)
        m.hiddenByReason[train.reason] = (m.hiddenByReason[train.reason] ?? 0) + 1
      const position = train.position
      if (train.status === "hidden" || !position) {
        prev.delete(train.key)
        continue
      }
      const hop = hopMetres(position)
      const before = prev.get(train.key)
      if (before) {
        const d = metres(before, position)
        m.steps++
        m.worstStepM = Math.max(m.worstStepM, d)
        // Catching up one whole hop after a late platform report is a correction, not a wrong place.
        if (d > Math.max(JUMP_M, 1.25 * Math.max(hop, before.hop))) m.jumps++
      }
      prev.set(train.key, { lat: position.lat, lon: position.lon, hop })
      const route = position.trainMotion?.route
      if (route) {
        const canon = hopGraphForRailLine(train.lineId).canonical
        const list = placements.get(train.key) ?? []
        list.push({
          key: train.key,
          t: round.receivedAt,
          direction: route.direction,
          stations: new Set(route.stations.map(canon)),
        })
        placements.set(train.key, list)
      }
    }
  }
  for (const line of lines) {
    const m = stats.get(line)!
    const canon = hopGraphForRailLine(line).canonical
    const byDirection = new Map<string, Set<string>[]>()
    for (const route of trainRoutes(line))
      byDirection.set(route.direction, [
        ...(byDirection.get(route.direction) ?? []),
        new Set(route.stations.map(canon)),
      ])
    for (const [key, list] of placements) {
      if (!key.startsWith(`${line}|`)) continue
      for (const placement of list)
        for (const report of reports.get(key) ?? []) {
          if (report.at <= placement.t || report.at > placement.t + 600_000)
            continue
          const sets = byDirection.get(placement.direction) ?? []
          const containing = sets.filter((s) => s.has(report.station)).length
          if (containing === 0 || containing === sets.length) continue
          m.branchChecks++
          if (placement.stations.has(report.station)) m.branchCorrect++
        }
    }
    const total = m.placed + m.beta + m.hidden
    m.trainsPerPoll = total / rounds.length
  }
  return { lines: stats, trains: perRound }
}
