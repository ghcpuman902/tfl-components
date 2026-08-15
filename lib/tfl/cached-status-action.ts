"use server"

import {
  getCachedLineStatuses,
  type CachedLineStatusesPayload,
} from "@/lib/tfl/status-data"

/**
 * Degraded-mode status for the hosted board — site cache, no polling.
 * Keep fetching out of the reusable TubeStatusBoard.
 */
export async function getCachedLineStatusesAction(): Promise<CachedLineStatusesPayload> {
  return getCachedLineStatuses()
}
