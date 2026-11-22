import { connection } from "next/server"
import { SITE_MAX_LIVE_RAIL_LINES } from "@/lib/tfl/live-rail-line-ids"
import {
  getCachedLiveVehiclesSnapshot,
  liveVehiclesKey,
} from "@/lib/tfl/live-vehicles-cache"
import {
  TRACKED_BUS_ROUTE_ID,
  TRACKED_RAIL_LINE_ID,
} from "@/lib/tfl/live-vehicles-stops"

const splitIds = (value: string | null): string[] =>
  value
    ? [
        ...new Set(
          value
            .split(",")
            .map((id) => id.trim())
            .filter(Boolean)
        ),
      ]
    : []

/** A line or route id: letters, digits and hyphens, so a request cannot invent cache keys. */
const VALID_ID = /^[A-Za-z0-9-]{1,40}$/

/**
 * Site-key fallback for visitors without a personal TfL key. The snapshot is
 * built behind a shared 15 s cache (`getCachedLiveVehiclesSnapshot`), so a set
 * of lines costs the key at most 4 TfL calls a minute however many tabs poll
 * it. Without `rail` or `bus`, serves the tracked defaults; with either, the
 * other is empty. `predictions=0` skips TfL arrivals.
 * Rail line count is capped so the shared key cannot pull the whole network.
 */
export async function GET(request: Request) {
  await connection()
  const { searchParams } = new URL(request.url)
  const hasIds = searchParams.has("rail") || searchParams.has("bus")
  const railLineIds = hasIds
    ? splitIds(searchParams.get("rail"))
    : [TRACKED_RAIL_LINE_ID]
  const busRouteIds = hasIds
    ? splitIds(searchParams.get("bus"))
    : [TRACKED_BUS_ROUTE_ID]
  if (![...railLineIds, ...busRouteIds].every((id) => VALID_ID.test(id))) {
    return Response.json(
      { ok: false, error: "Those line or route ids are not valid." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    )
  }
  if (railLineIds.length > SITE_MAX_LIVE_RAIL_LINES) {
    return Response.json(
      {
        ok: false,
        error: `The shared key follows up to ${SITE_MAX_LIVE_RAIL_LINES} rail lines at once. Add your own TfL API key to follow more.`,
      },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    )
  }
  try {
    const data = await getCachedLiveVehiclesSnapshot(
      liveVehiclesKey(railLineIds),
      liveVehiclesKey(busRouteIds),
      searchParams.get("predictions") !== "0"
    )
    return Response.json(
      { ok: true, data },
      { headers: { "Cache-Control": "no-store" } }
    )
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load live vehicles."
    return Response.json(
      { ok: false, error: message },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    )
  }
}
