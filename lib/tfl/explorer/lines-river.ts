import { LINE_STATION_SEQUENCES } from "tfl-ts"
import { compareBusRouteNames } from "@/lib/tfl/arrivals-route-sort"
import type { ExplorerLineSummary } from "@/lib/tfl/explorer/common"

/**
 * River-bus line directory from tfl-ts `LINE_STATION_SEQUENCES`.
 * Offline topology — no TfL round-trip.
 */
export const getExplorerRiverLines = (): ExplorerLineSummary[] =>
  Object.values(LINE_STATION_SEQUENCES)
    .filter((sequence) => sequence.modeName === "river-bus")
    .map(
      (sequence): ExplorerLineSummary => ({
        id: sequence.lineId,
        name: sequence.lineName,
        modeName: sequence.modeName,
      }),
    )
    .sort((a, b) => compareBusRouteNames(a.name, b.name))
