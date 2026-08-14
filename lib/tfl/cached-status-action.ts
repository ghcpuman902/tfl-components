"use server";

import {
  getCachedLineStatuses,
  type StatusLine,
} from "@/lib/tfl/status-data";

/**
 * Degraded-mode status for the hosted board — site cache, no polling.
 * Keep fetching out of the reusable TubeStatusBoard.
 */
export async function getCachedLineStatusesAction(): Promise<StatusLine[]> {
  return getCachedLineStatuses();
}
