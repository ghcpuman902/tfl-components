import type { LineString } from "geojson";
import type { RealtimePrediction } from "tfl-ts";
import type { VehiclePosition } from "@/lib/tfl/map-vehicles";
import {
  pointBetweenStations,
  progressBetweenStops,
  type StationCoord,
} from "@/lib/tfl/vehicle-progress";

export type { VehiclePosition, StationCoord };
export { pointBetweenStations, progressBetweenStops };

const groupPredictions = (
  predictions: readonly RealtimePrediction[],
): Map<string, RealtimePrediction[]> => {
  const groups = new Map<string, RealtimePrediction[]>();
  for (const prediction of predictions) {
    const vehicleId = prediction.vehicleId?.trim();
    if (!vehicleId) continue;
    const list = groups.get(vehicleId);
    if (list) list.push(prediction);
    else groups.set(vehicleId, [prediction]);
  }
  for (const list of groups.values()) {
    list.sort(
      (a, b) => (a.timeToStation ?? 9e9) - (b.timeToStation ?? 9e9),
    );
  }
  return groups;
};

/**
 * Place each vehicle on route geometry from its next two predicted stops.
 * TfL never sends vehicle lat/lon — use {@link progressBetweenStops} then
 * {@link pointBetweenStations}.
 */
export const locateVehicles = ({
  predictions,
  stationsById,
  polylines,
}: {
  predictions: readonly RealtimePrediction[];
  stationsById: ReadonlyMap<string, StationCoord>;
  polylines: readonly LineString[];
}): VehiclePosition[] => {
  const out: VehiclePosition[] = [];

  for (const [vehicleId, rows] of groupPredictions(predictions)) {
    const next = rows[0];
    if (!next?.naptanId) continue;
    const nextStop = stationsById.get(next.naptanId);
    if (!nextStop) continue;

    const ttsNext = next.timeToStation ?? 0;
    const after = rows[1];
    const afterStop = after?.naptanId
      ? stationsById.get(after.naptanId)
      : undefined;
    const progress = progressBetweenStops(ttsNext, after?.timeToStation);
    const placed =
      afterStop != null
        ? pointBetweenStations({
            from: nextStop,
            to: afterStop,
            progress,
            polylines,
          })
        : { lat: nextStop.lat, lon: nextStop.lon, bearingDeg: 0 };

    out.push({
      vehicleId,
      lineId: next.lineId ?? "",
      lat: placed.lat,
      lon: placed.lon,
      bearingDeg: placed.bearingDeg,
      destinationName: next.destinationName ?? next.towards ?? "",
      timeToNextStationSec: ttsNext,
    });
  }

  return out;
};
