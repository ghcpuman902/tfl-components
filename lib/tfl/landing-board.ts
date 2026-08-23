import type { BoardArrivalsStopIdsIndex } from "@/lib/tfl/board-arrivals-stop-ids"
import { getBoardArrivalsStopIdsIndex } from "@/lib/tfl/board-arrivals-stop-ids"
import type { BoardStationLinesIndex } from "@/lib/tfl/board-station-lines"
import { getBoardStationLinesIndex } from "@/lib/tfl/board-station-lines"
import type { BoardStationNamesIndex } from "@/lib/tfl/board-station-names"
import { getBoardStationNamesIndex } from "@/lib/tfl/board-station-names"
import { HOME_RAIL_LINES, HOME_RAIL_STOP } from "@/lib/tfl/home-arrivals-stops"

/** Compact indexes for the homepage Oxford Circus preview. Not the full catalog. */
export type LandingBoardIndexes = {
  stationLines: BoardStationLinesIndex
  stationNames: BoardStationNamesIndex
  arrivalsStopIds: BoardArrivalsStopIdsIndex
}

export const getLandingBoardIndexes = (): LandingBoardIndexes => {
  const stop = HOME_RAIL_STOP.id
  const lines = getBoardStationLinesIndex()
  const names = getBoardStationNamesIndex()
  const arrivals = getBoardArrivalsStopIdsIndex()

  return {
    stationLines: {
      [stop]: lines[stop] ?? HOME_RAIL_LINES,
    },
    stationNames: {
      [stop]: names[stop] ?? HOME_RAIL_STOP.name,
    },
    arrivalsStopIds: arrivals[stop] ? { [stop]: arrivals[stop] } : {},
  }
}
