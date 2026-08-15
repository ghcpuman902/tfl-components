"use server";

import type { RealtimePrediction } from "tfl-ts";
import {
  getCachedLineArrivals,
  getCachedStopArrivals,
  isDemoLineArrivalsSet,
  isDemoStopArrivalsId,
} from "@/lib/tfl/cached-stop-arrivals";

export type GetStopArrivalsResult =
  | { ok: true; arrivals: RealtimePrediction[] }
  | { ok: false; error: string };

/** @deprecated Use RealtimePrediction from tfl-ts. */
export type LiveArrival = RealtimePrediction;

/**
 * Docs-demo arrivals fetch for the site key path.
 * Only allowlisted demo stop IDs are served (shared cache).
 * Arbitrary stop IDs are rejected so this cannot be used as an open TfL proxy.
 */
export async function getStopArrivalsAction(
  stopPointId: string,
): Promise<GetStopArrivalsResult> {
  const trimmed = stopPointId.trim();
  if (!trimmed) return { ok: false, error: "No stop selected." };

  if (!isDemoStopArrivalsId(trimmed)) {
    return {
      ok: false,
      error: "This stop is not available on the site key. Add your own TfL API key.",
    };
  }

  try {
    const arrivals = await getCachedStopArrivals(trimmed);
    return { ok: true, arrivals };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch arrivals.";
    return { ok: false, error: message };
  }
}

export type GetLineArrivalsResult =
  | { ok: true; arrivals: RealtimePrediction[] }
  | { ok: false; error: string };

/**
 * Network-wide line arrivals for shared-track identity.
 * Only curated line sets are served so this cannot be used as an open TfL proxy.
 */
export async function getLineArrivalsAction(
  lineIds: readonly string[],
): Promise<GetLineArrivalsResult> {
  const trimmed = [
    ...new Set(lineIds.map((id) => id.trim()).filter(Boolean)),
  ];
  if (trimmed.length < 2) {
    return { ok: false, error: "Need at least two line ids." };
  }
  if (!isDemoLineArrivalsSet(trimmed)) {
    return {
      ok: false,
      error: "This line set is not available on the site key.",
    };
  }

  try {
    const arrivals = await getCachedLineArrivals(trimmed);
    return { ok: true, arrivals };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch line arrivals.";
    return { ok: false, error: message };
  }
}
