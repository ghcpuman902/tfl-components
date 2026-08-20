import type { Metadata } from "next"
import { Suspense } from "react"
import { pageMetadata, ROUTE_PAGE_META } from "@/lib/site-metadata"
import { BoardBuilder } from "@/components/board/board-builder"
import { BoardStagedBuilder } from "@/components/board/board-staged-builder"
import { getBoardStationLinesIndex } from "@/lib/tfl/board-station-lines"
import {
  getBoardStationNamesIndex,
  getBoardStationSearchIndex,
} from "@/lib/tfl/board-station-names"

export const metadata: Metadata = pageMetadata(ROUTE_PAGE_META.board)

type BoardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

const BoardFromParams = async ({ searchParams }: BoardPageProps) => {
  const params = await searchParams
  const staged = params.staged === "1" || params.staged === "true"
  const stationLines = getBoardStationLinesIndex()
  const stationNames = getBoardStationNamesIndex()
  const stations = getBoardStationSearchIndex()

  return (
    <div className="mx-auto w-full max-w-7xl">
      <article className="space-y-8">
        <header>
          <h1 className="tfl-title text-3xl text-foreground">Board</h1>
          <p className="mt-2 max-w-prose text-lg text-muted-foreground">
            {staged
              ? "Choose a screen and a stop. The useful live arrivals, line status and nearby services come first."
              : "Turn any screen into a live TfL departures and status display. Pick a station, then open or share the URL full-screen."}
          </p>
        </header>

        {staged ? (
          <BoardStagedBuilder
            stationLines={stationLines}
            stationNames={stationNames}
            stations={stations}
          />
        ) : (
          <BoardBuilder
            stationLines={stationLines}
            stationNames={stationNames}
            stations={stations}
          />
        )}
      </article>
    </div>
  )
}

export default function BoardBuilderPage({ searchParams }: BoardPageProps) {
  return (
    <Suspense
      fallback={
        <div className="mx-auto w-full max-w-7xl">
          <article className="space-y-8">
            <header>
              <h1 className="tfl-title text-3xl text-foreground">Board</h1>
              <p className="mt-2 max-w-prose text-lg text-muted-foreground">
                Turn any screen into a live TfL departures and status display.
              </p>
            </header>
          </article>
        </div>
      }
    >
      <BoardFromParams searchParams={searchParams} />
    </Suspense>
  )
}
