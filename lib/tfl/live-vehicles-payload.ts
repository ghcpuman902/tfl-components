import type { RealtimePrediction } from "tfl-ts"
import type { BusRouteGeometry } from "@/lib/tfl/bus-geography-types"
import { getCachedBusRouteGeometries } from "@/lib/tfl/bus-route-geometry"
import {
  BODS_STALE_MS,
  boundingBoxFromGeometries,
  fetchBodsVehicleActivities,
  isBodsConfigured,
  matchBodsLine,
  type BodsVehicleActivity,
} from "@/lib/tfl/bods-siri-vm"
import { fetchBatchedLineArrivals } from "@/lib/tfl/line-vehicle-arrivals"
import {
  TRACKED_BUS_DIRECTION,
  TRACKED_BUS_ROUTE_ID,
  TRACKED_RAIL_LINE_ID,
} from "@/lib/tfl/live-vehicles-stops"

export type LiveVehiclesSnapshot = {
  railPredictions: RealtimePrediction[]
  busPredictions: RealtimePrediction[]
  busGeometries: BusRouteGeometry[]
  bodsActivities: BodsVehicleActivity[]
  fetchedAt: number
  bodsConfigured: boolean
}

/** @deprecated Use {@link LiveVehiclesSnapshot}. */
export type LiveVehiclesPayload = LiveVehiclesSnapshot

export async function buildLiveVehiclesSnapshot({
  railLineIds = [TRACKED_RAIL_LINE_ID],
  busRouteIds = [TRACKED_BUS_ROUTE_ID],
  predictions = true,
}: {
  railLineIds?: readonly string[]
  busRouteIds?: readonly string[]
  /**
   * `false` skips TfL arrivals. Personal-key clients fetch those from the
   * browser and only need bus geometry and BODS positions from the server.
   */
  predictions?: boolean
} = {}): Promise<LiveVehiclesSnapshot> {
  const railIds = [
    ...new Set(railLineIds.map((id) => id.trim()).filter(Boolean)),
  ]
  const busIds = [
    ...new Set(busRouteIds.map((id) => id.trim()).filter(Boolean)),
  ]
  const [rail, bus, busGeometries] = await Promise.all([
    fetchBatchedLineArrivals(predictions ? railIds : []),
    fetchBatchedLineArrivals(predictions ? busIds : []),
    getCachedBusRouteGeometries(busIds, TRACKED_BUS_DIRECTION),
  ])
  const bodsConfigured = isBodsConfigured()
  const fetchedAt = Math.max(rail.fetchedAt, bus.fetchedAt, Date.now())
  let bodsActivities: BodsVehicleActivity[] = []
  if (bodsConfigured && busIds.length > 0) {
    const boundingBox = boundingBoxFromGeometries(busGeometries)
    if (boundingBox) {
      try {
        const raw = await fetchBodsVehicleActivities({ boundingBox })
        bodsActivities = raw.filter((activity) => {
          if (!busIds.some((id) => matchBodsLine(activity, id))) return false
          const recorded = Date.parse(activity.recordedAtTime)
          return (
            !Number.isFinite(recorded) || fetchedAt - recorded <= BODS_STALE_MS
          )
        })
      } catch {
        bodsActivities = []
      }
    }
  }
  return {
    railPredictions: rail.arrivals,
    busPredictions: bus.arrivals,
    busGeometries,
    bodsActivities,
    fetchedAt,
    bodsConfigured,
  }
}

export const buildLiveVehiclesPayload = (): Promise<LiveVehiclesSnapshot> =>
  buildLiveVehiclesSnapshot()
