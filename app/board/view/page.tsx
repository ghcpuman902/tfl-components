import type { Metadata, Viewport } from "next"
import { BoardDisplay } from "@/components/board/board-display"
import { getBoardArrivalsStopIdsIndex } from "@/lib/tfl/board-arrivals-stop-ids"
import { getBoardStationLinesIndex } from "@/lib/tfl/board-station-lines"
import { getBoardStationNamesIndex } from "@/lib/tfl/board-station-names"
import { boardViewPageMetadata } from "@/lib/site-metadata"
import { BOARD_VIEW_VIEWPORT } from "@/lib/tfl/board-view-manifest"

export const metadata: Metadata = boardViewPageMetadata()
export const viewport: Viewport = BOARD_VIEW_VIEWPORT

export default function BoardViewPage() {
  const stationLines = getBoardStationLinesIndex()
  const stationNames = getBoardStationNamesIndex()
  const arrivalsStopIds = getBoardArrivalsStopIdsIndex()
  return (
    <BoardDisplay
      stationLines={stationLines}
      stationNames={stationNames}
      arrivalsStopIds={arrivalsStopIds}
    />
  )
}
