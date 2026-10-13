import type { FeatureCollection, LineString, Point } from "geojson"
import { hopGraphForRailLine } from "@/lib/tfl/vehicle-hop-graph"
import {
  lineTail,
  orientLineToBearing,
  segmentAroundPoint,
  vehicleLengthMeters,
  vehicleStrokeScale,
  type RoutePolyline,
} from "@/lib/tfl/vehicle-progress"

export type VehiclePosition = {
  /** Optional rail motion state for a schematic renderer. Route distance is in metres. */
  trainMotion?: {
    route: {
      id: string
      lineId: string
      direction: string
      stations: string[]
      metres: number[]
      runSeconds: number[]
    }
    distance: number
    speed: number
    acceleration: number
    target: number
    arrivalAt: number
    asOf: number
    phase: "dwelling" | "accelerating" | "running" | "braking"
    departureAt?: number
    following?: { target: number; departureAt: number; arrivalAt: number }[]
  }
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

export type CarriageProperties = VehicleSegmentProperties & {
  /** `body` is the whole train; `front` is its leading end. */
  part: "body" | "front"
}

/** Share of a carriage painted as its front window. */
const FRONT_SHARE = 0.22

/**
 * Trains as carriages on the track: a body at its in-service length and a
 * front piece at the leading end. `minLengthMeters` keeps a train visible when
 * the map is zoomed out far enough that true length is under a few pixels.
 */
export const vehiclesToCarriageGeoJSON = (
  vehicles: readonly VehiclePosition[],
  polylines: readonly RoutePolyline[],
  minLengthMeters = 0
): FeatureCollection<LineString, CarriageProperties> => {
  const sized = vehicles.map((vehicle) => ({
    ...vehicle,
    lengthMeters: Math.max(
      vehicle.lengthMeters ?? vehicleLengthMeters(vehicle.lineId),
      minLengthMeters
    ),
  }))
  const lengths = new Map(
    sized.map((vehicle) => [
      `${vehicle.lineId}:${vehicle.vehicleId}`,
      vehicle.lengthMeters,
    ])
  )
  return {
    type: "FeatureCollection",
    features: vehiclesToSegmentGeoJSON(sized, polylines).features.flatMap(
      (body) => {
        const length =
          lengths.get(
            `${body.properties.lineId}:${body.properties.vehicleId}`
          ) ?? 0
        return [
          {
            ...body,
            properties: { ...body.properties, part: "body" as const },
          },
          {
            ...body,
            id: `${body.properties.lineId}:${body.id}:front`,
            properties: { ...body.properties, part: "front" as const },
            geometry: lineTail(body.geometry, length * FRONT_SHARE),
          },
        ]
      }
    ),
  }
}
