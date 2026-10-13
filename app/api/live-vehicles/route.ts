import { connection } from "next/server"
import { SITE_MAX_LIVE_RAIL_LINES } from "@/lib/tfl/live-rail-line-ids"
import { buildLiveVehiclesSnapshot } from "@/lib/tfl/live-vehicles-payload"
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

/**
 * Site-key fallback for visitors without a personal TfL key. Uncached: every
 * request reads TfL. Without `rail` or `bus`, serves the tracked defaults;
 * with either, the other is empty. `predictions=0` skips TfL arrivals.
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
    const data = await buildLiveVehiclesSnapshot({
      railLineIds,
      busRouteIds,
      predictions: searchParams.get("predictions") !== "0",
    })
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
