"use server";

import { TFL_MODAL_COLOURS } from "@/lib/tfl/brand-colours";
import { getCachedBusRouteGeometry } from "@/lib/tfl/bus-route-geometry";
import type { BusRouteGeometry } from "@/lib/tfl/bus-geography-types";
import {
  getCachedTrackedBusArrivals,
  getCachedTrackedRailArrivals,
} from "@/lib/tfl/cached-line-vehicle-arrivals";
import {
  TRACKED_BUS_DIRECTION,
  TRACKED_BUS_ROUTE_ID,
  TRACKED_RAIL_LINE_ID,
} from "@/lib/tfl/live-vehicles-stops";
import type { VehiclePosition } from "@/lib/tfl/map-vehicles";
import {
  railPolylinesForLine,
  railStationsById,
  railVehicleColor,
} from "@/lib/tfl/rail-vehicle-geometry";
import { locateVehicles } from "@/lib/tfl/vehicle-positions";

export type LiveVehiclesPayload = {
  rail: VehiclePosition[];
  bus: VehiclePosition[];
  busGeometry: BusRouteGeometry;
  fetchedAt: number;
};

export type GetLiveVehiclesResult =
  | { ok: true; data: LiveVehiclesPayload }
  | { ok: false; error: string };

const withColor = (
  vehicles: VehiclePosition[],
  colorFor: (lineId: string) => string,
): VehiclePosition[] =>
  vehicles.map((vehicle) => ({
    ...vehicle,
    color: colorFor(vehicle.lineId),
  }));

export async function getLiveVehiclesAction(): Promise<GetLiveVehiclesResult> {
  try {
    const [railCached, busCached, busGeometry] = await Promise.all([
      getCachedTrackedRailArrivals(),
      getCachedTrackedBusArrivals(),
      getCachedBusRouteGeometry(TRACKED_BUS_ROUTE_ID, TRACKED_BUS_DIRECTION),
    ]);

    const rail = withColor(
      locateVehicles({
        predictions: railCached.arrivals,
        stationsById: railStationsById(),
        polylines: railPolylinesForLine(TRACKED_RAIL_LINE_ID),
      }),
      railVehicleColor,
    );

    const busStops = new Map(
      busGeometry.stops.map((stop) => [
        stop.id,
        { lat: stop.lat, lon: stop.lon },
      ]),
    );
    const bus = withColor(
      locateVehicles({
        predictions: busCached.arrivals,
        stationsById: busStops,
        polylines: busGeometry.segments.map((segment) => segment.line),
      }),
      () => TFL_MODAL_COLOURS.buses.hex,
    );

    return {
      ok: true,
      data: {
        rail,
        bus,
        busGeometry,
        fetchedAt: Math.max(railCached.fetchedAt, busCached.fetchedAt),
      },
    };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load live vehicles.";
    return { ok: false, error: message };
  }
}
