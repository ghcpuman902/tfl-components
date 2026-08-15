import { cacheLife, cacheTag } from "next/cache"
import { sortLinesBySeverityAndOrder } from "tfl-ts"
import { getTflClient } from "@/lib/tfl/client"
import type { StatusLine } from "@/lib/tfl/status-types"

export type { StatusLine } from "@/lib/tfl/status-types"

/**
 * Modes on TfL’s Tube & Rail status surface (Cable Car is listed separately).
 * Keep in sync with `DEFAULT_STATUS_MODES` on `TubeStatusBoard`.
 */
export const CACHED_STATUS_MODES = [
  "tube",
  "elizabeth-line",
  "dlr",
  "tram",
  "overground",
] as const

export type CachedLineStatusesPayload = {
  data: StatusLine[]
  /** Clock for tfl-ts current-row helpers. Stamped inside `"use cache"`. */
  fetchedAt: number
}

/**
 * Site/demo fetch for status boards — keep out of the reusable component.
 * Prefer passing `data` and `now={fetchedAt}` into `TubeStatusBoard`.
 * With no `lineIds`, fetches TfL Tube & Rail modes (excludes Cable Car).
 * Soft-fails to `[]` on TfL errors so a quota/outage spike does not crash the page.
 */
export async function getCachedLineStatuses(
  lineIds?: readonly string[]
): Promise<CachedLineStatusesPayload> {
  "use cache"
  cacheLife({ revalidate: 60 })
  cacheTag("tfl-line-status")

  const fetchedAt = Date.now()

  try {
    const client = getTflClient()
    const lineStatuses = await client.line.getStatus(
      lineIds && lineIds.length > 0
        ? { lineIds: [...lineIds] }
        : {
            modes: [...CACHED_STATUS_MODES],
          }
    )
    return {
      data: sortLinesBySeverityAndOrder(lineStatuses, { now: fetchedAt }),
      fetchedAt,
    }
  } catch {
    return { data: [], fetchedAt }
  }
}
