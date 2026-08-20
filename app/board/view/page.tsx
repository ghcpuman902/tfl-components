import type { Metadata } from "next"
import { BoardDisplay } from "@/components/board/board-display"
import { getBoardArrivalsStopIdsIndex } from "@/lib/tfl/board-arrivals-stop-ids"
import { getBoardStationLinesIndex } from "@/lib/tfl/board-station-lines"
import { getBoardStationNamesIndex } from "@/lib/tfl/board-station-names"
import { pageMetadata, ROUTE_PAGE_META } from "@/lib/site-metadata"

export const metadata: Metadata = pageMetadata(ROUTE_PAGE_META.boardView)

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
