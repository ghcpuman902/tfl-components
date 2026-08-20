import type { LineString } from "geojson"
import type { RealtimePrediction } from "tfl-ts"
import type { VehiclePosition } from "@/lib/tfl/map-vehicles"
import {
  advanceHopPosition,
  ingestVehicleHops,
} from "@/lib/tfl/vehicle-hop-engine"
import type { StationCoord } from "@/lib/tfl/vehicle-progress"

export type { VehiclePosition, StationCoord }

/**
 * One-shot placement (no hop memory). Prefer {@link ingestVehicleHops}
 * when polling so ETA regressions cannot walk a vehicle backward.
 */
export const locateVehicles = ({
  predictions,
  stationsById,
  polylines,
  asOf,
}: {
  predictions: readonly RealtimePrediction[]
  stationsById: ReadonlyMap<string, StationCoord>
  polylines: readonly LineString[]
  asOf?: number
}): VehiclePosition[] =>
  ingestVehicleHops({
    tracks: new Map(),
    predictions,
    stationsById,
    polylines,
    asOf: asOf ?? 0,
  })

/** Re-place a vehicle using remaining km / countdown as it elapses since `asOf`. */
export const advanceVehiclePosition = (
  vehicle: VehiclePosition,
  nowMs: number,
  polylines: readonly LineString[]
): VehiclePosition => advanceHopPosition(vehicle, nowMs, polylines)
