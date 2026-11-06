import type { Metadata, Viewport } from "next"
import { BoardDisplay } from "@/components/board/board-display"
import { getBoardArrivalsStopIdsIndex } from "@/lib/tfl/board-arrivals-stop-ids"
import { getBoardStationLinesIndex } from "@/lib/tfl/board-station-lines"
import {
  getBoardStationNamesIndex,
  lookupBoardStationName,
} from "@/lib/tfl/board-station-names"
import { boardViewPageMetadata } from "@/lib/site-metadata"
import { BOARD_VIEW_VIEWPORT } from "@/lib/tfl/board-view-manifest"

type BoardViewPageProps = {
  searchParams: Promise<{ stop?: string | string[]; stopName?: string | string[] }>
}

const first = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) return value[0]
  return value
}

export const generateMetadata = async ({
  searchParams,
}: BoardViewPageProps): Promise<Metadata> => {
  const params = await searchParams
  const stop = first(params.stop)?.trim() || undefined
  const named = first(params.stopName)?.trim() || undefined
  const stopName =
    named ||
    (stop
      ? lookupBoardStationName(getBoardStationNamesIndex(), stop)
      : undefined)
  return boardViewPageMetadata({ stop, stopName })
}

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
