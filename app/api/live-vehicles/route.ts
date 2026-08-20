import { connection } from "next/server"
import { buildLiveVehiclesSnapshot } from "@/lib/tfl/live-vehicles-payload"
import {
  TRACKED_BUS_ROUTE_ID,
  TRACKED_RAIL_LINE_ID,
} from "@/lib/tfl/live-vehicles-stops"

const splitIds = (value: string | null, fallback: string): string[] => {
  const raw = value?.trim() ? value : fallback
  return [
    ...new Set(
      raw
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean)
    ),
  ]
}

/** Site-key fallback for visitors without a personal TfL key. */
export async function GET(request: Request) {
  await connection()
  const url = new URL(request.url)
  const railLineIds = splitIds(
    url.searchParams.get("rail"),
    TRACKED_RAIL_LINE_ID
  )
  const busRouteIds = splitIds(
    url.searchParams.get("bus"),
    TRACKED_BUS_ROUTE_ID
  )
  try {
    const data = await buildLiveVehiclesSnapshot({ railLineIds, busRouteIds })
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
