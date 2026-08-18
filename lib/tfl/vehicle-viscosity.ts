/**
 * Shared viscosity for live-vehicle coast / ease.
 * Curvature already stretches interpolation on bends. Station proximity
 * uses the same factor so a train slows into a stop and holds there
 * instead of sliding through onto the next hop.
 */
export type VehicleViscosityParams = {
  /** Multiplier on turn/π (the bend term). */
  curvatureWeight: number
  /** Distance from the next stop where station viscosity starts. */
  stationApproachKm: number
  /** Peak extra viscosity at the stop (0 = off). */
  stationWeight: number
  /** Hold at the arrived stop before interpolation starts the next hop. */
  dwellSec: number
}

/**
 * Tuned on a 49-frame / 61-vehicle Central trace (1 Hz capture, scored as
 * 15 requests/min). Station approach cut mean error 5.3 m → 3.6 m and
 * zeroed station overshoot. Dwell 0–28 s tied on that minute; 18 s is
 * kept so interpolation holds at the stop when the next hop appears.
 */
export const DEFAULT_VEHICLE_VISCOSITY: VehicleViscosityParams = {
  curvatureWeight: 0.6,
  stationApproachKm: 0.16,
  stationWeight: 2.4,
  dwellSec: 18,
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n))

/** 0 in open track, 1 at / past the stop. */
export const stationProximity = (
  remainingKm: number,
  approachKm: number,
): number => {
  if (approachKm <= 0) return remainingKm <= 0 ? 1 : 0
  if (remainingKm <= 0) return 1
  return clamp01(1 - remainingKm / approachKm)
}

/**
 * ≥1. Same shape as the old curvature ease: 1 on open straight track,
 * rising on a bend and as remaining km enters the station approach.
 */
export const viscosityFactor = ({
  remainingKm,
  turnRadians = 0,
  params,
}: {
  remainingKm?: number
  turnRadians?: number
  params?: VehicleViscosityParams
}): number => {
  const spec = params ?? DEFAULT_VEHICLE_VISCOSITY
  const curve =
    Math.min(1.6, Math.max(0, turnRadians) / Math.PI) * spec.curvatureWeight
  const proximity = stationProximity(
    remainingKm ?? Number.POSITIVE_INFINITY,
    spec.stationApproachKm,
  )
  const station = proximity * proximity * spec.stationWeight
  return 1 + Math.min(2.4, curve + station)
}

export const viscousDrainKm = ({
  remainingKm,
  elapsedSec,
  speedMetersPerSec,
  turnRadians = 0,
  params,
}: {
  remainingKm: number
  elapsedSec: number
  speedMetersPerSec: number
  turnRadians?: number
  params?: VehicleViscosityParams
}): { remainingKm: number; held: boolean } => {
  if (remainingKm <= 0 || elapsedSec <= 0) {
    return { remainingKm: Math.max(0, remainingKm), held: remainingKm <= 0 }
  }
  const factor = viscosityFactor({ remainingKm, turnRadians, params })
  const drained = (speedMetersPerSec * elapsedSec) / 1000 / factor
  const next = Math.max(0, remainingKm - drained)
  return { remainingKm: next, held: next <= 0 }
}

export const stillDwelling = (
  arrivedAtMs: number | undefined,
  nowMs: number,
  params?: VehicleViscosityParams,
): boolean => {
  const dwellMs = (params ?? DEFAULT_VEHICLE_VISCOSITY).dwellSec * 1000
  if (dwellMs <= 0 || arrivedAtMs == null) return false
  return nowMs - arrivedAtMs < dwellMs
}
