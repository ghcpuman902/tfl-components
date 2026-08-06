"use server";

import { getTflClient } from "@/lib/tfl/client";

export type LiveArrival = {
  lineId?: string;
  lineName?: string;
  destinationName?: string;
  towards?: string;
  platformName?: string;
  timeToStation?: number;
  vehicleId?: string;
};

export type GetStopArrivalsResult =
  | { ok: true; arrivals: LiveArrival[] }
  | { ok: false; error: string };

export async function getStopArrivalsAction(
  stopPointId: string,
): Promise<GetStopArrivalsResult> {
  const trimmed = stopPointId.trim();
  if (!trimmed) return { ok: false, error: "No stop selected." };

  try {
    const client = getTflClient();
    const arrivals = await client.stopPoint.getArrivals({
      stopPointIds: [trimmed],
      sortBy: "timeToStation",
    });
    return {
      ok: true,
      arrivals: arrivals.map((arrival) => ({
        lineId: arrival.lineId,
        lineName: arrival.lineName,
        destinationName: arrival.destinationName,
        towards: arrival.towards,
        platformName: arrival.platformName,
        timeToStation: arrival.timeToStation,
        vehicleId: arrival.vehicleId,
      })),
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch arrivals.";
    return { ok: false, error: message };
  }
}
