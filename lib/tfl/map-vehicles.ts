import type { FeatureCollection, Point } from "geojson";

export type VehiclePosition = {
  vehicleId: string;
  lineId: string;
  lat: number;
  lon: number;
  bearingDeg: number;
  destinationName: string;
  timeToNextStationSec: number;
  /** Paint colour for the map marker. Set by the caller. */
  color?: string;
};

export type VehiclePointProperties = {
  vehicleId: string;
  lineId: string;
  destinationName: string;
  bearingDeg: number;
  color: string;
};

export const vehiclesToGeoJSON = (
  vehicles: readonly VehiclePosition[],
): FeatureCollection<Point, VehiclePointProperties> => ({
  type: "FeatureCollection",
  features: vehicles
    .filter(
      (vehicle) =>
        Number.isFinite(vehicle.lat) && Number.isFinite(vehicle.lon),
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
});
