import type { RealtimePrediction } from "tfl-ts"

export type CentralTraceRow = {
  vehicleId: string
  naptanId: string
  timeToStation: number
  destinationName: string
}

export type CentralTraceFrame = {
  fetchedAt: number
  rows: CentralTraceRow[]
}

export type CentralVehicleTrace = {
  lineId: string
  intervalMs: number
  startedAt: string
  frames: CentralTraceFrame[]
}
import { hopGraphForRailLine } from "@/lib/tfl/vehicle-hop-graph"
import {
  ingestVehicleHops,
  advanceHopPosition,
  vehicleTrackKey,
  type VehicleHopTrack,
} from "@/lib/tfl/vehicle-hop-engine"
import type { VehiclePosition } from "@/lib/tfl/map-vehicles"
import { railPolylinesForLine, railStationsById } from "@/lib/tfl/rail-vehicle-geometry"
import type { VehicleViscosityParams } from "@/lib/tfl/vehicle-viscosity"

const METRES_PER_DEG_LAT = 111_320
const REF_LAT = 51.5
const METRES_PER_DEG_LNG =
  METRES_PER_DEG_LAT * Math.cos((REF_LAT * Math.PI) / 180)

export const POLL_15_PER_MIN_MS = 4_000

const distanceMetres = (
  left: { lat: number; lon: number },
  right: { lat: number; lon: number },
): number => {
  const dx = (left.lon - right.lon) * METRES_PER_DEG_LNG
  const dy = (left.lat - right.lat) * METRES_PER_DEG_LAT
  return Math.hypot(dx, dy)
}

const asPredictions = (
  lineId: string,
  rows: readonly {
    vehicleId: string
    naptanId: string
    timeToStation: number
    destinationName: string
  }[],
): RealtimePrediction[] =>
  rows.map(
    (row) =>
      ({
        lineId,
        vehicleId: row.vehicleId,
        naptanId: row.naptanId,
        timeToStation: row.timeToStation,
        destinationName: row.destinationName,
      }) as RealtimePrediction,
  )

export type ViscosityScore = {
  params: VehicleViscosityParams
  meanErrorM: number
  stationOvershootM: number
  samples: number
}

const isPollFrame = (
  frameAt: number,
  startAt: number,
  pollMs: number,
): boolean => {
  const elapsed = frameAt - startAt
  const slot = Math.round(elapsed / pollMs) * pollMs
  return Math.abs(elapsed - slot) < 750
}

export const scoreViscosityOnTrace = (
  trace: CentralVehicleTrace,
  params: VehicleViscosityParams,
  pollMs = POLL_15_PER_MIN_MS,
): ViscosityScore => {
  const stationsById = railStationsById()
  const polylines = railPolylinesForLine(trace.lineId)
  const graph = hopGraphForRailLine(trace.lineId)
  const truthTracks = new Map<string, VehicleHopTrack>()
  const simTracks = new Map<string, VehicleHopTrack>()
  const startAt = trace.frames[0]?.fetchedAt ?? 0
  let errorSum = 0
  let overshootSum = 0
  let samples = 0

  let lastPoll: VehiclePosition[] = []
  for (const frame of trace.frames) {
    const predictions = asPredictions(trace.lineId, frame.rows)
    const truth = ingestVehicleHops({
      tracks: truthTracks,
      predictions,
      stationsById,
      polylines,
      graph,
      asOf: frame.fetchedAt,
      viscosity: params,
    })
    const truthByKey = new Map(
      truth.map((vehicle) => [
        vehicleTrackKey(vehicle.lineId, vehicle.vehicleId),
        vehicle,
      ]),
    )

    if (isPollFrame(frame.fetchedAt, startAt, pollMs)) {
      lastPoll = ingestVehicleHops({
        tracks: simTracks,
        predictions,
        stationsById,
        polylines,
        graph,
        asOf: frame.fetchedAt,
        viscosity: params,
      })
    }

    const simByKey = new Map(
      lastPoll.map((vehicle) => {
        const advanced = advanceHopPosition(
          vehicle,
          frame.fetchedAt,
          polylines,
          params,
        )
        return [vehicleTrackKey(advanced.lineId, advanced.vehicleId), advanced]
      }),
    )

    for (const [key, expected] of truthByKey) {
      const predicted = simByKey.get(key)
      if (!predicted) continue
      const error = distanceMetres(expected, predicted)
      errorSum += error
      samples += 1
      if ((expected.remainingKm ?? 1) <= 0.04 && error > 80) {
        overshootSum += error
      }
    }
  }

  return {
    params,
    meanErrorM: samples === 0 ? Number.POSITIVE_INFINITY : errorSum / samples,
    stationOvershootM: overshootSum / Math.max(1, samples),
    samples,
  }
}

export const VISCOSITY_GRID: VehicleViscosityParams[] = [
  { curvatureWeight: 1, stationApproachKm: 0, stationWeight: 0, dwellSec: 0 },
  ...[0.6, 1, 1.4].flatMap((curvatureWeight) =>
    [0.1, 0.16, 0.24].flatMap((stationApproachKm) =>
      [0.8, 1.6, 2.4].flatMap((stationWeight) =>
        [0, 12, 18, 28].map((dwellSec) => ({
          curvatureWeight,
          stationApproachKm,
          stationWeight,
          dwellSec,
        })),
      ),
    ),
  ),
]

export const rankViscosityParams = (
  trace: CentralVehicleTrace,
  grid: readonly VehicleViscosityParams[] = VISCOSITY_GRID,
  pollMs = POLL_15_PER_MIN_MS,
): ViscosityScore[] => {
  const ranked = grid.map((params) =>
    scoreViscosityOnTrace(trace, params, pollMs),
  )
  ranked.sort((left, right) => {
    const leftScore = left.meanErrorM + 0.35 * left.stationOvershootM
    const rightScore = right.meanErrorM + 0.35 * right.stationOvershootM
    return leftScore - rightScore
  })
  return ranked
}
