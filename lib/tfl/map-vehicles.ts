import type { FeatureCollection, LineString, Point } from "geojson"
import { hopGraphForRailLine } from "@/lib/tfl/vehicle-hop-graph"
import {
  orientLineToBearing,
  segmentAroundPoint,
  vehicleLengthMeters,
  vehicleStrokeScale,
  type RoutePolyline,
} from "@/lib/tfl/vehicle-progress"

export type VehiclePosition = {
  vehicleId: string
  lineId: string
  lat: number
  lon: number
  bearingDeg: number
  destinationName: string
  timeToNextStationSec: number
  /** Paint colour for the map marker. Set by the caller. */
  color?: string
  /** Override {@link vehicleLengthMeters} for this vehicle. */
  lengthMeters?: number
  /** Epoch ms when `timeToStation` values were read. */
  asOf?: number
  /** The stop this vehicle is next due at — coasting re-places it here as `timeToNextStationSec` counts down. */
  nextStopLat?: number
  nextStopLon?: number
  /** The stop after that, used only to pick which way is "backward" along the track. */
  followingStopLat?: number
  followingStopLon?: number
  /** Naptan of the locked next stop. */
  nextStopId?: string
  /** Naptan of the hop's previous stop, when known. */
  fromStopId?: string
  /** Remaining km to `nextStop`. Drains while coasting; never increases on a locked hop. */
  remainingKm?: number
  /** Epoch ms when this hop's remaining km first hit 0. */
  arrivedAtMs?: number
}

export type VehiclePointProperties = {
  vehicleId: string
  lineId: string
  destinationName: string
  bearingDeg: number
  color: string
}

export type VehicleSegmentProperties = {
  vehicleId: string
  lineId: string
  destinationName: string
  widthScale: number
}

export const vehiclesToGeoJSON = (
  vehicles: readonly VehiclePosition[]
): FeatureCollection<Point, VehiclePointProperties> => ({
  type: "FeatureCollection",
  features: vehicles
    .filter(
      (vehicle) => Number.isFinite(vehicle.lat) && Number.isFinite(vehicle.lon)
    )
    .map((vehicle) => ({
      type: "Feature",
      id: vehicle.vehicleId,
      properties: {
        vehicleId: vehicle.vehicleId,
        lineId: vehicle.lineId,
        destinationName: vehicle.destinationName,
        bearingDeg: vehicle.bearingDeg,
        color: vehicle.color ?? "#0019A8",
      },
      geometry: {
        type: "Point",
        coordinates: [vehicle.lon, vehicle.lat],
      },
    })),
})

export const vehiclesToSegmentGeoJSON = (
  vehicles: readonly VehiclePosition[],
  polylines: readonly RoutePolyline[]
): FeatureCollection<LineString, VehicleSegmentProperties> => ({
  type: "FeatureCollection",
  features: vehicles
    .filter(
      (vehicle) => Number.isFinite(vehicle.lat) && Number.isFinite(vehicle.lon)
    )
    .map((vehicle) => ({
      type: "Feature",
      id: vehicle.vehicleId,
      properties: {
        vehicleId: vehicle.vehicleId,
        lineId: vehicle.lineId,
        destinationName: vehicle.destinationName,
        widthScale: vehicleStrokeScale(vehicle.lineId),
      },
      geometry: orientLineToBearing(
        segmentAroundPoint({
          at: { lat: vehicle.lat, lon: vehicle.lon },
          lengthMeters:
            vehicle.lengthMeters ?? vehicleLengthMeters(vehicle.lineId),
          lineId: vehicle.lineId,
          polylines,
          fromStopId: vehicle.fromStopId,
          toStopId: vehicle.nextStopId,
          canonical: hopGraphForRailLine(vehicle.lineId).canonical,
        }),
        vehicle.bearingDeg
      ),
    })),
})
