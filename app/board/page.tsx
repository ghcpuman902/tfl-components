import type { Metadata } from "next"
import { pageMetadata, ROUTE_PAGE_META } from "@/lib/site-metadata"
import { BoardBuilder } from "@/components/board/board-builder"
import { getBoardStationLinesIndex } from "@/lib/tfl/board-station-lines"
import {
  getBoardStationNamesIndex,
  getBoardStationSearchIndex,
} from "@/lib/tfl/board-station-names"

export const metadata: Metadata = pageMetadata(ROUTE_PAGE_META.board)

export default function BoardBuilderPage() {
  const stationLines = getBoardStationLinesIndex()
  const stationNames = getBoardStationNamesIndex()
  const stations = getBoardStationSearchIndex()

  return (
    <div className="mx-auto w-full max-w-7xl">
      <article className="space-y-8">
        <header>
          <h1 className="tfl-title text-3xl text-foreground">Board</h1>
          <p className="mt-2 max-w-prose text-lg text-muted-foreground">
            Turn any screen into a live TfL departures and status display. Pick
            a station, then open or share the URL full-screen.
          </p>
        </header>

        <BoardBuilder
          stationLines={stationLines}
          stationNames={stationNames}
          stations={stations}
        />
      </article>
    </div>
  )
}
