"use server";

import type { RealtimePrediction } from "tfl-ts";
import { getTflClient } from "@/lib/tfl/client";

export type GetStopArrivalsResult =
  | { ok: true; arrivals: RealtimePrediction[] }
  | { ok: false; error: string };

/** @deprecated Use RealtimePrediction from tfl-ts. */
export type LiveArrival = RealtimePrediction;

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
    return { ok: true, arrivals };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch arrivals.";
    return { ok: false, error: message };
  }
}
