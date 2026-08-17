import { getLineColor } from "tfl-ts";
import type { VehiclePosition } from "@/lib/tfl/map-vehicles";
import {
  railPolylinesForLine,
  railStationsById,
} from "@/lib/tfl/rail-vehicle-geometry";
import { pointBetweenStations } from "@/lib/tfl/vehicle-progress";

const FROM_ID = "940GZZLUGPK";
const TO_ID = "940GZZLUOXC";

/** Labeled 0 / 50 / 100% dots between Green Park and Oxford Circus. */
export const vehicleProgressExampleVehicles = (): VehiclePosition[] => {
  const stations = railStationsById();
  const from = stations.get(FROM_ID);
  const to = stations.get(TO_ID);
  if (!from || !to) return [];
  const polylines = railPolylinesForLine("victoria");
  const color = getLineColor("victoria").hex;
  return ([0, 0.5, 1] as const).map((progress) => {
    const point = pointBetweenStations({ from, to, progress, polylines });
    return {
      vehicleId: `progress-${progress}`,
      lineId: "victoria",
      lat: point.lat,
      lon: point.lon,
      bearingDeg: point.bearingDeg,
      destinationName: `${Math.round(progress * 100)}%`,
      timeToNextStationSec: 0,
      color,
    };
  });
};
